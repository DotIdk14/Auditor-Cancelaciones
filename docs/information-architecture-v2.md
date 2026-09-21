# Arquitectura de Información v2 — Auditor de Cancelaciones

**Documento:** Rediseño de Navegación, Jerarquía Visual y Reducción de Carga Cognitiva  
**Fecha:** Septiembre 2026  
**Roles:** Senior Product Designer & Senior Frontend Engineer React/TypeScript  
**Estado:** Especificación Aprobada para Implementación  

---

## 1. Navegación Actual y Diagnóstico de Problemas

### 1.1 Navegación Previa (v1)

- **Barra Lateral (Sidebar):**
  - *Inicio / Lista de Casos* (Vista de búsqueda)
  - *Auditoría (Grupo expandible):*
    - `Llamada y Audio`
    - `Evidencias`
    - `Análisis de Reglas`
    - `Dictamen Formal`
  - *Secundarios (Mocks decorativos):* `Catálogos`, `Reportes`, `Configuración`
- **Pestañas Internas en Expediente (`CaseHeader`):**
  - `Llamada y Audio`
  - `Evidencias`
  - `Información del caso`
  - `Análisis y Reglas`
  - `Dictamen Formal`
- **Vista Principal de Llamada (Sobrecarga Cognitiva Extrema):**
  - En el encabezado superior: Datos del alumno + Mini reproductor de audio completo (`CallPlayer`).
  - Columna izquierda (8 cols): Transcripción diarizada, selector de llamadas, buscador de frases, dropzone de audio.
  - Columna derecha (4 cols): **Tres paneles simultáneos apilados** (`CaseAnalysis`, `DictamenPanel`, `EvidencePanel`), duplicando la información de las 3 pestañas restantes y presentando más de 7 botones de acción compitiendo por atención.

---

### 1.2 Problemas UX Detectados

| Problema | Impacto Cognitivo | Causa Raíz |
|---|---|---|
| **Doble sistema de navegación desincronizado** | Alto (Desorientación) | La barra lateral y las pestañas del caso representaban los mismos destinos con nombres e IDs diferentes, generando dudas sobre el alcance de la navegación. |
| **"Llamada y Audio" elevado erróneamente a nivel global** | Crítico (Confusión de modelo mental) | Una llamada telefónica es una *evidencia particular* dentro de un caso, no un módulo del sistema auditor. |
| **Columna derecha triplemente redundante** | Crítico (Fatiga visual y parálisis de decisión) | En la vista de llamada se mostraban a la vez un resumen del análisis, un panel del dictamen y una lista de evidencias, mientras ya existían vistas dedicadas para cada uno. |
| **Exposición prematura de datos técnicos (Anti-Progressive Disclosure)** | Alto | El sandbox de parámetros normativos (12 selectores y switches) se mostraba abierto sin filtro en la pestaña "Información del caso", compitiendo con la ficha básica del estudiante. |
| **Reproductor de audio omnipresente en el encabezado** | Medio | El reproductor ocupaba 80px verticales fijos en todas las pestañas aunque el auditor estuviera redactando el dictamen o leyendo el árbol de decisión. |

---

## 2. Nueva Arquitectura de Información (v2)

### 2.1 Principios Rectores

1. **Una Acción Principal por Contexto:** Cada pantalla tiene un objetivo primario claro con un botón de jerarquía dominante (`primary button`), mientras que las acciones complementarias se relegan a niveles secundarios o menús contextuales.
2. **Progressive Disclosure:** La información crítica (veredicto, causales, alertas) se presenta de inmediato; los detalles técnicos profundos (reglas descartadas, matriz de conflictos, parámetros sandbox, árbol JSON) se revelan bajo demanda del auditor.
3. **Expediente Autónomo y Coherente:** El audio y las transcripciones residen como evidencias naturales del caso, sin contaminar la navegación del sistema.
4. **Separación Estricta:** Las herramientas globales (cola de trabajo, reportes normativos, compendio de políticas y configuración) gobiernan el sistema; el expediente gobierna el caso individual.

