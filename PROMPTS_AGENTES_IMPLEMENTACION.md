# PROMPTS AGENTES DE IMPLEMENTACIÓN

## Convención
- Cada ticket usa el identificador `MC-Fn-xxx` con `n = 0..9`.
- La numérica canónica es `F0..F9`.
- Cada prompt debe ser ejecutable sin leer el roadmap completo.
- Los prompts no pueden introducir nuevas arquitecturas ni decisiones de negocio no acordadas.

## Template obligatorio por ticket

Cada prompt debe incluir estas secciones:
- Contexto
- Objetivo
- Dependencias
- Archivos relevantes
- Cambios permitidos
- NO tocar
- Pasos de implementación
- Migraciones involucradas
- Tests obligatorios
- Rollback
- Criterios de aceptación
- Definition of Done

---

## F0 — Estabilización

### Prompt F0-A — `MC-F0-001` | Configuración sin URL hardcodeada
Contexto: `src/lib/api/config.ts` usa un host fijo y la app debe depender de variables de entorno.
Objetivo: eliminar hardcoding sin alterar la API existente.
Dependencias: ninguna.
Archivos relevantes: `.env.example`, `src/lib/api/config.ts`, `server.ts`, `package.json`, `src/hooks/*`.
Cambios permitidos: mover hosts y endpoints a configuración por entorno; documentar fallback seguro.
NO tocar: lógica de negocio de auditoría ni la operación del motor determinístico.
Pasos de implementación: localizar todas las referencias a host fijo, reemplazarlas por config, validar boot y requests.
Migraciones involucradas: ninguna.
Tests obligatorios: `tsc --noEmit`, `npm run lint`, smoke de boot.
Rollback: revert de configuración y fallback seguro.
Criterios de aceptación: la app no contiene un endpoint real hardcodeado en repo y `.env.example` refleja el valor esperado.
Definition of Done: configuración por entorno documentada y reproducible.

### Prompt F0-B — `MC-F0-002` | Variables por capa
Contexto: faltan variables de entorno por capa y el sistema no es reproducible en distintos entornos.
Objetivo: documentar variables para frontend, backend, worker, database, IA y storage.
Dependencias: `MC-F0-001`.
Archivos relevantes: `.env.example`, `src/server/*`, `src/lib/api/config.ts`, `src/lib/insforge/*`.
Cambios permitidos: expandir `.env.example` y documentar requisitos por capa.
NO tocar: lógica de negocio ni secretos reales.
Pasos de implementación: enumerar cada variable, clasificar por capa, documentar required vs optional, validar con bootstrap.
Migraciones involucradas: ninguna.
Tests obligatorios: `tsc --noEmit`, `npm run lint`, smoke de arranque local.
Rollback: revert de `.env.example` y comentarios.
Criterios de aceptación: todas las variables relevantes quedan documentadas y no se usa clave real en repo.
Definition of Done: entorno legible, reproducible y sin secretos en código.

### Prompt F0-C — `MC-F0-003` | Baseline golden y jobs
Contexto: antes de cambios de dominio, hay que preservar la red de seguridad actual.
Objetivo: validar que la base determinística y job flow sigue intacta.
Dependencias: `MC-F0-002`.
Archivos relevantes: `tests/jobs/*`, `src/lib/decision-engine/*`, `src/lib/jobs/*`.
Cambios permitidos: correcciones de pruebas o config solo si se necesitan para estabilizar la baseline.
NO tocar: reglas de negocio ni endpoints funcionales.
Pasos de implementación: ejecutar golden suite y jobs suite, fijar resultados actuales y documentar fallback.
Migraciones involucradas: ninguna funcional.
Tests obligatorios: `npm run test:golden`, `npm run test:jobs`.
Rollback: revert de cambios de prueba y documentación.
Criterios de aceptación: baseline actual en verde y documentada como referencia.
Definition of Done: la base de seguridad queda registrada y no se rompe antes de F1.

