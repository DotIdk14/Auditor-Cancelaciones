# BACKLOG DE IMPLEMENTACIÓN — MEJORA CONTINUA

## Convención
- Identificador: `MC-Fn-xxx` con `n = 0..9`
- Prioridad: `P0`, `P1`, `P2`
- Cada tarea debe poder asignarse a un agente individual.

## F0 — Estabilización técnica

### MC-F0-001 — Configurar entorno sin hardcode
- Objetivo: eliminar `HEAVY_API_BASE` hardcodeado y dejar configuración por entorno.
- Prioridad: P0
- Dependencias: ninguna
- Archivos: `src/lib/api/config.ts`, `.env.example`, `server.ts`, `package.json`
- DB: no
- Backend: config de runtime
- Frontend: consumo seguro de env
- Tests: smoke de bootstrap
- Criterio de salida: no hay URL real fija en el código
- Definition of Done: variable de entorno configurada y documentada

### MC-F0-002 — Completar variables por capa
- Objetivo: documentar variables para frontend, backend, worker, DB, IA y storage.
- Prioridad: P0
- Dependencias: MC-F0-001
- Archivos: `.env.example`, `src/server/*`, `src/lib/api/config.ts`
- Tests: `npm run lint` + bootstrap smoke
- Criterio de salida: entorno legible y reproducible
- DoD: no secretos en repo

### MC-F0-003 — Verificar baseline golden y jobs
- Objetivo: conservar la red de seguridad antes del cambio de dominio.
- Prioridad: P0
- Dependencias: MC-F0-002
- Archivos: `src/lib/decision-engine/__tests__/*`, `tests/jobs/*`
- Tests: `test:golden`, `test:jobs`
- Criterio: base actual en verde
- DoD: baseline de referencia registrado

### MC-F0-004 — Revisión real del DDL y RLS
- Objetivo: confirmar qué es canónico y qué es legacy.
- Prioridad: P1
- Dependencias: MC-F0-003
- Archivos: `migrations/*`, `src/lib/insforge/*`
- DB: revisión de schemas y policies
- Tests: smoke de DDL
- Criterio: ninguna migración no documentada se usa en producción
- DoD: DDL canónico y RLS definidos para tablas sensibles

## F1 — Identidad y gobierno

### MC-F1-001 — Diseño RBAC base
- Objetivo: definir roles mínimos y permisos obligatorios.
- Prioridad: P0
- Dependencias: MC-F0-004
- Archivos: `migrations/*`, `src/server/*`, `src/lib/insforge/*`
- DB: `roles`, `user_roles`, `permissions`
- Backend: middleware de autorización
- Frontend: guards
- Tests: RBAC
- Criterio: auditor, revisor, policy-admin y admin quedan modelados
- DoD: no puede editar policy ni aprobar sin permiso

### MC-F1-002 — Migración aditiva de identidad
- Objetivo: no destruir trazabilidad histórica de `created_by` ni `approved_by`.
- Prioridad: P0
- Dependencias: MC-F1-001
- Archivos: `migrations/*`, `src/lib/insforge/repository.ts`
- DB: `actor_user_id` nullable, mapping table si aplica
- Tests: migration compatibility
- Criterio: historial conservado aunque no se pueda mapear a usuario real
- DoD: no `TEXT -> UUID` destructivo

### MC-F1-003 — Crear `policy`, `policy_version`, `policy_numeral`
- Objetivo: normalizar política como dato y versionarla.
- Prioridad: P0
- Dependencias: MC-F1-002
- Archivos: `migrations/*`, backend API de política
- DB: `policy`, `policy_version`, `policy_numeral`
- Tests: lifecycle de versión y aprobación
- Criterio: cada versión tiene hash, vigencia, creador y aprobador
- DoD: un caso solo puede apuntar a una versión válida

### MC-F1-004 — Crear `policy_audit_log`
- Objetivo: auditar cambios de política y reglas.
- Prioridad: P0
- Dependencias: MC-F1-003
- Archivos: `migrations/*`, backend policy audit
- DB: `policy_audit_log`
- Tests: log de cambios y aprobaciones
- Criterio: cada cambio tiene actor y snapshot antes/después
- DoD: historial completo de cambios de policy/rule

