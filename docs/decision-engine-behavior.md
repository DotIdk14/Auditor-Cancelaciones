# Comportamiento del Motor de Decisiones — Auditor de Cancelaciones

**Documento:** Especificación del Pipeline de Decisión, Reglas Normativas y Resolución de Conflictos  
**Fecha:** Septiembre 2026  
**Rol:** Senior Software Architect & QA Engineer  
**Estado:** Baseline Pre-Refactorización (Fase 0)

---

## 1. Flujo de Ejecución Extremo a Extremo (Pipeline de Decisión)

El motor de decisiones normativo opera como una función pura y síncrona. Su punto de entrada principal es `analyzeCancellationCase`, implementado en `src/lib/decision-engine/decision-engine.ts`.

El flujo se divide en 6 etapas secuenciales:

```
[ Entrada ]
CaseDecisionData (UI)  o  CancellationCase (Canónico)
       │
       ▼
[ Etapa 1: Normalización ] ──> normalizeToCancellationCase()
       │                         - Asigna valores por defecto
       │                         - Estructura contratos anidados
       ▼
[ Etapa 2: Evaluación de Reglas ] ──> RuleEngine.evaluate()
       │                              - Ordena por prioridad ascendente
       │                              - Filtro Nodo 0 (Elegibilidad temprana)
       │                              - Detección de Hard Blocker (Calificaciones)
       ▼
[ Etapa 3: Resolución de Conflictos ] ──> resolveDecisionConflict()
       │                                  - Evalúa colisión de dictámenes
       │                                  - Aplica prevalencia institucional
       ▼
[ Etapa 4: Razonamiento y Confianza ] ──> buildReasoningAndConfidence()
       │                                  - Construcción de fundamentación jurídica
       │                                  - Ponderación matemática de certidumbre
       ▼
[ Etapa 5: Redacción Oficial de Dictamen ] ──> generateDictamenText()
       │                                       - Síntesis pericial certificable
       ▼
[ Salida ]
DecisionResult (Inmutable, certificado y bilingüe)
```

---

## 2. Descripción Detallada de las Etapas

### Etapa 1: Normalización (`normalizeToCancellationCase`)
- Valida si el objeto recibido ya cumple con la estructura `CancellationCase`.
- Si recibe un `CaseDecisionData` (procedente de formularios o mocks), extrae fechas, desglosa números de contacto, agrupa banderas en objetos funcionales (`academic`, `operational`, `retention`, `contacts`).
- Asigna identificadores y asegura que no existan valores `undefined` en campos obligatorios de evaluación.

### Etapa 2: Evaluación Secuencial de Reglas (`RuleEngine.evaluate`)
El `RuleEngine` mantiene una colección de 15 instancias de reglas ordenadas por su campo numérico `priority` (de 0 a 8, donde 0 es la prioridad más alta).

#### Mecanismos de Cortocircuito (Short-Circuits):
1. **Cortocircuito por Inelegibilidad (Prioridad 0 - `RULE_NODO0_ELIGIBILITY`):**
   - Si faltan datos elementales (matrícula vacía, fecha de inicio no especificada o solicitud inexistente), el motor detiene inmediatamente la ejecución de las reglas restantes.
   - Retorna inmediatamente una clasificación de `REQUIERE_REVISION` con confianza baja (`0.35`).
2. **Cortocircuito por Hard Blocker (Prioridad 1 - `RULE_ACADEMIC_GRADES_BLOCKER`):**
   - Basado en el **Art. 5.7.d**: *"Bajo ninguna circunstancia procederá cancelación de venta si el alumno cuenta con calificaciones registradas en plataforma en el primer bimestre"*.
   - Si `academic.hasGradesBimester1 === true`, la regla se activa como **DETERMINANTE**, registra el bloqueo `CANCELACION_VENTA_BLOQUEADA_POR_CALIFICACIONES`, fuerza el dictamen a `BAJA` e interrumpe la evaluación del resto de las reglas para prevenir que una causal secundaria reclasifique el caso.