### Prompt F0-D — `MC-F0-004` | DDL y RLS reales
Contexto: la seguridad de la base no puede dejarse para después y se requiere revisar el DDL canónico.
Objetivo: inspeccionar DDL y RLS actuales antes de comenzar la fase funcional.
Dependencias: `MC-F0-003`.
Archivos relevantes: `migrations/*`, `src/lib/insforge/*`, `src/server/*`.
Cambios permitidos: documentación de DDL canónico, plan de revisión y flags si hace falta.
NO tocar: migraciones de dominio ni datos de producción.
Pasos de implementación: mapear tablas sensibles, revisar grants/RLS, documentar brechas y riesgos.
Migraciones involucradas: solo de documentación y guard rails, no de dominio.
Tests obligatorios: smoke de DDL, revisión de schema y RLS.
Rollback: revert documentación y tiempos de revisión.
Criterios de aceptación: DDL real inspeccionado y RLS documentado al menos para tablas sensibles.
Definition of Done: F0 sale con evidencia de que la base es segura y su schema es conocido.

---

## F1 — Identidad/Gobierno

### Prompt F1-A — `MC-F1-001` | RBAC base
Contexto: falta un modelo de identidades y permisos explícito.
Objetivo: definir roles, permisos y asociación sin decidir el proveedor final de identidad.
Dependencias: `MC-F0-004`.
Archivos relevantes: `migrations/*`, `src/server/*`, `src/lib/insforge/*`.
Cambios permitidos: `roles`, `permissions`, `role_permissions`, `user_roles` y middleware de permisos.
NO tocar: proveedor final de identidad ni negocio externo.
Pasos de implementación: crear tablas base, asociar permisos, activar middleware, documentar user_roles y legacy source.
Migraciones involucradas: `roles`, `permissions`, `role_permissions`, `user_roles`.
Tests obligatorios: RBAC de policy/admin/auditor/revisor.
Rollback: desactivar middleware y dejar tablas sin uso en legacy mode.
Criterios de aceptación: auditor, revisor, policy-admin y admin siguen definidos con permisos adecuados.
Definition of Done: la identidad del sistema está modelada sin depender del proveedor final.

### Prompt F1-B — `MC-F1-002` | Migración aditiva de identidad
Contexto: el historial de `created_by`/`approved_by` no puede perderse por un cambio de identidad.
Objetivo: crear un modelo aditivo y no destructivo para actores.
Dependencias: `MC-F1-001`.
Archivos relevantes: `migrations/*`, `src/lib/insforge/repository.ts`.
Cambios permitidos: añadir `actor_user_id` y compatibilidad con actor legacy.
NO tocar: migraciones que destruyen texto histórico.
Pasos de implementación: añadir columnas nullable, mapear si existe identidad real, documentar legacy fallback.
Migraciones involucradas: columnas de actor en tablas relevantes.
Tests obligatorios: migration compatibility, legacy preservation.
Rollback: mantener columnas y no borrar trazabilidad histórica.
Criterios de aceptación: no hay `TEXT -> UUID` destructivo ni pérdida de relation.
Definition of Done: trazabilidad de actor conservada en contexto legacy y real.

### Prompt F1-C — `MC-F1-003` | `policy`, `policy_version`, `policy_numeral`
Contexto: la política no está modelada como dato versionado.
Objetivo: crear el mínimo catalogo de política con versionado y vigencia.
Dependencias: `MC-F1-002`.
Archivos relevantes: `migrations/*`, `src/server/*`, `src/lib/insforge/*`.
Cambios permitidos: crear tablas y workflow de versión de policy.
NO tocar: la lógica del motor existente ni la política embebida de code.
Pasos de implementación: crear `policy`, `policy_version`, `policy_numeral`, definir vigencia y hash, dejar workflow draft/review/approve/active.
Migraciones involucradas: `policy`, `policy_version`, `policy_numeral`.
Tests obligatorios: lifecycle de version y aprobación.
Rollback: desactivar versión activa sin borrado de historial.
Criterios de aceptación: cada versión tiene hash, vigencia, creador y aprobador.
Definition of Done: una policy queda versionada y reproducible.