## F2 — Política, reglas y rulesets versionados

### MC-F2-001 — Crear `rules` con versionado inmutable
- Objetivo: definir la norma ejecutable con versionado y no updates in-place.
- Prioridad: P0
- Dependencias: MC-F1-003
- Archivos: `migrations/*`, `src/lib/decision-engine/*`
- DB: `rules` con `rule_key` + `version` + `UNIQUE(rule_key, version)`
- Tests: golden + versioned rule lifecycle
- Criterio: toda modificación normativa crea una nueva fila de versión
- DoD: `rules` es la base canónica y nunca se actualiza in-place cuando está `APPROVED/ACTIVE`

### MC-F2-002 — Crear `rule_conditions`
- Objetivo: separar condiciones de la definición de la regla.
- Prioridad: P0
- Dependencias: MC-F2-001
- Archivos: `migrations/*`, `src/lib/decision-engine/rules/*`
- DB: `rule_conditions`
- Tests: condition integrity + rule evaluation
- Criterio: condiciones no se mezclan con metadata de ruleset ni con JSONB de ejecución
- DoD: la regla y sus condiciones tienen un owner claro y una sola fuente de verdad

### MC-F2-003 — Crear `evidence_requirements`
- Objetivo: mantener la evidencia requerida como tabla canónica.
- Prioridad: P0
- Dependencias: MC-F2-002
- Archivos: `migrations/*`, domain services
- DB: `evidence_requirements`
- Tests: required evidence validation
- Criterio: no hay evidencia requerida duplicada como JSONB canónico en `ruleset_members`
- DoD: una regla tiene una sola definición de evidencia requerida

### MC-F2-004 — Crear `ruleset_versions`
- Objetivo: versionar la composición del conjunto de reglas por policy version.
- Prioridad: P0
- Dependencias: MC-F2-003
- Archivos: `migrations/*`, `src/lib/decision-engine/*`
- DB: `ruleset_versions`
- Tests: create/load ruleset
- Criterio: el ruleset puede reconstruirse y hashearse determinísticamente
- DoD: ruleset versionado e inmutable

### MC-F2-005 — Crear `ruleset_members` con overrides explícitos
- Objetivo: aplicar cambios del ruleset sin convertir `ruleset_members` en fuente canónica para parámetros y evidencia.
- Prioridad: P0
- Dependencias: MC-F2-004
- Archivos: `migrations/*`, decision-engine adapters
- DB: `ruleset_members` con `overrides_parameters`, `overrides_thresholds`, `overrides_evidence_requirements`
- Tests: precedence and overrides
- Criterio: precedencia definida explícitamente = base rule config → ruleset overrides → snapshot/hash ejecutado
- DoD: no precedencia implícita ni JSONB canónico duplicado

### MC-F2-006 — Extender `decision_runs` y `rule_evaluations`
- Objetivo: registrar policy version, ruleset version, hash y evidencia clave del run.
- Prioridad: P0
- Dependencias: MC-F2-005
- Archivos: `migrations/*`, `src/lib/insforge/repository.ts`
- DB: `decision_runs.policy_version_id`, `ruleset_version_id`, `ruleset_hash`, `rule_evaluations.rule_id`
- Tests: reproducibilidad, immutability
- Criterio: histórica no se altera
- DoD: cada decisión puede reconstruirse

### MC-F2-007 — Adapter `DB config -> RuleRegistry` con fallback seguro
- Objetivo: cargar reglas persistidas con compatibilidad hacia el engine TS actual.
- Prioridad: P0
- Dependencias: MC-F2-006
- Archivos: `src/lib/decision-engine/rule-engine.ts`, `src/lib/decision-engine/decision-engine.ts`
- Tests: fallback and registry selection
- Criterio: prioridad y reglas se conservan
- DoD: compatibility preserved

### MC-F2-008 — Contradicciones IA vs determinístico
- Objetivo: separar `policy_audit_log` de `consistency_events`.
- Prioridad: P1
- Dependencias: MC-F2-007
- Archivos: `src/lib/audit/*`, `migrations/*`
- DB: `consistency_events`
- Tests: contradiction logging
- Criterio: la IA no reemplaza la regla determinística
- DoD: conflicto se registra en eventos específicos

