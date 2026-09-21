import assert from 'node:assert/strict';
import { getAiModels } from '../../ai/models';
import { parseExtractionJson } from '../../ai/schemas';
import { evaluatePdfTextQuality } from '../pdf-extractor';
import { formatTranscriptSegments } from '../audio-extractor';
import { shouldUseFallback } from '../structured-extractor';
import { analyzeCancellationCase, CaseDecisionData } from '../../decision-engine/decision-engine';

function validPayload(overrides: Record<string, unknown> = {}): string {
  const field = (valor: unknown = null, confianza = 'BAJA') => ({ valor, confianza, evidencia_id: 'ev_001', pagina: null, timestamp: null, texto_citado: valor ? String(valor) : null });
  return JSON.stringify({
    estudiante: {
      folio: field('CAVE-12345', 'ALTA'), matricula: field('12345678', 'ALTA'), nombre: field(), nivel: field(), programa: field(), canal: field(), telefono: field(),
    },
    solicitud: { fecha_inicio: field('2026-03-01', 'ALTA'), fecha_solicitud: field('2026-03-08', 'ALTA'), motivo: field('Solicitud expresa', 'ALTA') },
    indicadores: {
      contacto_efectivo: field(true, 'ALTA'), llamadas: field(1, 'ALTA'), mensajes: field(0, 'ALTA'), ingreso_aula: field(false, 'ALTA'), materias_cargadas: field(false, 'ALTA'),
      falla_carga_materias: field(false, 'ALTA'), calificaciones: field(false, 'ALTA'), errores_operativos: field(false, 'ALTA'), errores_financieros: field(false, 'ALTA'),
      error_inscripcion: field(false, 'ALTA'), promesa_venta: field(false, 'ALTA'), retencion_realizada: field(false, 'ALTA'), retencion_aceptada: field(false, 'ALTA'),
      intencion_cancelacion_manifiesta: field(true, 'ALTA'),
    },
    hechos: [{ tipo: 'SOLICITUD_NO_CONTINUAR', valor: true, confianza: 'ALTA', evidencia_id: 'ev_001', timestamp: '00:04:17', texto_citado: 'Ya no quiero continuar estudiando' }],
    ...overrides,
  });
}

export function runExtractionLayerTests(): { name: string; passed: boolean; error?: string }[] {
  const tests: { name: string; run: () => void }[] = [
    {
      name: 'PDF textual usa texto local suficiente y no requiere vision',
      run: () => {
        const text = Array.from({ length: 80 }, (_, i) => `palabra${i} documento con texto embebido util`).join(' ');
        const quality = evaluatePdfTextQuality(text, 1);
        assert.equal(quality.hasUsefulText, true);
      },
    },
    {
      name: 'PDF escaneado sin texto se clasifica para vision',
      run: () => {
        const quality = evaluatePdfTextQuality('', 2);
        assert.equal(quality.hasUsefulText, false);
      },
    },
    {
      name: 'Imagen utiliza AI_VISION_MODEL',
      run: () => {
        process.env.AI_VISION_MODEL = 'qwen/qwen3-vl-8b-instruct';
        assert.equal(getAiModels().vision, 'qwen/qwen3-vl-8b-instruct');
      },
    },
    {
      name: 'Audio conserva segmentos y timestamps',
      run: () => {
        const text = formatTranscriptSegments([{ speaker: 'ASESOR', start: 72000, end: 78000, text: 'Buenas tardes' }]);
        assert.equal(text, '[01:12] ASESOR: Buenas tardes');
      },
    },
    {
      name: 'Texto utiliza AI_EXTRACTION_MODEL',
      run: () => {
        process.env.AI_EXTRACTION_MODEL = 'openai/gpt-5-nano';
        assert.equal(getAiModels().extraction, 'openai/gpt-5-nano');
      },
    },
    {
      name: 'JSON invalido activa validacion/fallback',
      run: () => {
        const parsed = parseExtractionJson('{ invalid');
        assert.equal(parsed.success, false);
        assert.equal(shouldUseFallback(parsed), true);
      },
    },
    {
      name: 'Conflicto se conserva como CONFLICTO',
      run: () => {
        const parsed = parseExtractionJson(validPayload({ solicitud: {
          fecha_inicio: { valor: '2026-03-01', confianza: 'CONFLICTO', evidencia_id: 'ev_001', pagina: null, timestamp: null, texto_citado: '2026-03-01' },
          fecha_solicitud: { valor: '2026-03-08', confianza: 'ALTA', evidencia_id: 'ev_001', pagina: null, timestamp: null, texto_citado: '2026-03-08' },
          motivo: { valor: 'Solicitud expresa', confianza: 'ALTA', evidencia_id: 'ev_001', pagina: null, timestamp: null, texto_citado: 'Solicitud expresa' },
        } }));
        assert.equal(parsed.success, true);
        if (parsed.success) assert.equal(parsed.data.solicitud.fecha_inicio.confianza, 'CONFLICTO');
      },
    },
    {
      name: 'Capa IA no altera decision con mismos CaseDecisionData',
      run: () => {
        const data: CaseDecisionData = {
          fechaInicio: '2026-09-01', fechaSolicitud: '2026-08-25', nivelEducativo: 'LICENCIATURA', programa: 'Derecho', estatusAlumno: 'Activo',
          contactoEfectivo: true, llamadas: 1, interaccionesEscritas: 0, ingresoAula: false, seleccionModalidad: false, calificaciones: false, materiasCargadas: false,
          erroresAdministrativos: false, erroresFinancieros: false, errorInscripcion: false, promesaVenta: false, solicitudAjuste: false, ajusteRealizado: false,
          contactoConExitoEstudiantil: true, retencionRealizada: false, motivoSolicitud: 'Solicito cancelacion antes de iniciar', intencionCancelacionManifiesta: true,
        };
        const first = analyzeCancellationCase(data);
        const second = analyzeCancellationCase({ ...data });
        assert.deepEqual({
          classification: first.classification,
          rootCause: first.rootCause,
          hardBlockers: first.hardBlockers,
          appliedRules: first.appliedRules.map(rule => rule.id),
        }, {
          classification: second.classification,
          rootCause: second.rootCause,
          hardBlockers: second.hardBlockers,
          appliedRules: second.appliedRules.map(rule => rule.id),
        });
      },
    },
  ];

  return tests.map(test => {
    try {
      test.run();
      return { name: test.name, passed: true };
    } catch (error) {
      return { name: test.name, passed: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