### Prompt F1-D — `MC-F1-004` | `policy_audit_log`
Contexto: los cambios de policy y reglas necesitan trazabilidad verificable.
Objetivo: registrar cambios con snapshot antes/después y actor verificable o legacy.
Dependencias: `MC-F1-003`.
Archivos relevantes: `migrations/*`, `src/server/*`, `src/lib/insforge/*`.
Cambios permitidos: crear `policy_audit_log` con columnas `entity_type`, `entity_id`, `action`, `before_snapshot`, `after_snapshot`, `reason`.
NO tocar: `consistency_events` ni eventos de IA.
Pasos de implementación: diseñar tabla de audit, usar `actor_verifiable` + `actor_legacy`, registrar cambios de policy, version, numeral, rules y ruleset.
Migraciones involucradas: `policy_audit_log`.
Tests obligatorios: log de cambios y aprobación.
Rollback: neutralizar tabla en legacy mode y conservar snapshots.
Criterios de aceptación: la historia de cambios queda trazada, y `consistency_events` mantiene solo contradicciones IA vs determinístico.
Definition of Done: cambios de governance quedan auditables.

---

## F2 — Policy/Rulesets

### Prompt F2-A — `MC-F2-001` | `rules` con versionado inmutable
Contexto: la regla existente vive en TypeScript y no tiene un formato de versión inmutable.
Objetivo: crear la base canónica de reglas sin updates in-place.
Dependencias: `MC-F1-003`.
Archivos relevantes: `migrations/*`, `src/lib/decision-engine/*`.
Cambios permitidos: crear `rules` con `rule_key`, `version`, `status`, `UNIQUE(rule_key, version)`.
NO tocar: la lógica de implementación actual del rule engine salvo adaptador.
Pasos de implementación: definir regla base, versionado, status y hash del conjunto.
Migraciones involucradas: `rules`.
Tests obligatorios: golden + versioned lifecycle.
Rollback: nuevas versiones se desactivan y no se republican en runs nuevos.
Criterios de aceptación: una modificación normativa produce nueva versión; no update in-place sobre ACTIVE/APPROVED.
Definition of Done: `rules` queda como base canónica e inmutable por versión.

### Prompt F2-B — `MC-F2-002` | `rule_conditions`
Contexto: conditions y metadata no deben mezclarse con la regla base.
Objetivo: separar condiciones de la definición de la regla.
Dependencias: `MC-F2-001`.
Archivos relevantes: `migrations/*`, `src/lib/decision-engine/rules/*`.
Cambios permitidos: crear `rule_conditions` con `operator`, `field_path`, `threshold`, etc.
NO tocar: JSONB de ruleset members como fuente canónica.
Pasos de implementación: definir tabla, asociar `rule_id`, definir operadores permitidos y ordering.
Migraciones involucradas: `rule_conditions`.
Tests obligatorios: condition integrity + evaluation.
Rollback: desactivar condiciones no usadas o versionar otra regla.
Criterios de aceptación: condiciones tienen una sola fuente de verdad.
Definition of Done: regla y condiciones quedan separadas y auditables.

### Prompt F2-C — `MC-F2-003` | `evidence_requirements`
Contexto: la evidencia requerida no puede vivir duplicada como JSONB canónico.
Objetivo: dejar a `evidence_requirements` como tabla canónica.
Dependencias: `MC-F2-002`.
Archivos relevantes: `migrations/*`, `src/lib/decision-engine/*`, domain services.
Cambios permitidos: crear `evidence_requirements` y asociar a `rule_id` y `numeral_id`.
NO tocar: `ruleset_members` como fuente canónica de requirements.
Pasos de implementación: definir requerimientos mínimos, evidence type y cardinalidad, registrar en policy audit.
Migraciones involucradas: `evidence_requirements`.
Tests obligatorios: required evidence validation.
Rollback: desactivar la regla o volver a la versión anterior.
Criterios de aceptación: una regla tiene una sola definición de evidencia requerida.
Definition of Done: evidence requirements queda canónico y no duplicado.

