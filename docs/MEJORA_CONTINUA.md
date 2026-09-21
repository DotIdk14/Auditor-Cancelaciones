# Auditor de Cancelaciones - Plan Maestro de Mejora Continua

## 1. Estado ejecutivo

La iniciativa evoluciona el auditor existente sin reescribirlo. El motor deterministico, los jobs, la extraccion, la auditoria multimodal y la generacion de PDF permanecen como capacidades operativas.

Estado de esta ejecucion:

- F0 EXIT - Implementation: PASS.
- F1 ENTRY - Implementation: PASS con provider InsForge configurado por adapter.
- F1 EXIT - Implementation: PASS; provider InsForge, migraciones, schema, RLS, grants, append-only y workflow validados en PostgreSQL local no productivo.
- F1 Production Deployment: BLOCKED.
- F2: MC-F2-001 implementado; F2-002 en adelante no iniciados.

La validación SQL se ejecutó dos veces sobre PostgreSQL 16.4 local, en `127.0.0.1:55432`, base `auditor_test`, cluster temporal en `%TEMP%`. El comando `npm.cmd run test:f1:db` exige `TEST_DATABASE_URL`, rechaza por defecto hosts no locales y no utiliza `DATABASE_URL` ni credenciales InsForge.

El siguiente paso es `MC-F2-002`; no se ejecuta en esta fase.

## 2. Arquitectura actual

- SPA Vite + React en `src/`.
- API Express en `src/server/`.
- Persistencia operativa mediante InsForge/PostgreSQL.
- Jobs asincronos para auditoria multimodal en `src/lib/jobs/` y `src/server/`.
- Motor deterministico en `src/lib/decision-engine/` con golden tests.
- Extraccion y auditoria multimodal en `src/lib/extraction/` y `src/lib/audit/`.
- PDF canonico en `src/lib/pdf/`.

La API pesada se consume desde el navegador mediante `VITE_HEAVY_API_BASE`; no se asume same-origin porque el repositorio no contiene un proxy que lo demuestre.

## 3. Principios no negociables

- El proyecto no se reescribe.
- `tickets` sigue siendo la raiz del caso.
- `evidences` sigue siendo la evidencia operativa.
- `extracted_facts` sigue siendo la base de hechos extraidos.
- `decision_runs` sigue siendo el resultado de ejecuciones.
- No se crea una tabla generica `case` duplicada.
- No se crea una tabla `evidence` paralela.
- El motor TypeScript deterministico es la autoridad del dictamen.
- La IA apoya extraccion, clasificacion, explicacion y deteccion de contradicciones.
- Policy y rulesets son versionados; F2 aun no esta implementada.
- Las decisiones historicas son reproducibles y no se reescriben.
- Las migraciones de identidad son aditivas y conservan actores legacy.
- El rollback de produccion es no destructivo.
- RLS es obligatorio para tablas sensibles.
- KPI no usa SQL arbitrario almacenado.

## 4. Arquitectura objetivo

La arquitectura conserva tres limites: UI, API de dominio y persistencia. Policy governance se implementa en `src/server/policy/`; autorizacion se implementa en `src/server/auth/`; las operaciones de caso y el motor existente no se mezclan con el workflow de governance.

El proveedor de identidad queda desacoplado mediante `ActorResolver`. `InsforgeVerifiedIdentityProvider` valida el bearer token con `auth.getCurrentUser()` server-side; sin configuración o credencial válida, las rutas de policy fallan cerrado con `401`. No se aceptan roles, permisos o user IDs enviados por el navegador.

## 5. Modelo de dominio

Entidades existentes que se reutilizan:

- Ticket/caso operativo: `tickets`.
- Evidencia: `evidences`.
- Hecho extraido: `extracted_facts`.
- Ejecucion de decision: `decision_runs`.
- Evaluacion de regla historica: `rule_evaluations`.

Entidades F1:

- `policy`: identidad/catalogo de la norma.
- `policy_version`: lifecycle normativo versionado.
- `policy_numeral`: numerales de una version.
- `policy_audit_log`: historia append-only de governance.
- RBAC: `roles`, `permissions`, `role_permissions`, `user_roles`.

