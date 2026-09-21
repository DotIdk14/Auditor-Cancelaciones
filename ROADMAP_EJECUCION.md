# ROADMAP DE EJECUCIÓN — MEJORA CONTINUA

## 1. Principio del roadmap

La secuencia canónica es única y debe usar exactamente F0-F9. El proyecto no se reescribe; se evoluciona y se gobierna.

## 2. Fases canónicas

### F0 — Estabilización técnica
- Tipo: S
- Prerrequisitos: ninguno
- Puede ejecutarse en paralelo: config, baseline tests, revisión DDL/RLS.
- Bloquea: F1..F9
- Criterio de salida: `.env.example` completo, no hay hardcode, baseline golden y jobs en verde.

### F1 — Identidad y gobierno
- Tipo: M
- Prerrequisitos: F0
- Puede ejecutarse en paralelo: RBAC, policy catalog, policy_version.
- Bloquea: F2..F9
- Criterio de salida: roles base + identidad aditiva + policy versionada.

### F2 — Política, reglas y rulesets versionados
- Tipo: M/L
- Prerrequisitos: F1
- Puede ejecutarse en paralelo: ruleset definitions, rules, adapter TS/DB.
- Bloquea: F3..F9
- Criterio de salida: ruleset + policy version + decision_run reproducible y no destructivo.

### F3 — Hechos, evidencia y trazabilidad
- Tipo: M
- Prerrequisitos: F2
- Puede ejecutarse en paralelo: fact/evidence relation, traceability UI.
- Bloquea: F4..F9
- Criterio de salida: cada conclusión se explica con regla + evidencia + hecho.

### F4 — Calendario, ventanas y SLA
- Tipo: M
- Prerrequisitos: F3
- Puede ejecutarse en paralelo: business calendar, SLA, windows.
- Bloquea: F5..F9
- Criterio de salida: deadline y breach calculation centralizados.

### F5 — KPI y reportes
- Tipo: L
- Prerrequisitos: F4
- Puede ejecutarse en paralelo: KPI catalog, report service, aggregation.
- Bloquea: F6..F9
- Criterio de salida: KPI sin SQL arbitrario y reportes desde backend.

### F6 — Acciones correctivas
- Tipo: M
- Prerrequisitos: F5
- Puede ejecutarse en paralelo: corrective actions, remeasurement.
- Bloquea: F7..F9
- Criterio de salida: cada hallazgo tiene owner, evidence y follow-up.

### F7 — Cockpit y separación Caso / Proceso
- Tipo: M
- Prerrequisitos: F6
- Puede ejecutarse en paralelo: workspace del caso y cockpit del proceso.
- Bloquea: F8..F9
- Criterio de salida: caso individual y proceso agregado separados visualmente y funcionalmente.

### F8 — Integraciones y saneamiento
- Tipo: M/L
- Prerrequisitos: F7
- Puede ejecutarse en paralelo: integrations, cleanup huérfanos, rollout flags.
- Bloquea: F9
- Criterio de salida: contratos de integración y deuda reducida sin romper producción.

### F9 — Deprecación controlada del legacy
- Tipo: S/M
- Prerrequisitos: F8
- Puede ejecutarse en paralelo: legacy shutdown seguro y eliminación final controlada.
- Criterio de salida: legacy bajo feature flags y rollback no destructivo.

## 3. Matriz de trazabilidad del plan

| Fase | Tickets | Prompt agente | Migraciones | Tests | Feature flag | Criterio de salida |
|---|---|---|---|---|---|---|
| F0 | MC-F0-001, MC-F0-002, MC-F0-003, MC-F0-004 | F0-A, F0-B, F0-C, F0-D | baseline env y DDL | lint, golden, jobs | env + rollout | entorno reproducible y baseline verde |
| F1 | MC-F1-001, MC-F1-002, MC-F1-003, MC-F1-004 | F1-A, F1-B, F1-C, F1-D | policy, policy_version, policy_numeral, policy_audit_log | RBAC + approval | auth flags | governance y auth definidos |
| F2 | MC-F2-001, MC-F2-002, MC-F2-003, MC-F2-004, MC-F2-005 | F2-A, F2-B, F2-C, F2-D, F2-E | ruleset_versions, ruleset_members, rules, conditions, evidence requirements | golden + consistency | ruleset switch | rules versionadas y reproducibles |
| F3 | MC-F3-001, MC-F3-002, MC-F3-003, MC-F3-004 | F3-A, F3-B, F3-C, F3-D | fact/evidence relationships | traceability tests | case-trace flag | cada conclusión vuelve a evidencia |
| F4 | MC-F4-001, MC-F4-002, MC-F4-003 | F4-A, F4-B, F4-C | business_calendar, slas | business-day + SLA tests | calendar flag | fechas y SLO centralizados |
| F5 | MC-F5-001, MC-F5-002, MC-F5-003 | F5-A, F5-B, F5-C | kpis | aggregation + reports tests | KPI aggregation | KPI seguros y reportes backend |
| F6 | MC-F6-001, MC-F6-002 | F6-A, F6-B | corrective_actions | lifecycle + remeasurement | corrective flag | ciclo de mejora cerrado |
| F7 | MC-F7-001, MC-F7-002 | F7-A, F7-B | UX structure only | workspace + cockpit smoke | ui flag | separación Caso / Proceso |
| F8 | MC-F8-001, MC-F8-002 | F8-A, F8-B | connectors and cleanup | integration smoke | rollout flags | saneamiento y integraciones |
| F9 | MC-F9-001, MC-F9-002 | F9-A, F9-B | legacy retirement | rollback + regression | legacy disable | deprecación sin riesgo |

## 4. Gates de readiness