### Prompt F2-D — `MC-F2-004` | `ruleset_versions`
Contexto: el conjunto de reglas necesita un snapshot versionado por policy version.
Objetivo: crear `ruleset_versions` con hash determinista.
Dependencias: `MC-F2-003`.
Archivos relevantes: `migrations/*`, `src/lib/decision-engine/*`.
Cambios permitidos: crear `ruleset_versions` y calcular `hash` determinísticamente.
NO tocar: reglas ya activas salvo su inclusión en ruleset.
Pasos de implementación: introducir version, hash, status, metadata, link a policy_version.
Migraciones involucradas: `ruleset_versions`.
Tests obligatorios: create/load ruleset, hash consistency.
Rollback: desactivar ruleset activo sin borrar snapshot históricamente.
Criterios de aceptación: ruleset puede reconstruirse y expresarse como snapshot immutable.
Definition of Done: ruleset versionado e inmutable.

### Prompt F2-E — `MC-F2-005` | `ruleset_members` con overrides explícitos
Contexto: el ruleset puede necesitar ajustes puntuales sin duplicar la configuración canónica.
Objetivo: definir precedence explícita y overrides solo del set.
Dependencias: `MC-F2-004`.
Archivos relevantes: `migrations/*`, `src/lib/decision-engine/*`.
Cambios permitidos: crear `ruleset_members` con `overrides_parameters`, `overrides_thresholds`, `overrides_evidence_requirements`.
NO tocar: parámetros/thresholds/evidence como JSONB canónico en ruleset members.
Pasos de implementación: crear tabla, definir precedencia base → overrides → snapshot.
Migraciones involucradas: `ruleset_members`.
Tests obligatorios: precedence + override tests.
Rollback: quitar override activo sin tocar regla base.
Criterios de aceptación: precedencia no implícita y no hay duplicación de fuente de verdad.
Definition of Done: ruleset members solo aplica ajustes específicos del ruleset.

### Prompt F2-F — `MC-F2-006` | Snapshot de `decision_runs`
Contexto: es imposible reconstruir un run histórico si no se guarda qué ruleset y versión se ejecutaron.
Objetivo: extender `decision_runs` y `rule_evaluations` con snapshots reproducibles.
Dependencias: `MC-F2-005`.
Archivos relevantes: `migrations/*`, `src/lib/insforge/repository.ts`, `src/lib/decision-engine/*`.
Cambios permitidos: añadir `policy_version_id`, `ruleset_version_id`, `ruleset_hash`, `rule_id`, `evidence_refs`.
NO tocar: decisiones históricas ya emitidas y snapshots previos.
Pasos de implementación: persistir metadata del run, mantener inmutabilidad, registrar hash.
Migraciones involucradas: extension de `decision_runs` y `rule_evaluations`.
Tests obligatorios: reproducibility, historical immutability.
Rollback: no borrar snapshot histórico; mover a legacy mode si hace falta.
Criterios de aceptación: cada run se puede reconstruir exactamente.
Definition of Done: la decisión queda reproducible en tiempo y versión.

### Prompt F2-G — `MC-F2-007` | Adapter DB -> RuleRegistry
Contexto: la config persistida debe cargar sobre el engine TypeScript existente con fallback seguro.
Objetivo: conectar DB a RuleRegistry y no romper golden.
Dependencias: `MC-F2-006`.
Archivos relevantes: `src/lib/decision-engine/rule-engine.ts`, `src/lib/decision-engine/decision-engine.ts`.
Cambios permitidos: adaptador para cargar reglas persistidas y mantener fallback.
NO tocar: reglas ya validadas sin registro persistente.
Pasos de implementación: cargar reglas desde DB, orden por prioridad y version, mantener fallback seguro.
Migraciones involucradas: ninguna nueva, solo adaptador.
Tests obligatorios: rule registry selection, fallback seguro, golden regression.
Rollback: desactivar `rules_from_db` y volver a fallback TS.
Criterios de aceptación: el engine conserva prioridad, reglas y compatibilidad.
Definition of Done: RuleRegistry y DB quedan conectados sin romper lo que ya funciona.