MC-F2-001 agrega únicamente `rules` como metadata/versionado de implementaciones TypeScript. `rule_conditions`, `evidence_requirements`, `ruleset_versions`, `ruleset_members`, `consistency_events`, KPI, SLA y acciones correctivas siguen pendientes.

## 6. Modelo de datos y migraciones

La migracion F1 es `migrations/20260921000003_create-f1-governance.sql`. Es aditiva e idempotente en la medida soportada por PostgreSQL:

- crea RBAC y siembra roles/permisos baseline;
- agrega columnas UUID nullable junto a actores legacy;
- crea `policy`, `policy_version`, `policy_numeral` y `policy_audit_log`;
- agrega constraints de vigencia, unicidad e indice parcial de version activa;
- habilita RLS, grants y policies de lectura;
- hace append-only el audit log mediante trigger;
- no realiza backfill de actores ni elimina columnas.

### Schema efectivo observado

La secuencia relevante es:

1. `20260918211733_create-auditor-schema.sql` crea tablas operativas, inicialmente con algunas FK a `auth.users`, y habilita RLS.
2. `20260918212205_make-auditor-ids-text.sql` elimina esas FK para actores operativos, convierte `created_by`, `approved_by` y `actor` a `TEXT`, y recrea policies basadas en texto.
3. `20260921000001_create-audit-jobs-schema.sql` y `20260921000002_fix-stale-requeue-preserve-attempts.sql` agregan y corrigen jobs.
4. `20260921000003_create-f1-governance.sql` conserva esos textos y agrega UUID nullable paralelos para identidad verificable.
5. `20260921000004_create-rules-schema.sql` agrega metadata/versionado de rules, lifecycle, inmutabilidad, RLS y permisos F2.

Por tanto, el estado efectivo esperado despues de aplicar la secuencia es: actores historicos en texto, FK antiguas de actores eliminadas, RLS operativo historico basado en la migracion existente y nuevas tablas F1 protegidas con RLS. La aplicacion de produccion sigue bloqueada hasta consultar el schema realmente desplegado y sus policies efectivas.

No se ejecutaron migraciones contra una base no verificada.

## 7. Seguridad, identidad y RBAC

Contrato de actor: `AuthenticatedActor` contiene `userId`, `legacyIdentity`, `roles`, `permissions` y `source`.

`ActorResolver` es la frontera server-side. `InsforgeVerifiedIdentityProvider` extrae únicamente `Authorization: Bearer`, valida el token contra InsForge y devuelve el usuario verificado. `DatabaseActorResolver` carga `user_roles` activos y resuelve permissions mediante `role_permissions`. No lee `x-role`, `x-permissions`, JSON del cliente ni user IDs no verificados.

Sin `INSFORGE_URL` y `INSFORGE_ANON_KEY` configurados, el adapter por defecto es `UnconfiguredActorResolver` y devuelve ausencia de identidad. Esto mantiene fail-closed sin inventar autenticacion.

Permisos baseline:

- `case.read`, `case.audit`.
- `policy.read`, `policy.draft.create`, `policy.draft.update`.
- `policy.review.submit`, `policy.review`, `policy.approve`, `policy.activate`, `policy.retire`.
- `governance.audit.read`.
- `rbac.manage`.

Roles baseline configurables:

- `auditor`: lectura y auditoria de casos, lectura de policy.
- `reviewer`: capacidades de auditor y revision de policy.
- `policy_admin`: workflow completo de policy y lectura de governance.
- `admin`: catalogo completo de permisos.

La API usa `requirePermission`; no depende de comparaciones repetidas de role. El frontend no es boundary de seguridad.

## 8. Política, numerales, reglas y rulesets

F1 implementa `policy`, `policy_version` y `policy_numeral`. No crea reglas ni rulesets.

`policy` usa `ENABLED` y `ARCHIVED`. `policy_version` usa `DRAFT -> REVIEW -> APPROVED -> ACTIVE -> RETIRED`; las transiciones arbitrarias se rechazan. Existe indice unico parcial para impedir dos versiones `ACTIVE` de una misma policy.

Versiones `APPROVED` o `ACTIVE` no se editan mediante el repositorio de policy ni mediante UPDATE/DELETE directo en PostgreSQL: el trigger de lifecycle protege el contenido normativo. Los cambios normativos requieren una nueva version.