### Etapa 3: Resolución de Conflictos (`resolveDecisionConflict`)
Cuando el expediente activa dos o más reglas que proponen clasificaciones contradictorias (por ejemplo: la regla de solicitud posterior al inicio sugiere `BAJA`, pero la regla de carga de materias sugiere `CANCELACION_VENTA_OPERATIVA`), interviene el componente `conflict-resolver.ts`.

#### Matriz Jerárquica de Prevalencia:
1. **Calificaciones Registradas > Cualquier Causal:** Si hay calificaciones, el servicio educativo se considera formalmente devengado; ninguna falla operativa o solicitud puede revocar este principio.
2. **Falla Operativa Institucional > Solicitud Extemporánea:** Si el alumno solicita la cancelación después del inicio (lo cual ameritaría ordinariamente una `BAJA`), pero se comprueba una falla atribuible a la universidad (Art. 5.9: retraso en carga de materias, cobros erróneos, o falta de canalización formal por el área operativa a Éxito Estudiantil), **la falla institucional prevalece**, eximiendo al alumno y clasificando como `CANCELACION_VENTA_OPERATIVA`.
3. **Promesa de Venta Engañosa > Solicitud Ordinaria:** Si se comprueba en grabación de calidad una promesa comercial no cumplida (Art. 5.7.c), prevalece sobre el procedimiento ordinario de baja.
4. **Prioridad Numérica Estricta:** En caso de no existir una regla de negocio específica, prevalece la regla con menor número de prioridad (ej. Prioridad 3 prevalece sobre Prioridad 5).

Cada resolución genera un registro explícito en `DecisionResult.conflicts` indicando `ruleA`, `ruleB` y el texto de fundamentación jurídica que explica por qué una regla prevaleció sobre la otra.

### Etapa 4: Razonamiento Jurídico y Algoritmo de Confianza
El módulo `reasoning-builder.ts`:
- Reúne las evidencias requeridas por las reglas activadas.
- Coteja contra las evidencias registradas en el expediente y genera el arreglo `missingEvidence`.
- Calcula el índice de confianza algorítmica:
  - Base inicial: `0.70`
  - Bonificación por reglas determinantes de alta prioridad (+0.10 a +0.20)
  - Bonificación por contacto efectivo (+0.05)
  - Penalización por evidencias faltantes (-0.15 por cada evidencia requerida no adjunta)
  - Penalización por inconsistencias detectadas (-0.10)
  - Ponderación final acotada estrictamente en el intervalo `[0.30, 0.97]`

### Etapa 5: Redacción Oficial del Dictamen
Genera un párrafo formal estructurado con técnica pericial que incluye:
1. Identificador de caso y matrícula.
2. Calificación jurídica institucional.
3. Fundamento en artículos del Procedimiento Deserción.
4. Causa raíz determinada.
5. Efectos administrativos (reembolso aplicable y afectación a KPIs comerciales).

---

## 3. Catálogo Oficial de Reglas Normativas