## F3 — Hechos, evidencia y trazabilidad

### MC-F3-001 — Reutilizar `tickets` y `evidences` como raíz del caso
- Objetivo: no duplicar fuentes de verdad ni crear `case`/`evidence` redundantes.
- Prioridad: P0
- Dependencias: MC-F2-003
- Archivos: `migrations/*`, `src/lib/insforge/*`
- DB: extender `tickets` y `evidences` con campos de caso y trazabilidad
- Tests: relation integrity
- Criterio: `tickets` permanece la raíz del caso
- DoD: no hay tabla duplicada de caso

### MC-F3-002 — Extender `extracted_facts` y `fact_evidence_links`
- Objetivo: conectar hechos, evidencia y numerales.
- Prioridad: P0
- Dependencias: MC-F3-001
- Archivos: `migrations/*`, `src/lib/extraction/*`
- DB: `fact_evidence_links`, extra fields in `extracted_facts`
- Tests: fact-to-evidence linking
- Criterio: cada conclusión llega a evidencia y numeral
- DoD: trazabilidad visible

### MC-F3-003 — Separar lifecycle vs outcome vs operational status
- Objetivo: evitar enums mezclados.
- Prioridad: P0
- Dependencias: MC-F3-001
- Archivos: `migrations/*`, backend types
- Tests: state mapping
- Criterio: no se mezclan `PROCEDE` con `CLOSED`
- DoD: estados separados y documentados

### MC-F3-004 — UI de trazabilidad del caso
- Objetivo: mostrar evidencia y regla desde la conclusión.
- Prioridad: P1
- Dependencias: MC-F3-002
- Archivos: `src/App.tsx`, `src/components/audit/*`
- Tests: UI navigation
- Criterio: cada conclusión tiene trail a evidencia
- DoD: auditor no reconstruye mentalmente el caso

## F4 — Calendario, ventanas y SLA

### MC-F4-001 — `business_calendar` y servicio de días hábiles
- Objetivo: centralizar lógica de fechas no laborables.
- Prioridad: P1
- Dependencias: MC-F3-003
- Archivos: `migrations/*`, domain service
- DB: `business_calendar`
- Tests: business-day logic
- Criterio: `scope NOT NULL DEFAULT 'GLOBAL'` u opción equivalente
- DoD: calendario centralizado y reutilizable

### MC-F4-002 — `slas` y cálculo de deadline
- Objetivo: plazos configurables por etapa y calendar.
- Prioridad: P1
- Dependencias: MC-F4-001
- Archivos: `migrations/*`, backend service
- DB: `slas`
- Tests: elapsed, remaining, breach
- Criterio: owner, stage, calendar, vigencia y thresholds
- DoD: cada caso calcula SLA sin React

### MC-F4-003 — Vínculo de ventanas a policy y numeral
- Objetivo: que cada regla y numeral haga referencia a la ventana propia.
- Prioridad: P1
- Dependencias: MC-F4-002
- Archivos: `migrations/*`, policy service
- Tests: window computation
- Criterio: ventana no queda dispersa en componentes
- DoD: cada regla tiene su ventana y calendar

## F5 — KPI y reportes

### MC-F5-001 — Catalogar KPI y population model
- Objetivo: definir indicadores sin SQL ejecutable en BD.
- Prioridad: P1
- Dependencias: MC-F4-003
- Archivos: `migrations/*`, domain KPI service
- DB: `kpis`
- Tests: metadata validation
- Criterio: `calculation_key` + filters + parameters + version
- DoD: KPI configurables sin SQL arbitrario

### MC-F5-002 — Agregación por periodo y función
- Objetivo: generar regresión x función y performance.
- Prioridad: P1
- Dependencias: MC-F5-001
- Archivos: worker jobs, backend service, reports
- Tests: aggregation job
- Criterio: métricas reales por período y función
- DoD: reportes servidos por backend