---

### 2.2 Estructura de Navegación Global (Nivel Sistema)

La barra lateral izquierda (`Sidebar`) ahora contiene exclusivamente módulos de alcance global:

```
[ SIDEBAR GLOBAL ]
  ├── 1. Casos (Bandeja general y buscador central de expedientes)
  ├── 2. Cola de Auditoría (Casos priorizados por urgencia, estado y bloqueo normativo)
  ├── 3. Reportes (Métricas de cancelaciones, distribución por causa raíz y SLA)
  ├── 4. Políticas (Procedimiento Deserción GDM_GAM_PRD_MLG_003 interactivo)
  └── 5. Configuración (Preferencias de auditor, umbrales y perfiles)
```

---

### 2.3 Estructura de Navegación del Expediente (Nivel Caso)

Al seleccionar o abrir un caso, el auditor interactúa con un flujo lineal de 4 fases cognitivas naturales:

```
[ EXPEDIENTE AUDITADO ]
  ├── 1. Resumen (Ficha ejecutiva, estado normativo, alertas y cronología)
  │      └── Acción primaria: "Revisar Evidencias" (Paso 1 del flujo)
  │
  ├── 2. Evidencias (Llamadas diarizadas con reproductor + SIU + Flokzu + Documentos)
  │      └── Acción primaria: "Analizar Decisión" (Paso 2 del flujo)
  │      └── Subsecciones limpias: 
  │           • Contacto y Llamadas (con reproductor, diarización y carga)
  │           • Expediente Documental (capturas SIU, tickets Flokzu, cartas)
  │
  ├── 3. Decisión (Diagnóstico del motor: causales, reglas determinantes, bloqueos)
  │      └── Acción primaria: "Emitir Dictamen Oficial" (Paso 3 del flujo)
  │      └── Progressive Disclosure: 
  │           • Árbol de decisión interactivo (modal bajo demanda)
  │           • Sandbox de simulación de variables normativas (colapsable)
  │           • Reglas secundarias y descartadas (acordeón expandible)
  │
  └── 4. Dictamen (Redacción pericial, firma de calidad, certificación y exportación)
         └── Acción primaria: "Aprobar y Certificar Dictamen" (Cierre vinculante)
```

---

## 3. Mapa de Pantallas y Flujo del Auditor

```
                       ┌─────────────────────────┐
                       │   1. BANDEJA DE CASOS   │
                       │ (Búsqueda, Filtros, SLA)│
                       └────────────┬────────────┘
                                    │ Clic en expediente
                                    ▼
                       ┌─────────────────────────┐
                       │    2. CASO: RESUMEN     │
                       │ Identificación, Estado, │
                       │    Alertas y Avance     │
                       └────────────┬────────────┘
                                    │ "Revisar Evidencias"
                                    ▼
                       ┌─────────────────────────┐
                       │   3. CASO: EVIDENCIAS   │
                       │ • Llamada y Diarización │
                       │ • Capturas SIU / Flokzu │
                       │ • Visor de Documentos   │
                       └────────────┬────────────┘
                                    │ "Analizar Decisión"
                                    ▼
                       ┌─────────────────────────┐
                       │    4. CASO: DECISIÓN    │
                       │ • Causal Raíz y Motor   │
                       │ • Bloqueos y Conflictos │
                       │ • Sandbox Simulación    │
                       └────────────┬────────────┘
                                    │ "Emitir Dictamen"
                                    ▼
                       ┌─────────────────────────┐
                       │    5. CASO: DICTAMEN    │
                       │ • Certificación Oficial │
                       │ • Edición Fundamentada  │
                       │ • Firma y Exportación   │
                       └─────────────────────────┘
```

---

## 4. Matriz de Componentes

### 4.1 Componentes Reutilizados (Optimizados y Reubicados)

