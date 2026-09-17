# Arquitectura Actual — Auditor de Cancelaciones

**Documento:** Auditoría Arquitectural y Mapeo de Dependencias  
**Fecha:** Septiembre 2026  
**Rol:** Senior Software Architect & QA Engineer  
**Estado:** Baseline Pre-Refactorización (Fase 0)

---

## 1. Resumen Ejecutivo y Propósito del Sistema

El **Auditor de Cancelaciones** es una plataforma operativa de auditoría y certificación jurídica-normativa diseñada para dictaminar solicitudes de deserción, baja y cancelación de matrícula en instituciones de educación superior.

El sistema digitaliza y automatiza el procedimiento institucional de referencia (**GDM_GAM_PRD_MLG_003 Procedimiento Deserción de Estudiantes**), permitiendo a auditores de calidad:
- Visualizar el expediente integral del alumno (datos académicos, bitácora de llamadas con transcripción diarizada, evidencias en SIU/Flokzu/Aula Virtual).
- Evaluar el expediente contra un motor de decisiones normativo basado en reglas jerárquicas y detección de bloqueos duros (*hard blockers*).
- Resolver contradicciones entre causales (ej. solicitud extemporánea vs. falla operativa de la universidad).
- Generar, editar y certificar dictámenes oficiales con valor probatorio institucional.

---

## 2. Stack Tecnológico Actual

| Componente | Tecnología | Versión | Rol Arquitectónico |
|---|---|---|---|
| **Frontend Framework** | React | 19.0.1 | Capa de presentación reactiva basada en componentes funcionales |
| **Tipado Estático** | TypeScript | 5.8.2 | Tipado estricto en UI, contratos de dominio y motor de reglas |
| **Bundler & Dev Server** | Vite | 6.2.3 | Empaquetado SPA, compilación HMR y servidor en puerto 3000 |
| **Estilos & Layout** | Tailwind CSS | 4.1.14 | Utilidades atómicas de estilizado responsive y tema oscuro |
| **Animaciones UI** | Motion | 12.23.24 | Transiciones de tabs, modales y renderizado fluido |
| **Iconografía** | Lucide React | 0.546.0 | Conjunto consistente de pictogramas de auditoría |
| **Motor de Reglas** | TypeScript Puro | N/A | Núcleo de decisión determinista, desacoplado de React |
| **Test Runner** | tsx / Node.js | N/A | Ejecución directa de pruebas unitarias y regresión de golden cases |

---

## 3. Topología del Repositorio y Capas