### Prompt F2-H — `MC-F2-008` | `consistency_events`
Contexto: IA vs determinístico debe quedar separado de policy audit log.
Objetivo: registrar contradicciones en events específicos.
Dependencias: `MC-F2-007`.
Archivos relevantes: `src/lib/audit/*`, `migrations/*`.
Cambios permitidos: crear `consistency_events` y emitir registro de contradicción.
NO tocar: `policy_audit_log` como log de cambios de governance.
Pasos de implementación: definir source, event_type, details, y correlación con `decision_runs`.
Migraciones involucradas: `consistency_events`.
Tests obligatorios: contradiction logging.
Rollback: desactivar eventos sin borrar decisiones.
Criterios de aceptación: la IA no reemplaza la regla determinística y cada conflicto queda registrado.
Definition of Done: la autoridad de decisión sigue siendo determinística y trazable.

---

## F3 — Evidencia/Trazabilidad

### Prompt F3-A — `MC-F3-001` | Reutilizar `tickets` y `evidences`
Contexto: no debe duplicarse la fuente del caso ni la evidencia.
Objetivo: dejar `tickets` y `evidences` como raíz y extensionales.
Dependencias: `MC-F2-006`.
Archivos relevantes: `migrations/*`, `src/lib/insforge/*`.
Cambios permitidos: extender tablas existentes con campos de trazabilidad y linkage.
NO tocar: tablas duplicadas de caso/evidencia.
Pasos de implementación: validar entidades existentes, añadir campos de link y trazabilidad, no crear nueva raíz duplicada.
Migraciones involucradas: extensiones de `tickets`, `evidences`, metadata relevante.
Tests obligatorios: relation integrity.
Rollback: desactivar vínculo adicional sin borrar base original.
Criterios de aceptación: `tickets` sigue siendo la raíz del caso.
Definition of Done: no hay caso ni evidencia duplicados.

### Prompt F3-B — `MC-F3-002` | `extracted_facts` y enlace a evidencia
Contexto: hay que ligar hechos a evidencia y a numeral.
Objetivo: construir trazabilidad end-to-end.
Dependencias: `MC-F3-001`.
Archivos relevantes: `migrations/*`, `src/lib/extraction/*`.
Cambios permitidos: crear `fact_evidence_link` y metadata de evidencia en `extracted_facts`.
NO tocar: motor de decisión.
Pasos de implementación: mapear hecho → evidencia → numeral y dejar ids del run.
Migraciones involucradas: `fact_evidence_link` y columnas en `extracted_facts`/`evidences` si aplica.
Tests obligatorios: fact-to-evidence linking, traceability.
Rollback: desactivar vínculo y dejar evidencia intacta.
Criterios de aceptación: cada conclusión llega a evidencia y numerales.
Definition of Done: trazabilidad visible y reproducible.

### Prompt F3-C — `MC-F3-003` | separar lifecycle, outcome y operational status
Contexto: los estados no deben mezclarse en un único enum.
Objetivo: separar estado de caso, resultado de decisión y estado operativo.
Dependencias: `MC-F3-001`.
Archivos relevantes: `migrations/*`, domain types.
Cambios permitidos: definir enums por dominio y mapeos.
NO tocar: semántica actual del caso salvo separación conceptual.
Pasos de implementación: definir tres dimensiones de estado, ajustar validación y documentos.
Migraciones involucradas: enums o metadata de estado.
Tests obligatorios: state mapping.
Rollback: revert de mapping sin borrar histórico.
Criterios de aceptación: no hay `PROCEDE` mezclado con `CLOSED`.
Definition of Done: estados separados y documentados.

### Prompt F3-D — `MC-F3-004` | UI de trazabilidad
Contexto: el auditor debe poder reconstruir la decisión desde la evidencia.
Objetivo: construir navegación de conclusión a regla y evidencia.
Dependencias: `MC-F3-002`.
Archivos relevantes: `src/App.tsx`, `src/components/audit/*`.
Cambios permitidos: UI panel de trazabilidad y navegación.
NO tocar: full rewrite del flujo completo.
Pasos de implementación: enlazar conclusión, regla, evidencia, hecho y snapshot del run.
Migraciones involucradas: ninguna nueva.
Tests obligatorios: UI navigation smoke.
Rollback: ocultar panel o desactivar feature flag.
Criterios de aceptación: cada conclusión tiene trail visible.
Definition of Done: el caso se puede reconstruir sin “pensarlo” internamente.

