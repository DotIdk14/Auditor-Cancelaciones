import type { AuthenticatedActor } from '../auth/types.js';
import type { RuleImplementationKey } from './registry.js';

export type RuleStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'ACTIVE' | 'RETIRED';

export interface RuleMetadata {
  id: string;
  policyVersionId: string;
  numeralId: string | null;
  ruleKey: string;
  code: string;
  name: string;
  description: string | null;
  priority: number;
  implementationKey: RuleImplementationKey;
  version: string;
  status: RuleStatus;
  createdBy: string | null;
  actorUserId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface RuleRepository {
  getRule(id: string): Promise<RuleMetadata | null>;
  createDraft(input: {
    policyVersionId: string;
    numeralId?: string | null;
    ruleKey: string;
    code: string;
    name: string;
    description?: string | null;
    priority: number;
    implementationKey: string;
    version: string;
    metadata?: Record<string, unknown>;
    actor: AuthenticatedActor;
  }): Promise<RuleMetadata>;
  updateDraft(id: string, input: {
    numeralId?: string | null;
    code?: string;
    name?: string;
    description?: string | null;
    priority?: number;
    implementationKey?: string;
    metadata?: Record<string, unknown>;
    actor: AuthenticatedActor;
  }): Promise<RuleMetadata>;
  submitReview(id: string, actor: AuthenticatedActor): Promise<RuleMetadata>;
  approve(id: string, actor: AuthenticatedActor): Promise<RuleMetadata>;
  activate(id: string, actor: AuthenticatedActor): Promise<RuleMetadata>;
  retire(id: string, actor: AuthenticatedActor): Promise<RuleMetadata>;
}
