import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  Mic,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Check,
  Eye,
  Edit3,
  Trash2,
  Sparkles,
  Shield,
  User,
  Calendar,
  Phone,
  Mail,
  BookOpen,
  Wifi,
  Database,
  Search,
  RefreshCw,
  MoreHorizontal,
} from 'lucide-react';
import { AuditCase, EducationLevel, EvidenceType, EvidenceItem } from '../../types/audit';
import { analyzeCancellationCase, CaseDecisionData } from '../../lib/decision-engine/decision-engine';
import { parseApiResponse } from '../../lib/api/parse-response';
import {
  DraftCase,
  EvidenceDraft,
  ExtractedField,
  FieldConfidence,
  ConflictItem,
} from '../../lib/extraction/types';
import { buildDictamenText } from '../../lib/dictamen/templates';

const VALID_EDUCATION_LEVELS: EducationLevel[] = ['LICENCIATURA', 'POSGRADO', 'EJECUTIVA', 'ALIANZA', 'UNKNOWN'];

interface EvidenceFirstAddCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCase: (newCase: AuditCase, files?: File[]) => void;
}

type WizardStep = 'upload' | 'processing' | 'review' | 'creating';

const API_BASE = '/api';

const CONFIDENCE_COLORS: Record<FieldConfidence, string> = {
  ALTA: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  MEDIA: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  BAJA: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  CONFLICTO: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse',
};

const CONFIDENCE_LABELS: Record<FieldConfidence, string> = {
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
  CONFLICTO: 'Conflicto',
};

const FIELD_GROUPS = [
  {
    id: 'student',
    label: 'Datos del Estudiante',
    icon: User,
    fields: [
      { key: 'folio', label: 'Folio CAVE', type: 'text' },
      { key: 'matricula', label: 'Matrícula', type: 'text' },
      { key: 'nombre', label: 'Nombre completo', type: 'text' },
      { key: 'nivel', label: 'Nivel educativo', type: 'select', options: VALID_EDUCATION_LEVELS },
      { key: 'programa', label: 'Programa académico', type: 'text' },
      { key: 'canal', label: 'Canal de venta', type: 'text' },
      { key: 'telefono', label: 'Teléfono', type: 'tel' },
    ],
  },
  {
    id: 'request',
    label: 'Solicitud de Cancelación',
    icon: Calendar,
    fields: [
      { key: 'fechaInicio', label: 'Inicio de clases', type: 'date' },
      { key: 'fechaSolicitud', label: 'Fecha de solicitud', type: 'date' },
      { key: 'motivo', label: 'Motivo / Causal', type: 'textarea' },
    ],
  },
  {
    id: 'academic',
    label: 'Indicadores Académicos y Operativos',
    icon: BookOpen,
    fields: [
      { key: 'contactoEfectivo', label: 'Contacto efectivo acreditado', type: 'boolean' },
      { key: 'llamadas', label: 'Número de llamadas', type: 'number' },
      { key: 'mensajes', label: 'Interacciones escritas', type: 'number' },
      { key: 'ingresoAula', label: 'Ingreso a aula virtual', type: 'boolean' },
      { key: 'materiasCargadas', label: 'Materias cargadas en aula', type: 'boolean' },
      { key: 'fallaCargaMaterias', label: 'Falla en carga de materias', type: 'boolean' },
      { key: 'calificaciones', label: 'Tiene calificaciones asentadas', type: 'boolean' },
      { key: 'erroresOperativos', label: 'Error operativo institucional', type: 'boolean' },
      { key: 'erroresFinancieros', label: 'Error financiero', type: 'boolean' },
      { key: 'errorInscripcion', label: 'Error de inscripción', type: 'boolean' },
      { key: 'promesaVenta', label: 'Promesa de venta comprobada', type: 'boolean' },
      { key: 'retencionRealizada', label: 'Retención realizada', type: 'boolean' },
      { key: 'retencionAceptada', label: 'Aceptó beneficio de retención', type: 'boolean' },
      { key: 'intencionCancelacionManifiesta', label: 'Intención de cancelación manifiesta', type: 'boolean' },
    ],
  },
];