### PRE-F0 READINESS
Debe exigir solamente:
- roadmap F0-F9 consistente;
- backlog y prompts sincronizados;
- ausencia de migraciones destructivas planeadas;
- acceso disponible al repositorio y entornos necesarios;
- rollback conceptual definido.

### F0 EXIT GATE
Debe exigir:
- hardcoding eliminado;
- `.env.example` completo;
- `tsc --noEmit` / lint en verde;
- golden baseline ejecutado;
- jobs baseline ejecutado;
- DDL real inspeccionado;
- RLS actual documentado.

### F1 ENTRY GATE
Debe exigir:
- `F0 EXIT` green;
- decisión de identidad/auth suficiente;
- estrategia RBAC aprobada;
- DDL/RLS de producción conocido;
- backup/rollback disponible.

F0 puede comenzar antes de resolver decisiones de negocio de F1+.

## 5. Matriz de trazabilidad actualizada

| Ticket | Prompt | Dependencia | Migración | Test | Feature flag | Rollback | Exit gate |
|---|---|---|---|---|---|---|---|
| MC-F0-001 | F0-A | ninguna | ninguna | `tsc --noEmit`, lint, smoke | env | revert config | F0 EXIT |
| MC-F0-002 | F0-B | MC-F0-001 | ninguna | lint, bootstrap | env | revert env docs | F0 EXIT |
| MC-F0-003 | F0-C | MC-F0-002 | ninguna | golden, jobs | env | revert pruebas | F0 EXIT |
| MC-F0-004 | F0-D | MC-F0-003 | revisión DDL | DDL smoke | guard rails | revert docs | F0 EXIT |
| MC-F1-001 | F1-A | MC-F0-004 | roles, perms, user_roles | RBAC | auth flags | disable middleware | F1 ENTRY |
| MC-F1-002 | F1-B | MC-F1-001 | actor fields | migration compatibility | legacy auth | retain legacy actor | F1 ENTRY |
| MC-F1-003 | F1-C | MC-F1-002 | policy, policy_version, policy_numeral | approval lifecycle | policy flags | disable version | F1 ENTRY |
| MC-F1-004 | F1-D | MC-F1-003 | policy_audit_log | audit logging | audit flags | keep snapshots | F1 ENTRY |
| MC-F2-001 | F2-A | MC-F1-003 | rules | version lifecycle | rules flag | disable version | F2 |
| MC-F2-002 | F2-B | MC-F2-001 | rule_conditions | integrity | rules flag | disable condition set | F2 |
| MC-F2-003 | F2-C | MC-F2-002 | evidence_requirements | validation | rules flag | revert rule set | F2 |
| MC-F2-004 | F2-D | MC-F2-003 | ruleset_versions | create/load ruleset | ruleset switch | disable active set | F2 |
| MC-F2-005 | F2-E | MC-F2-004 | ruleset_members | overrides | ruleset switch | revert override | F2 |
| MC-F2-006 | F2-F | MC-F2-005 | decision_runs, rule_evaluations | reproducibility | run snapshot flag | keep historical snapshot | F2 |
| MC-F2-007 | F2-G | MC-F2-006 | adapter | fallback + golden | rules_from_db | fallback TS | F2 |
| MC-F2-008 | F2-H | MC-F2-007 | consistency_events | contradiction logging | ia_consistency | disable events | F2 |
| MC-F3-001 | F3-A | MC-F2-006 | extensional data | relation integrity | case trace flag | keep base tables | F3 |
| MC-F3-002 | F3-B | MC-F3-001 | fact_evidence_link | traceability | trace flag | disable link | F3 |
| MC-F3-003 | F3-C | MC-F3-001 | state model | state mapping | status flags | revert mapping | F3 |
| MC-F3-004 | F3-D | MC-F3-002 | none | UI trace smoke | ui flag | hide trace panel | F3 |
| MC-F4-001 | F4-A | MC-F3-003 | business_calendar | business-day | calendar flag | hide calendar | F4 |
| MC-F4-002 | F4-B | MC-F4-001 | slas | SLA tests | sla flag | disable SLA | F4 |
| MC-F4-003 | F4-C | MC-F4-002 | policy windows | window calc | window flag | disable windowing | F4 |
| MC-F5-001 | F5-A | MC-F4-003 | kpis | metadata validation | kpi flag | disable KPI set | F5 |
| MC-F5-002 | F5-B | MC-F5-001 | aggregation job | aggregation tests | kpi aggregation | disable aggregation | F5 |
| MC-F5-003 | F5-C | MC-F5-002 | none | dashboard smoke | reporting flag | hide reports | F5 |
| MC-F6-001 | F6-A | MC-F5-002 | corrective_actions | lifecycle | corrective flag | keep issues open | F6 |
| MC-F6-002 | F6-B | MC-F6-001 | remeasurement | remeasurement | corrective flag | keep existing action | F6 |
| MC-F7-001 | F7-A | MC-F3-004 | none | case workspace smoke | ui flag | restore previous view | F7 |
| MC-F7-002 | F7-B | MC-F5-003 | none | cockpit smoke | ui flag | hide cockpit | F7 |
| MC-F8-001 | F8-A | MC-F7-002 | adapter/contract | contract tests | integration flag | disable adapter | F8 |
| MC-F8-002 | F8-B | MC-F8-001 | cleanup | smoke | legacy flag | restore legacy route | F8 |
| MC-F9-001 | F9-A | MC-F8-002 | none | rollback tests | legacy flag | restore legacy mode | F9 |
| MC-F9-002 | F9-B | MC-F9-001 | cleanup final | regression | legacy flag | revert to previous build | F9 |

## 6. Conclusión
La evolución sigue siendo incremental, controlada y no destructiva. El valor actual se conserva, la base se estabiliza en F0 y la fase funcional comienza solo después de que el readiness gate y el modelo de identidad/política estén claros.
