import { CancellationCase, CaseDecisionData, Evidence } from '../types';
import { EducationLevel } from '../../../types/domain';

const EDUCATION_LEVEL_MAP: Record<string, EducationLevel> = {
  LICENCIATURAS_ALIANZAS: 'ALIANZA',
  EJECUTIVAS: 'EJECUTIVA',
};

function mapEducationLevel(input: string): EducationLevel {
  return EDUCATION_LEVEL_MAP[input] ?? (input as EducationLevel) ?? 'UNKNOWN';
}

function mapEvidenceSource(source: string): 'SIU' | 'FLOKZU' | 'I6' | 'AULA_VIRTUAL' | 'WHATSAPP' | 'CORREO' | 'CAPTURA' | 'PDF' | 'AUDIO' | 'OTRO' {
  const sourceMap: Record<string, any> = {
    'SIU': 'SIU',
    'Flokzu': 'FLOKZU',
    'I6': 'I6',
    'Aula Virtual': 'AULA_VIRTUAL',
    'WhatsApp': 'WHATSAPP',
    'Correo': 'CORREO',
    'Capturas': 'CAPTURA',
    'Documentos': 'PDF',
    'AUDIO': 'AUDIO',
  };
  return sourceMap[source] || 'OTRO';
}

function buildCalls(d: CaseDecisionData): any[] {
  const calls: any[] = [];
  if (!d.llamadas || d.llamadas <= 0) return calls;

  for (let i = 0; i < d.llamadas; i++) {
    calls.push({
      id: `call-norm-${i + 1}`,
      title: `Llamada de auditoría ${i + 1}`,
      date: d.fechaSolicitud || '2026-09-07',
      time: '14:00',
      duration: '05:00',
      durationSeconds: 300,
      status: 'TRANSCRIPCION_COMPLETADA',
      campaign: 'AUDITORIA',
      phoneNumber: '+525500000000',
      intentsRatio: '1/15',
      sentiment: 'Neutro',
      detectedIntentions: d.intencionCancelacionManifiesta ? ['Desea cancelar'] : [],
      keyMoments: [],
      effectiveContact: d.contactoEfectivoDetalle || {
        efectivo: d.contactoEfectivo,
        criterio: [
          { criterio: 'Titular', cumplido: d.contactoEfectivo, evidencia: 'Titular validado' }
        ]
      },
      transcript: d.frasesDetectadas?.map((f, idx) => ({
        id: `seg-${idx}`,
        speaker: 'customer',
        speakerName: 'Cliente',
        start: '00:10',
        end: '00:20',
        startSeconds: 10,
        endSeconds: 20,
        text: f
      })) || []
    });
  }
  return calls;
}

function buildWrittenInteractions(d: CaseDecisionData): any[] {
  const writtenInteractions: any[] = [];
  if (!d.interaccionesEscritas || d.interaccionesEscritas <= 0) return writtenInteractions;

  for (let i = 0; i < d.interaccionesEscritas; i++) {
    writtenInteractions.push({
      id: `msg-${i + 1}`,
      date: d.fechaSolicitud || '2026-09-07',
      channel: 'WHATSAPP',
      received: true,
      summary: 'Mensaje de seguimiento de calidad'
    });
  }
  return writtenInteractions;
}

function buildEvidence(evidences: Evidence[]): Evidence[] {
  return evidences.map(e => ({
    id: e.id,
    source: mapEvidenceSource(e.source),
    type: e.type.toUpperCase(),
    title: e.title,
    description: e.description,
    date: e.date,
    verified: true,
    confidence: 0.9,
  }));
}

export function normalizeToCancellationCase(input: CancellationCase | CaseDecisionData & { evidences?: Evidence[] }): CancellationCase {
  if ('ticketId' in input && 'student' in input && 'dates' in input) {
    return input as CancellationCase;
  }

  const d = input as CaseDecisionData & { evidences?: Evidence[] };
  const evidences = d.evidences || [];

  const calls = buildCalls(d);
  const writtenInteractions = buildWrittenInteractions(d);
  const evidence = buildEvidence(evidences);

  return {
    ticketId: 'CAVE-AUDIT',
    student: {
      name: 'Estudiante de Auditoría',
      enrollmentId: '01000000',
      program: d.programa || '',
      educationLevel: mapEducationLevel(d.nivelEducativo)
    },
    dates: {
      startDate: d.fechaInicio,
      requestDate: d.fechaSolicitud
    },
    request: {
      wantsToContinue: !d.intencionCancelacionManifiesta,
      explicitCancellationRequest: Boolean(d.intencionCancelacionManifiesta || d.motivoSolicitud?.toLowerCase().includes('cancel')),
      reason: d.motivoSolicitud
    },
    academic: {
      enteredVirtualClassroom: d.ingresoAula ?? false,
      selectedEvaluationMethod: d.seleccionModalidad ?? false,
      hasActivities: d.actividadesEntregadas ?? (d.cantidadActividadesEntregadas ?? 0) > 0,
      hasGrades: d.calificaciones ?? false,
      enteredAnyActiveSubject: d.ingresoAulaValidoPosgrado ?? d.ingresoAula ?? false,
      participatedInForum: d.ingresoAulaValidoPosgrado ?? false,
      clicksDetected: (d.clicsDetectados ?? 0) > 0,
      recentAccess: Boolean(d.ultimoAccesoCurso) || d.calificacionVisible !== undefined,
    },
    contacts: {
      calls,
      writtenInteractions,
      effectiveContacts: [
        {
          contactId: 'eff-1',
          date: d.fechaSolicitud,
          isEffective: d.contactoEfectivo,
          titularConfirmed: d.contactoEfectivo,
          purposeExplained: d.contactoEfectivo,
          cycleInfoProvided: d.contactoEfectivo,
          institutionIdentified: d.contactoEfectivo,
          personalDataConfirmed: d.contactoEfectivo,
          decisionManifested: d.contactoEfectivo
        }
      ]
    },
    operational: {
      operationalError: d.erroresAdministrativos,
      financialError: d.erroresFinancieros,
      materialLoadError: d.fallaCargaMaterias || !d.materiasCargadas,
      enrollmentError: d.errorInscripcion,
      incorrectProgram: d.errorInscripcionTipo === 'programa',
      incorrectPackage: d.errorInscripcionTipo === 'paquete',
      missingAdjustment: d.solicitudAjuste && !d.ajusteRealizado,
      areaFailedToChannel: d.areaOperativaCanalizoAExito === false,
      studentUpsetByError: true,
      causalLinkWithCancellation: true
    },
    retention: {
      attempted: d.retencionRealizada,
      successful: d.retencionAceptada,
      acceptedBenefit: d.retencionAceptada
    },
    salesPromise: {
      proven: d.promesaVenta,
      evidenceText: d.promesaVentaEvidencia
    },
    cycleChange: {
      requested: Boolean(d.cambioCicloGestionado && d.cambioCicloGestionado !== 'ninguno'),
      requestedBeforeStart: d.cambioCicloGestionado === 'antes_inicio',
      managedBy: 'MATRICULA',
      isRevalidation: d.cambioCicloRevalidacion ?? false
    },
    evidence,
    channel: d.canalVenta,
    rawDecisionData: d
  };
}