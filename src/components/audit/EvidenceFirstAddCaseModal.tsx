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
  Trash2,
  Sparkles,
  Shield,
} from 'lucide-react';
import { AuditCase, EducationLevel, EvidenceType, EvidenceItem } from '../../types/audit';
import type { DecisionResult } from '../../lib/decision-engine/types';
import { CaseDecisionData } from '../../lib/decision-engine/decision-engine';
import { buildDictamenText } from '../../lib/dictamen/templates';
import type { AuditResult, AuditEvidenceItem } from '../../lib/audit/types';
import { parseApiResponse } from '../../lib/api/parse-response';
import { HEAVY_API_BASE } from '../../lib/api/config';

interface EvidenceFirstAddCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCase: (newCase: AuditCase, files?: File[]) => void;
}

type WizardStep = 'upload' | 'processing' | 'review' | 'creating';

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

export const EvidenceFirstAddCaseModal: React.FC<EvidenceFirstAddCaseModalProps> = ({
  isOpen,
  onClose,
  onAddCase,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<WizardStep>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [evidenceResults, setEvidenceResults] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditEvidence, setAuditEvidence] = useState<AuditEvidenceItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressDetail, setProgressDetail] = useState('');
  const progressPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopProgressPolling = useCallback(() => {
    if (progressPollRef.current) {
      clearInterval(progressPollRef.current);
      progressPollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopProgressPolling();
  }, [stopProgressPolling]);

  const resetWizard = useCallback(() => {
    stopProgressPolling();
    setStep('upload');
    setFiles([]);
    setEvidenceResults([]);
    setAuditResult(null);
    setAuditEvidence([]);
    setProcessing(false);
    setError(null);
    setProgress(0);
    setProgressDetail('');
  }, [stopProgressPolling]);

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
    setStep('processing');
    setProgress(1);
    setProgressDetail('Iniciando servidor de procesamiento...');

    const progressId = (typeof globalThis.crypto !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
      ? globalThis.crypto.randomUUID()
      : `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const formData = new FormData();
    files.forEach(f => formData.append('evidencias', f));
    formData.append('progressId', progressId);

    try {
      // El contenedor (plan free) se duerme en el idle; despertarlo antes de subir.
      const WAKE_ATTEMPTS = 45;
      let awake = false;
      for (let attempt = 0; attempt < WAKE_ATTEMPTS; attempt++) {
        setProgress(1 + Math.round((attempt / WAKE_ATTEMPTS) * 4));
        setProgressDetail(
          attempt === 0
            ? 'Iniciando servidor de procesamiento...'
            : `Iniciando servidor de procesamiento... (intento ${attempt + 1})`
        );
        try {
          const healthRes = await fetch(`${HEAVY_API_BASE}/api/health`, { cache: 'no-store' });
          if (healthRes.ok) {
            awake = true;
            break;
          }
        } catch {
          // La máquina está dormida; los 502 sin CORS lanzan aquí.
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      if (!awake) {
        throw new Error('El servidor de procesamiento no respondió. Inténtalo de nuevo en unos segundos.');
      }

      setProgress(6);
      setProgressDetail('Subiendo evidencias...');

      stopProgressPolling();
      progressPollRef.current = setInterval(async () => {
        try {
          const progressRes = await fetch(`${HEAVY_API_BASE}/api/audit/multimodal/progress/${progressId}`);
          const progressBody = await parseApiResponse(progressRes);
          if (progressBody.success) {
            setProgress(Number(progressBody.data.progress) || 0);
            setProgressDetail(progressBody.data.detail || '');
          }
        } catch {
          // El poll de progreso es best-effort; el POST sigue corriendo.
        }
      }, 900);

      let response = await fetch(`${HEAVY_API_BASE}/api/audit/multimodal`, {
        method: 'POST',
        body: formData,
      });

      // Si el contenedor se durmió justo a mitad, reintentar una vez.
      if (response.status === 502) {
        stopProgressPolling();
        setProgressDetail('Servidor reiniciando, reintentando la subida...');
        await new Promise(r => setTimeout(r, 3000));
        response = await fetch(`${HEAVY_API_BASE}/api/audit/multimodal`, {
          method: 'POST',
          body: formData,
        });
      }

      const body = await parseApiResponse(response);

      if (!response.ok && !body) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      if (!body.success) {
        throw new Error(body.message || body.error || `Error HTTP ${response.status}`);
      }

      setProgress(100);
      setProgressDetail('Auditoría completada');
      setAuditResult(body.data.resultado);
      setAuditEvidence(body.data.evidencias);

      const evidenceResults = body.data.evidencias.map((ev: AuditEvidenceItem) => ({
        evidenceId: ev.evidenceId,
        nombreArchivo: ev.nombreArchivo,
        tipoEvidencia: ev.tipo,
      }));
      setEvidenceResults(evidenceResults);

      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando evidencias');
      setStep('upload');
    } finally {
      stopProgressPolling();
      setProcessing(false);
    }
  }, [files, stopProgressPolling]);

  const createCase = useCallback(async () => {
    if (!auditResult) {
      setError('No hay resultado de auditoría. Primero procesa al menos una evidencia.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const exp = auditResult.expediente || {};
      const res = auditResult.resultado || {};

      const classificationMap: Record<string, string> = {
        'CANCELACION_VENTA': 'CANCELACION_VENTA',
        'CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE': 'CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE',
        'CANCELACION_VENTA_ILOCALIZABLE': 'CANCELACION_VENTA_ILOCALIZABLE',
        'CANCELACION_VENTA_OPERATIVA': 'CANCELACION_VENTA_OPERATIVA',
        'CANCELACION_VENTA_PROMESA_NO_CUMPLIDA': 'CANCELACION_VENTA_PROMESA_NO_CUMPLIDA',
        'CANCELACION_DE_MATRICULA': 'CANCELACION_DE_MATRICULA',
        'BAJA': 'BAJA',
        'REQUIERE_REVISION': 'REQUIERE_REVISION',
      };

      const mappedClassification = classificationMap[res.clasificacion] || 'REQUIERE_REVISION';

      const appliedRules = (auditResult.reglasEvaluadas || [])
        .filter(r => r.status === 'CUMPLE')
        .map(r => ({
          ruleId: r.numeral,
          ruleName: r.title,
          description: r.fundamentacion,
          normativeRef: r.numeral,
          evidenceRefs: r.evidenceRefs.map(e => e.evidenceId),
        }));

      const rejectedRules = (auditResult.reglasEvaluadas || [])
        .filter(r => r.status === 'NO_CUMPLE' || r.status === 'NO_ACREDITADO')
        .map(r => ({
          ruleId: r.numeral,
          ruleName: r.title,
          reason: r.fundamentacion,
          normativeRef: r.numeral,
        }));

      const engineResult: DecisionResult = {
        classification: mappedClassification as any,
        classificationName: res.clasificacion?.replace(/_/g, ' ').toLowerCase() || '',
        confidence: res.confianza || 0,
        rootCause: res.causaRaiz || 'PENDIENTE',
        causaRaiz: res.causaRaiz || 'PENDIENTE',
        status: res.confianza >= 0.7 ? 'DICTAMINADO' : 'REQUIERE_REVISION',
        hardBlockers: res.hardBlockers || [],
        appliedRules,
        rejectedRules,
        missingEvidence: auditResult.incidencias
          ?.filter(i => i.type === 'EVIDENCIA_FALTANTE')
          .map(i => i.descripcion) || [],
        inconsistencies: auditResult.incidencias
          ?.filter(i => i.type !== 'EVIDENCIA_FALTANTE')
          .map(i => `${i.titulo}: ${i.descripcion}`) || [],
        reasoning: auditResult.cronologia?.map(c => c.evento) || [],
        evidenceReferences: auditEvidence.map(e => e.evidenceId),
        conflicts: [],
        dictamenSugerido: res.dictamen || '',
        politicaArticulo: auditResult.reglasEvaluadas?.[0]?.numeral || '',
        analizadoEn: auditResult.ejecucion?.fecha || new Date().toISOString(),
      };

      const studentName = exp.nombre || 'Alumno sin nombre';
      const matricula = exp.matricula || 'Sin matrícula';
      const folio = exp.folio || `CAVE-${Math.floor(30300 + Math.random() * 900)}`;
      const startDate = formatDateForInput(exp.fechaInicio || '');
      const requestDate = formatDateForInput(exp.fechaSolicitud || '');

      let daysDiff = 0;
      if (startDate && requestDate) {
        const start = new Date(startDate);
        const req = new Date(requestDate);
        daysDiff = Math.ceil((req.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }

      const validNivel: EducationLevel = ['LICENCIATURA', 'POSGRADO', 'EJECUTIVA', 'ALIANZA', 'UNKNOWN'].includes(exp.nivel as EducationLevel)
        ? (exp.nivel as EducationLevel) : 'LICENCIATURA';

      const decisionData: CaseDecisionData = {
        fechaInicio: startDate,
        fechaSolicitud: requestDate,
        diasHabilesDesdeInicio: Math.max(0, Math.min(daysDiff, 10)),
        semanasDesdeInicio: Math.max(0, Math.ceil(daysDiff / 7)),
        nivelEducativo: validNivel,
        programa: exp.programa || '',
        estatusAlumno: 'En proceso de auditoría',
        canalVenta: exp.canal || 'DIGITAL_FACEBOOK_ADS',
        contactoEfectivo: true,
        llamadas: 0,
        llamadasValidasPorHorario: false,
        interaccionesEscritas: 0,
        ingresoAula: false,
        ingresoAulaValidoPosgrado: false,
        seleccionModalidad: false,
        actividadesEntregadas: false,
        calificaciones: false,
        materiasCargadas: false,
        fallaCargaMaterias: false,
        erroresAdministrativos: false,
        erroresFinancieros: false,
        errorInscripcion: false,
        promesaVenta: false,
        solicitudAjuste: false,
        ajusteDentroDe20Dias: true,
        ajusteRealizado: false,
        contactoConExitoEstudiantil: true,
        areaOperativaCanalizoAExito: true,
        retencionRealizada: true,
        retencionAceptada: false,
        motivoSolicitud: exp.motivo || '',
        intencionCancelacionManifiesta: true,
      };

      const evidences: EvidenceItem[] = auditEvidence.map((ev, idx) => ({
        id: ev.evidenceId,
        code: `EVID-${Date.now()}-${idx}`,
        name: ev.nombreArchivo,
        source: ev.nombreArchivo.toLowerCase().includes('whatsapp') ? 'WHATSAPP' :
                ev.nombreArchivo.toLowerCase().includes('llamada') || ev.nombreArchivo.toLowerCase().includes('call') ? 'LLAMADA' : 'SISTEMA',
        type: ev.tipo === 'PDF' ? 'pdf' : ev.tipo === 'IMAGE' ? 'image' : ev.tipo === 'AUDIO' ? 'audio' : 'document',
        status: 'DISPONIBLE' as const,
        statusLabel: 'Disponible',
        date: new Date().toISOString().split('T')[0],
        description: `Evidencia procesada por modelo multimodal`,
        fileSize: '',
        previewType: ev.tipo === 'PDF' ? 'pdf_view' : ev.tipo === 'IMAGE' ? 'image' : 'doc_view',
        previewData: {},
      }));

      const formattedStartDate = formatDateForDisplay(startDate);
      const formattedRequestDate = formatDateForDisplay(requestDate);

      const newCase: AuditCase = {
        id: folio,
        status: engineResult.status === 'DICTAMINADO' ? 'DICTAMINADO' : 'PENDIENTE_REVISION',
        statusLabel: engineResult.status === 'DICTAMINADO' ? 'Dictaminado' : 'Pendiente revisión',
        matricula,
        studentName,
        program: exp.programa || 'Programa no especificado',
        level: validNivel,
        channel: exp.canal || 'DIGITAL_FACEBOOK_ADS',
        startDate: formattedStartDate,
        requestDate: formattedRequestDate,
        daysFromStart: daysDiff,
        workingDaysFromStart: Math.max(1, Math.min(daysDiff, 10)),
        requestedPolicy: res.clasificacion?.replace(/_/g, ' ') || 'Cancelación de Venta',
        requestReason: exp.motivo || 'Motivo pendiente de documentar',
        studentContactNumber: exp.telefono || '',
        campaign: 'AUDITORIA_MULTIMODAL',
        primaryCall: {
          id: `CALL-${Date.now()}`,
          title: `Llamada de validación – ${formattedRequestDate}`,
          duration: '00:00',
          durationSeconds: 0,
          date: formattedRequestDate,
          time: '12:00 h',
          status: 'EN_PROCESO',
          campaign: 'AUDITORIA_MULTIMODAL',
          phoneNumber: exp.telefono || 'Desconocido',
          intentsRatio: 'N/A',
          sentiment: 'Neutro',
          detectedIntentions: [],
          keyMoments: [],
          effectiveContact: { efectivo: false, criterios: [] },
          transcript: [],
        },
        secondaryCalls: [],
        evidences,
        timeline: [
          {
            id: `TL-${Date.now()}`,
            date: formattedRequestDate,
            time: '12:00 h',
            title: 'Auditoría multimodal completada',
            description: `Análisis realizado por modelo de IA con ${auditEvidence.length} evidencia(s) procesada(s)`,
            actor: 'Sistema IA',
            system: 'Auditor Multimodal',
            type: 'info' as const,
          },
        ],
        dictamen: {
          classification: engineResult.classification as any,
          confidence: engineResult.confidence,
          rootCause: engineResult.rootCause,
          text: res.dictamen || buildDictamenText({
            folio,
            estudiante: studentName,
            matricula,
            clasificacion: engineResult.classification as any,
            causaRaiz: engineResult.rootCause,
            fechaInicio: startDate || undefined,
            fechaSolicitud: requestDate || undefined,
            confianza: engineResult.confidence,
            motivo: exp.motivo,
            evidencias: auditEvidence.map(ev => ({ tipo: ev.tipo, descripcion: ev.nombreArchivo })),
          }),
          status: engineResult.status === 'DICTAMINADO' ? 'APROBADO' : 'PENDIENTE_REVISION',
          modifiedByAuditor: false,
        },
        decisionData,
        visualFacts: undefined,
      };

      onAddCase(newCase, files);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando caso');
    } finally {
      setCreating(false);
    }
  }, [auditResult, auditEvidence, evidenceResults, onAddCase, onClose, files]);

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

      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center text-xs text-zinc-400 mb-1.5 gap-4">
          <span className="truncate">{progressDetail || 'Procesando...'}</span>
          <span className="shrink-0 tabular-nums">{Math.min(100, Math.max(0, progress))}%</span>
        </div>
        <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

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
    if (!auditResult) return null;

    const res = auditResult.resultado || {};
    const exp = auditResult.expediente || {};
    const reglas = auditResult.reglasEvaluadas || [];
    const incidencias = auditResult.incidencias || [];
    const cronologia = auditResult.cronologia || [];

    const cumple = reglas.filter(r => r.status === 'CUMPLE');
    const noCumple = reglas.filter(r => r.status === 'NO_CUMPLE' || r.status === 'NO_ACREDITADO');
    const noAplica = reglas.filter(r => r.status === 'NO_APLICA');

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-white">Resultado de Auditoría Multimodal</h3>
          <p className="text-zinc-400 text-sm mt-1">
            Modelo: {auditResult.ejecucion?.modelo} · {auditEvidence.length} evidencia(s) procesada(s)
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Clasificación</p>
            <p className="text-sm font-bold text-emerald-400">{res.clasificacion?.replace(/_/g, ' ') || 'Sin clasificar'}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Causa raíz</p>
            <p className="text-sm font-bold text-white">{res.causaRaiz || 'No determinada'}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Confianza</p>
            <p className="text-sm font-bold text-white">{res.confianza ? `${Math.round(res.confianza * 100)}%` : '--'}</p>
          </div>
        </div>

        {exp.nombre && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-2">Datos del expediente</p>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <p className="text-zinc-300"><span className="text-zinc-500">Nombre:</span> {exp.nombre}</p>
              <p className="text-zinc-300"><span className="text-zinc-500">Matrícula:</span> {exp.matricula}</p>
              <p className="text-zinc-300"><span className="text-zinc-500">Programa:</span> {exp.programa}</p>
              <p className="text-zinc-300"><span className="text-zinc-500">Nivel:</span> {exp.nivel}</p>
              <p className="text-zinc-300"><span className="text-zinc-500">Fecha inicio:</span> {exp.fechaInicio}</p>
              <p className="text-zinc-300"><span className="text-zinc-500">Fecha solicitud:</span> {exp.fechaSolicitud}</p>
            </div>
          </div>
        )}

        {reglas.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-3">Reglas evaluadas: {cumple.length} cumplen · {noCumple.length} no cumplen · {noAplica.length} no aplican</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {reglas.map((r, idx) => (
                <div key={idx} className={`p-2 rounded-lg text-xs border ${
                  r.status === 'CUMPLE' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                  r.status === 'NO_CUMPLE' || r.status === 'NO_ACREDITADO' ? 'bg-red-500/5 border-red-500/20 text-red-400' :
                  'bg-zinc-800/50 border-zinc-700 text-zinc-400'
                }`}>
                  <span className="font-mono font-bold">{r.numeral}</span> · {r.title} — {r.status}
                </div>
              ))}
            </div>
          </div>
        )}

        {incidencias.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-3">Incidencias detectadas: {incidencias.length}</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {incidencias.map((inc, idx) => (
                <div key={idx} className={`p-2 rounded-lg text-xs border ${
                  inc.impacto === 'BLOQUEANTE' ? 'bg-red-500/5 border-red-500/20 text-red-400' :
                  inc.impacto === 'RELEVANTE' ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' :
                  'bg-zinc-800/50 border-zinc-700 text-zinc-400'
                }`}>
                  <span className="font-bold">{inc.titulo}</span>
                  <p className="mt-1 text-zinc-400">{inc.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {res.dictamen && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-2">Dictamen generado</p>
            <p className="text-sm text-zinc-300 whitespace-pre-line">{res.dictamen}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={() => setStep('upload')}
            className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Volver
          </button>
          <button
            onClick={createCase}
            disabled={creating}
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