El hash SHA-256 se calcula sobre contenido canonico: `sourceText` normalizado y numerales ordenados por `code`, incluyendo solo code, title, text, orderIndex, processArea y vigencias. No incluye IDs, timestamps, actores ni metadata operacional.

No se cargan numerales oficiales inventados. El catalogo productivo queda vacio hasta contar con fuente normativa verificable.

La API separada esta en `src/server/policy/router.ts` y `src/server/policy/repository.ts` con listar, obtener, crear draft/version, editar draft, agregar numeral y transiciones. MC-F2-001 agrega `src/server/rules/` para metadata de reglas, sin ejecutar reglas desde DB.

## 9. Evidencia, hechos y trazabilidad

F1 no duplica evidencia, hechos ni casos. Las fuentes existentes permanecen operativas. Los nuevos actores verificables son nullable y no sustituyen texto historico.

El audit log de policy es exclusivamente de governance. Contradicciones IA, telemetria y eventos del worker quedan fuera de `policy_audit_log` y pertenecen a fases posteriores.

## 10. Calendario, ventanas y SLA

No implementado en F1. Corresponde a F4.

## 11. KPI y reportes

No implementado en F1. Los KPI futuros deben usar catalogo y claves de calculo backend; nunca SQL arbitrario almacenado.

## 12. Acciones correctivas

No implementado en F1. Corresponde a F6.

## 13. Cockpit Caso / Proceso

No implementado en F1. La UI existente no se rediseña en esta fase.

## 14. Integraciones

InsForge es el proveedor configurado. `InsforgeVerifiedIdentityProvider` usa el SDK oficial con `accessToken` por request y `auth.getCurrentUser()`. La identidad verificada se entrega a `DatabaseActorResolver`; roles y permisos continúan resolviéndose exclusivamente desde DB.

`VITE_HEAVY_API_BASE` se documenta como variable frontend obligatoria, sin fallback real. `INSFORGE_*`, `DATABASE_URL`, IA, AssemblyAI, worker y flags quedan enumeradas en `.env.example`.

## 15. Testing

Tests disponibles y ejecutados durante esta ejecucion:

- `npm.cmd run lint`: PASS (`tsc --noEmit`).
- `npm.cmd run test:f1`: PASS, 9/9.
- `npm.cmd run test:f2`: PASS, 8/8.
- `npm.cmd run test:golden`: PASS, 24/24.
- `npm.cmd run test:jobs`: PASS, 92/92.
- `npm.cmd run test:f1:db`: PASS, 6 migraciones sobre PostgreSQL 16.4 local.
- `npm.cmd run test:f2:db`: PASS, 6 migraciones con FK/versionado/lifecycle/inmutabilidad/RLS/grants.

Los tests F1 cubren 401 sin identidad, 403 sin permiso, autorizacion permitida, bearer válido, token inválido, headers falsificados ignorados, hash estable/diferente y transiciones validas/invalidas. El harness SQL también valida inmutabilidad APPROVED/ACTIVE. F2 cubre allowlist de implementation keys y lifecycle. Los harnesses SQL validan la cadena completa desde cero y revierten la transacción al finalizar.

## 16. Roadmap F0-F9

- F0: estabilizacion tecnica.
- F1: identidad y gobierno.
- F2: politica, reglas y rulesets versionados.
- F3: hechos, evidencia y trazabilidad.
- F4: calendario, ventanas y SLA.
- F5: KPI y reportes.
- F6: acciones correctivas.
- F7: cockpit Caso/Proceso.
- F8: integraciones y saneamiento.
- F9: deprecacion controlada del legacy.

Cada fase bloquea las posteriores hasta cumplir su exit gate.

## 17. Backlog ejecutable

F0: `MC-F0-001` configuracion sin hardcode; `MC-F0-002` variables por capa; `MC-F0-003` baseline; `MC-F0-004` DDL/RLS efectivo.

F1:

- `MC-F1-001`: RBAC base, middleware y matriz.
- `MC-F1-002`: identidad aditiva y actores verificables nullable.
- `MC-F1-003`: policy/version/numeral, hash y workflow.
- `MC-F1-004`: audit log append-only.

F2 inicia con `MC-F2-001` rules versionadas. No se ejecuta en esta mision.

## 18. Gates de readiness

