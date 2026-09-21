import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationDirectory = path.join(repositoryRoot, 'migrations');
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required. Refusing to use DATABASE_URL or InsForge credentials.');
}

const database = new URL(testDatabaseUrl);
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
if (!localHosts.has(database.hostname) && process.env.TEST_DATABASE_NONPRODUCTION_CONFIRM !== 'auditor-test') {
  throw new Error('Refusing non-local PostgreSQL. Set TEST_DATABASE_NONPRODUCTION_CONFIRM=auditor-test only for an explicitly identified non-production test DB.');
}

const client = new Client({ connectionString: testDatabaseUrl });
const bootstrapSql = `
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE SCHEMA IF NOT EXISTS system;
  CREATE OR REPLACE FUNCTION system.update_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  END $$;
`;

const requiredTables = [
  'roles', 'permissions', 'role_permissions', 'user_roles',
  'policy', 'policy_version', 'policy_numeral', 'policy_audit_log',
];

async function query(text, values) {
  return client.query(text, values);
}

function assert(condition, message) {
  if (!condition) throw new Error(`DB assertion failed: ${message}`);
}

async function expectFailure(label, operation) {
  const savepoint = `sp_${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
  await query(`SAVEPOINT ${savepoint}`);
  try {
    await operation();
    await query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await query(`RELEASE SAVEPOINT ${savepoint}`);
  } catch {
    await query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await query(`RELEASE SAVEPOINT ${savepoint}`);
    return;
  }
  throw new Error(`Expected PostgreSQL operation to fail: ${label}`);
}

async function main() {
  await client.connect();
  try {
    await query('BEGIN');
    await query(bootstrapSql);

    const migrationFiles = (await fs.readdir(migrationDirectory))
      .filter((file) => /^\d+.*\.sql$/.test(file))
      .sort();
    assert(migrationFiles.length > 0, 'no migrations found');

    for (const file of migrationFiles) {
      process.stdout.write(`Applying ${file}\n`);
      await query(await fs.readFile(path.join(migrationDirectory, file), 'utf8'));
    }

    const tableRows = await query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [requiredTables],
    );
    assert(tableRows.rowCount === requiredTables.length, 'all F1 tables exist');

    const actorColumns = await query(
      `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND ((table_name = 'tickets' AND column_name = 'created_by')
           OR (table_name = 'dictamen_versions' AND column_name IN ('approved_by', 'created_by'))
           OR (table_name = 'audit_events' AND column_name = 'actor')
           OR (column_name LIKE '%user_id' AND table_name IN ('tickets', 'evidences', 'decision_runs', 'dictamen_versions', 'audit_events')))
       ORDER BY table_name, column_name`,
    );
    const actorMap = new Map(actorColumns.rows.map((row) => [`${row.table_name}.${row.column_name}`, row]));
    for (const key of ['tickets.created_by', 'dictamen_versions.approved_by', 'dictamen_versions.created_by', 'audit_events.actor']) {
      assert(actorMap.get(key)?.data_type === 'text', `${key} remains TEXT`);
    }
    for (const row of actorColumns.rows.filter((item) => item.column_name.endsWith('user_id'))) {
      assert(row.data_type === 'uuid' && row.is_nullable === 'YES', `${row.table_name}.${row.column_name} is nullable UUID`);
    }

    const roles = await query("SELECT code FROM public.roles WHERE code IN ('auditor','reviewer','policy_admin','admin')");
    const permissions = await query('SELECT code FROM public.permissions');
    assert(roles.rowCount === 4, 'baseline roles seeded');
    assert(permissions.rowCount >= 12, 'baseline permissions seeded');
    const assignments = await query('SELECT COUNT(*)::int AS count FROM public.role_permissions');
    assert(assignments.rows[0].count >= 12, 'role permission assignments seeded');

    const rls = await query(
      `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])`,
      [requiredTables],
    );
    assert(rls.rowCount === requiredTables.length && rls.rows.every((row) => row.relrowsecurity), 'RLS enabled on every F1 table');

    const policies = await query(
      `SELECT tablename, policyname, cmd FROM pg_policies
       WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [requiredTables],
    );
    for (const table of ['policy', 'policy_version', 'policy_numeral', 'policy_audit_log', 'roles', 'permissions']) {
      assert(policies.rows.some((row) => row.tablename === table), `${table} has an installed policy`);
    }

    assert(await query("SELECT has_table_privilege('authenticated', 'public.policy', 'SELECT')" ).then((result) => result.rows[0].has_table_privilege), 'authenticated can read policy');
    assert(!(await query("SELECT has_table_privilege('authenticated', 'public.policy', 'INSERT')")).rows[0].has_table_privilege, 'authenticated cannot insert policy directly');

    const legacy = await query("INSERT INTO public.tickets (folio, created_by) VALUES ('TEST-F1-LEGACY', 'legacy-auditor') RETURNING created_by");
    assert(legacy.rows[0].created_by === 'legacy-auditor', 'legacy actor text survives');

    const policy = await query("INSERT INTO public.policy (code, name, created_by) VALUES ('TEST_POLICY', 'Test policy', 'legacy-auditor') RETURNING id");
    const policyId = policy.rows[0].id;
    const firstVersion = await query("INSERT INTO public.policy_version (policy_id, version, hash) VALUES ($1, '1.0', 'test-hash-1') RETURNING id", [policyId]);
    const secondVersion = await query("INSERT INTO public.policy_version (policy_id, version, hash) VALUES ($1, '2.0', 'test-hash-2') RETURNING id", [policyId]);
    await query("INSERT INTO public.policy_audit_log (actor_legacy, entity_type, entity_id, action, after_snapshot) VALUES ('legacy-auditor', 'policy', $1, 'created', '{}'::jsonb)", [policyId]);
    await expectFailure('audit log UPDATE', () => query("UPDATE public.policy_audit_log SET reason = 'tampered' WHERE entity_id = $1", [policyId]));
    await expectFailure('audit log DELETE', () => query("DELETE FROM public.policy_audit_log WHERE entity_id = $1", [policyId]));

    await query("UPDATE public.policy_version SET status = 'REVIEW' WHERE id = $1", [firstVersion.rows[0].id]);
    await query("UPDATE public.policy_version SET status = 'APPROVED' WHERE id = $1", [firstVersion.rows[0].id]);
    await expectFailure('approved policy version content mutation', () => query("UPDATE public.policy_version SET source_text = 'tampered' WHERE id = $1", [firstVersion.rows[0].id]));
    await query("UPDATE public.policy_version SET status = 'ACTIVE' WHERE id = $1", [firstVersion.rows[0].id]);
    await expectFailure('active policy version content mutation', () => query("UPDATE public.policy_version SET hash = 'tampered' WHERE id = $1", [firstVersion.rows[0].id]));
    await expectFailure('second ACTIVE policy version', () => query("UPDATE public.policy_version SET status = 'ACTIVE' WHERE id = $1", [secondVersion.rows[0].id]));
    await expectFailure('invalid effective date range', () => query("INSERT INTO public.policy_version (policy_id, version, effective_from, effective_to, hash) VALUES ($1, '3.0', '2026-02-01', '2026-01-01', 'test-hash-3')", [policyId]));

    await query('SET LOCAL ROLE authenticated');
    await expectFailure('authenticated policy INSERT grant', () => query("INSERT INTO public.policy (code, name) VALUES ('TEST_DENIED', 'Denied')"));
    await query('RESET ROLE');

    await query('ROLLBACK');
    console.log(`F1 DB integration: PASS (${migrationFiles.length} migrations, schema/RLS/grants/legacy/append-only/workflow verified)`);
  } catch (error) {
    await query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

await main();