| Componente Original | Nuevo Rol en v2 | Ubicación y Función |
|---|---|---|
| `CaseSearchList.tsx` | Reutilizado | Pantalla principal del módulo global **Casos**. |
| `CallTranscript.tsx` | Reutilizado | Integrado dentro de la pestaña **Evidencias** (subsección de Contacto y Llamadas). |
| `CallPlayer.tsx` | Reutilizado | Embebido en la tarjeta de evidencia de llamada (ya no flota en el header global). |
| `EvidenceViewer.tsx` | Reutilizado | Drawer/Modal para inspección visual de capturas y PDFs probatorios. |
| `DecisionTreeModal.tsx`| Reutilizado | Modal de inspección profunda bajo demanda en la pestaña **Decisión**. |
| `AddCaseModal.tsx` | Reutilizado | Modal de alta manual accesible desde la barra superior y bandeja. |

### 4.2 Componentes Fusionados

| Componentes Anteriores | Componente Fusionado v2 | Justificación de Diseño |
|---|---|---|
| `CaseInfoTab.tsx` (Ficha) + Vista Resumen | `CaseSummaryView.tsx` | Unifica la ficha del estudiante, estado del trámite, fechas críticas y diagnóstico rápido en una sola pantalla ejecutiva. Elimina duplicidad. |
| `EvidencePanel.tsx` + `EvidenceFullView.tsx` | `CaseEvidencesView.tsx` | Elimina el mini panel lateral redundante y ofrece una vista unificada y categorizada (Llamadas diarizadas + Documentos SIU/Flokzu) con reproductor integrado. |
| `CaseAnalysis.tsx` + `AnalysisFullView.tsx` + Sandbox de `CaseInfoTab.tsx` | `CaseDecisionView.tsx` | Centraliza todo el diagnóstico normativo: veredicto principal primero, bloqueos duros y conflictos; sandbox de simulación accesible bajo demanda con progressive disclosure. |
| `DictamenPanel.tsx` + `DictamenFullView.tsx` | `CaseDictamenView.tsx` | Elimina la previsualización lateral y proporciona el espacio pericial completo para revisión, edición, certificación y firma. |

### 4.3 Componentes Eliminados / Deprecados de la Vista Principal

| Componente | Motivo de Eliminación de la Vista Central |
|---|---|
| Columna lateral de 3 paneles (`App.tsx` col-span-4) | Generaba sobrecarga visual extrema al mostrar a la vez 3 resúmenes secundarios mientras el auditor analizaba una llamada. |
| `CallPlayer` pegado al `CaseHeader` | Ocupaba espacio crítico en todas las pestañas; ahora reside contextualizado dentro de la evidencia de audio. |
| Tabs duplicadas en Sidebar | La barra lateral ya no duplica las 4 pestañas del caso; ahora contiene exclusivamente módulos globales del sistema. |

---

## 5. Criterios de Aceptación UX y Verificación

- [x] **Encontrar un caso:** Buscador reactivo y tabla de casos con estados claros en el módulo global "Casos".
- [x] **Abrirlo:** Transición instantánea al caso con `CaseHeader` limpio (ID, matrícula, nivel, estado y 4 pestañas exactas).
- [x] **Comprender su estado:** Pestaña "Resumen" muestra de un vistazo causal sugerida, días transcurridos y checklist normativo.
- [x] **Revisar evidencia:** Pestaña "Evidencias" agrupa audio diarizado con reproductor y archivos SIU/Flokzu sin colisiones.
- [x] **Revisar decisión:** Pestaña "Decisión" presenta el dictamen del motor, causa raíz, reglas determinantes y sandbox con progressive disclosure.
- [x] **Emitir dictamen:** Pestaña "Dictamen" permite redactar, certificar y firmar digitalmente el documento oficial.
- [x] **Preservación total de funcionalidad:** Ninguna regla normativa alterada; 100% de pruebas unitarias y de Golden Cases aprobadas.