```
/
├── index.html                           # Entry point HTML con metadatos de auditoría
├── package.json                         # Dependencias y scripts de build/lint/test
├── tsconfig.json                        # Configuración del compilador TypeScript
├── vite.config.ts                       # Configuración de Vite y plugin Tailwind CSS
│
├── docs/                                # Documentación de arquitectura y refactorización
│   ├── architecture-current.md          # [Este documento] Mapeo arquitectural del sistema
│   ├── domain-contracts.md              # Especificación formal de tipos e interfaces
│   ├── decision-engine-behavior.md      # Flujo de ejecución del motor y reglas normativas
│   └── refactor-plan.md                 # Estrategia de refactorización progresiva segura
│
├── src/
│   ├── main.tsx                         # Bootstrap de React montado en DOM (#root)
│   ├── App.tsx                          # Orquestador central de UI, estado y llamadas al motor
│   ├── index.css                        # Importación central de Tailwind CSS (@import "tailwindcss")
│   │
│   ├── types/
│   │   └── audit.ts                     # Tipos de la UI de auditoría (AuditCase, CallRecord, EvidenceItem, etc.)
│   │
│   ├── mock/
│   │   └── cases.ts                     # Datos de prueba (4 casos reales: CAVE-30274, 30288, 29941, 30299)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopNavbar.tsx            # Barra superior: estado del sistema, búsqueda y switch de vista
│   │   │   └── Sidebar.tsx              # Barra lateral: navegación, filtros y perfil de auditor
│   │   │
│   │   └── audit/
│   │       ├── CaseHeader.tsx           # Encabezado del caso: badges, fechas, alertas y acciones
│   │       ├── CaseSearchList.tsx       # Bandeja de entrada de expedientes con filtrado
│   │       ├── CallTranscript.tsx       # Transcripción diarizada de audio con momentos clave
│   │       ├── CallPlayer.tsx           # Reproductor interactivo de audio con sincronización de tiempo
│   │       ├── CaseAnalysis.tsx         # Widget lateral de análisis rápido del dictamen
│   │       ├── DictamenPanel.tsx        # Widget lateral de dictamen con botón de aprobación
│   │       ├── EvidencePanel.tsx        # Widget lateral de resumen de evidencias disponibles
│   │       ├── EvidenceViewer.tsx       # Drawer/modal para previsualizar capturas, SIU y PDFs
│   │       ├── CaseInfoTab.tsx          # Pestaña "Ficha Técnica": expediente y sandbox de parámetros
│   │       ├── AnalysisFullView.tsx     # Pestaña "Análisis Normativo": reglas aplicadas, descartadas y conflictos
│   │       ├── DictamenFullView.tsx     # Pestaña "Dictamen Oficial": edición, certificación y copia
│   │       ├── EvidenceFullView.tsx     # Pestaña "Evidencias": repositorio completo clasificado por origen
│   │       ├── DecisionTreeModal.tsx    # Modal explicativo del árbol de prioridades y resolución
│   │       └── AddCaseModal.tsx         # Modal de alta rápida de nuevos casos con autoevaluación
│   │
│   └── lib/
│       └── decision-engine/             # NÚCLEO AUTÓNOMO DEL MOTOR DE DECISIONES
│           ├── decision-engine.ts       # Fachada principal y normalizador canónico
│           ├── rule-engine.ts           # Despachador de evaluación secuencial de reglas
│           ├── conflict-resolver.ts     # Árbitro de resolución de conflictos normativos
│           ├── evidence-evaluator.ts    # Auditor de suficiencia de evidencias por causal
│           ├── reasoning-builder.ts     # Generador de fundamentación legal y cálculo de confianza
│           ├── types.ts                 # Interfaces del motor de decisión
│           │
│           ├── rules/                   # Catálogo de reglas normativas (implementan DecisionRule)
│           │   ├── eligibility.ts       # Prioridad 0: Validación de campos mínimos obligatorios
│           │   ├── academic-activity.ts # Prioridad 1: Calificaciones y devengamiento (Hard Blocker)
│           │   ├── mystery-shopper.ts   # Prioridad 2: Cancelación de matrícula por Mystery Shopper
│           │   ├── cycle-change.ts      # Prioridad 2: Invasión de ciclo sin grado previo
│           │   ├── operational-cancellation.ts # Prioridad 3: Falla operativa de carga de materias
│           │   ├── sales-promise.ts     # Prioridad 4: Promesa de venta engañosa no cumplida
│           │   ├── enrollment-error.ts  # Prioridad 5: Error de inscripción no ajustado (<20 días)
│           │   ├── effective-contact.ts # Prioridad 6: Validación de llamada con contacto efectivo
│           │   ├── unreachable.ts       # Prioridad 6: Protocolo de ilocalizable (15 llamadas + 6 escritos)
│           │   ├── dates.ts             # Prioridad 7: Ventana de 10 días hábiles y fecha inicio
│           │   ├── student-request.ts   # Prioridad 7: Solicitud expresa del estudiante (pre vs post)
│           │   ├── retention.ts         # Prioridad 7: Procedimiento de retención y contraoferta
│           │   ├── documentation.ts     # Prioridad 8: Documentación de identidad incompleta
│           │   ├── decision35.ts        # Regla complementaria: Clasificación 3.5
│           │   ├── decision53.ts        # Regla complementaria: Clasificación 5.3
│           │   ├── operational-error.ts # [DEUDA TÉCNICA] Función standalone legacy sin uso
│           │   └── unreachable-student.ts # [DEUDA TÉCNICA] Función standalone legacy sin uso
│           │
│           └── __tests__/               # SUITE DE PRUEBAS DE REGRESIÓN
│               ├── decision-engine.test.ts # 12 pruebas unitarias de escenarios sintéticos
│               ├── golden-cases.ts      # Definición y evaluador de Casos Dorados (Golden Cases)
│               ├── run-cli.ts           # Runner CLI de pruebas unitarias
│               └── run-all.ts           # Runner CLI unificado (Unitarias + Golden Cases)
```

---

## 4. Dependencias entre Componentes y Flujo de Datos

