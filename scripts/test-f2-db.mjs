import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL is required.');
const parsed = new URL(url);
if (!new Set(['localhost', '127.0.0.1', '::1']).has(parsed.hostname) && process.env.TEST_DATABASE_NONPRODUCTION_CONFIRM !== 'auditor-test') {
  throw new Error('Refusing non-local PostgreSQL without explicit non-production confirmation.');
}
const client = new Client({ connectionString: url });
const migrations = (await fs.readdir(path.join(root, 'migrations'))).filter((file) => /^\d+.*\.sql$/.test(file)).sort();
const bootstrap = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY, email TEXT UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE SCHEMA IF NOT EXISTS system;
CREATE OR REPLACE FUNCTION system.update_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;
`;
async function q(text, values) { return client.query(text, values); }
async function fail(label, operation) {
  const savepoint = `f2_${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
  await q(`SAVEPOINT ${savepoint}`);
  try { await operation(); } catch { await q(`ROLLBACK TO SAVEPOINT ${savepoint}`); await q(`RELEASE SAVEPOINT ${savepoint}`); return; }
  await q(`ROLLBACK TO SAVEPOINT ${savepoint}`); await q(`RELEASE SAVEPOINT ${savepoint}`);
  throw new Error(`Expected failure: ${label}`);
}
await client.connect();
try {
  await q('BEGIN');
  await q(bootstrap);
  for (const file of migrations) await q(await fs.readFile(path.join(root, 'migrations', file), 'utf8'));
  const policy = await q("INSERT INTO policy (code, name) VALUES ('F2_TEST_POLICY', 'F2 test policy') RETURNING id");
  const version = await q("INSERT INTO policy_version (policy_id, version, hash, status) VALUES ($1, 'F2-1', 'f2-test', 'ACTIVE') RETURNING id", [policy.rows[0].id]);
  const numeral = await q("INSERT INTO policy_numeral (policy_version_id, code, text, order_index) VALUES ($1, 'TEST-1', 'Fixture only', 1) RETURNING id", [version.rows[0].id]);
  const rule = await q("INSERT INTO rules (policy_version_id, numeral_id, rule_key, code, name, priority, implementation_key, version) VALUES ($1, $2, 'RULE_NODO0_ELIGIBILITY', 'TEST-RULE', 'F2 test rule', 0, 'RULE_NODO0_ELIGIBILITY', '1') RETURNING id", [version.rows[0].id, numeral.rows[0].id]);
  await fail('duplicate rule version', () => q("INSERT INTO rules (policy_version_id, rule_key, code, name, priority, implementation_key, version) VALUES ($1, 'RULE_NODO0_ELIGIBILITY', 'TEST-RULE-2', 'Duplicate', 0, 'RULE_NODO0_ELIGIBILITY', '1')", [version.rows[0].id]));
  await fail('invalid policy foreign key', () => q("INSERT INTO rules (policy_version_id, rule_key, code, name, priority, implementation_key, version) VALUES ('00000000-0000-0000-0000-000000000000', 'X', 'X', 'X', 0, 'RULE_NODO0_ELIGIBILITY', '1')"));
  await q("UPDATE rules SET status = 'REVIEW' WHERE id = $1", [rule.rows[0].id]);
  await q("UPDATE rules SET status = 'APPROVED' WHERE id = $1", [rule.rows[0].id]);
  await fail('approved rule content mutation', () => q("UPDATE rules SET name = 'tampered' WHERE id = $1", [rule.rows[0].id]));
  await q("UPDATE rules SET status = 'ACTIVE' WHERE id = $1", [rule.rows[0].id]);
  await fail('active rule content mutation', () => q("UPDATE rules SET priority = 99 WHERE id = $1", [rule.rows[0].id]));
  await fail('invalid active to approved transition', () => q("UPDATE rules SET status = 'APPROVED' WHERE id = $1", [rule.rows[0].id]));
  await fail('active rule delete', () => q("DELETE FROM rules WHERE id = $1", [rule.rows[0].id]));
  const secondRule = await q("INSERT INTO rules (policy_version_id, numeral_id, rule_key, code, name, priority, implementation_key, version) VALUES ($1, $2, 'RULE_NODO0_ELIGIBILITY', 'TEST-RULE-2', 'F2 second version', 0, 'RULE_NODO0_ELIGIBILITY', '2') RETURNING id", [version.rows[0].id, numeral.rows[0].id]);
  await q("UPDATE rules SET status = 'REVIEW' WHERE id = $1", [secondRule.rows[0].id]);
  await q("UPDATE rules SET status = 'APPROVED' WHERE id = $1", [secondRule.rows[0].id]);
  await fail('two active versions for one rule key', () => q("UPDATE rules SET status = 'ACTIVE' WHERE id = $1", [secondRule.rows[0].id]));
  const rls = await q("SELECT relrowsecurity FROM pg_class WHERE oid = 'public.rules'::regclass");
  if (!rls.rows[0].relrowsecurity) throw new Error('rules RLS is not enabled');
  const grant = await q("SELECT has_table_privilege('authenticated', 'public.rules', 'SELECT') AS read, has_table_privilege('authenticated', 'public.rules', 'INSERT') AS write");
  if (!grant.rows[0].read || grant.rows[0].write) throw new Error('rules grants are not least privilege');
  await q('ROLLBACK');
  console.log(`F2 DB integration: PASS (${migrations.length} migrations, rule FK/version/lifecycle/immutability/RLS/grants verified)`);
} catch (error) {
  await q('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