const FIELD_ALIASES: Record<string, string> = {
  fechaInicio: 'fecha_inicio',
  fechaSolicitud: 'fecha_solicitud',
  contactoEfectivo: 'contacto_efectivo',
  ingresoAula: 'ingreso_aula',
  materiasCargadas: 'materias_cargadas',
  fallaCargaMaterias: 'falla_carga_materias',
  erroresOperativos: 'errores_operativos',
  erroresFinancieros: 'errores_financieros',
  errorInscripcion: 'error_inscripcion',
  promesaVenta: 'promesa_venta',
  retencionRealizada: 'retencion_realizada',
  retencionAceptada: 'retencion_aceptada',
  intencionCancelacionManifiesta: 'intencion_cancelacion_manifiesta',
};

function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const slashParts = dateStr.split('/');
  if (slashParts.length === 3) {
    const [day, month, year] = slashParts;
    if (year?.length === 4) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return dateStr;
}

function formatDateForDisplay(dateStr: string): string {
  const inputDate = formatDateForInput(dateStr);
  return inputDate ? inputDate.split('-').reverse().join('/') : 'Sin fecha';
}

function getSource(draft: DraftCase, groupId: string): Record<string, ExtractedField> | null {
  return (groupId === 'student' ? draft.student : groupId === 'request' ? draft.request : draft.academic) as any;
}

function getFieldValue(draft: DraftCase, groupId: string, fieldKey: string): ExtractedField | null {
  const source = getSource(draft, groupId);
  return source?.[fieldKey] || source?.[FIELD_ALIASES[fieldKey]] || null;
}

function setFieldValue(draft: DraftCase, groupId: string, fieldKey: string, value: any): DraftCase {
  const newDraft = JSON.parse(JSON.stringify(draft));
  const source = getSource(newDraft, groupId);
  if (source) {
    const targetKey = source[fieldKey] ? fieldKey : FIELD_ALIASES[fieldKey] && source[FIELD_ALIASES[fieldKey]] ? FIELD_ALIASES[fieldKey] : fieldKey;
    source[targetKey] = {
      ...(source[targetKey] || { evidenciaId: null }),
      valor: value,
      confianza: 'ALTA' as FieldConfidence,
    };
  }
  newDraft.completitud = calculateCompletitud(newDraft);
  return newDraft;
}

function getDraftValue(draft: DraftCase, groupId: string, fieldKey: string): any {
  return getFieldValue(draft, groupId, fieldKey)?.valor ?? null;
}

function calculateCompletitud(draft: DraftCase): number {
  const fields = [
    ...Object.values(draft.student || {}),
    ...Object.values(draft.request || {}),
    ...Object.values(draft.academic || {}),
  ] as ExtractedField[];

  const withValue = fields.filter(f => f.valor !== null && f.confianza !== 'BAJA').length;
  return fields.length > 0 ? Math.round((withValue / fields.length) * 100) : 0;
}

function hasRequiredFields(draft: DraftCase): boolean {
  return Boolean(draft);
}

