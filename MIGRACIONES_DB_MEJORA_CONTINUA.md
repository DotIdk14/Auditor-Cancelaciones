# MIGRACIONES DB — MEJORA CONTINUA

## 1. Principio de diseño

Estas migraciones no se ejecutan. Son un diseño de referencia para un rollout incremental y seguro. La clave es extender la base actual sin duplicar fuentes de verdad.

Reglas:
- `tickets` sigue siendo la raíz del caso.
- `evidences` y `extracted_facts` siguen siendo entidades de evidencia/hechos.
- No se crea `case` SQL ni un `evidence` duplicado.
- `policy_version` y `ruleset_versions` son la base del gobierno.
- La migración de identidad es aditiva y no destructiva.

---

## 2. Orden de migraciones

### F0 — preparación técnica
- RLS y grants para tablas existentes.
- feature flags de infraestructura.
- compatibilidad cuando `created_by` es texto histórico.

### F1 — identidad y gobierno
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `policy`
- `policy_version`
- `policy_numeral`
- `policy_audit_log`
- `actor_user_id` en tablas relevantes

### F2 — rulesets y reglas
- `rules`
- `rule_conditions`
- `evidence_requirements`
- `ruleset_versions`
- `ruleset_members`
- extensiones de `decision_runs` y `rule_evaluations`
- adapter DB -> RuleRegistry

### F3 — evidencia y trazabilidad
- `consistency_events`
- `fact_evidence_links` si hace falta
- metadata de trazabilidad en `extracted_facts` y `evidences`

### F4 — calendario/SLA
- `business_calendar`
- `slas`

### F5 — KPI
- `kpis`
- filtros y cálculo por backend

### F6 — acciones correctivas
- `corrective_actions`

## 2.1 Fuente de verdad canónica de reglas

La precedencia es explícita y no implícita:

1. Configuración base de la regla (`rules`, `rule_conditions`, `evidence_requirements`)
2. Overrides del ruleset (`ruleset_members.overrides_*`)
3. Snapshot/hash ejecutado (`decision_runs.ruleset_hash` + `rule_evaluations`)

`ruleset_members` no puede ser la fuente canónica de `parameters`, `thresholds` ni `evidence requirements`; solo puede aportar overrides explícitos de un ruleset concreto.

`evidence_requirements` es la tabla canónica de evidencia requerida. `ruleset_members.evidence_requirements` solo puede existir como `overrides_evidence_requirements` del ruleset y nunca como duplicado del modelo canónico.

## 2.2 Versionado de rules

Modelo elegido: A. cada fila de `rules` es una versión inmutable.

- `rules` tiene `rule_key` (identificador estable del concepto)
- `version` (texto de versión)
- `UNIQUE(rule_key, version)`
- no updates in-place de registros `APPROVED/ACTIVE`
- cualquier cambio normativo crea una nueva fila con `version` incrementada
- `ruleset_versions.hash` se calcula determinísticamente sobre `(rule_key, version, conditions hash, evidence requirements hash)`

Esto permite reconstruir un run exacto sin depender de un `UPDATE` sobre la misma fila.

---

## 3. Migraciones y tablas clave

