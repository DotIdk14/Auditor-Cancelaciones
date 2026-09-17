# Contratos de Dominio y Tipos — Auditor de Cancelaciones

**Documento:** Especificación Formal de Contratos, Entidades y Mapeos de Dominio  
**Fecha:** Septiembre 2026  
**Rol:** Senior Software Architect & QA Engineer  
**Estado:** Baseline Pre-Refactorización (Fase 0)

---

## 1. Visión General de Dominio

El dominio del sistema se articula alrededor del concepto de un **Expediente de Auditoría de Cancelación / Deserción** (`AuditCase`), el cual consolida la interacción entre el estudiante, las áreas operativas de la universidad (Admisiones, Servicios Escolares, Finanzas, Éxito Estudiantil) y los sistemas institucionales (SIU, Aula Virtual, Flokzu, InConcert).

Existen dos modelos de datos paralelos en el repositorio:
1. **Modelo Canónico del Motor (`CancellationCase`):** Estructura jerárquica, fuertemente tipada y orientada a evaluación normativa.
2. **Modelo Aplanado de UI / Mock (`CaseDecisionData`):** Estructura plana de banderas booleanas y contadores numéricos consumida por los formularios de React y las tarjetas de la interfaz.

---

## 2. Contratos del Motor de Decisiones (`src/lib/decision-engine/types.ts`)

### 2.1 Modelo Canónico: `CancellationCase`
Entidad rectora consumida por el motor (`RuleEngine.evaluate`):

```typescript
export interface CancellationCase {
  id: string;                                   // Identificador único (ej. "CAVE-30274")
  student: CaseStudent;                         // Identidad, matrícula y nivel del estudiante
  dates: CaseDates;                             // Cronología del ciclo y fechas de solicitud
  request: CaseRequest;                         // Voluntad expresa de cancelación y canal
  academic: CaseAcademic;                       // Calificaciones, ingreso a plataforma y materias
  contacts: CaseContacts;                       // Intentos de contacto, horarios y efectividad
  operational: CaseOperational;                 // Errores de carga de materias, finanzas o escolares
  retention: CaseRetention;                     // Gestiones del área de Éxito Estudiantil
  salesPromise?: CaseSalesPromise;              // Promesas de venta verbales o escritas no cumplidas
  cycleChange?: CaseCycleChange;                // Solicitudes de invasión o cambio de ciclo
  evidences?: Evidence[];                       // Lista de evidencias probatorias adjuntas
}
```

#### Sub-contratos de `CancellationCase`:

| Sub-contrato | Campos Clave | Tipo | Semántica Normativa |
|---|---|---|---|
| `CaseStudent` | `id`, `name`, `level`, `program`, `channel` | `string`, `EducationLevel` | Nivel educativo (determina si aplica criterio de selección de modalidad o ingreso a aula). |
| `CaseDates` | `classStartDate`, `requestDate`, `calendarDaysFromStart`, `workingDaysFromStart` | `string` (ISO), `number` | Crucial para determinar si la solicitud ocurrió dentro o fuera de la ventana de 10 días hábiles. |
| `CaseRequest` | `isManifest`, `reason`, `requestedAt`, `channel` | `boolean`, `string` | Acreditación formal de la voluntad de no continuar en la institución. |
| `CaseAcademic` | `hasGradesBimester1`, `hasEnteredClassroom`, `hasSelectedEvaluationMode`, `coursesAssigned` | `boolean` | `hasGradesBimester1 === true` constituye un **Hard Blocker** inmediato (fuerza Baja Definitiva). |
| `CaseContacts` | `totalCalls`, `callsValidSchedule`, `writtenInteractions`, `effectiveContactAchieved` | `number`, `boolean` | Define cumplimiento del protocolo de ilocalizable (mínimo 15 llamadas alternas + 6 escritos). |
| `CaseOperational` | `courseLoadFailure`, `administrativeError`, `financialError`, `channeledToStudentSuccess` | `boolean`, `string` | Fallas imputables a la universidad que eximen al alumno y transforman el caso en Cancelación Operativa. |
| `CaseRetention` | `retentionAttempted`, `retentionAccepted`, `reasonsExpressed` | `boolean`, `string[]` | Validación de que Éxito Estudiantil agotó la labor de retención antes del dictamen. |
| `CaseSalesPromise`| `alleged`, `provenInQualityRecording`, `evidenceRef` | `boolean`, `string` | Acreditación de ofertas o condiciones de venta falsas/incumplidas verificadas en grabación. |