### 4.1 Árbol de Componentes
```
App
├── TopNavbar (búsqueda, switch de vistas, alertas)
├── Sidebar (menú de navegación, filtros de casos)
└── [Vistas Principales]
    ├── CaseSearchList (si activeView === 'search')
    └── [Detalle del Caso Seleccionado]
        ├── CaseHeader (selector de expediente, badges, pestañas)
        │
        ├── [Contenido de Pestaña Activa]
        │   ├── CaseInfoTab (si activeTab === 'info')
        │   ├── EvidenceFullView (si activeTab === 'evidences')
        │   ├── AnalysisFullView (si activeTab === 'analysis')
        │   ├── DictamenFullView (si activeTab === 'dictamen')
        │   └── [Vista Llamada / Dashboard Principal] (si activeTab === 'call')
        │       ├── CallTranscript (columna izquierda: transcripción sincronizada)
        │       │   └── CallPlayer (reproductor de audio flotante/integrado)
        │       └── Columna Derecha (widgets rápidos):
        │           ├── CaseAnalysis (resumen del dictamen y métricas)
        │           ├── DictamenPanel (vista rápida de dictamen oficial)
        │           └── EvidencePanel (lista rápida de evidencias)
        │
        ├── EvidenceViewer (Modal drawer para ver detalle de evidencia seleccionada)
        ├── DecisionTreeModal (Modal con diagrama de flujo y prioridades)
        └── AddCaseModal (Modal para ingresar nuevos casos)
```

### 4.2 Dependencias UI -> Motor de Decisiones
El motor de decisiones (`src/lib/decision-engine/`) está desacoplado del framework React, operando como una función determinista pura. Sin embargo, la UI se acopla a través de los siguientes puntos:

1. **`App.tsx` (Consumidor Primario):**
   - Importa `analyzeCancellationCase` de `src/lib/decision-engine/decision-engine`.
   - Inicializa el estado `decisionResult` ejecutando `analyzeCancellationCase(selectedCase.decisionData)`.
   - Re-ejecuta el análisis automáticamente cuando:
     - Cambia el caso seleccionado (`useEffect([selectedCase.id])`).
     - El usuario simula o edita parámetros en el sandbox de la Ficha Técnica (`handleModifyDecisionData`).
     - Se añade una nueva llamada al expediente (`handleAddCall`).
     - El usuario pulsa el botón "Re-evaluar Reglas" (`handleRunAnalysis`).

2. **`AddCaseModal.tsx` (Consumidor Secundario):**
   - Importa `analyzeCancellationCase`.
   - En el evento de envío (`handleSubmit`), corre el motor de decisiones sobre el objeto generado para sugerir la política aplicable (`engineResult.classificationName`) antes de registrar el caso en el estado global.

3. **Componentes de Visualización (Consumidores de Tipos):**
   - `AnalysisFullView.tsx`: consume `DecisionResult`, `AppliedRule`, `RejectedRule`, `RuleConflict`.
   - `DictamenFullView.tsx`: consume `DecisionResult`, `AppliedRule`.
   - `CaseAnalysis.tsx`: consume `DecisionResult`.
   - `DecisionTreeModal.tsx`: consume `DecisionResult`, `CaseDecisionData`.

### 4.3 Dependencias Motor -> Mocks / Datos Externos
- **Aislamiento en Runtime:** El motor de decisiones **NO** importa `src/mock/cases.ts` en su código productivo (`decision-engine.ts`, `rule-engine.ts`, etc.).
- **Acoplamiento de Contrato:** En `src/lib/decision-engine/decision-engine.ts`, la función `normalizeToCancellationCase` recibe una unión de tipos:
  ```ts
  export function normalizeToCancellationCase(input: CancellationCase | CaseDecisionData): CancellationCase
  ```
  Esto significa que el motor conoce la forma estructural de los datos de mock/UI (`CaseDecisionData`), garantizando retrocompatibilidad pero acoplando el contrato de entrada a nombres de propiedades en español y formatos específicos del mock.
- **Suite de Pruebas:** Los tests en `__tests__/golden-cases.ts` importan `MOCK_CASES` para validar la estabilidad funcional.

---

## 5. Gestión del Estado, Datos Derivados y Efectos Secundarios

### 5.1 Estado Global de la Aplicación (Centralizado en `App.tsx`)
El sistema no utiliza Redux, Zustand ni Context API. Todo el estado reside en `App.tsx` y se distribuye mediante *prop drilling*:

