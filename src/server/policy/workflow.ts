import type { PolicyVersionStatus } from './types.js';

const transitions: Record<PolicyVersionStatus, PolicyVersionStatus[]> = {
  DRAFT: ['REVIEW'],
  REVIEW: ['APPROVED'],
  APPROVED: ['ACTIVE'],
  ACTIVE: ['RETIRED'],
  RETIRED: [],
};

export function canTransitionPolicyVersion(from: PolicyVersionStatus, to: PolicyVersionStatus): boolean {
  return transitions[from].includes(to);
}