---

## F4 — Calendario/SLA

### Prompt F4-A — `MC-F4-001` | `business_calendar`
Contexto: no hay calendario institucional centralizado.
Objetivo: construir `business_calendar` con scope y días hábiles.
Dependencias: `MC-F3-003`.
Archivos relevantes: `migrations/*`, domain calendar.
Cambios permitidos: crear tabla y service de negocio.
NO tocar: UI ni lógica del negocio fuera del calendario.
Pasos de implementación: definir scope por defecto `GLOBAL`, un calendar type y días laborables.
Migraciones involucradas: `business_calendar`.
Tests obligatorios: business-day logic.
Rollback: desactivar calendario sin romper el caso.
Criterios de aceptación: calendar centralizado y reutilizable.
Definition of Done: calendarios y ventanas quedan centralizados.

### Prompt F4-B — `MC-F4-002` | `slas`
Contexto: la app no tiene deadlines operativos configurables por etapa.
Objetivo: modelar SLA por etapa y owner.
Dependencias: `MC-F4-001`.
Archivos relevantes: `migrations/*`, backend service.
Cambios permitidos: crear `slas` y calcular deadlines.
NO tocar: JSX ni React para cálculo.
Pasos de implementación: definir stage, duration, owner_role, threshold y business calendar.
Migraciones involucradas: `slas`.
Tests obligatorios: elapsed, remaining, breach.
Rollback: desactivar servicio y dejar el caso intacto.
Criterios de aceptación: cada caso calcula su SLA sin depender de UI.
Definition of Done: deadlines y breaches quedan centralizados.

### Prompt F4-C — `MC-F4-003` | ventanas por policy y numeral
Contexto: las ventanas temporales están dispersas.
Objetivo: dejar regla/numeral con su ventana y calendar.
Dependencias: `MC-F4-002`.
Archivos relevantes: `migrations/*`, policy service.
Cambios permitidos: agregar metadata y service de windows.
NO tocar: random logic in components.
Pasos de implementación: relacionar ventana con rules y numerales, definir calendar.
Migraciones involucradas: metadata o columnas relevantes.
Tests obligatorios: window computation.
Rollback: revert de metadata y mantener fallback.
Criterios de aceptación: ventana no queda dispersa.
Definition of Done: cada regla y numeral tienen su ventana, calendario y vigencia.

---

## F5 — KPI

### Prompt F5-A — `MC-F5-001` | catálogo KPI seguro
Contexto: KPI no puede usar SQL arbitrario ejecutable.
Objetivo: definir un modelo seguro de KPI con metadata y parameters.
Dependencias: `MC-F4-003`.
Archivos relevantes: `migrations/*`, KPI service.
Cambios permitidos: crear `kpis` con `calculation_key`, `filters`, `parameters`, `version`, `owner_role`.
NO tocar: SQL literal en BD de producción o in-situ.
Pasos de implementación: definir catálogo, owner, period y thresholds.
Migraciones involucradas: `kpis`.
Tests obligatorios: metadata validation.
Rollback: desactivar KPI sin romper caso.
Criterios de aceptación: KPI es configurable y seguro.
Definition of Done: catálogo KPI sin SQL arbitrario.

### Prompt F5-B — `MC-F5-002` | agregación por periodo
Contexto: los KPI requieren agregación por función y período.
Objetivo: construir backend service y job de agregación.
Dependencias: `MC-F5-001`.
Archivos relevantes: worker jobs, backend service, report service.
Cambios permitidos: crear job de agregación y queries parametrizadas.
NO tocar: cálculos en React.
Pasos de implementación: preparar job, filtros por período, function_area y owner. 
Migraciones involucradas: solo si hace falta esquema de job outputs.
Tests obligatorios: aggregation job, report query.
Rollback: desactivar job y dejar reportes en legacy mode.
Criterios de aceptación: KPIs se calculan desde backend.
Definition of Done: reportes operativos quedan viables.

