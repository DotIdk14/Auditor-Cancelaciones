-- MC-F2-001: persistent metadata/versioning for existing TypeScript rules.
-- The TypeScript RuleRegistry remains the execution authority.

CREATE TABLE IF NOT EXISTS public.rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version_id UUID NOT NULL REFERENCES public.policy_version(id) ON DELETE RESTRICT,
  numeral_id UUID REFERENCES public.policy_numeral(id) ON DELETE RESTRICT,
  rule_key TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL CHECK (priority >= 0),
  implementation_key TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'ACTIVE', 'RETIRED')),
  created_by TEXT,
  actor_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (policy_version_id, rule_key, version),
  UNIQUE (policy_version_id, code, version)
);

CREATE INDEX IF NOT EXISTS rules_policy_version_idx ON public.rules (policy_version_id, status);
CREATE INDEX IF NOT EXISTS rules_numeral_idx ON public.rules (numeral_id);
CREATE UNIQUE INDEX IF NOT EXISTS rules_one_active_per_key_idx
  ON public.rules (policy_version_id, rule_key) WHERE status = 'ACTIVE';

CREATE OR REPLACE FUNCTION public.validate_rule_lifecycle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status IN ('APPROVED', 'ACTIVE') THEN
    RAISE EXCEPTION 'APPROVED or ACTIVE rules are immutable';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'DRAFT' AND NEW.status NOT IN ('DRAFT', 'REVIEW') THEN
      RAISE EXCEPTION 'Invalid rule transition: DRAFT -> %', NEW.status;
    ELSIF OLD.status = 'REVIEW' AND NEW.status NOT IN ('REVIEW', 'APPROVED') THEN
      RAISE EXCEPTION 'Invalid rule transition: REVIEW -> %', NEW.status;
    ELSIF OLD.status = 'APPROVED' AND NEW.status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'Invalid rule transition: APPROVED -> %', NEW.status;
    ELSIF OLD.status = 'ACTIVE' AND NEW.status <> 'RETIRED' THEN
      RAISE EXCEPTION 'Invalid rule transition: ACTIVE -> %', NEW.status;
    ELSIF OLD.status IN ('APPROVED', 'ACTIVE') AND (
      NEW.policy_version_id IS DISTINCT FROM OLD.policy_version_id OR
      NEW.numeral_id IS DISTINCT FROM OLD.numeral_id OR
      NEW.rule_key IS DISTINCT FROM OLD.rule_key OR
      NEW.code IS DISTINCT FROM OLD.code OR
      NEW.name IS DISTINCT FROM OLD.name OR
      NEW.description IS DISTINCT FROM OLD.description OR
      NEW.priority IS DISTINCT FROM OLD.priority OR
      NEW.implementation_key IS DISTINCT FROM OLD.implementation_key OR
      NEW.version IS DISTINCT FROM OLD.version OR
      NEW.created_by IS DISTINCT FROM OLD.created_by OR
      NEW.actor_user_id IS DISTINCT FROM OLD.actor_user_id OR
      NEW.metadata IS DISTINCT FROM OLD.metadata
    ) THEN
      RAISE EXCEPTION 'APPROVED or ACTIVE rule content is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rules_lifecycle_guard ON public.rules;
CREATE TRIGGER rules_lifecycle_guard
  BEFORE UPDATE OR DELETE ON public.rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_rule_lifecycle();

INSERT INTO public.permissions (code, name, description) VALUES
  ('rules.read', 'Read rules', 'Read versioned rule metadata.'),
  ('rules.draft.create', 'Create rule draft', 'Create a draft rule version.'),
  ('rules.draft.update', 'Edit rule draft', 'Edit draft rule metadata.'),
  ('rules.review.submit', 'Submit rule review', 'Submit a rule draft for review.'),
  ('rules.review', 'Review rule', 'Review a submitted rule version.'),
  ('rules.approve', 'Approve rule', 'Approve a reviewed rule version.'),
  ('rules.activate', 'Activate rule', 'Activate an approved rule version.'),
  ('rules.retire', 'Retire rule', 'Retire an active rule version.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.code = 'policy_admin' AND p.code IN (
  'rules.read', 'rules.draft.create', 'rules.draft.update', 'rules.review.submit',
  'rules.review', 'rules.approve', 'rules.activate', 'rules.retire'
)
ON CONFLICT DO NOTHING;

ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rules FROM anon;
GRANT SELECT ON public.rules TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rules FROM authenticated;
CREATE POLICY "rules_read_authenticated" ON public.rules FOR SELECT TO authenticated USING (true);
