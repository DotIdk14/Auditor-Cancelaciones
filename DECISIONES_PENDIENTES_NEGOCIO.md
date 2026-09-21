# DECISIONES PENDIENTES DE NEGOCIO

## 1. Bloqueantes

### 1. Autenticación real y roles definitivos
- Afecta: policy, rules, approvals, `actor_user_id`, `policy_audit_log`.
- Decisión pendiente: qué identidad se usa para aprobar y revisar.
- Default técnico: mantener `created_by` text + `actor_user_id` nullable con mapping verificable.

### 2. Política y numerales oficiales
- Afecta: `policy`, `policy_version`, `policy_numeral`.
- Decisión pendiente: qué norma exacta se definirá como catálogo oficial.
- Default técnico: usar la policy activa actual como baseline mínima y no inventar numerales fuera de la norma vigente.

### 3. Modelo de roles y aprobaciones
- Afecta: `policy_version`, `ruleset_versions`, `policy_audit_log`.
- Decisión pendiente: quién aprueba, revisa y activa.
- Default técnico: `DRAFT -> REVIEW -> APPROVED -> ACTIVE -> RETIRED` en `policy_version` y `ruleset_versions`.

### 4. Estado real de producción
- Afecta: DDL, RLS, feature flags, migration plan.
- Decisión pendiente: qué DDL ya existe en producción y qué se puede añadir sin riesgo.
- Default técnico: no migración destructiva ni alteración de historial.

### 5. Definición de Mejora Continua operativa
- Afecta: `kpis`, `corrective_actions`, cockpit del proceso.
- Decisión pendiente: qué indicadores y qué acciones pertenecen al proceso y no al caso individual.
- Default técnico: separar caso individual y proceso agregado en dos canales distintos.

---

## 2. Importantes

### 6. Calendario institucional
- Afecta: `business_calendar`, fechas hábiles y SLA.
- Decisión pendiente: calendario oficial y feriados reales.
- Default técnico: `scope NOT NULL DEFAULT 'GLOBAL'` y calendar base configurable.

### 7. SLA y deadlines reales
- Afecta: `slas` y milestone del caso.
- Decisión pendiente: etapas y owner responsables.
- Default técnico: usar etapas genéricas y owner_role configurable.

### 8. KPIs oficiales
- Afecta: `kpis` y dashboards del proceso.
- Decisión pendiente: qué métricas son operativas y qué métricas son de reporting.
- Default técnico: catalogar KPI con `calculation_key`, filters, params, version y owner_role.

### 9. Backfill histórico
- Afecta: mapeo de actores, runs, y datos de decisiones.
- Decisión pendiente: cuándo se hace backfill verificable y cuándo queda `legacy`.
- Default técnico: conservar histórico y no sobreescribir `created_by` o runs viejos.

---

## 3. Deseables

### 10. Integraciones externas
- Afecta: orden de trabajo, data ingestion y evidencias.
- Default técnico: mantener conectores desacoplados y no asumiendo scraping manual.

### 11. Notificaciones
- Afecta: alerts de SLA y actions.
- Default técnico: bus de eventos abstracto.

### 12. Exportación de reportes
- Afecta: dashboard y reporting.
- Default técnico: export por JSON/CSV/PDF en servicio backend.

---

## 4. Regla de decisión

Mientras el negocio no responda, el sistema debe operar con:
- policy catalogado y versionado
- rulesetVersion + members + hash
- lifecycle, outcome y execution status separados
- `created_by` legacy conservado + `actor_user_id` opcional
- `business_calendar` con `scope='GLOBAL'` por defecto
- KPI sin SQL ejecutable
- rollback no destructivo
- trazabilidad por caso/evidencia/regla

Esto mantiene la arquitectura segura y viable sin bloquear la ejecución del plan.