### Prompt F5-C — `MC-F5-003` | `ReportsView` funcional
Contexto: la mejora continua necesita dashboard y reportes reales.
Objetivo: conectar UI a KPI backend y no a lógica dispersa.
Dependencias: `MC-F5-002`.
Archivos relevantes: `src/components/global/ReportsView.tsx`, dashboard views.
Cambios permitidos: panel y fetch desde servicio.
NO tocar: caso individual ni flujo de dictamen.
Pasos de implementación: conectar view a KPI service, filtros y series por período.
Migraciones involucradas: ninguna.
Tests obligatorios: dashboard smoke.
Rollback: ocultar panel o volver a fallback.
Criterios de aceptación: dashboard de proceso es visible y accionable.
Definition of Done: mejora continua existe como visión operativa separada del caso.

---

## F6 — Acciones correctivas

### Prompt F6-A — `MC-F6-001` | `corrective_actions`
Contexto: la mejora continua necesita cierre de hallazgos y seguimiento.
Objetivo: crear `corrective_actions` con owner, deadline y evidencia.
Dependencias: `MC-F5-002`.
Archivos relevantes: `migrations/*`, backend action service.
Cambios permitidos: crear tabla y lifecycle.
NO tocar: caso individual como cierre operativo del dictamen.
Pasos de implementación: definir owner, due_at, evidence, status y linkage a KPI o hallazgo.
Migraciones involucradas: `corrective_actions`.
Tests obligatorios: lifecycle and owner tracking.
Rollback: desactivar action sin borrar hallazgo.
Criterios de aceptación: cada acción tiene owner, evidencia y cierre medible.
Definition of Done: mejora continua se convierte en loop cerrado.

### Prompt F6-B — `MC-F6-002` | re-medición
Contexto: la acción correctiva debe ser medible y re-evaluable.
Objetivo: enlazar la acción con KPI y re-medición.
Dependencias: `MC-F6-001`.
Archivos relevantes: KPI service, action workflow.
Cambios permitidos: seguimiento y validación de remeasurement.
NO tocar: decisión individual.
Pasos de implementación: registrar KPI objetivo asociado, evaluar remeasurement y cerrar con evidencia.
Migraciones involucradas: columnas o tablas de seguimiento si aplican.
Tests obligatorios: remeasurement and follow-up.
Rollback: dejar acción en estado abierto sin borrar historial.
Criterios de aceptación: cada acción se vincula a KPI o hallazgo y queda medible.
Definition of Done: ciclo de mejora continua sigue cerrado y verificable.

---

## F7 — Cockpit

### Prompt F7-A — `MC-F7-001` | workspace del caso
Contexto: el caso individual debe seguir con foco y no mezclarse con reportes.
Objetivo: mantener el workspace del caso limpio.
Dependencias: `MC-F3-004`.
Archivos relevantes: `src/App.tsx`, `src/components/audit/*`.
Cambios permitidos: refactor incremental del workspace del caso.
NO tocar: dashboard del proceso.
Pasos de implementación: separar navegación de caso, evidencias, decisiones y trazabilidad.
Migraciones involucradas: ninguna.
Tests obligatorios: case workspace smoke.
Rollback: regresión del workspace a estado previo con feature flag.
Criterios de aceptación: caso individual y proceso no comparten el mismo eje operativo.
Definition of Done: workspace del caso claro y separado.

### Prompt F7-B — `MC-F7-002` | cockpit de mejora continua
Contexto: el proceso necesita dashboard agregado separado del caso.
Objetivo: construir cockpit operativo para proceso y métricas.
Dependencias: `MC-F5-003`.
Archivos relevantes: dashboard UI y API.
Cambios permitidos: creación de cockpit operacional.
NO tocar: case workspace.
Pasos de implementación: integrar KPI, acciones correctivas y SLA por proceso.
Migraciones involucradas: ninguna nueva.
Tests obligatorios: cockpit smoke.
Rollback: ocultar cockpit.
Criterios de aceptación: separación visual y funcional Caso/Proceso está presente.
Definition of Done: la operación del proceso queda visible y no mezclada con el caso.