---

### 2.2 Modelo Plano de Compatibilidad: `CaseDecisionData`
Estructura plana que utilizan los componentes de UI (`AddCaseModal.tsx`, `CaseInfoTab.tsx`, `src/mock/cases.ts`):

```typescript
export interface CaseDecisionData {
  fechaInicio: string;                          // YYYY-MM-DD o DD/MM/YYYY
  fechaSolicitud: string;                       // YYYY-MM-DD o DD/MM/YYYY
  diasHabilesDesdeInicio: number;               // Días hábiles transcurridos
  semanasDesdeInicio?: number;                  // Semanas transcurridas
  nivelEducativo: string;                       // 'LICENCIATURA' | 'POSGRADO' | etc.
  programa?: string;                            // Nombre del programa académico
  estatusAlumno?: string;                       // Estado actual en SIU
  canalVenta?: string;                          // Canal de captación (ej. Mystery Shopper)
  contactoEfectivo: boolean;                    // Hubo comunicación bidireccional con el alumno
  llamadas: number;                             // Conteo total de llamadas realizadas
  llamadasValidasPorHorario?: boolean;          // Al menos 2 diarias en horarios distintos
  interaccionesEscritas: number;                // Conteo de WhatsApp/correos enviados
  ingresoAula: boolean;                         // Registro de sesión en plataforma virtual
  ingresoAulaValidoPosgrado?: boolean;          // Ingreso válido sin reclamo operativo
  seleccionModalidad?: boolean;                 // Modalidad de evaluación elegida (Licenciatura)
  calificaciones: boolean;                      // Calificaciones asentadas en Bimestre 1
  materiasCargadas: boolean;                    // Materias visibles en SIU en fecha de inicio
  fallaCargaMaterias?: boolean;                 // Incidencia comprobada en asignación docente/materia
  erroresAdministrativos?: boolean;             // Inconsistencias en Servicios Escolares
  erroresFinancieros?: boolean;                 // Cobros indebidos o becas no reflejadas
  errorInscripcion?: boolean;                   // Inscripción errónea en plan no solicitado
  promesaVenta?: boolean;                       // Promesa comercial no cumplida
  promesaVentaEvidencia?: string;               // Referencia a transcripción o grabación
  solicitudAjuste?: boolean;                    // El alumno pidió corrección administrativa
  ajusteDentroDe20Dias?: boolean;               // Ajuste solicitado en plazo reglamentario
  ajusteRealizado?: boolean;                    // La universidad ejecutó la corrección
  contactoConExitoEstudiantil?: boolean;        // Hubo gestión con Éxito Estudiantil
  areaOperativaCanalizoAExito?: boolean;        // El área receptora transfirió el caso (Art. 5.9.c)
  retencionRealizada?: boolean;                 // Intento formal de retención efectuado
  retencionAceptada?: boolean;                  // El estudiante aceptó la contraoferta
  motivoSolicitud?: string;                     // Razón manifestada por el alumno
  intencionCancelacionManifiesta?: boolean;     // Declaración formal de cancelación
  invasionCiclo?: boolean;                      // Ingreso a ciclo sin documentación previa
}
```

---

## 3. Mapeo de Normalización (`normalizeToCancellationCase`)

La función `normalizeToCancellationCase` en `decision-engine.ts` actúa como un **Anti-Corruption Layer (ACL)** que convierte `CaseDecisionData` al modelo formal `CancellationCase`:

```
CaseDecisionData (UI / Mock)                  CancellationCase (Motor Canónico)
─────────────────────────────────────────────────────────────────────────────────
fechaInicio, fechaSolicitud, diasHabiles  ───> dates: CaseDates
nivelEducativo, programa, canalVenta      ───> student: CaseStudent
contactoEfectivo, llamadas, escritos      ───> contacts: CaseContacts
calificaciones, ingresoAula, modalidad    ───> academic: CaseAcademic
fallaCargaMaterias, erroresAdmin/Fin      ───> operational: CaseOperational
retencionRealizada, retencionAceptada     ───> retention: CaseRetention
promesaVenta, promesaVentaEvidencia       ───> salesPromise: CaseSalesPromise
invasionCiclo                             ───> cycleChange: CaseCycleChange
intencionCancelacionManifiesta, motivo    ───> request: CaseRequest
```

---

## 4. Contratos de Clasificación y Resultados

### 4.1 Clasificaciones Normativas Canónicas (`CancellationClassification`)
El motor evalúa hacia uno de los siguientes 8 dictámenes institucionales:

1. **`CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE`:** Solicitud formulada antes del inicio de clases o dentro de la ventana de cancelación sin incidencias operativas.
2. **`CANCELACION_VENTA_OPERATIVA`:** Cancelación provocada por falla institucional imputable a la universidad (carga tardía de materias, error en SIU, omisión de canalización a Éxito Estudiantil).
3. **`CANCELACION_VENTA_ILOCALIZABLE`:** Agotamiento del protocolo normativo de localización (15 llamadas válidas + 6 escritos sin contacto ni actividad académica).
4. **`CANCELACION_VENTA_PROMESA_NO_CUMPLIDA`:** Oferta comercial o académica falsa o divergente demostrada en grabación de venta.
5. **`CANCELACION_VENTA`:** Causal genérica de cancelación por error de inscripción no ajustado en plazo reglamentario.
6. **`CANCELACION_DE_MATRICULA`:** Casos especiales administrativos sin impacto en KPIs de venta (ej. Canal Mystery Shopper de Servicios Escolares).
7. **`BAJA`:** Baja definitiva cuando la solicitud es posterior al inicio de clases sin falla operativa, o cuando existen calificaciones asentadas en plataforma.
8. **`REQUIERE_REVISION`:** Expedientes incompletos, inconsistentes o donde no se acreditaron los requisitos mínimos probatorios.

### 4.2 Contrato de Salida: `DecisionResult`
```typescript
export interface DecisionResult {
  id: string;                                   // UUID de la evaluación
  timestamp: string;                            // Marca de tiempo ISO
  caseId: string;                               // Identificador del caso evaluado
  classification: CancellationClassification;   // Dictamen canónico (en español estructurado)
  tipo?: CancellationType;                      // Alias para retrocompatibilidad
  classificationName: string;                   // Nombre descriptivo para visualización
  politicaArticulo: string;                     // Fundamento legal (ej. "Art. 5.9 / Art. 5.3.c")
  rootCause: string;                            // Clave identificadora de causa raíz
  causaRaiz?: string;                           // Alias para retrocompatibilidad
  confidence: number;                           // Coeficiente de certidumbre [0.0 - 1.0]
  nivelCerteza?: string;                        // "ALTA" | "MEDIA" | "BAJA"
  appliedRules: AppliedRule[];                  // Reglas aplicadas al caso
  reglasAplicadas?: AppliedRule[];              // Alias retrocompatible
  rejectedRules: RejectedRule[];                // Reglas descartadas con motivo de rechazo
  reglasDescartadas?: RejectedRule[];           // Alias retrocompatible
  conflicts: RuleConflict[];                    // Conflictos detectados y resueltos
  conflictos?: RuleConflict[];                  // Alias retrocompatible
  hardBlockers: string[];                       // Bloqueos duros detectados
  missingEvidence: string[];                    // Evidencias mandatorias faltantes
  inconsistencies: string[];                    // Inconsistencias documentales o lógicas
  reasoning: string[];                          // Argumentación jurídica detallada paso a paso
  dictamenSugerido?: string;                    // Párrafo de redacción oficial sugerido
  refundPercentage?: number;                    // Porcentaje aplicable de reembolso (0%, 80%, 100%)
  impactsSalesKPI?: boolean;                    // Si penaliza la meta comercial de la fuerza de ventas
}
```

