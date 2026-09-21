import { getAdminClient } from '../../lib/insforge/client.js';
import { hashPolicyContent } from './hash.js';
import { canTransitionPolicyVersion } from './workflow.js';
import type { AuthenticatedActor } from '../auth/types.js';
import type { Policy, PolicyAuditEntry, PolicyNumeral, PolicyRepository, PolicyVersion, PolicyVersionStatus } from './types.js';

type Row = Record<string, any>;

function actorValues(actor: AuthenticatedActor) {
  return {
    actor_user_id: actor.userId,
    actor_legacy: actor.legacyIdentity,
  };
}

function mapPolicy(row: Row): Policy {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    status: row.status,
    createdBy: row.created_by ?? null,
    actorUserId: row.actor_user_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVersion(row: Row): PolicyVersion {
  return {
    id: row.id,
    policyId: row.policy_id,
    version: row.version,
    effectiveFrom: row.effective_from ?? null,
    effectiveTo: row.effective_to ?? null,
    status: row.status,
    hash: row.hash,
    sourceText: row.source_text ?? null,
    createdBy: row.created_by ?? null,
    approvedBy: row.approved_by ?? null,
    createdByUserId: row.created_by_user_id ?? null,
    approvedByUserId: row.approved_by_user_id ?? null,
    createdAt: row.created_at,
    approvedAt: row.approved_at ?? null,
    metadata: row.metadata ?? {},
  };
}

function mapNumeral(row: Row): PolicyNumeral {
  return {
    id: row.id,
    policyVersionId: row.policy_version_id,
    code: row.code,
    title: row.title ?? null,
    text: row.text,
    orderIndex: row.order_index,
    processArea: row.process_area ?? null,
    effectiveFrom: row.effective_from ?? null,
    effectiveTo: row.effective_to ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export class InsforgePolicyRepository implements PolicyRepository {
  private database() {
    return getAdminClient().database as any;
  }

  private async audit(input: {
    actor: AuthenticatedActor;
    entityType: PolicyAuditEntry['entityType'];
    entityId: string;
    action: string;
    beforeSnapshot?: Record<string, unknown> | null;
    afterSnapshot?: Record<string, unknown> | null;
    reason?: string | null;
  }) {
    const { error } = await this.database().from('policy_audit_log').insert([{
      actor_verifiable: input.actor.userId,
      actor_legacy: input.actor.legacyIdentity,
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      before_snapshot: input.beforeSnapshot ?? null,
      after_snapshot: input.afterSnapshot ?? null,
      reason: input.reason ?? null,
    }]);
    if (error) throw new Error(`policy audit: ${error.message ?? String(error)}`);
  }

  private async numerals(policyVersionId: string): Promise<PolicyNumeral[]> {
    const { data, error } = await this.database().from('policy_numeral').select().eq('policy_version_id', policyVersionId).order('order_index', { ascending: true });
    if (error) throw new Error(`policy numerals: ${error.message ?? String(error)}`);
    return (data ?? []).map(mapNumeral);
  }

  private async recalculateHash(row: Row): Promise<string> {
    const numerals = await this.numerals(row.id);
    return hashPolicyContent({
      sourceText: row.source_text ?? null,
      numerals: numerals.map((numeral) => ({
        code: numeral.code,
        title: numeral.title,
        text: numeral.text,
        orderIndex: numeral.orderIndex,
        processArea: numeral.processArea,
        effectiveFrom: numeral.effectiveFrom,
        effectiveTo: numeral.effectiveTo,
      })),
    });
  }

  async listPolicies(): Promise<Policy[]> {
    const { data, error } = await this.database().from('policy').select().order('code', { ascending: true });
    if (error) throw new Error(`list policies: ${error.message ?? String(error)}`);
    return (data ?? []).map(mapPolicy);
  }

  async getPolicy(id: string): Promise<Policy | null> {
    const { data, error } = await this.database().from('policy').select().eq('id', id).maybeSingle();
    if (error) throw new Error(`get policy: ${error.message ?? String(error)}`);
    return data ? mapPolicy(data) : null;
  }

  async createPolicy(input: { code: string; name: string; description?: string | null; actor: AuthenticatedActor }): Promise<Policy> {
    const { data, error } = await this.database().from('policy').insert([{
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      status: 'ENABLED',
      created_by: input.actor.legacyIdentity,
      ...actorValues(input.actor),
    }]).select().single();
    if (error) throw new Error(`create policy: ${error.message ?? String(error)}`);
    const policy = mapPolicy(data);
    await this.audit({ actor: input.actor, entityType: 'policy', entityId: policy.id, action: 'created', afterSnapshot: policy as any });
    return policy;
  }

  async getVersion(id: string): Promise<PolicyVersion | null> {
    const { data, error } = await this.database().from('policy_version').select().eq('id', id).maybeSingle();
    if (error) throw new Error(`get policy version: ${error.message ?? String(error)}`);
    return data ? mapVersion(data) : null;
  }

  async createDraftVersion(input: { policyId: string; version: string; sourceText?: string | null; effectiveFrom?: string | null; effectiveTo?: string | null; metadata?: Record<string, unknown>; actor: AuthenticatedActor }): Promise<PolicyVersion> {
    const hash = hashPolicyContent({ sourceText: input.sourceText ?? null, numerals: [] });
    const { data, error } = await this.database().from('policy_version').insert([{
      policy_id: input.policyId,
      version: input.version,
      effective_from: input.effectiveFrom ?? null,
      effective_to: input.effectiveTo ?? null,
      status: 'DRAFT',
      hash,
      source_text: input.sourceText ?? null,
      created_by: input.actor.legacyIdentity,
      created_by_user_id: input.actor.userId,
      metadata: input.metadata ?? {},
    }]).select().single();
    if (error) throw new Error(`create policy version: ${error.message ?? String(error)}`);
    const version = mapVersion(data);
    await this.audit({ actor: input.actor, entityType: 'policy_version', entityId: version.id, action: 'created', afterSnapshot: version as any });
    return version;
  }

  async updateDraftVersion(id: string, input: { sourceText?: string | null; effectiveFrom?: string | null; effectiveTo?: string | null; metadata?: Record<string, unknown>; actor: AuthenticatedActor }): Promise<PolicyVersion> {
    const current = await this.getVersion(id);
    if (!current) throw new Error('Policy version not found.');
    if (current.status !== 'DRAFT') throw new Error('Only DRAFT policy versions can be edited.');
    const updates: Row = {
      ...(input.sourceText === undefined ? {} : { source_text: input.sourceText }),
      ...(input.effectiveFrom === undefined ? {} : { effective_from: input.effectiveFrom }),
      ...(input.effectiveTo === undefined ? {} : { effective_to: input.effectiveTo }),
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    };
    const { data, error } = await this.database().from('policy_version').update(updates).eq('id', id).select().single();
    if (error) throw new Error(`update policy version: ${error.message ?? String(error)}`);
    const hash = await this.recalculateHash(data);
    const { data: hashed, error: hashError } = await this.database().from('policy_version').update({ hash }).eq('id', id).select().single();
    if (hashError) throw new Error(`update policy hash: ${hashError.message ?? String(hashError)}`);
    const version = mapVersion(hashed);
    await this.audit({ actor: input.actor, entityType: 'policy_version', entityId: id, action: 'draft_updated', beforeSnapshot: current as any, afterSnapshot: version as any });
    return version;
  }

  async addNumeral(input: { policyVersionId: string; code: string; title?: string | null; text: string; orderIndex: number; processArea?: string | null; actor: AuthenticatedActor }): Promise<PolicyNumeral> {
    const version = await this.getVersion(input.policyVersionId);
    if (!version) throw new Error('Policy version not found.');
    if (version.status !== 'DRAFT') throw new Error('Numerals can only be changed in DRAFT.');
    const { data, error } = await this.database().from('policy_numeral').insert([{
      policy_version_id: input.policyVersionId,
      code: input.code,
      title: input.title ?? null,
      text: input.text,
      order_index: input.orderIndex,
      process_area: input.processArea ?? null,
    }]).select().single();
    if (error) throw new Error(`create numeral: ${error.message ?? String(error)}`);
    const numeral = mapNumeral(data);
    const hash = await this.recalculateHash({
      id: version.id,
      source_text: version.sourceText,
      numerals: undefined,
    });
    await this.database().from('policy_version').update({ hash }).eq('id', version.id);
    await this.audit({ actor: input.actor, entityType: 'numeral', entityId: numeral.id, action: 'created', afterSnapshot: numeral as any });
    return numeral;
  }

  private async transition(id: string, expected: PolicyVersionStatus, next: PolicyVersionStatus, actor: AuthenticatedActor, action: string): Promise<PolicyVersion> {
    const current = await this.getVersion(id);
    if (!current) throw new Error('Policy version not found.');
    if (current.status !== expected || !canTransitionPolicyVersion(current.status, next)) {
      throw new Error(`Invalid policy transition: ${current.status} -> ${next}.`);
    }
    const updates: Row = { status: next };
    if (next === 'APPROVED') Object.assign(updates, { approved_by: actor.legacyIdentity, approved_by_user_id: actor.userId, approved_at: new Date().toISOString() });
    const { data, error } = await this.database().from('policy_version').update(updates).eq('id', id).select().single();
    if (error) throw new Error(`transition policy version: ${error.message ?? String(error)}`);
    const version = mapVersion(data);
    await this.audit({ actor, entityType: 'policy_version', entityId: id, action, beforeSnapshot: current as any, afterSnapshot: version as any });
    return version;
  }

  submitVersion(id: string, actor: AuthenticatedActor) { return this.transition(id, 'DRAFT', 'REVIEW', actor, 'submitted_for_review'); }
  approveVersion(id: string, actor: AuthenticatedActor) { return this.transition(id, 'REVIEW', 'APPROVED', actor, 'approved'); }
  activateVersion(id: string, actor: AuthenticatedActor) { return this.transition(id, 'APPROVED', 'ACTIVE', actor, 'activated'); }
  retireVersion(id: string, actor: AuthenticatedActor) { return this.transition(id, 'ACTIVE', 'RETIRED', actor, 'retired'); }
}