export const EvidenceFirstAddCaseModal: React.FC<EvidenceFirstAddCaseModalProps> = ({
  isOpen,
  onClose,
  onAddCase,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<WizardStep>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [draft, setDraft] = useState<DraftCase | null>(null);
  const [evidenceResults, setEvidenceResults] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reviewedFields, setReviewedFields] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetWizard = useCallback(() => {
    setStep('upload');
    setFiles([]);
    setDraft(null);
    setEvidenceResults([]);
    setProcessing(false);
    setError(null);
    setReviewedFields(new Set());
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles].slice(0, 10));
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles].slice(0, 10));
    }
    if (e.target) e.target.value = '';
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processFiles = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);

    const formData = new FormData();
    files.forEach(f => formData.append('evidencias', f));

    try {
      const response = await fetch(`${API_BASE}/cases/extract`, {
        method: 'POST',
        body: formData,
      });

      const result = await parseApiResponse(response);

      if (!result.success) throw new Error(result.message || 'Error en extracción');

      setDraft(result.data.draft);
      setEvidenceResults(result.data.evidenceResults);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando evidencias');
      setStep('upload');
    } finally {
      setProcessing(false);
    }
  }, [files]);

  const handleFieldChange = useCallback((groupId: string, fieldKey: string, value: any) => {
    if (!draft) return;
    const newDraft = setFieldValue(draft, groupId, fieldKey, value);
    setDraft(newDraft);
    setReviewedFields(prev => new Set([...prev, `${groupId}.${fieldKey}`]));
  }, [draft]);

  const handleFieldReview = useCallback((groupId: string, fieldKey: string) => {
    setReviewedFields(prev => new Set([...prev, `${groupId}.${fieldKey}`]));
  }, []);

  const createCase = useCallback(async () => {
    if (!draft || !hasRequiredFields(draft)) {
      setError('No hay un borrador de caso para crear. Primero procesa al menos una evidencia.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/cases/evaluate-from-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });

      const result = await parseApiResponse(response);

      if (!result.success) throw new Error(result.message || 'Error evaluando caso');

      const engineResult = {
        classification: result.data.classification,
        classificationName: result.data.classificationName,
        confidence: result.data.confidence,
        rootCause: result.data.rootCause,
        causaRaiz: result.data.causaRaiz,
        status: result.data.status,
        hardBlockers: result.data.hardBlockers,
        appliedRules: result.data.appliedRules,
        rejectedRules: result.data.rejectedRules,
        missingEvidence: result.data.missingEvidence,
        inconsistencies: result.data.inconsistencies,
        reasoning: result.data.reasoning,
        evidenceReferences: result.data.evidenceReferences,
        conflicts: result.data.conflicts,
        dictamenSugerido: result.data.dictamenSugerido,
        politicaArticulo: result.data.politicaArticulo,
        prioridadRegla: result.data.prioridadRegla,
        evidenciasNecesarias: result.data.evidenciasNecesarias,
        analizadoEn: result.data.analizadoEn,
      };

      const newCase = buildAuditCase(draft, evidenceResults, engineResult);
      onAddCase(newCase, files);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando caso');
    } finally {
      setCreating(false);
    }
  }, [draft, evidenceResults, onAddCase, onClose]);

  function vfValue(draft: DraftCase, section: 'aulaVirtual' | 'siu' | 'contacto', key: string): any {
  const field = (draft.visualFacts as any)?.[section]?.[key];
  const value = field?.valor;
  if (value !== null && value !== undefined && value !== '') return value;
  return null;
}

const buildAuditCase = (draft: DraftCase, evidenceResults: any[], engineResult: any): AuditCase => {
    const student = draft.student;

    const startDate = formatDateForInput(getDraftValue(draft, 'request', 'fechaInicio') || '');
    const requestDate = formatDateForInput(getDraftValue(draft, 'request', 'fechaSolicitud') || '');

    let daysDiff = 0;
    if (startDate && requestDate) {
      const start = new Date(startDate);
      const req = new Date(requestDate);
      const diffTime = req.getTime() - start.getTime();
      daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const formattedStartDate = formatDateForDisplay(startDate);
    const formattedRequestDate = formatDateForDisplay(requestDate);

    const rawNivel = getDraftValue(draft, 'student', 'nivel');
    const validNivel: EducationLevel = VALID_EDUCATION_LEVELS.includes(rawNivel as EducationLevel) ? (rawNivel as EducationLevel) : 'LICENCIATURA';

    const vfIngresoAula = vfValue(draft, 'aulaVirtual', 'ingresoAula');
    const vfUltimoAcceso = vfValue(draft, 'aulaVirtual', 'ultimoAccesoCurso');
    const vfClics = vfValue(draft, 'aulaVirtual', 'clicsDetectados');
    const vfActividades = vfValue(draft, 'aulaVirtual', 'actividadesEntregadas');
    const vfCalificacion = vfValue(draft, 'aulaVirtual', 'calificacion');
    const vfMaterias = vfValue(draft, 'aulaVirtual', 'materiasCargadas');
    const vfSeleccionModalidad = vfValue(draft, 'aulaVirtual', 'seleccionModalidad');
    const vfCalificacionesSiu = vfValue(draft, 'siu', 'calificacionesRegistradas');
    const vfEstatus = vfValue(draft, 'siu', 'estatusAlumno');
    const vfTelefono = vfValue(draft, 'contacto', 'telefonoRegistrado') || vfValue(draft, 'siu', 'telefono');
    const hayAccesoVisual = Boolean(vfIngresoAula) || Boolean(vfUltimoAcceso) || (Number(vfClics) > 0) || (Number(vfActividades) > 0);

    const decisionData: CaseDecisionData = {
      fechaInicio: startDate,
      fechaSolicitud: requestDate,
      diasHabilesDesdeInicio: Math.max(0, Math.min(daysDiff, 10)),
      semanasDesdeInicio: Math.max(0, Math.ceil(daysDiff / 7)),
      nivelEducativo: validNivel,
      programa: getDraftValue(draft, 'student', 'programa') || '',
      estatusAlumno: vfEstatus || 'En proceso de auditoría',
      canalVenta: getDraftValue(draft, 'student', 'canal') || 'DIGITAL_FACEBOOK_ADS',
      contactoEfectivo: getDraftValue(draft, 'academic', 'contactoEfectivo') ?? true,
      llamadas: getDraftValue(draft, 'academic', 'llamadas') || 0,
      llamadasValidasPorHorario: (getDraftValue(draft, 'academic', 'llamadas') || 0) >= 15,
      interaccionesEscritas: getDraftValue(draft, 'academic', 'mensajes') || 0,
      ingresoAula: hayAccesoVisual ? true : (getDraftValue(draft, 'academic', 'ingresoAula') ?? false),
      ingresoAulaValidoPosgrado: hayAccesoVisual ? true : (getDraftValue(draft, 'academic', 'ingresoAula') ?? false) && !(getDraftValue(draft, 'academic', 'fallaCargaMaterias') ?? false),
      seleccionModalidad: vfSeleccionModalidad !== null ? Boolean(vfSeleccionModalidad) : false,
      ultimoAccesoCurso: vfUltimoAcceso || undefined,
      clicsDetectados: vfClics !== null ? Number(vfClics) : undefined,
      cantidadActividadesEntregadas: vfActividades !== null ? Number(vfActividades) : undefined,
      calificacionVisible: vfCalificacion !== null ? Number(vfCalificacion) : undefined,
      actividadesEntregadas: (Number(vfActividades) > 0) || false,
      calificaciones: Boolean(vfCalificacionesSiu) || (vfCalificacion !== null && vfCalificacion !== undefined) ? true : (getDraftValue(draft, 'academic', 'calificaciones') ?? false),
      materiasCargadas: vfMaterias !== null ? Boolean(vfMaterias) : (getDraftValue(draft, 'academic', 'materiasCargadas') ?? false),
      fallaCargaMaterias: getDraftValue(draft, 'academic', 'fallaCargaMaterias') ?? false,
      erroresAdministrativos: getDraftValue(draft, 'academic', 'erroresOperativos') ?? false,
      erroresFinancieros: getDraftValue(draft, 'academic', 'erroresFinancieros') ?? false,
      errorInscripcion: getDraftValue(draft, 'academic', 'errorInscripcion') ?? false,
      promesaVenta: getDraftValue(draft, 'academic', 'promesaVenta') ?? false,
      promesaVentaEvidencia: getDraftValue(draft, 'academic', 'promesaVenta') ? 'Grabación de cierre de venta cotejada por calidad' : undefined,
      solicitudAjuste: getDraftValue(draft, 'academic', 'fallaCargaMaterias') ?? false,
      ajusteDentroDe20Dias: true,
      ajusteRealizado: false,
      contactoConExitoEstudiantil: getDraftValue(draft, 'academic', 'contactoEfectivo') ?? true,
      areaOperativaCanalizoAExito: true,
      retencionRealizada: getDraftValue(draft, 'academic', 'retencionRealizada') ?? true,
      retencionAceptada: getDraftValue(draft, 'academic', 'retencionAceptada') ?? false,
      motivoSolicitud: getDraftValue(draft, 'request', 'motivo') || '',
      intencionCancelacionManifiesta: getDraftValue(draft, 'academic', 'intencionCancelacionManifiesta') ?? true,
    };

    const evidences: EvidenceItem[] = evidenceResults.map((er, idx) => ({
      id: er.evidenceId,
      code: `EVID-${Date.now()}-${idx}`,
      name: er.nombreArchivo,
      source: inferSource(er.nombreArchivo),
      type: er.nombreArchivo.toLowerCase().endsWith('.pdf') ? 'pdf' :
            er.nombreArchivo.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/) ? 'image' :
            er.nombreArchivo.toLowerCase().match(/\.(mp3|wav|m4a|ogg)$/) ? 'audio' : 'document',
      status: 'DISPONIBLE' as const,
      statusLabel: 'Disponible',
      date: new Date().toISOString().split('T')[0],
      description: `Evidencia procesada automáticamente`,
      fileSize: '',
      previewType: er.nombreArchivo.toLowerCase().endsWith('.pdf') ? 'pdf_view' :
                   er.nombreArchivo.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/) ? 'image' : 'doc_view',
      previewData: {},
    }));

    const folio = getDraftValue(draft, 'student', 'folio') || `CAVE-${Math.floor(30300 + Math.random() * 900)}`;
    const studentName = getDraftValue(draft, 'student', 'nombre') || 'Alumno sin nombre';
    const matricula = getDraftValue(draft, 'student', 'matricula') || 'Sin matricula';

    return {
      id: folio,
      status: engineResult.status === 'APROBADO' ? 'DICTAMINADO' : 'PENDIENTE_REVISION',
      statusLabel: engineResult.status === 'APROBADO' ? 'Dictaminado' : 'Pendiente revisión',
      matricula,
      studentName,
      program: getDraftValue(draft, 'student', 'programa') || 'Programa no especificado',
      level: VALID_EDUCATION_LEVELS.includes(student.nivel?.valor as EducationLevel) ? (student.nivel?.valor as EducationLevel) : 'LICENCIATURA',
      channel: getDraftValue(draft, 'student', 'canal') || 'DIGITAL_FACEBOOK_ADS',
      startDate: formattedStartDate,
      requestDate: formattedRequestDate,
      daysFromStart: daysDiff,
      workingDaysFromStart: Math.max(1, Math.min(daysDiff, 10)),
      requestedPolicy: engineResult.classificationName || 'Cancelación de Venta',
      requestReason: getDraftValue(draft, 'request', 'motivo') || 'Motivo pendiente de documentar',
      studentContactNumber: getDraftValue(draft, 'student', 'telefono') || '',
      campaign: 'AUDITORIA_EVIDENCIA_PRIMERA',
      primaryCall: {
        id: `CALL-${Date.now()}`,
        title: `Llamada de validación – ${formattedRequestDate}`,
        duration: '00:00',
        durationSeconds: 0,
        date: formattedRequestDate,
        time: '12:00 h',
        status: 'EN_PROCESO',
        campaign: 'AUDITORIA_EVIDENCIA_PRIMERA',
        phoneNumber: getDraftValue(draft, 'student', 'telefono') || 'Desconocido',
        intentsRatio: 'N/A',
        sentiment: 'Neutro',
        detectedIntentions: [],
        keyMoments: [],
        effectiveContact: {
          efectivo: false,
          criterios: [],
        },
        transcript: [],
      },
      secondaryCalls: [],
      evidences,
      timeline: [
        {
          id: `TL-${Date.now()}`,
          date: formattedRequestDate,
          time: '12:00 h',
          title: 'Caso creado desde evidencias',
          description: `Expediente generado automáticamente desde ${evidences.length} evidencia(s)`,
          actor: 'Sistema',
          system: 'Auditor',
          type: 'info' as const,
        },
      ],
      dictamen: {
        classification: engineResult.classification,
        confidence: engineResult.confidence,
        rootCause: engineResult.rootCause,
        text: buildDictamenText({
          folio,
          estudiante: studentName,
          matricula,
          clasificacion: engineResult.classification,
          causaRaiz: engineResult.rootCause,
          fechaInicio: startDate || undefined,
          fechaSolicitud: requestDate || undefined,
          confianza: engineResult.confidence,
          motivo: getDraftValue(draft, 'request', 'motivo'),
          evidencias: evidenceResults.map(er => ({ tipo: er.tipoEvidencia || 'OTRO', descripcion: er.nombreArchivo })),
        }),
        status: engineResult.status === 'APROBADO' ? 'APROBADO' : 'PENDIENTE_REVISION',
        modifiedByAuditor: false,
      },
      decisionData,
      visualFacts: draft.visualFacts,
    };
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Nuevo Caso desde Evidencias</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          Arrastra o selecciona PDFs, imágenes y audios. El sistema extraerá los datos automáticamente
          y tú solo revisarás lo necesario antes de crear el expediente.
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-2xl p-8 transition-colors ${
          dragActive
            ? 'border-emerald-500 bg-emerald-500/5'
            : 'border-zinc-700 hover:border-zinc-600'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.ogg"
          onChange={handleFileSelect}
          className="hidden"
          id="evidence-upload"
        />
        <div className="flex flex-col items-center gap-4">
          <Upload className="h-12 w-12 text-zinc-500" />
          <div className="text-center">
            <p className="text-lg font-medium text-white">Arrastra archivos aquí o haz clic para seleccionar</p>
            <p className="text-sm text-zinc-500 mt-1">PDF, imágenes (JPG, PNG, WebP) y audio (MP3, WAV, M4A, OGG) • Máx 50 MB c/u • Máx 10 archivos</p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Archivos seleccionados ({files.length})
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-zinc-800">
                  {file.type.startsWith('audio/') ? (
                    <Mic className="h-5 w-5 text-amber-400" />
                  ) : file.type === 'application/pdf' ? (
                    <FileText className="h-5 w-5 text-red-400" />
                  ) : (
                    <FileText className="h-5 w-5 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  aria-label="Eliminar archivo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={processFiles}
            disabled={processing}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Procesando evidencias...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Procesar y extraer datos
              </>
            )}
          </button>
        </div>
      )}

      {error && step === 'upload' && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
      <h3 className="text-xl font-bold text-white">Procesando evidencias...</h3>
      <p className="text-zinc-400">Extrayendo texto, transcribiendo audio y analizando con IA</p>

      <div className="space-y-3 max-w-md mx-auto text-left">
        {evidenceResults.map((er, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              {er.success ? (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{er.nombreArchivo}</p>
              <p className="text-xs text-zinc-500">
                {er.success ? `${Object.keys(er.extractedFields || {}).length} campos detectados` : `Error: ${er.error}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReviewStep = () => {
    if (!draft) return null;

    const conflicts = draft.conflictos || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Revisar y confirmar datos</h3>
            <p className="text-zinc-400">Completitud: <span className="font-bold text-emerald-400">{draft.completitud}%</span></p>
          </div>
          {conflicts.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              {conflicts.length} conflicto(s) detectado(s)
            </div>
          )}
        </div>

        {conflicts.length > 0 && (
          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
            <h4 className="font-medium text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Conflictos entre evidencias
            </h4>
            {conflicts.map((c, idx) => (
              <div key={idx} className="text-sm text-zinc-300 bg-zinc-900/50 p-3 rounded-lg">
                <p className="font-medium">{c.campo}</p>
                <p className="text-zinc-400 mt-1">{c.descripcion}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {c.valores.map((v, vi) => (
                    <span key={vi} className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700">
                      {v.valor} (conf: {CONFIDENCE_LABELS[v.confianza]})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-6">
          {FIELD_GROUPS.map(group => {
            const Icon = group.icon;
            return (
              <div key={group.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-4 pb-3 border-b border-zinc-800">
                  <Icon className="h-5 w-5 text-emerald-500" /> {group.label}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.fields.map(field => {
                    const extracted = getFieldValue(draft, group.id, field.key);
                    const isReviewed = reviewedFields.has(`${group.id}.${field.key}`);
                    const hasConflict = conflicts.some(c => c.campo === field.key);
                    const confidence = extracted?.confianza || 'BAJA';
                    const value = extracted?.valor as string | number | boolean | null;

                    return (
                      <div key={field.key} className={`relative p-4 rounded-xl border-2 transition-all ${
                        hasConflict ? 'border-red-500/50 bg-red-500/5' :
                        confidence === 'ALTA' ? 'border-emerald-500/30 bg-emerald-500/5' :
                        confidence === 'MEDIA' ? 'border-amber-500/30 bg-amber-500/5' :
                        'border-zinc-700 bg-zinc-800/50'
                      }`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <label className="text-xs font-medium text-zinc-400 flex-1 pr-2">{field.label}</label>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${CONFIDENCE_COLORS[confidence]}`}>
                            {CONFIDENCE_LABELS[confidence]}
                          </span>
                        </div>

                        {field.type === 'boolean' ? (
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={value === true}
                              onChange={e => handleFieldChange(group.id, field.key, e.target.checked)}
                              onBlur={() => handleFieldReview(group.id, field.key)}
                              className="w-5 h-5 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 bg-zinc-900"
                            />
                            <span className="text-sm text-white">{value === true ? 'Sí' : value === false ? 'No' : 'No detectado'}</span>
                          </div>
                        ) : field.type === 'select' ? (
                          <select
                            value={value || ''}
                            onChange={e => handleFieldChange(group.id, field.key, e.target.value || null)}
                            onBlur={() => handleFieldReview(group.id, field.key)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">Seleccionar...</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            value={value || ''}
                            onChange={e => handleFieldChange(group.id, field.key, e.target.value)}
                            onBlur={() => handleFieldReview(group.id, field.key)}
                            rows={3}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                            placeholder="No detectado en evidencias"
                          />
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            value={value !== null && value !== undefined ? value : ''}
                            onChange={e => handleFieldChange(group.id, field.key, e.target.value ? parseInt(e.target.value) : null)}
                            onBlur={() => handleFieldReview(group.id, field.key)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            placeholder="No detectado"
                            min={0}
                          />
                        ) : field.type === 'date' ? (
                          <input
                            type="date"
                            value={formatDateForInput(value as string || '')}
                            onChange={e => handleFieldChange(group.id, field.key, e.target.value)}
                            onBlur={() => handleFieldReview(group.id, field.key)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={value || ''}
                            onChange={e => handleFieldChange(group.id, field.key, e.target.value)}
                            onBlur={() => handleFieldReview(group.id, field.key)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            placeholder="No detectado en evidencias"
                          />
                        )}

                        {extracted?.textoCitado && (
                          <button
                            onClick={() => alert(`Fuente: Evidencia ${extracted.evidenciaId}\nPágina: ${extracted.pagina || 'N/A'}\nTimestamp: ${extracted.timestamp || 'N/A'}\n\n"${extracted.textoCitado}"`)}
                            className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                          >
                            <Search className="h-3 w-3" /> Ver fuente
                          </button>
                        )}

                        {hasConflict && (
                          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                            <AlertTriangle className="h-3 w-3 inline-block mr-1" /> Valor en conflicto entre evidencias
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={() => setStep('upload')}
            className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Volver
          </button>
          <button
            onClick={createCase}
            disabled={creating || !draft}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creando caso...
              </>
            ) : (
              <>
                <Shield className="h-5 w-5" />
                Crear expediente y dictaminar
              </>
            )}
          </button>
        </div>

        {error && step === 'review' && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 'upload': return renderUploadStep();
      case 'processing': return renderProcessingStep();
      case 'review': return renderReviewStep();
      default: return null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetWizard();
    }
  }, [isOpen, resetWizard]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50 sticky top-0 z-10">
          <h2 className="text-base font-bold text-slate-100">Nuevo Caso desde Evidencias</h2>
          <button
            onClick={onClose}
            disabled={processing || creating}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {renderStep()}
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-800 bg-zinc-950/50 text-xs text-zinc-500">
          <span className={`flex items-center gap-1 ${step === 'upload' ? 'text-emerald-400' : 'text-zinc-500'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 1. Subir evidencias
          </span>
          <ChevronRight className="h-3 w-3" />
          <span className={`flex items-center gap-1 ${step === 'processing' ? 'text-emerald-400' : step === 'review' ? 'text-emerald-400' : 'text-zinc-500'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 2. Procesar con IA
          </span>
          <ChevronRight className="h-3 w-3" />
          <span className={`flex items-center gap-1 ${step === 'review' ? 'text-emerald-400' : 'text-zinc-500'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 3. Revisar y crear
          </span>
        </div>
      </div>
    </div>
  );
};

function inferSource(filename: string): 'Flokzu' | 'SIU' | 'I6' | 'Aula Virtual' | 'WhatsApp' | 'Correo' | 'Capturas' | 'Documentos' | 'Otros' {
  const lower = filename.toLowerCase();
  if (lower.includes('siu')) return 'SIU';
  if (lower.includes('flokzu')) return 'Flokzu';
  if (lower.includes('i6') || lower.includes('llamada')) return 'I6';
  if (lower.includes('aula') || lower.includes('virtual')) return 'Aula Virtual';
  if (lower.includes('whatsapp')) return 'WhatsApp';
  if (lower.includes('correo') || lower.includes('email')) return 'Correo';
  if (lower.includes('captura') || lower.includes('screenshot')) return 'Capturas';
  return 'Documentos';
}
