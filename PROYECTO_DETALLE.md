# Documentación Detallada: Sistema de Auditoría de Calidad y Motor de Decisiones de Cancelación

## 1. Introducción y Resumen Ejecutivo

El **Auditor de Cancelaciones** es una aplicación web empresarial avanzada desarrollada en **React 18+, TypeScript y Tailwind CSS**, diseñada para automatizar, estandarizar y auditar los procesos de revisión, análisis normativo y dictaminación de casos de deserción y cancelación de estudiantes en instituciones educativas.

El sistema resuelve un reto operativo crítico: evaluar expedientes complejos de cancelación cruzando políticas internas, grabaciones de llamadas con diarización, interacciones de canales escritos (WhatsApp/CRM), evidencias documentales (SIU/Flokzu) y el historial académico del estudiante. Para ello, incorpora un **Motor de Decisiones Basado en Reglas (Rule Engine)** con 15 reglas jerarquizadas, resolución de conflictos, evaluación de evidencias y generación automática de dictámenes oficiales listos para certificación.

---

## 2. Arquitectura y Estructura del Proyecto

El proyecto sigue una arquitectura modular limpia orientada a componentes empresariales y separación estricta de lógica de negocio y presentación:

```text
/
├── metadata.json                 # Metadatos de la aplicación y capacidades
├── package.json                  # Dependencias y scripts de compilación (Vite, React, Lucide, Motion)
├── tsconfig.json                 # Configuración estricta de TypeScript
├── vite.config.ts                # Configuración del empaquetador Vite con Tailwind CSS v4
├── /src
    ├── App.tsx                   # Componente raíz y enrutador de vistas/pestañas del auditor
    ├── main.tsx                  # Punto de montaje de la aplicación React
    ├── index.css                 # Estilos globales y directivas de Tailwind CSS
    ├── /types
    │   └── audit.ts              # Tipos TypeScript globales (Casos, Evidencias, Dictámenes, Llamadas)
    ├── /mock
    │   ├── cases.ts              # Casos de prueba iniciales pre-cargados con datos normativos y académicos
    │   ├── calls.ts              # Registros de llamadas de audio simuladas, transcripciones y diarización
    │   └── evidences.ts          # Repositorio de evidencias (PDFs de políticas, capturas SIU/Flokzu, I6)
    ├── /components
    │   ├── /layout
    │   │   ├── Sidebar.tsx       # Barra de navegación lateral (Búsqueda, Auditoría, Evidencias, Análisis, Dictamen)
    │   │   └── TopNavbar.tsx     # Barra superior con selector de casos, acceso a política oficial y alta de casos
    │   └── /audit
    │       ├── AddCaseModal.tsx        # Modal interactivo para dar de alta nuevos expedientes de auditoría
    │       ├── AnalysisFullView.tsx    # Vista completa del análisis normativo y desglose de reglas evaluadas
    │       ├── CallPlayer.tsx          # Barra de reproducción de audio interactiva con onda, marcas de tiempo y velocidad
    │       ├── CallTranscript.tsx      # Visor de transcripción diarizada con sincronización de audio y selector de llamadas
    │       ├── CaseAnalysis.tsx        # Panel lateral de resumen rápido del motor de decisiones y confianza
    │       ├── CaseHeader.tsx          # Cabecera principal del expediente (Estado, nombre de estudiante, pestañas de navegación)
    │       ├── CaseInfoTab.tsx         # Pestaña interactiva de información del caso y sandbox de modificación de variables
    │       ├── CaseSearchList.tsx      # Vista general de búsqueda, filtrado y listado de todos los expedientes de auditoría
    │       ├── DecisionTreeModal.tsx   # Modal de árbol de decisión visual paso a paso y rastro de evaluación
    │       ├── DictamenFullView.tsx    # Vista completa del dictamen oficial, redacción legal y certificación
    │       ├── DictamenPanel.tsx       # Panel lateral de vista previa y aprobación rápida de dictamen
    │       ├── EvidenceFullView.tsx    # Vista de cuadrícula/tabla de todo el repositorio documental y probatorio
    │       ├── EvidencePanel.tsx       # Panel lateral de evidencias vinculadas al caso activo
    │       └── EvidenceViewer.tsx      # Visor modal/drawer interactivo de evidencias (PDF, imágenes SIU/Flokzu, logs I6)
    └── /lib
        └── /decision-engine            # Núcleo de Inteligencia Normativa y Reglas
            ├── decision-engine.ts      # Coordinador principal y normalizador de datos de casos
            ├── rule-engine.ts          # Motor secuencial de evaluación por prioridades y bloqueos duros
            ├── conflict-resolver.ts    # Algoritmo de resolución de conflictos entre múltiples reglas cumplidas
            ├── evidence-evaluator.ts   # Evaluador de obligatoriedad de evidencias probatorias
            ├── reasoning-builder.ts    # Constructor de razonamiento algorítmico, confianza y dictamen sugerido
            ├── /rules                  # Las 15 reglas normativas individuales del sistema
            │   ├── academic-activity.ts      # Regla de actividad académica y calificaciones (Bloqueo Duro)
            │   ├── cycle-change.ts           # Regla de gestión de cambio de ciclo / revalidación
            │   ├── dates.ts                  # Reglas de temporalidad (ventanas de cancelación, inicio, deserción)
            │   ├── decision35.ts             # Regla específica de política / excepción 35
            │   ├── decision53.ts             # Regla específica de política / excepción 53
            │   ├── documentation.ts          # Regla de suficiencia documental y expediente completo
            │   ├── effective-contact.ts      # Regla de validación de contacto efectivo y titularidad
            │   ├── eligibility.ts            # NODO 0: Validación obligatoria de datos mínimos de elegibilidad
            │   ├── enrollment-error.ts       # Regla de errores de inscripción (programa, paquete, carga)
            │   ├── mystery-shopper.ts        # Regla de auditoría de calidad anónima / mystery shopper
            │   ├── operational-cancellation.ts # Regla de cancelación por fallas operativas o financieras
            │   ├── operational-error.ts      # Regla auxiliar de errores administrativos
            │   ├── retention.ts              # Regla de gestión de intentos de retención y beneficios
            │   ├── sales-promise.ts          # Regla de incumplimiento de promesa de venta comercial
            │   ├── student-request.ts        # Regla de solicitud explícita de cancelación del estudiante
            │   ├── unreachable-student.ts    # Regla auxiliar de estudiante ilocalizable
            │   └── unreachable.ts            # Regla principal de mínimo de intentos de contacto (Ilocalizable)
            ├── /types.ts               # Tipos TypeScript específicos del motor de decisiones
            └── /__tests__/             # Pruebas unitarias y CLI para validación de reglas
```