### 3.1 `policy`
```sql
CREATE TABLE public.policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('ENABLED','ARCHIVED')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- Propósito: catalogar la norma.
- RLS: escritura solo para policy-admin/admin.

### 3.2 `policy_version`
```sql
CREATE TABLE public.policy_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policy(id),
  version TEXT NOT NULL,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','REVIEW','APPROVED','ACTIVE','RETIRED')),
  hash TEXT NOT NULL,
  source_text TEXT,
  created_by TEXT,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  UNIQUE(policy_id, version)
);
```
- Propósito: versionar la política y su workflow.
- Backfill: crear la versión actual activa como snapshot inicial.

### 3.3 `policy_numeral`
```sql
CREATE TABLE public.policy_numeral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version_id UUID NOT NULL REFERENCES public.policy_version(id),
  code TEXT NOT NULL,
  title TEXT,
  text TEXT NOT NULL,
  order_index INT NOT NULL,
  process_area TEXT,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(policy_version_id, code)
);
```

### 3.4 `rules`
```sql
CREATE TABLE public.rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version_id UUID NOT NULL REFERENCES public.policy_version(id),
  numeral_id UUID REFERENCES public.policy_numeral(id),
  rule_key TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  implementation_key TEXT,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','REVIEW','APPROVED','ACTIVE','RETIRED')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(policy_version_id, rule_key, version),
  UNIQUE(policy_version_id, code, version)
);
```
- `rule_key` es el identificador estable del concepto.
- `version` identifica cada iteración normativa.
- un cambio aprobado/activo requiere nueva fila con nueva versión, no `UPDATE`.

### 3.5 `rule_conditions`
```sql
CREATE TABLE public.rule_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.rules(id),
  condition_type TEXT NOT NULL,
  field_path TEXT,
  operator TEXT CHECK (operator IN ('eq','ne','gt','gte','lt','lte','in','exists','and','or','not')),
  value JSONB,
  threshold NUMERIC,
  order_index INT NOT NULL,
  metadata JSONB DEFAULT '{}'
);
```

### 3.6 `evidence_requirements`
```sql
CREATE TABLE public.evidence_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.rules(id),
  numeral_id UUID REFERENCES public.policy_numeral(id),
  requirement_code TEXT NOT NULL,
  evidence_type TEXT,
  minimum_count INT NOT NULL DEFAULT 1,
  required BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'
);
```

### 3.7 `ruleset_versions`
```sql
CREATE TABLE public.ruleset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version_id UUID NOT NULL REFERENCES public.policy_version(id),
  version TEXT NOT NULL,
  hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','REVIEW','APPROVED','ACTIVE','RETIRED')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  UNIQUE(policy_version_id, version)
);
```

### 3.8 `ruleset_members`
```sql
CREATE TABLE public.ruleset_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset_version_id UUID NOT NULL REFERENCES public.ruleset_versions(id),
  rule_id UUID NOT NULL REFERENCES public.rules(id),
  priority INT NOT NULL,
  overrides_parameters JSONB DEFAULT '{}',
  overrides_thresholds JSONB DEFAULT '{}',
  overrides_evidence_requirements JSONB DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','DISABLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ruleset_version_id, rule_id)
);
```

### 3.9 `rule_conditions` / `evidence_requirements` restrictions

`ruleset_members` no debe incluir `parameters`, `thresholds` ni `evidence_requirements` como JSONB canónico. Si ese ruleset requiere un ajuste específico, debe venir bajo `overrides_*` y seguir la precedencia:

base rule config → ruleset overrides → snapshot/hash ejecutado

### 3.10 `decision_runs` extensional
```sql
ALTER TABLE public.decision_runs
  ADD COLUMN policy_version_id UUID REFERENCES public.policy_version(id),
  ADD COLUMN ruleset_version_id UUID REFERENCES public.ruleset_versions(id),
  ADD COLUMN ruleset_hash TEXT,
  ADD COLUMN actor_user_id UUID NULL,
  ADD COLUMN actor_legacy TEXT,
  ADD COLUMN inputs JSONB,
  ADD COLUMN outputs JSONB;
```

### 3.11 `rule_evaluations` extensional
```sql
ALTER TABLE public.rule_evaluations
  ADD COLUMN rule_id UUID REFERENCES public.rules(id),
  ADD COLUMN evidence_refs JSONB,
  ADD COLUMN missing_evidence JSONB,
  ADD COLUMN explanation TEXT;
```

### 3.7 `rule_conditions`
```sql
CREATE TABLE public.rule_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.rules(id),
  condition_type TEXT NOT NULL,
  field_path TEXT,
  operator TEXT CHECK (operator IN ('eq','ne','gt','gte','lt','lte','in','exists','and','or','not')),
  value JSONB,
  threshold NUMERIC,
  order_index INT NOT NULL,
  metadata JSONB DEFAULT '{}'
);
```

### 3.8 `evidence_requirements`
```sql
CREATE TABLE public.evidence_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.rules(id),
  numeral_id UUID REFERENCES public.policy_numeral(id),
  requirement_code TEXT NOT NULL,
  evidence_type TEXT,
  minimum_count INT NOT NULL DEFAULT 1,
  required BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'
);
```

### 3.9 `decision_runs` extensional
```sql
ALTER TABLE public.decision_runs
  ADD COLUMN policy_version_id UUID REFERENCES public.policy_version(id),
  ADD COLUMN ruleset_version_id UUID REFERENCES public.ruleset_versions(id),
  ADD COLUMN ruleset_hash TEXT,
  ADD COLUMN actor_user_id UUID NULL,
  ADD COLUMN actor_legacy TEXT,
  ADD COLUMN inputs JSONB,
  ADD COLUMN outputs JSONB;