| Variable de Estado | Tipo | Propósito |
|---|---|---|
| `casesList` | `AuditCase[]` | Lista mutable en memoria de expedientes (inicializada con `MOCK_CASES`) |
| `selectedCase` | `AuditCase` | Expediente actualmente bajo revisión del auditor |
| `activeTab` | `'call' \| 'info' \| 'evidences' \| 'analysis' \| 'dictamen'` | Pestaña de navegación interna del expediente |
| `activeView` | `'detail' \| 'search'` | Vista principal (detalle de caso vs. lista de búsqueda) |
| `decisionResult` | `DecisionResult` | Salida viva calculada por el motor de decisiones |
| `activeCallId` | `string` | Llamada telefónica activa dentro del expediente actual |
| `isPlaying` | `boolean` | Estado del reproductor simulado de audio |
| `currentPlayTime`| `number` (segundos) | Posición actual de reproducción del audio |
| `viewingEvidence`| `EvidenceItem \| null` | Evidencia seleccionada para visualización en drawer |
| `isDecisionTreeOpen` | `boolean` | Visibilidad del modal explicativo del árbol de decisión |
| `isAddCaseOpen` | `boolean` | Visibilidad del modal para dar de alta nuevos casos |
| `toastMessage` | `string \| null` | Mensajes temporales de notificación al auditor |
| `isAnalyzing` | `boolean` | Indicador de carga animada durante el análisis |

### 5.2 Datos Derivados (Computed Values)
- `allCalls`: arreglo combinado de `[primaryCall, ...(secondaryCalls || [])]`.
- `activeCall`: llamada correspondiente a `activeCallId` o fallback a `primaryCall`.
- `determinantRules`: subconjunto de `appliedRules` donde `status === 'DETERMINANTE'` o `priority <= 2`.
- `conflictsCount`: número de conflictos resueltos por el motor (`decisionResult.conflicts.length`).
- `hardBlockersDetected`: booleano derivado de `decisionResult.hardBlockers.length > 0`.

### 5.3 Efectos Secundarios (Side Effects)
1. **Temporizador de Reproducción de Audio (`useEffect` en `App.tsx`):**
   ```ts
   // Simula el avance en tiempo real de la llamada cada 1000ms
   useEffect(() => {
     let interval: any = null;
     if (isPlaying) {
       interval = setInterval(() => {
         setCurrentPlayTime(t => (t >= totalDur ? (setIsPlaying(false), totalDur) : t + 1));
       }, 1000);
     }
     return () => clearInterval(interval);
   }, [isPlaying, totalDur]);
   ```
2. **Sincronización Automática de Motor al Cambiar de Caso (`useEffect`):**
   - Al cambiar `selectedCase.id`, se reinicia el reproductor y se recalcula `analyzeCancellationCase`.
3. **Simulador de Proceso de Análisis Asíncrono (`handleRunAnalysis`):**
   - Ejecuta `setTimeout(..., 400)` para simular latencia de motor y refrescar el dictamen.
4. **Persistencia en Memoria del Dictamen Aprobado (`handleApproveDictamen`):**
   - Modifica el estado del caso a `APROBADO` asignando fecha y hora en zona horaria local (`America/Mexico_City`).

---

## 6. Hallazgos Críticos de Arquitectura y Deuda Técnica

1. **Dependencia Cíclica de Tipos:**
   - `src/types/audit.ts` importa `import('../lib/decision-engine/types').CaseDecisionData`.
   - `src/lib/decision-engine/types.ts` importa `import { CallRecord, EducationLevel } from '../../types/audit'`.
   - *Impacto:* Aunque TypeScript lo resuelve en transpilación, introduce acoplamiento bidireccional entre la capa de UI y el motor de dominio.

2. **Archivos Muertos / Código Huérfano en Reglas:**
   - `src/lib/decision-engine/rules/operational-error.ts` (función `evaluateOperationalError`) y `src/lib/decision-engine/rules/unreachable-student.ts` (función `evaluateUnreachableStudent`) no son importados ni invocados por `rule-engine.ts`.
   - Sus lógicas fueron migradas a clases (`OperationalCancellationRule` y `UnreachableRule`), pero los archivos originales se mantuvieron en el repositorio.

3. **Prop Drilling Severo en `App.tsx`:**
   - `App.tsx` tiene más de 420 líneas y gestiona 13 estados independientes, pasando callbacks y objetos anidados a través de 3 niveles de componentes.

4. **Duplicidad de Nomenclatura en la Salida del Motor:**
   - `DecisionResult` soporta propiedades bilingües/duplicadas para retrocompatibilidad:
     - `appliedRules` / `reglasAplicadas`
     - `rejectedRules` / `reglasDescartadas`
     - `conflicts` / `conflictos`
     - `classification` / `tipo`
     - `rootCause` / `causaRaiz`
   - Esto incrementa el riesgo de desalineación en componentes que acceden a una u otra clave.