---

## 3. Módulos y Componentes de la Interfaz de Usuario (UI)

### 3.1 Navegación y Estructura Global
* **`Sidebar.tsx`**: Barra de navegación lateral fija con accesos directos para cambiar entre las vistas principales del sistema:
  1. *Búsqueda y Listado General* (`search`)
  2. *Auditoría Principal / Diarización* (`audit`)
  3. *Repositorio de Evidencias* (`evidence`)
  4. *Motor de Decisión Normativa* (`analysis`)
  5. *Dictamen Oficial y Certificación* (`dictamen`)
* **`TopNavbar.tsx`**: Barra superior corporativa que muestra el título del sistema, un selector rápido de expediente activo entre todos los casos cargados, un botón para consultar el PDF de la Política Oficial Institucional, y el botón para dar de alta nuevos casos (`AddCaseModal`).

### 3.2 Vista de Auditoría Principal y Reproductor de Llamadas
* **`CaseHeader.tsx`**: Encabezado dinámico del expediente que muestra la matrícula, el programa educativo, el nivel (Licenciaturas, Ejecutivas, Posgrado), el estado actual del caso (*En Revisión, Aprobado, Requiere Revisión*) y las pestañas internas de navegación (`Llamada / Audio`, `Información y Sandbox`, `Evidencias`, `Análisis Normativo`, `Dictamen`). Incluye un reproductor de audio integrado con controles de reproducción, barra de progreso y temporizador.
* **`CallTranscript.tsx`**: Componente central para la auditoría de llamadas. Muestra la transcripción diarizada con distinción de interlocutores (*Agente, Estudiante/Titular, Sistema*), marcas de tiempo interactivas (al hacer clic en una línea de tiempo, el reproductor salta al segundo exacto), indicadores de sentimiento detectado, palabras clave, y soporte para **gestionar múltiples llamadas** por expediente y **cargar nuevas llamadas** (mediante selector de archivos o simulación de arrastre).
* **`CallPlayer.tsx`**: Reproductor de audio avanzado con barra de ondas simulada, control de velocidad, salto temporal y sincronización automática con la transcripción.