| ID de Regla | Prioridad | Nombre de la Regla | Fundamento Normativo | Criterio de Activación | Clasificación Resultante |
|---|---|---|---|---|---|
| `RULE_NODO0_ELIGIBILITY` | 0 | Verificación de Expediente y Requisitos Mínimos | Art. 5.1 / 5.2 | Expediente sin matrícula, fechas base o motivo | `REQUIERE_REVISION` |
| `RULE_ACADEMIC_GRADES_BLOCKER` | 1 | Restricción Fuerte por Calificaciones y Devengamiento | Art. 5.7.d | Alumno con calificaciones en Bimestre 1 | `BAJA` (Hard Blocker) |
| `RULE_PRIO2_MYSTERY_SHOPPER` | 2 | Canal Especial Mystery Shopper | Art. 5.10 | Canal de venta identificado como Mystery Shopper | `CANCELACION_DE_MATRICULA` |
| `RULE_PRIO2_CYCLE_CHANGE` | 2 | Invasión de Ciclo sin Grado Previo | Art. 5.7.c | Alumno inscrito en ciclo posterior sin antecedente | `CANCELACION_VENTA` |
| `RULE_NODO12_MATERIAL_LOAD_DELAY` | 3 | Cancelación Operativa por Carga Tardía de Materias | Art. 5.9.a / 5.3.c | Materias sin cargar en fecha de inicio comprobadas | `CANCELACION_VENTA_OPERATIVA` |
| `RULE_PRIO4_SALES_PROMISE` | 4 | Promesa de Venta No Cumplida | Art. 5.7.b | Promesa engañosa comprobada en grabación de cierre | `CANCELACION_VENTA_PROMESA_NO_CUMPLIDA` |
| `RULE_NODO9_ENROLLMENT_ERROR` | 5 | Error de Inscripción y Ajustes Administrativos | Art. 5.3.c | Ajuste solicitado en ≤20 días no realizado | `CANCELACION_VENTA` |
| `RULE_NODO6_EFFECTIVE_CONTACT` | 6 | Criterios de Contacto Efectivo | Art. 5.4 | Grabación con identidad, motivo y escucha activa | Contribuye a certidumbre |
| `RULE_NODO7_UNREACHABLE` | 6 | Estudiante Ilocalizable | Art. 5.2.b / 5.8 | ≥15 llamadas en horarios alternos + ≥6 escritos | `CANCELACION_VENTA_ILOCALIZABLE` |
| `RULE_NODO1_DATES` | 7 | Fechas y Ventana de Deserción | Art. 5.3 | Evaluación de los 10 días hábiles de inicio | Criterio temporal |
| `RULE_NODO5_STUDENT_REQUEST` | 7 | Solicitud Expresa del Estudiante | Art. 5.3 / 5.7 | Voluntad de cancelación antes vs. después de inicio | `CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE` o `BAJA` |
| `RULE_NODO16_RETENTION` | 7 | Procedimiento de Retención Institucional | Art. 5.5 | Registro de contraoferta por Éxito Estudiantil | Contribuye a validez de trámite |
| `RULE_DECISION_35_COMPLEMENT` | 7 | Dictamen Especial 3.5 | Art. 3.5 | Casos especiales de transferencia de plantel | Clasificación complementaria |
| `RULE_DECISION_53_COMPLEMENT` | 7 | Dictamen Especial 5.3 | Art. 5.3 | Cancelación en periodo de gracia | Clasificación complementaria |
| `RULE_NODO14_DOCUMENTATION` | 8 | Validación Documental de Identidad | Art. 5.6 | Cotejo de identificación oficial y firma | `REQUIERE_REVISION` si apócrifo |

---

## 4. Estado de Casos Dorados (Golden Cases Baseline)

La suite de regresión automática (`src/lib/decision-engine/__tests__/golden-cases.ts`) certifica que los 4 expedientes mock del sistema ejecutan sin desviaciones:

```
┌────────────┬───────────────────────────────────┬────────────────────────────────────────┬────────────┬───────────┐
│ Caso ID    │ Clasificación Esperada y Obtenida │ Causa Raíz                             │ Confianza  │ Conflictos│
├────────────┼───────────────────────────────────┼────────────────────────────────────────┼────────────┼───────────┤
│ CAVE-30274 │ CANCELACION_VENTA_OPERATIVA       │ CARGA_TARDIA_MATERIAS                  │ 88%        │ 3         │
│ CAVE-30288 │ BAJA                              │ DEVENGAMIENTO_SERVICIO_CALIFICACIONES  │ 96%        │ 0         │
│ CAVE-29941 │ CANCELACION_VENTA_ILOCALIZABLE    │ AGOTAMIENTO_PROTOCOLO_ILOCALIZABLE     │ 43%        │ 0         │
│ CAVE-30299 │ CANCELACION_VENTA_OPERATIVA       │ CARGA_TARDIA_MATERIAS                  │ 88%        │ 3         │
└────────────┴───────────────────────────────────┴────────────────────────────────────────┴────────────┴───────────┘
```
*Total de pruebas del motor: 16 de 16 exitosas (100% de cumplimiento).*
