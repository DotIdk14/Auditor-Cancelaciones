import assert from 'node:assert/strict';
import { KNOWN_RULE_IMPLEMENTATION_KEYS, isKnownRuleImplementationKey } from '../../src/server/rules/registry.js';
import { canTransitionPolicyVersion } from '../../src/server/policy/workflow.js';

assert.equal(KNOWN_RULE_IMPLEMENTATION_KEYS.length, 15);
assert.equal(isKnownRuleImplementationKey('RULE_NODO0_ELIGIBILITY'), true);
assert.equal(isKnownRuleImplementationKey('eval-arbitrary-code'), false);
assert.equal(canTransitionPolicyVersion('DRAFT', 'REVIEW'), true);
assert.equal(canTransitionPolicyVersion('REVIEW', 'APPROVED'), true);
assert.equal(canTransitionPolicyVersion('APPROVED', 'ACTIVE'), true);
assert.equal(canTransitionPolicyVersion('ACTIVE', 'RETIRED'), true);
assert.equal(canTransitionPolicyVersion('ACTIVE', 'APPROVED'), false);
assert.equal(canTransitionPolicyVersion('DRAFT', 'ACTIVE'), false);
console.log('F2 rule metadata tests: 8/8 aprobadas');