### 3.3 Paneles Laterales de Resumen (Vista de Audio)
* **`CaseAnalysis.tsx`**: Panel lateral derecho en la vista de auditoría que resume en tiempo real el resultado del motor de decisiones: clasificación propuesta, porcentaje de confianza algorítmica, causa raíz, bloqueos duros y acceso al árbol de decisiones completo.
* **`DictamenPanel.tsx`**: Panel lateral para visualizar el dictamen sugerido, editar observaciones y ejecutar la aprobación formal del caso con firma digital simulada del auditor.
* **`EvidencePanel.tsx`**: Panel lateral que lista las evidencias probatorias asociadas al caso (capturas de SIU, Flokzu, grabaciones I6, correos) permitiendo previsualizarlas con un clic.

### 3.4 Vistas Completas de Pestañas Dedicadas
* **`CaseInfoTab.tsx`**: Pestaña detallada con la información completa del estudiante, datos del ticket y un **Sandbox Interactivo de Variables** que permite modificar en tiempo real parámetros (ej. *ingreso a aula, contacto efectivo, errores administrativos, intentos de llamada*) para observar cómo el motor de decisiones recalcula instantáneamente la clasificación.
* **`EvidenceFullView.tsx`**: Repositorio documental completo con filtros por tipo de evidencia (Audio, Captura SIU, Flokzu, Documento Legal), estados de verificación y opción para adjuntar nuevas pruebas.
* **`AnalysisFullView.tsx`**: Vista exhaustiva del motor normativo que detalla todas las reglas evaluadas, cuáles se cumplieron (determinantes o favorables), cuáles fueron rechazadas con sus condiciones faltantes, y el árbol de razonamiento jurídico-operativo.
* **`DictamenFullView.tsx`**: Interfaz formal para redactar, editar, justificar legalmente y certificar el dictamen del caso antes de su cierre definitivo en el sistema.

### 3.5 Modales Especializados
* **`EvidenceViewer.tsx`**: Visor flotante en modal/drawer para inspeccionar a detalle el contenido de una evidencia (previsualización de documentos PDF, capturas de pantalla de sistemas escolares SIU y flujos de aprobación en Flokzu).
* **`DecisionTreeModal.tsx`**: Representación gráfica interactiva del árbol de decisión lógica, mostrando el camino lógico seguido por el motor desde el Nodo 0 hasta la conclusión del dictamen.
* **`AddCaseModal.tsx`**: Formulario estructurado para registrar un nuevo expediente de auditoría ingresando los datos del estudiante, programa, fechas y variables iniciales.

---

## 4. El Motor de Decisiones Normativas (`decision-engine`)

El núcleo del sistema es un motor basado en reglas deterministas y heurísticas de cumplimiento normativo institucional. Funciona en 4 etapas principales:

1. **Normalización (`normalizeToCancellationCase`)**: Convierte cualquier estructura de datos de la interfaz o mock en un objeto canónico normalizado (`CancellationCase`).
2. **Evaluación Jerárquica (`RuleEngine`)**: Ejecuta secuencialmente las reglas ordenadas por prioridad numérica (desde Prioridad 0 hasta Prioridad 8). Si detecta un bloqueo duro de máxima prioridad (ej. Actividad Académica con calificaciones aprobatorias), detiene la evaluación anticipadamente.
3. **Resolución de Conflictos (`conflict-resolver.ts`)**: Si múltiples reglas emiten propuestas de clasificación válidas, el resolvedor de conflictos aplica criterios de precedencia regulatoria (ej. Fraude o Promesa de Venta > Error Operativo > Solicitud Estudiante > Deserción Simple).
4. **Construcción de Razonamiento (`reasoning-builder.ts`)**: Genera el texto explicativo paso a paso, calcula el índice de confianza (0.0 a 1.0), enumera las evidencias faltantes y redacta el dictamen sugerido basado en artículos normativos.

### 4.1 Las 15 Reglas Normativas del Sistema

