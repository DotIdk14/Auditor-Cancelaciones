# PLAN DE TESTING — MEJORA CONTINUA

## 1. Principio rector

La validación debe dividirse en dos líneas distintas:
- CI determinístico y bloqueante
- evaluación IA real y no bloqueante para el CI principal

La regla es que la disponibilidad o variación del proveedor LLM no debe volver aleatorio el CI principal.

---

## 2. CI determinístico bloqueante

Incluye:
- golden cases
- fixtures y mocks
- schemas
- contracts
- pruebas de reglas determinísticas
- consistencia con resultados IA pregrabados

### Cobertura mínima por fase

#### F0 — estabilidad
- `npm run lint`
- `npm run test:jobs`
- baseline golden
- smoke de bootstrap

#### F1 — identidad y gobierno
- RBAC tests
- policy approval tests
- migration compatibility tests

#### F2 — rulesets y reglas
- ruleset load tests
- hash integrity tests
- rules and policy version selection tests
- `consistency_events` generation

#### F3 — hechos y evidencia
- fact-to-evidence linking
- state separation tests
- traceability tests

#### F4 — calendario y SLA
- business-day logic
- SLA elapsed/remaining/breach
- window alignment

#### F5 — KPI y reportes
- KPI metadata validation
- aggregation by period
- report service smoke

#### F6 — acciones correctivas
- lifecycle tests
- owner and evidence of resolution
- remeasurement tracking

#### F7 — cockpit
- case workspace tests
- process dashboard smoke

#### F8 — integraciones y saneamiento
- contract tests
- legacy guard tests

#### F9 — deprecación
- rollback no destructivo
- feature flag tests

---

## 3. Evaluación IA real

La evaluación IA real debe ejecutarse periódicamente y apartada del CI principal.

Incluye:
- drift
- costo y tokens
- contradicciones runtime
- métricas de performance por modelo
- revisión de resultados reales

La IA no sustituye la lógica determinística ni bloquea el PR por variabilidad del proveedor.

---

## 4. Casos obligatorios

### Unit
- `evaluateEffectiveContact` basada en criterios mínimos
- prioridad de regla
- cálculo de días hábiles
- cálculo de SLA
- selección de policy version

### Golden
- caso con evidencia insuficiente
- caso fuera de ventana
- contacto efectivo
- no contacto efectivo
- actividad académica / retención
- prioridad de regla
- regla de evidencia faltante
- caso `PROCEDE` / `NO_PROCEDE`

### Integration
- `decision_runs` con `policy_version_id` y `ruleset_hash`
- `evidences` y `extracted_facts` vinculados
- API policy + rule versioned
- jobs de aggregations y workflow

### Security
- permisos por rol
- RLS en tablas sensibles
- aprobación de policy y rules sin bypass

### Regression
- no romper dictamen histórico bajo misma policy version
- no romper workers y queue
- legacy bajo feature flag

---

## 5. Reglas de aceptación

Se exige para cada PR:
- golden tests verdes
- tests de integración relevantes
- verificación de `ruleset_hash`
- registro de contradictorias en `consistency_events`
- validación de RLS o acceso por rol
- no migración destructiva de identidad

---

## 6. Criterio de salida del testing

La fase solo se considera segura si:
- el CI determinístico está en verde
- la política y rulesets son reproducibles
- no se altera la semántica histórica de un dictamen ya ejecutado
- IA y motor determinístico pueden compararse sin conflicto de autoridad
- subida de evidencia para drift y contradicciones queda documentada

---

## 7. Conclusión

La estrategia de testing separa la seguridad del software de la evaluación real del modelo. El software debe ser bloqueado por determinismo, reglas y contratos; la IA queda como evaluación operativa y de mejora, no como fuente de verdad del dictamen final.