---

## F8 — Integraciones/Saneamiento

### Prompt F8-A — `MC-F8-001` | integración externa
Contexto: hay integraciones que deben definirse con contrato claro.
Objetivo: preparar conectores externos con definición de entrada/salida y contract tests.
Dependencias: `MC-F7-002`.
Archivos relevantes: `src/lib/*`, backend adapters.
Cambios permitidos: contratos y adaptadores externos, sin asumir proveedor final.
NO tocar: policy engine ni reglas existentes.
Pasos de implementación: definir integrador por fuente, contrato, retry, y output normalizado.
Migraciones involucradas: ninguna nueva si aplica solo metadata.
Tests obligatorios: contract tests.
Rollback: desactivar adapter con feature flag.
Criterios de aceptación: integrador externo se encuentra desacoplado y observable.
Definition of Done: integración externa no rompe la operación principal.

### Prompt F8-B — `MC-F8-002` | saneamiento y huérfanos
Contexto: hay módulos y endpoints huérfanos que necesitan clasificación.
Objetivo: limpiar deuda sin quebrar producción.
Dependencias: `MC-F8-001`.
Archivos relevantes: `src/server/app.ts`, `src/hooks/*`, `src/components/global/*`.
Cambios permitidos: refactor, marca legacy o eliminación controlada.
NO tocar: funcionalidad con paridad no comprobada.
Pasos de implementación: listar huérfanos, clasificarlos y mantener feature flag para rollback.
Migraciones involucradas: ninguna si es no estructural.
Tests obligatorios: smoke UI y legacy route coverage.
Rollback: reactivar ruta o módulo antes de eliminación.
Criterios de aceptación: no quedan módulos muertos sin ownership.
Definition of Done: saneamiento controlado y sin riesgo para producción.

---

## F9 — Legacy

### Prompt F9-A — `MC-F9-001` | feature flag y rollback
Contexto: legacy requiere protección para evitar riesgo en producción.
Objetivo: dejar componentes y endpoints legacy bajo feature flags y rollback seguro.
Dependencias: `MC-F8-002`.
Archivos relevantes: `src/server/app.ts`, `src/server/jobs-router.ts`.
Cambios permitidos: feature flags de legacy y routing seguro.
NO tocar: decisiones de negocio ni estructura funcional activa.
Pasos de implementación: activar flags, monitorizar y documentar rollback.
Migraciones involucradas: ninguna nueva.
Tests obligatorios: rollback + feature flag tests.
Rollback: reactivar legacy mode.
Criterios de aceptación: legacy queda aislado y seguro.
Definition of Done: deprecación controlada sin pérdida de historial.

### Prompt F9-B — `MC-F9-002` | eliminación final controlada
Contexto: se debe retirar duplicados y dead code con seguridad.
Objetivo: asegurar paridad y eliminar solo lo que ya no se usa.
Dependencias: `MC-F9-001`.
Archivos relevantes: `src/server/*`, `src/hooks/*`, `src/components/*`.
Cambios permitidos: eliminación final confiable de huérfanos.
NO tocar: código activo sin pruebas de paridad.
Pasos de implementación: confirmar uso, retirar rutas y componentes, mantener backup de funcionalidad y rollback.
Migraciones involucradas: depende de eliminación estructural.
Tests obligatorios: API/UI regression plus legacy route coverage.
Rollback: devolver estado previo con git o respaldo.
Criterios de aceptación: deuda severa baja y sin regresión funcional.
Definition of Done: legacy fue retirado sin riesgo operativo.

---

## Reglas transversales
- cada ticket debe tener su prompt asociado;
- cada prompt debe tener dependencias, archivos, tests y criterios de aceptación;
- la numeración canónica es F0..F9;
- cada fase tiene su gate de salida o entrada;
- la implementación real no puede comenzar sin pasar gate de entrada.