### 4.3 Estructura de Regla de Decisión (`DecisionRule`)
Toda regla implementada en `src/lib/decision-engine/rules/` respeta el contrato formal:

```typescript
export interface DecisionRule {
  id: string;                                   // Identificador único (ej. "RULE_NODO12_MATERIAL_LOAD_DELAY")
  name: string;                                 // Nombre formal de la regla
  priority: number;                             // Jerarquía de evaluación (1 = Máxima prioridad)
  evaluate(cancellationCase: CancellationCase): RuleEvaluationResult;
}

export interface RuleEvaluationResult {
  triggered: boolean;                           // Si la regla se cumple en el caso
  appliedRule?: AppliedRule;                    // Metadatos de fundamentación jurídica
  rejectedRule?: RejectedRule;                  // Motivo por el cual no se cumplió
  blocksCancellation?: boolean;                 // Si actúa como Hard Blocker
  blockerReason?: string;                       // Detalle del bloqueo duro
  suggestedClassification?: CancellationClassification; // Veredicto que promueve la regla
  suggestedRootCause?: string;                  // Causa raíz sugerida
  confidenceImpact?: number;                    // Aporte positivo al score de certidumbre
  missingEvidence?: string[];                   // Evidencias que exige esta regla
}
```

---

## 5. Contratos de la Capa de Presentación (`src/types/audit.ts`)

| Interfaz | Propósito en la UI |
|---|---|
| `AuditCase` | Contenedor principal de un expediente: datos del estudiante, llamada principal, evidencias, historial y dictamen. |
| `CallRecord` | Ficha técnica de la llamada telefónica: duración, campaña, audioUrl, sentimiento y diarización de turnos. |
| `TranscriptSegment` | Turno de habla transcrito (`speaker: 'advisor' \| 'customer'`), con marcas de tiempo en segundos, texto y etiquetas. |
| `EffectiveContactResult` | Evaluación detallada de los 4 criterios de contacto efectivo (identidad, intención, escucha activa, retención). |
| `EvidenceItem` | Metadatos de documento o captura adjunta (`source: 'SIU' \| 'Flokzu' \| 'Aula Virtual'`, `previewType`, `fileUrl`). |
| `TimelineEvent` | Hito en la cronología interactiva del expediente (fecha, hora, sistema de procedencia y severidad). |
| `DictamenData` | Estado del dictamen oficial (`BORRADOR`, `PENDIENTE_REVISION`, `APROBADO`), firma y notas del auditor. |

---

## 6. Brechas e Incompatibilidades Identificadas (Gaps & Debt)

1. **Acoplamiento Bidireccional:**
   - `AuditCase.decisionData` utiliza `import('../lib/decision-engine/types').CaseDecisionData`.
   - `CancellationCase.student.level` y `contacts.primaryCall` consumen tipos de `src/types/audit.ts`.
   - *Solución requerida en refactor:* Extraer los tipos canónicos a un subpaquete de contratos neutro (`src/core/contracts/` o `src/domain/`).

2. **Doble Mantenimiento de Nombres de Propiedades:**
   - Componentes antiguos leen `reglasAplicadas` y componentes nuevos leen `appliedRules`.
   - Se debe consolidar una única propiedad principal con getters o un adapter unificado.

3. **Inmutabilidad en el Motor:**
   - El motor no modifica el objeto `CancellationCase` de entrada (lo trata como inmutable), lo cual es una fortaleza arquitectónica que debe preservarse estrictamente en la refactorización.
