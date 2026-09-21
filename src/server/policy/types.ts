import type { AuthenticatedActor } from '../auth/types.js';

export type PolicyStatus = 'ENABLED' | 'ARCHIVED';
export type PolicyVersionStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'ACTIVE' | 'RETIRED';
export type PolicyEntityType = 'policy' | 'policy_version' | 'numeral' | 'rule' | 'ruleset';

export interface Policy {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: PolicyStatus;
  createdBy: string | null;
  actorUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: PolicyVersionStatus;
  hash: string;
  sourceText: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  createdByUserId: string | null;
  approvedByUserId: string | null;
  createdAt: string;
  approvedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface PolicyNumeral {
  id: string;
  policyVersionId: string;
  code: string;
  title: string | null;
  text: string;
  orderIndex: number;
  processArea: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PolicyAuditEntry {
  id: string;
  actorVerifiable: string | null;
  actorLegacy: string | null;
  entityType: PolicyEntityType;
  entityId: string;
  action: string;
  beforeSnapshot: Record<string, unknown> | null;
  afterSnapshot: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
}

export interface PolicyRepository {
  listPolicies(): Promise<Policy[]>;
  getPolicy(id: string): Promise<Policy | null>;
  createPolicy(input: { code: string; name: string; description?: string | null; actor: AuthenticatedActor }): Promise<Policy>;
  getVersion(id: string): Promise<PolicyVersion | null>;
  createDraftVersion(input: {
    policyId: string;
    version: string;
    sourceText?: string | null;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    metadata?: Record<string, unknown>;
    actor: AuthenticatedActor;
  }): Promise<PolicyVersion>;
  updateDraftVersion(id: string, input: { sourceText?: string | null; effectiveFrom?: string | null; effectiveTo?: string | null; metadata?: Record<string, unknown>; actor: AuthenticatedActor }): Promise<PolicyVersion>;
  addNumeral(input: { policyVersionId: string; code: string; title?: string | null; text: string; orderIndex: number; processArea?: string | null; actor: AuthenticatedActor }): Promise<PolicyNumeral>;
  submitVersion(id: string, actor: AuthenticatedActor): Promise<PolicyVersion>;
  approveVersion(id: string, actor: AuthenticatedActor): Promise<PolicyVersion>;
  activateVersion(id: string, actor: AuthenticatedActor): Promise<PolicyVersion>;
  retireVersion(id: string, actor: AuthenticatedActor): Promise<PolicyVersion>;
}