| ID de Regla | Nombre de la Regla | Prioridad | Propósito y Criterio de Evaluación |
| :--- | :--- | :---: | :--- |
| `RULE_NODO0_ELIGIBILITY` | Validación de Datos Mínimos (Elegibilidad) | 0 | Verifica que el caso cuente con datos esenciales (fechas de inicio/solicitud, motivo). Si falta información crítica, detiene el análisis como `REQUIERE_REVISION`. |
| `RULE_NODO1_ACADEMIC` | Actividad Académica y Calificaciones | 1 | **Bloqueo Duro**: Si el estudiante tiene calificaciones registradas o entregó actividades evaluables, **bloquea la cancelación** y clasifica como improcedente (Baja Definitiva o permanencia). |
| `RULE_NODO2_MYSTERY_SHOPPER` | Auditoría Mystery Shopper / Calidad | 2 | Identifica si el caso proviene de una simulación o auditoría de calidad anónima para control interno. |
| `RULE_NODO3_OPERATIONAL` | Cancelación Operativa (Carga/Finanzas) | 3 | Detecta si la cancelación es imputable a fallas operativas de la institución (error de carga de materias, retraso financiero, falta de canalización adecuada). |
| `RULE_NODO3_DECISION35` | Política Especial / Excepción 35 | 3 | Evalúa criterios especiales aplicables bajo la directriz normativa 35 (casos de reubicación o convenios institucionales). |
| `RULE_NODO3_DECISION53` | Política Especial / Excepción 53 | 3 | Evalúa criterios específicos de la directriz normativa 53 para exenciones y devoluciones especiales. |
| `RULE_NODO4_SALES_PROMISE` | Incumplimiento de Promesa de Venta | 4 | Valida si el asesor comercial realizó promesas falsas o condiciones no cumplidas demostrables mediante evidencia en llamada o chat. |
| `RULE_NODO5_ENROLLMENT_ERROR` | Error de Inscripción | 5 | Detecta si hubo errores en la inscripción inicial (programa incorrecto asignado, paquete equivocado o error de captura). |
| `RULE_NODO5_CYCLE_CHANGE` | Cambio de Ciclo / Revalidación | 5 | Evalúa solicitudes de cambio de ciclo gestionadas antes de iniciar clases o procesos de revalidación académica. |
| `RULE_NODO6_UNREACHABLE` | Estudiante Ilocalizable | 6 | Verifica si se agotaron los intentos mínimos obligatorios de contacto (ej. mínimo 3 intentos en días distintos) sin respuesta del estudiante. |
| `RULE_NODO6_EFFECTIVE_CONTACT` | Contacto Efectivo y Titularidad | 6 | Valida que las llamadas cumplan con los criterios formales de contacto efectivo con el titular (confirmación de identidad, propósito y datos). |
| `RULE_NODO7_DATES` | Temporalidad y Ventanas de Cancelación | 7 | Analiza las fechas clave: si la solicitud se encuentra dentro de la ventana legal de cancelación posterior al inicio del ciclo o previo a este. |
| `RULE_NODO7_STUDENT_REQUEST` | Solicitud Explícita del Estudiante | 7 | Verifica si existe una manifestación clara y voluntaria del estudiante de no continuar con sus estudios. |
| `RULE_NODO7_RETENTION` | Intentos de Retención y Beneficios | 7 | Valida si el área de retención ofreció alternativas, becas o beneficios y si el estudiante los aceptó o rechazó. |
| `RULE_NODO8_DOCUMENTATION` | Suficiencia Documental y Expediente | 8 | Verifica que el expediente cuente con todas las constancias, firmas y documentos probatorios requeridos por auditoría. |

---

## 5. Datos de Prueba (`Mock Data`)

El sistema incluye expedientes precargados realistas para demostración y pruebas inmediatas:
* **`cases.ts`**: Contiene múltiples casos de auditoría con perfiles variados (ej. Caso de Cancelación por Promesa de Venta Comercial, Caso de Cancelación Operativa por Fallas de Carga, Caso de Estudiante Ilocalizable, Caso con Actividad Académica Bloqueante).
* **`calls.ts`**: Grabaciones de audio simuladas con transcripciones diarizadas detalladas, marcas de tiempo en segundos, análisis de sentimiento y criterios de contacto efectivo.
* **`evidences.ts`**: Repositorio de evidencias que incluye el PDF de la Política Oficial Institucional, capturas de pantalla del sistema escolar SIU, flujos de gestión en Flokzu e historiales de llamadas I6.

---

## 6. Verificación, Pruebas y Scripts

El proyecto está configurado para compilación y validación estricta con TypeScript:
* **Script de Desarrollo**: `npm run dev` (ejecuta Vite en el puerto `3000` con enlace a `0.0.0.0`).
* **Script de Compilación**: `npm run build` (compila la aplicación estática optimizada para producción en `dist/`).
* **Script de Verificación de Tipos**: `npm run lint` (`tsc --noEmit` para asegurar cero errores de tipos TypeScript).
* **Pruebas del Motor**: Cuenta con pruebas unitarias en `src/lib/decision-engine/__tests__/` que validan el comportamiento de las reglas del motor de decisiones.