```
- No es destructivo.
- Backfill solo cuando exista mapeo verificado; el resto queda legacy con trazabilidad.

### 3.10 `rule_evaluations` extensional
```sql
ALTER TABLE public.rule_evaluations
  ADD COLUMN rule_id UUID REFERENCES public.rules(id),
  ADD COLUMN evidence_refs JSONB,
  ADD COLUMN missing_evidence JSONB,
  ADD COLUMN explanation TEXT;
```

### 3.11 `consistency_events`
```sql
CREATE TABLE public.consistency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_run_id UUID REFERENCES public.decision_runs(id),
  source TEXT NOT NULL CHECK (source IN ('AI','TS','HYBRID')),
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.13 `kpis`
```sql
CREATE TABLE public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  function_area TEXT NOT NULL,
  population_definition TEXT,
  calculation_key TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  owner_role TEXT,
  threshold NUMERIC,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','ACTIVE','RETIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.14 `roles`
```sql
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.15 `permissions`
```sql
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.16 `role_permissions`
```sql
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id),
  permission_id UUID NOT NULL REFERENCES public.permissions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);
```

### 3.17 `user_roles`
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id),
  source TEXT NOT NULL DEFAULT 'LEGACY',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);
```

### 3.18 `policy_audit_log`
```sql
CREATE TABLE public.policy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_verifiable UUID,
  actor_legacy TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('policy','policy_version','numeral','rule','ruleset')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_snapshot JSONB,
  after_snapshot JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `entity_type` y `entity_id` identifican la entidad auditada.
- `actor_verifiable` si existe identidad real.
- `actor_legacy` si solo existe trazabilidad histórica.
- No se almacena aquí IA inconsistency; eso va en `consistency_events`.

### 3.19 `immutability rule`

Las siguientes entidades son inmutables después de `APPROVED/ACTIVE`:
- `policy_version`
- `rules`
- `ruleset_versions`
- `ruleset_members` asociados
- `decision_runs`
- `rule_evaluations` históricas

Se fuerza mediante servicio de dominio + API + trigger/DDL recomendado. La elección preferida es:
- dominio + API para validación inicial;
- trigger/constraint DB para protección final si la plataforma lo soporta;
- RLS como control de acceso, no como sustituto de inmutabilidad.

Esto evita `UPDATE` in-place y protege el historial de decisiones.

### 3.20 `business_calendar`
```sql
CREATE TABLE public.business_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_type TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'GLOBAL',
  date DATE NOT NULL,
  is_business_day BOOLEAN NOT NULL,
  description TEXT,
  source TEXT,
  UNIQUE(calendar_type, scope, date)
);
```

### 3.14 `slas`
```sql
CREATE TABLE public.slas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  stage TEXT NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  calendar_type TEXT NOT NULL,
  policy_version_id UUID REFERENCES public.policy_version(id),
  owner_role TEXT,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','ACTIVE','RETIRED')),
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  warning_threshold INT,
  critical_threshold INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.15 `corrective_actions`
```sql
CREATE TABLE public.corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID REFERENCES public.kpis(id),
  ticket_id UUID REFERENCES public.tickets(id),
  title TEXT NOT NULL,
  description TEXT,
  root_cause TEXT,
  owner_id UUID,
  status TEXT NOT NULL CHECK (status IN ('OPEN','IN_PROGRESS','PENDING_REVIEW','CLOSED')),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  evidence_url TEXT,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Seguridad y RLS

Toda tabla sensible debe nacer con grants, RLS y policies. Es obligatorio para:
- `policy_version`
- `policy_numeral`
- `rules`
- `ruleset_versions`
- `ruleset_members`
- `policy_audit_log`
- roles / approvals
- `consistency_events`

---

## 5. Backfill y compatibilidad histórica

- `created_by` y `approved_by` deben mantenerse como texto histórico.
- `actor_user_id` se añade como nullable y se rellena con identidad verificada.
- si no hay match, se conserva el actor legacy y la trazabilidad no se pierde.
- los datos históricos no pueden borrarse por rollback operativo.

---

## 6. Rollback real

- Desarrollo: `DROP` permitido solo si no toca producción y no es un cambio canónico.
- Producción: desactivar, revertir a versión anterior, conservar histórico y usar feature flags.

Nunca se elimina una policy, ruleset o evidencia operativa para hacer rollback.

---

## 7. Conclusión

La migración correcta no crea una segunda fuente de verdad ni destruye la historia de actores y decisiones. La estrategia es extender el modelo actual con policy, rulesets, SLA, KPI y trazabilidad, manteniendo `tickets`, `evidences` y `decision_runs` como eje operativo.
