import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types';

export interface ContactCriterionResult {
  id: string;
  description: string;
  fulfilled: boolean;
  evidenceReference?: string;
}

export interface EffectiveContactEvaluation {
  effective: boolean;
  criteria: ContactCriterionResult[];
  notes?: string;
}

export function evaluateEffectiveContact(caseData: CancellationCase): EffectiveContactEvaluation {
  const contacts = caseData.contacts;
  const directEff = contacts?.effectiveContacts?.find(c => c.isEffective);
  const primaryCall = contacts?.calls?.[0];

  const criteria: ContactCriterionResult[] = [
    {
      id: 'CRIT_1_TITULAR',
      description: 'El contacto debe ser con el titular registrado',
      fulfilled: directEff ? directEff.titularConfirmed : Boolean(primaryCall?.effectiveContact?.criterios?.[0]?.cumplido ?? false),
      evidenceReference: primaryCall?.effectiveContact?.criterios?.[0]?.evidencia || 'Validación de identidad telefónica'
    },
    {
      id: 'CRIT_2_IDENTIFICACION_INSTITUCIONAL',
      description: 'Debe identificarse claramente que el contacto es de la universidad',
      fulfilled: directEff ? directEff.institutionIdentified : Boolean(primaryCall?.effectiveContact?.criterios?.[1]?.cumplido ?? false),
      evidenceReference: primaryCall?.effectiveContact?.criterios?.[1]?.evidencia || 'Saludo institucional formal'
    },
    {
      id: 'CRIT_3_OBJETIVO_Y_CICLO',
      description: 'Se debe informar el objetivo de la llamada y ciclo de inicio',
      fulfilled: directEff ? (directEff.purposeExplained && directEff.cycleInfoProvided) : Boolean(primaryCall?.effectiveContact?.criterios?.[2]?.cumplido ?? false),
      evidenceReference: primaryCall?.effectiveContact?.criterios?.[2]?.evidencia || 'Explicación de objetivo y calendario'
    },
    {
      id: 'CRIT_4_CONFIRMAR_DATOS',
      description: 'Deben confirmarse los datos personales y situación académica/financiera',
      fulfilled: directEff ? directEff.personalDataConfirmed : Boolean(primaryCall?.effectiveContact?.criterios?.[3]?.cumplido ?? false),
      evidenceReference: primaryCall?.effectiveContact?.criterios?.[3]?.evidencia || 'Cotejo de datos en CRM'
    },
    {
      id: 'CRIT_5_DECISION_ESTUDIANTE',
      description: 'Manifestación explícita de decisión (continuidad o no)',
      fulfilled: directEff ? directEff.decisionManifested : Boolean(primaryCall?.effectiveContact?.criterios?.[4]?.cumplido ?? false),
      evidenceReference: primaryCall?.effectiveContact?.criterios?.[4]?.evidencia || 'Postura del alumno ante la oferta'
    },
    {
      id: 'CRIT_6_PROCEDIMIENTO_POLITICA',
      description: 'Canalización y aplicación del procedimiento correspondiente',
      fulfilled: directEff ? true : Boolean(primaryCall?.effectiveContact?.criterios?.[5]?.cumplido ?? false),
      evidenceReference: primaryCall?.effectiveContact?.criterios?.[5]?.evidencia || 'Canalización a retención o auditoría'
    }
  ];

  const fulfilledCount = criteria.filter(c => c.fulfilled).length;
  // Consideramos contacto efectivo si se cumplen al menos 4 de los criterios esenciales y el titular fue confirmado
  const isEffective = directEff?.isEffective ?? (fulfilledCount >= 4 && criteria[0].fulfilled);

  return {
    effective: isEffective,
    criteria,
    notes: isEffective
      ? 'Contacto individual efectivo acreditado conforme a política de calidad.'
      : 'No se acredita contacto efectivo individual con el titular registrado.'
  };
}

export class EffectiveContactRule implements DecisionRule {
  id = 'RULE_NODO6_EFFECTIVE_CONTACT';
  name = 'Evaluación de Criterios de Contacto Efectivo';
  priority = 6;
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.8.g';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const evalResult = evaluateEffectiveContact(caseData);

    if (evalResult.effective) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: 'Contacto individual efectivo acreditado con el estudiante titular conforme a los 6 criterios de calidad.',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['contacts.effectiveContacts', 'contacts.calls'],
        missingEvidence: []
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      fulfilled: false,
      determinant: false,
      priority: this.priority,
      article: this.article,
      explanation: 'No se acreditó contacto efectivo con el estudiante titular de la matrícula.',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: [],
      missingEvidence: ['AUDIO_LLAMADA_CONTACTO_EFECTIVO']
    };
  }

  requiredEvidence(): string[] {
    return ['GRABACION_LLAMADA', 'CRM_BITACORA_CONTACTO'];
  }
}
