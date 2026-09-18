import {
  CancellationCase,
  CaseDecisionData,
  DecisionResult
} from './types';
import { RuleEngine, getDefaultRuleRegistry, createRuleEngine, type RuleRegistry } from './rule-engine';
import { getDaysFromStart, isWithinDesertionPeriod, isWithinCancellationWindow, isPriorToStart } from './rules/dates';
import { evaluateAcademicActivity } from './rules/academic-activity';
import { evaluateEffectiveContact } from './rules/effective-contact';
import { evaluateMinimumContactAttempts } from './rules/unreachable';
import { evaluateStudentIntent } from './rules/student-request';
import { evaluateDecision35 } from './rules/decision35';
import { evaluateDecision53 } from './rules/decision53';
import { resolveDecisionConflict } from './conflict-resolver';
import { requiredEvidenceForRule } from './evidence-evaluator';
import { normalizeToCancellationCase } from './adapters/case-adapter';

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