### MC-F5-003 — Rehabilitar `ReportsView` y paneles KPI
- Objetivo: poner la mejora continua en UI operativa.
- Prioridad: P2
- Dependencias: MC-F5-002
- Archivos: `src/components/global/ReportsView.tsx`, dashboard views
- Tests: dashboard smoke
- Criterio: un proceso puede ser visto sin mezclarlo con caso individual
- DoD: reportes de mejora continua visibles y accionables

## F6 — Acciones correctivas

### MC-F6-001 — Crear `corrective_actions`
- Objetivo: cerrar el ciclo de mejora continua.
- Prioridad: P1
- Dependencias: MC-F5-002
- Archivos: `migrations/*`, backend service
- DB: `corrective_actions`
- Tests: lifecycle and owner tracking
- Criterio: cada hallazgo tiene owner, deadline y evidencia de cierre
- DoD: no mezclan caso y proceso

### MC-F6-002 — Conectar a KPI y re-medición
- Objetivo: cerrar la cadena causal de mejora continua.
- Prioridad: P1
- Dependencias: MC-F6-001
- Archivos: KPI service, action workflow
- Tests: remeasurement and follow-up
- Criterio: cada acción se vincula a un KPI o hallazgo
- DoD: proceso medible y seguible

## F7 — Cockpit y separación Caso / Proceso

### MC-F7-001 — Crear workspace del caso
- Objetivo: mantener operación del caso individual clara.
- Prioridad: P1
- Dependencias: MC-F3-004
- Archivos: `src/App.tsx`, `src/components/audit/*`
- Tests: case workspace flow
- Criterio: case workspace no se llena de reportes
- DoD: navegación centrada en caso

### MC-F7-002 — Crear cockpit de mejora continua
- Objetivo: separar dashboard de proceso del caso.
- Prioridad: P1
- Dependencias: MC-F5-003, MC-F6-002
- Archivos: UI global, API dashboard
- Tests: dashboard toggles and filters
- Criterio: no se mezclan indicadores de proceso con expediente individual
- DoD: cockpit operativo y claro

## F8 — Integraciones y saneamiento

### MC-F8-001 — Integraciones externas reales
- Objetivo: preparar conector de SIU/I6/Flokzu/Aula.
- Prioridad: P2
- Dependencias: MC-F3-002
- Archivos: `src/lib/*`, backend adapters
- Tests: contract tests
- Criterio: el origen tiene contrato formal y no depende de scraping
- DoD: integraciones desacopladas y comprobables

### MC-F8-002 — Revisión de huérfanos y legacy
- Objetivo: saneamiento de UX y backend sin romper producción.
- Prioridad: P1
- Dependencias: MC-F7-002
- Archivos: `src/App.tsx`, `src/components/global/*`, `src/server/app.ts`
- Tests: smoke regression
- Criterio: módulos muertos clasificados y eliminados solo con paridad
- DoD: deuda reducida y flujo limpio

## F9 — Deprecación controlada del legacy

### MC-F9-001 — Feature flag de legacy y rollback operativo
- Objetivo: no destruir producción ni histórico.
- Prioridad: P1
- Dependencias: MC-F8-002
- Archivos: `src/server/app.ts`, `src/server/jobs-router.ts`, config
- Tests: legacy routes and rollback
- Criterio: el legado está bajo feature flag
- DoD: rollback no destructivo

### MC-F9-002 — Eliminación final de duplicados y endpoints muertos
- Objetivo: reducir deuda sin riesgos de producción.
- Prioridad: P2
- Dependencias: MC-F9-001
- Archivos: `src/server/*`, `src/hooks/*`, `src/components/*`
- Tests: end-to-end validation
- Criterio: no se elimina ningún path sin paridad
- DoD: sistema más limpio y estable

## Criterios de cierre del backlog
- Todas las fases F0-F9 tienen tareas asignadas y dependencias claras.
- Todos los tickets tienen tests asociados.
- No existen tareas sin prompt ni sin criterio de salida.
- No se crean tablas duplicadas de caso/evidencia.
- La trazabilidad histórica se conserva.
- La política y regras están versionadas.
- El sistema mantiene un rollback seguro y no destructivo.
