import { getAdminClient } from '../../lib/insforge/client.js';
import { canTransitionPolicyVersion } from '../policy/workflow.js';
import { isKnownRuleImplementationKey, type RuleImplementationKey } from './registry.js';
import type { AuthenticatedActor } from '../auth/types.js';
import type { RuleMetadata, RuleRepository, RuleStatus } from './types.js';

type Row = Record<string, any>;

function mapRule(row: Row): RuleMetadata {
  return {
    id: row.id,
    policyVersionId: row.policy_version_id,
    numeralId: row.numeral_id ?? null,
    ruleKey: row.rule_key,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    priority: row.priority,
    implementationKey: row.implementation_key,
    version: row.version,
    status: row.status,
    createdBy: row.created_by ?? null,
    actorUserId: row.actor_user_id ?? null,
    createdAt: row.created_at,
    metadata: row.metadata ?? {},
  };
}

function requireImplementationKey(value: string): RuleImplementationKey {
  if (!isKnownRuleImplementationKey(value)) throw new Error(`Unknown rule implementation key: ${value}`);
  return value;
}

export class InsforgeRuleRepository implements RuleRepository {
  private database() { return getAdminClient().database as any; }

  private async audit(actor: AuthenticatedActor, rule: RuleMetadata, action: string, beforeSnapshot?: RuleMetadata) {
    const { error } = await this.database().from('policy_audit_log').insert([{
      actor_verifiable: actor.userId,
      actor_legacy: actor.legacyIdentity,
      entity_type: 'rule',
      entity_id: rule.id,
      action,
      before_snapshot: beforeSnapshot ?? null,
      after_snapshot: rule,
    }]);
    if (error) throw new Error(`rule audit: ${error.message ?? String(error)}`);
  }

  async getRule(id: string): Promise<RuleMetadata | null> {
    const { data, error } = await this.database().from('rules').select().eq('id', id).maybeSingle();
    if (error) throw new Error(`get rule: ${error.message ?? String(error)}`);
    return data ? mapRule(data) : null;
  }

  async createDraft(input: {
    policyVersionId: string; numeralId?: string | null; ruleKey: string; code: string; name: string;
    description?: string | null; priority: number; implementationKey: string; version: string;
    metadata?: Record<string, unknown>; actor: AuthenticatedActor;
  }): Promise<RuleMetadata> {
    const implementationKey = requireImplementationKey(input.implementationKey);
    const { data, error } = await this.database().from('rules').insert([{
      policy_version_id: input.policyVersionId,
      numeral_id: input.numeralId ?? null,
      rule_key: input.ruleKey,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      priority: input.priority,
      implementation_key: implementationKey,
      version: input.version,
      status: 'DRAFT',
      created_by: input.actor.legacyIdentity,
      actor_user_id: input.actor.userId,
      metadata: input.metadata ?? {},
    }]).select().single();
    if (error) throw new Error(`create rule draft: ${error.message ?? String(error)}`);
    const rule = mapRule(data);
    await this.audit(input.actor, rule, 'rule_created');
    return rule;
  }

  async updateDraft(id: string, input: {
    numeralId?: string | null; code?: string; name?: string; description?: string | null;
    priority?: number; implementationKey?: string; metadata?: Record<string, unknown>; actor: AuthenticatedActor;
  }): Promise<RuleMetadata> {
    const current = await this.getRule(id);
    if (!current) throw new Error('Rule not found.');
    if (current.status !== 'DRAFT') throw new Error('Only DRAFT rules can be edited.');
    const updates: Row = {};
    if (input.numeralId !== undefined) updates.numeral_id = input.numeralId;
    if (input.code !== undefined) updates.code = input.code;
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.implementationKey !== undefined) updates.implementation_key = requireImplementationKey(input.implementationKey);
    if (input.metadata !== undefined) updates.metadata = input.metadata;
    const { data, error } = await this.database().from('rules').update(updates).eq('id', id).select().single();
    if (error) throw new Error(`update rule draft: ${error.message ?? String(error)}`);
    const rule = mapRule(data);
    await this.audit(input.actor, rule, 'rule_draft_updated', current);
    return rule;
  }

  private async transition(id: string, expected: RuleStatus, next: RuleStatus, actor: AuthenticatedActor, action: string): Promise<RuleMetadata> {
    const current = await this.getRule(id);
    if (!current) throw new Error('Rule not found.');
    if (current.status !== expected || !canTransitionPolicyVersion(current.status, next)) {
      throw new Error(`Invalid rule transition: ${current.status} -> ${next}.`);
    }
    const { data, error } = await this.database().from('rules').update({ status: next }).eq('id', id).select().single();
    if (error) throw new Error(`transition rule: ${error.message ?? String(error)}`);
    const rule = mapRule(data);
    await this.audit(actor, rule, action, current);
    return rule;
  }

  submitReview(id: string, actor: AuthenticatedActor) { return this.transition(id, 'DRAFT', 'REVIEW', actor, 'rule_submitted_for_review'); }
  approve(id: string, actor: AuthenticatedActor) { return this.transition(id, 'REVIEW', 'APPROVED', actor, 'rule_approved'); }
  activate(id: string, actor: AuthenticatedActor) { return this.transition(id, 'APPROVED', 'ACTIVE', actor, 'rule_activated'); }
  retire(id: string, actor: AuthenticatedActor) { return this.transition(id, 'ACTIVE', 'RETIRED', actor, 'rule_retired'); }
}