| Gate | Estado | Evidencia |
|---|---|---|
| PRE-F0 | PASS | Planes reconciliados y sin migraciones destructivas nuevas. |
| F0 EXIT - Implementation | PASS | Hardcode eliminado, env documentado, lint, golden y jobs verdes. |
| F1 ENTRY - Implementation | PASS | F0 implementation verde; migracion F1 aditiva; rollback no destructivo. |
| F1 EXIT - Implementation | PASS | Provider InsForge, migraciones, schema, legacy, RBAC, RLS, grants, append-only y workflow validados en PostgreSQL 16.4 local. |
| F1 Production Deployment | BLOCKED | DB productiva, backup, rollout autorizado y RLS desplegado no verificados. |
| F2 MC-F2-001 | PASS | `rules` versionadas e inmutables, metadata TypeScript, RLS/grants y tests PostgreSQL validados. |

Implementation PASS no autoriza deployment automatico.

## 19. Estado de implementación

Implementado:

- configuracion de API pesada sin fallback real;
- `.env.example` por capas;
- contrato `AuthenticatedActor`, `ActorResolver`, middleware `requirePermission`;
- `InsforgeVerifiedIdentityProvider` y resolver RBAC de DB;
- migracion F1 aditiva con RBAC, policy, numerales, audit log, RLS y grants;
- migracion `20260921000004_create-rules-schema.sql` con rules versionadas, lifecycle e inmutabilidad;
- repositorio y router de policy;
- repositorio y router de rules metadata;
- hash y matriz de workflow;
- tests focalizados F1.

Parcial o pendiente:

- despliegue productivo, backup y verificación de schema/RLS productivo;
- endpoint de lectura de audit log cuando el repositorio de governance se expanda;
- guards UX de frontend para Policy UI, que no existe como rediseño F1.

## 20. Decisiones pendientes de negocio

- destino DB, backup y ventana de deployment;
- política normativa y numerales oficiales;
- aprobadores de producción;
- backfill histórico y retención de actores legacy;
- calendario institucional, KPI, owners y SLAs futuros.

## 21. Matriz de reuso / refactor / deprecación

| Superficie | Decisión |
|---|---|
| `tickets` | Reusar como raiz del caso. |
| `evidences` | Reusar como evidencia operativa. |
| `extracted_facts` | Reusar como hechos extraidos. |
| `decision_runs` | Reusar como ejecuciones historicas. |
| Motor deterministico | Preservar sin cambios semanticos. |
| Actores TEXT | Conservar; complementar con UUID nullable. |
| Policy embebida | Mantener como fallback operativo en F1. |
| `case`/`evidence` paralelos | No crear. |
| `rules` metadata/versionado | Implementado en MC-F2-001; TypeScript sigue ejecutando. |
| Conditions/rulesets DB | Reservar para tickets F2 posteriores. |

## 22. Rollback y feature flags

El rollback F1 no borra tablas ni historia. Puede desactivarse `MC_RBAC_ENABLED` y `MC_POLICY_WORKFLOW_ENABLED`, manteniendo el modo legacy mientras se corrige el provider. Una policy version nueva puede retirarse; snapshots y audit log se conservan.

No se deben ejecutar migraciones destructivas para volver atras. El despliegue de produccion requiere backup y destino confirmado antes de aplicar SQL.

## 23. Historial de ejecución

### F1 - 2026-09-21

- Se corrigio la configuracion hardcodeada y se completo `.env.example`.
- Se implementaron RBAC, identidad aditiva, policy governance y audit log en codigo/migracion.
- Se mantuvo el motor deterministico intacto.
- Tests: lint PASS, F1 9/9, golden 24/24, jobs 92/92.
- Provider InsForge implementado; Production deployment: BLOCKED por DB/RLS/backup no verificados.

### MC-F2-001 - 2026-09-21

- PostgreSQL local de test 16.4 provisionado en `%TEMP%`, sin servicio persistente ni datos reales.
- Se validaron seis migraciones, F1 dos veces y F2 con FK, lifecycle, inmutabilidad, RLS y grants.
- Se mantuvo el RuleEngine TypeScript como autoridad; no se creó DSL ni adapter DB-driven.

## 24. Próximo paso

El siguiente ticket es `MC-F2-002` - `rule_conditions`. No se ejecuta en esta fase.
