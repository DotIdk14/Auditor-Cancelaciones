import {
  CancellationCase,
  CaseDecisionData,
  DecisionResult
} from './types.js';
import { RuleEngine, getDefaultRuleRegistry, createRuleEngine, type RuleRegistry } from './rule-engine.js';
import { getDaysFromStart, isWithinDesertionPeriod, isWithinCancellationWindow, isPriorToStart } from './rules/dates.js';
import { evaluateAcademicActivity } from './rules/academic-activity.js';
import { evaluateEffectiveContact } from './rules/effective-contact.js';
import { evaluateMinimumContactAttempts } from './rules/unreachable.js';
import { evaluateStudentIntent } from './rules/student-request.js';
import { evaluateDecision35 } from './rules/decision35.js';
import { evaluateDecision53 } from './rules/decision53.js';
import { resolveDecisionConflict } from './conflict-resolver.js';
import { requiredEvidenceForRule } from './evidence-evaluator.js';
import { normalizeToCancellationCase } from './adapters/case-adapter.js';

/**
 * POLICY-LOCKED CODE
 *
 * This module implements organization-approved policy rules.
 * AI extraction services MUST NOT modify, override or bypass these rules.
 * Changes to this directory require an explicit policy update and human approval.
 */

export {
  RuleEngine,
  getDefaultRuleRegistry,
  createRuleEngine,
  type RuleRegistry,
  getDaysFromStart,
  isWithinDesertionPeriod,
  isWithinCancellationWindow,
  isPriorToStart,
  evaluateAcademicActivity,
  evaluateEffectiveContact,
  evaluateMinimumContactAttempts,
  evaluateStudentIntent,
  evaluateDecision35,
  evaluateDecision53,
  resolveDecisionConflict,
  requiredEvidenceForRule,
  normalizeToCancellationCase,
  type CaseDecisionData,
  type DecisionResult,
  type CancellationCase
};

const defaultEngine = new RuleEngine();

/**
 * Función principal del Motor de Decisiones
 * analyzeCancellationCase(caseData) -> DecisionResult
 */
export function analyzeCancellationCase(caseData: CancellationCase | CaseDecisionData): DecisionResult {
  const normalizedCase = normalizeToCancellationCase(caseData);
  return defaultEngine.evaluate(normalizedCase);
}
