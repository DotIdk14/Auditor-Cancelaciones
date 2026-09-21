-- F1 identity and governance. Additive only; do not backfill unresolved actors.

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'manual', 'legacy')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

INSERT INTO public.roles (code, name, description, is_system) VALUES
  ('auditor', 'Auditor', 'Read and audit case operations.', TRUE),
  ('reviewer', 'Reviewer', 'Review policy versions and audit cases.', TRUE),
  ('policy_admin', 'Policy administrator', 'Manage policy drafts and lifecycle.', TRUE),
  ('admin', 'Administrator', 'Manage RBAC and governance.', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.permissions (code, name, description) VALUES
  ('case.read', 'Read case', 'Read authorized case data.'),
  ('case.audit', 'Audit case', 'Perform authorized case audits.'),
  ('policy.read', 'Read policy', 'Read policy catalog and versions.'),
  ('policy.draft.create', 'Create policy draft', 'Create policies and draft versions.'),
  ('policy.draft.update', 'Edit policy draft', 'Edit draft policy content and numerals.'),
  ('policy.review.submit', 'Submit policy review', 'Submit a draft for review.'),
  ('policy.review', 'Review policy', 'Review a submitted policy version.'),
  ('policy.approve', 'Approve policy', 'Approve a reviewed policy version.'),
  ('policy.activate', 'Activate policy', 'Activate an approved policy version.'),
  ('policy.retire', 'Retire policy', 'Retire an active policy version.'),
  ('governance.audit.read', 'Read governance audit log', 'Read policy governance history.'),
  ('rbac.manage', 'Manage RBAC', 'Manage roles and permissions assignments.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.code IN (
  'case.read', 'case.audit', 'policy.read'
) WHERE r.code = 'auditor'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.code IN (
  'case.read', 'case.audit', 'policy.read', 'policy.review'
) WHERE r.code = 'reviewer'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.code IN (
  'policy.read', 'policy.draft.create', 'policy.draft.update', 'policy.review.submit',
  'policy.review', 'policy.approve', 'policy.activate', 'policy.retire', 'governance.audit.read'
) WHERE r.code = 'policy_admin'
ON CONFLICT DO NOTHING;

-- Add verified identity alongside historical text. No backfill is performed.
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS actor_user_id UUID;
ALTER TABLE public.evidences ADD COLUMN IF NOT EXISTS actor_user_id UUID;
ALTER TABLE public.decision_runs ADD COLUMN IF NOT EXISTS actor_user_id UUID;
ALTER TABLE public.dictamen_versions ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE public.dictamen_versions ADD COLUMN IF NOT EXISTS approved_by_user_id UUID;
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS actor_user_id UUID;

CREATE TABLE IF NOT EXISTS public.policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ENABLED' CHECK (status IN ('ENABLED', 'ARCHIVED')),
  created_by TEXT,
  actor_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.policy_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policy(id) ON DELETE RESTRICT,
  version TEXT NOT NULL,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'ACTIVE', 'RETIRED')),
  hash TEXT NOT NULL,
  source_text TEXT,
  created_by TEXT,
  approved_by TEXT,
  created_by_user_id UUID,
  approved_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (policy_id, version),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS policy_version_one_active_idx
  ON public.policy_version (policy_id) WHERE status = 'ACTIVE';

CREATE OR REPLACE FUNCTION public.validate_policy_version_lifecycle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'DRAFT' AND NEW.status NOT IN ('DRAFT', 'REVIEW') THEN
      RAISE EXCEPTION 'Invalid policy version transition: DRAFT -> %', NEW.status;
    ELSIF OLD.status = 'REVIEW' AND NEW.status NOT IN ('REVIEW', 'APPROVED') THEN
      RAISE EXCEPTION 'Invalid policy version transition: REVIEW -> %', NEW.status;
    ELSIF OLD.status = 'APPROVED' AND NEW.status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'Invalid policy version transition: APPROVED -> %', NEW.status;
    ELSIF OLD.status = 'ACTIVE' AND NEW.status <> 'RETIRED' THEN
      RAISE EXCEPTION 'Invalid policy version transition: ACTIVE -> %', NEW.status;
    ELSIF OLD.status IN ('APPROVED', 'ACTIVE') AND (
      NEW.policy_id IS DISTINCT FROM OLD.policy_id OR
      NEW.version IS DISTINCT FROM OLD.version OR
      NEW.effective_from IS DISTINCT FROM OLD.effective_from OR
      NEW.effective_to IS DISTINCT FROM OLD.effective_to OR
      NEW.hash IS DISTINCT FROM OLD.hash OR
      NEW.source_text IS DISTINCT FROM OLD.source_text OR
      NEW.created_by IS DISTINCT FROM OLD.created_by OR
      NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id OR
      NEW.metadata IS DISTINCT FROM OLD.metadata
    ) THEN
      RAISE EXCEPTION 'APPROVED or ACTIVE policy version content is immutable';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' AND OLD.status IN ('APPROVED', 'ACTIVE') THEN
    RAISE EXCEPTION 'APPROVED or ACTIVE policy versions are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS policy_version_lifecycle_guard ON public.policy_version;
CREATE TRIGGER policy_version_lifecycle_guard
  BEFORE UPDATE OR DELETE ON public.policy_version
  FOR EACH ROW EXECUTE FUNCTION public.validate_policy_version_lifecycle();

CREATE TABLE IF NOT EXISTS public.policy_numeral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version_id UUID NOT NULL REFERENCES public.policy_version(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  title TEXT,
  text TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  process_area TEXT,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (policy_version_id, code),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS public.policy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_verifiable UUID,
  actor_legacy TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('policy', 'policy_version', 'numeral', 'rule', 'ruleset')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_snapshot JSONB,
  after_snapshot JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS policy_status_idx ON public.policy (status);
CREATE INDEX IF NOT EXISTS policy_version_status_idx ON public.policy_version (policy_id, status);
CREATE INDEX IF NOT EXISTS policy_numeral_order_idx ON public.policy_numeral (policy_version_id, order_index);
CREATE INDEX IF NOT EXISTS policy_audit_entity_idx ON public.policy_audit_log (entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.reject_policy_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'policy_audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS policy_audit_log_no_update ON public.policy_audit_log;
CREATE TRIGGER policy_audit_log_no_update
  BEFORE UPDATE OR DELETE ON public.policy_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.reject_policy_audit_mutation();

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_numeral ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.roles, public.permissions, public.role_permissions, public.user_roles,
  public.policy, public.policy_version, public.policy_numeral, public.policy_audit_log FROM anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.roles, public.permissions, public.role_permissions, public.policy,
  public.policy_version, public.policy_numeral TO authenticated;

-- No authenticated client receives mutation grants. The server service role performs writes
-- after requirePermission; deployment remains blocked until a trusted auth provider is wired.
REVOKE INSERT, UPDATE, DELETE ON public.roles, public.permissions, public.role_permissions,
  public.user_roles, public.policy, public.policy_version, public.policy_numeral,
  public.policy_audit_log FROM authenticated;

CREATE POLICY "policy_read_authenticated" ON public.policy FOR SELECT TO authenticated USING (true);
CREATE POLICY "policy_version_read_authenticated" ON public.policy_version FOR SELECT TO authenticated USING (true);
CREATE POLICY "policy_numeral_read_authenticated" ON public.policy_numeral FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_catalog_read_authenticated" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "permission_catalog_read_authenticated" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permission_read_authenticated" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "policy_audit_read_authenticated" ON public.policy_audit_log FOR SELECT TO authenticated USING (true);
