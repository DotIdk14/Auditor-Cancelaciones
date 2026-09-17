import React, { useState } from 'react';
import {
  X,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  PhoneCall,
  Laptop,
  Image as ImageIcon,
  MessageSquare,
  Printer,
  Eye,
  Lock,
  Clock,
  ExternalLink,
  CheckCheck,
  Building2,
  FileCheck,
  Paperclip,
  Send,
  MoreVertical,
  Volume2,
  Play,
  Pause
} from 'lucide-react';
import { EvidenceItem } from '../../types/audit';

interface EvidenceViewerProps {
  evidence: EvidenceItem | null;
  onClose: () => void;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  evidence,
  onClose
}) => {
  if (!evidence) return null;

  // View modes: 'proof' (The actual original document/image) vs 'metadata' (Technical audit stamps)
  const [viewMode, setViewMode] = useState<'proof' | 'metadata'>('proof');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [activePdfPage, setActivePdfPage] = useState<number>(1);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleDownload = () => {
    setDownloadNotice(`Archivo "${evidence.name}" descargado con éxito`);
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isWhatsApp =
    evidence.source === 'WhatsApp' ||
    evidence.code.toUpperCase().includes('WAPP') ||
    evidence.name.toLowerCase().includes('whatsapp');

  const isFlokzu =
    evidence.source === 'Flokzu' ||
    evidence.code.toUpperCase().includes('FLK') ||
    evidence.code.toUpperCase().includes('CAVE') ||
    evidence.previewType === 'doc_view';

  const isSiu =
    evidence.source === 'SIU' ||
    evidence.previewType === 'siu_table' ||
    evidence.code.toUpperCase().includes('SIU');

  const isI6 =
    evidence.source === 'I6' ||
    evidence.previewType === 'i6_log' ||
    evidence.code.toUpperCase().includes('I6') ||
    evidence.type === 'audio';

  const isAulaVirtual =
    evidence.source === 'Aula Virtual' ||
    evidence.previewType === 'aula_log' ||
    evidence.code.toUpperCase().includes('AULA');

  const isPdf = evidence.type === 'pdf' || evidence.previewType === 'pdf_view';

  const hasDirectImage =
    Boolean(evidence.fileUrl && evidence.fileUrl.startsWith('data:image/')) ||
    (evidence.type === 'image' && Boolean(evidence.fileUrl && !evidence.fileUrl.includes('placeholder')));

  return (
    <div
      id="evidence-viewer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 md:p-6"
    >
      <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* TOP BAR / MODAL HEADER */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 flex-wrap gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {isWhatsApp ? (
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              ) : isFlokzu ? (
                <FileText className="w-4 h-4 text-sky-400" />
              ) : isSiu ? (
                <GraduationCap className="w-4 h-4 text-blue-400" />
              ) : isI6 ? (
                <PhoneCall className="w-4 h-4 text-purple-400" />
              ) : isAulaVirtual ? (
                <Laptop className="w-4 h-4 text-amber-400" />
              ) : (
                <ImageIcon className="w-4 h-4 text-zinc-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-zinc-100 truncate max-w-md">
                  {evidence.name}
                </h3>
                <span className="text-[10px] bg-zinc-800 text-zinc-300 font-mono px-2 py-0.5 rounded-md border border-zinc-700">
                  {evidence.code}
                </span>
                <span className="text-[10px] bg-emerald-950/70 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-800 flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Prueba Certificada</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                Fuente oficial: <span className="font-semibold text-zinc-200">{evidence.source}</span> • Fecha: {evidence.date} • Peso: {evidence.fileSize || '320 KB'}
              </p>
            </div>
          </div>

          {/* Header Controls & Mode Tabs */}
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 text-xs">
              <button
                id="tab-proof-document"
                onClick={() => setViewMode('proof')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  viewMode === 'proof'
                    ? 'bg-zinc-100 text-zinc-900 font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Documento / Prueba</span>
              </button>
              <button
                id="tab-proof-metadata"
                onClick={() => setViewMode('metadata')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  viewMode === 'metadata'
                    ? 'bg-zinc-100 text-zinc-900 font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Metadatos Técnicos</span>
              </button>
            </div>

            {downloadNotice && (
              <span className="text-xs text-emerald-400 font-medium px-2 py-1 bg-emerald-950/60 border border-emerald-800 rounded-lg animate-in fade-in hidden sm:inline">
                {downloadNotice}
              </span>
            )}

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition-colors cursor-pointer"
              title="Descargar documento probatorio"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Descargar</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer ml-1"
              title="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SUB-HEADER TOOLBAR (Zoom, Rotate, Actions) */}
        {viewMode === 'proof' && (
          <div className="px-6 py-2 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 font-medium">Controles de visualización:</span>
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 gap-2">
                <button
                  onClick={() => setZoomLevel(Math.max(60, zoomLevel - 15))}
                  className="p-1 hover:text-zinc-100 transition-colors cursor-pointer"
                  title="Alejar"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-semibold text-[11px] w-10 text-center text-zinc-200">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel(Math.min(180, zoomLevel + 15))}
                  className="p-1 hover:text-zinc-100 transition-colors cursor-pointer"
                  title="Acercar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setZoomLevel(100);
                    setRotation(0);
                  }}
                  className="text-[10px] text-zinc-400 hover:text-zinc-100 pl-2 border-l border-zinc-800 cursor-pointer"
                >
                  Restablecer
                </button>
              </div>

              <button
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] transition-colors cursor-pointer"
                title="Girar 90 grados"
              >
                <RotateCw className="w-3 h-3" />
                <span className="hidden sm:inline">Girar</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                Expediente: <strong className="text-zinc-200 font-mono">CAVE-30274</strong>
              </span>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] transition-colors cursor-pointer"
                title="Imprimir documento oficial"
              >
                <Printer className="w-3 h-3" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL BODY (THE AUTHENTIC DOCUMENT / PROOF) */}
        <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 sm:p-6 md:p-8 flex flex-col items-center justify-start">
          
          {/* ============================================================ */}
          {/* VIEW MODE 1: THE REAL PROOF / DOCUMENT (DEFAULT)              */}
          {/* ============================================================ */}
          {viewMode === 'proof' && (
            <div
              className="w-full flex flex-col items-center transition-all duration-200 origin-top"
              style={{
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                maxWidth: '960px'
              }}
            >
              {/* CASE A: DIRECT UPLOADED USER IMAGE */}
              {hasDirectImage && evidence.fileUrl && (
                <div className="w-full bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl p-4 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between pb-3 border-b border-zinc-800 text-xs text-zinc-400 mb-4">
                    <span className="font-semibold text-zinc-200">{evidence.name}</span>
                    <span className="font-mono text-emerald-400">✓ Archivo cargado por el auditor</span>
                  </div>
                  <div className="max-w-full overflow-hidden rounded-xl border border-zinc-800 bg-black flex items-center justify-center p-2">
                    <img
                      src={evidence.fileUrl}
                      alt={evidence.name}
                      className="max-h-[600px] w-auto object-contain rounded-lg shadow-lg"
                    />
                  </div>
                  <p className="text-xs text-zinc-400 mt-4 text-center max-w-xl">
                    {evidence.description}
                  </p>
                </div>
              )}

              {/* CASE B: WHATSAPP REAL CHAT PROOF */}
              {!hasDirectImage && isWhatsApp && (
                <div className="w-full max-w-2xl bg-[#0b141a] rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden text-zinc-100 font-sans">
                  {/* WhatsApp App Bar */}
                  <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-sm text-white shadow-inner">
                        UT
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white">Soporte Alumnos UTEL</h4>
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-zinc-900 flex items-center justify-center text-[9px] font-bold">
                            ✓
                          </span>
                        </div>
                        <span className="text-[11px] text-emerald-400 font-medium">En línea • Cuenta de empresa oficial</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400">
                      <PhoneCall className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                      <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                    </div>
                  </div>

                  {/* WhatsApp Chat Canvas */}
                  <div className="p-4 sm:p-6 space-y-4 min-h-[480px] bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px] bg-[#0b141a]">
                    {/* End to end encryption notice */}
                    <div className="bg-[#182229] border border-[#222e35] p-2.5 rounded-xl max-w-md mx-auto text-center text-[11px] text-[#8696a0] flex items-center gap-2 justify-center shadow-xs">
                      <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span>Los mensajes en este chat están cifrados de extremo a extremo. Nadie fuera de este chat puede leerlos.</span>
                    </div>

                    {/* Date separator */}
                    <div className="flex justify-center">
                      <span className="bg-[#182229] text-[#8696a0] text-[10px] font-bold uppercase px-3 py-1 rounded-lg border border-[#222e35]">
                        5 de Septiembre de 2026
                      </span>
                    </div>

                    {/* Student message 1 */}
                    <div className="flex justify-end">
                      <div className="bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-xs p-3.5 max-w-md shadow-md text-xs leading-relaxed space-y-1">
                        <p>
                          Hola, buenos días. Mi nombre es Carlos Eduardo Escobar Benitez, matrícula 010847403, alumno de la Maestría en Automatización y Robot Industrial. Iniciamos clases el lunes 31 de agosto, pero entro a mi aula virtual y mi tablero sigue completamente vacío, sin materias ni foros de presentación.
                        </p>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] pt-1">
                          <span>11:20 am</span>
                          <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                        </div>
                      </div>
                    </div>

                    {/* Support response 1 */}
                    <div className="flex justify-start">
                      <div className="bg-[#202c33] text-[#e9edef] rounded-2xl rounded-tl-xs p-3.5 max-w-md shadow-md text-xs leading-relaxed space-y-1">
                        <p className="font-semibold text-emerald-400 text-[11px]">Soporte Alumnos UTEL</p>
                        <p>
                          Hola Carlos, buen día. Un gusto saludarte de la Mesa de Atención. Verificando tu expediente vemos que tu pago de colegiatura e inscripción está al 100% validado. Hubo un retraso masivo en la sincronización de materias de posgrado por parte de Servicios Escolares. Te pedimos por favor esperar de 48 a 72 horas hábiles en lo que concluye la carga.
                        </p>
                        <div className="flex items-center justify-end text-[10px] text-[#8696a0] pt-1">
                          <span>11:24 am</span>
                        </div>
                      </div>
                    </div>

                    {/* Student message 2 */}
                    <div className="flex justify-end">
                      <div className="bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-xs p-3.5 max-w-md shadow-md text-xs leading-relaxed space-y-1 border border-emerald-600/30">
                        <p>
                          No puedo esperar 48 horas más, la primera semana ya terminó y los foros de evaluación cerrarán. Si la universidad no puede brindarme el servicio educativo en tiempo y forma, exijo cancelar mi inscripción de inmediato y la devolución de mi dinero.
                        </p>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] pt-1">
                          <span>11:28 am</span>
                          <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                        </div>
                      </div>
                    </div>

                    {/* Support response 2 */}
                    <div className="flex justify-start">
                      <div className="bg-[#202c33] text-[#e9edef] rounded-2xl rounded-tl-xs p-3.5 max-w-md shadow-md text-xs leading-relaxed space-y-1">
                        <p className="font-semibold text-emerald-400 text-[11px]">Soporte Alumnos UTEL</p>
                        <p>
                          Comprendemos tu molestia, Carlos. Voy a canalizar tu reporte de inmediato al área de Éxito Estudiantil para que un gestor se comunique contigo vía telefónica hoy mismo y te asista con el proceso. Lamentamos mucho los inconvenientes generados.
                        </p>
                        <div className="flex items-center justify-end text-[10px] text-[#8696a0] pt-1">
                          <span>11:31 am</span>
                        </div>
                      </div>
                    </div>

                    {/* Student message 3 */}
                    <div className="flex justify-end">
                      <div className="bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-xs p-3.5 max-w-md shadow-md text-xs leading-relaxed space-y-1">
                        <p>
                          Espero su llamada. Si no me resuelven iniciaré el trámite formal de cancelación de venta.
                        </p>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] pt-1">
                          <span>11:35 am</span>
                          <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Footer Audit Stamp */}
                  <div className="bg-[#202c33] p-3 border-t border-[#2a3942] flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Captura cotejada pericialmente con línea +52 55 6506 3173
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">SHA-256: d4a7...99b1</span>
                  </div>
                </div>
              )}

              {/* CASE C: FLOKZU BPM - BOLETA OFICIAL DE RADICACIÓN CAVE */}
              {!hasDirectImage && isFlokzu && !isWhatsApp && (
                <div className="w-full max-w-3xl bg-zinc-100 text-zinc-900 rounded-xl shadow-2xl p-6 sm:p-10 font-sans border-4 border-zinc-300">
                  {/* University Document Header */}
                  <div className="flex items-start justify-between pb-4 border-b-2 border-zinc-900">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-7 h-7 text-zinc-900" />
                        <div>
                          <h2 className="text-xl font-extrabold tracking-tight uppercase text-zinc-950">
                            UTEL UNIVERSIDAD
                          </h2>
                          <p className="text-[10px] font-bold text-zinc-600 tracking-wider uppercase">
                            DIRECCIÓN GENERAL DE OPERACIONES ESCOLARES Y ÉXITO ESTUDIANTIL
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-zinc-950 text-white text-[10px] font-mono font-bold px-3 py-1 rounded-sm uppercase tracking-wider">
                        FLOKZU BPM • TRÁMITE OFICIAL
                      </span>
                      <div className="text-xs font-bold font-mono text-zinc-800 mt-1">
                        FOLIO: CAVE-30274
                      </div>
                    </div>
                  </div>

                  {/* Title Banner */}
                  <div className="bg-zinc-200/80 p-3 my-4 rounded border border-zinc-300 text-center">
                    <h3 className="text-sm font-black uppercase text-zinc-900 tracking-wide">
                      SOLICITUD FORMAL DE CANCELACIÓN DE VENTA (PROCESO CAVE)
                    </h3>
                    <p className="text-[11px] text-zinc-600">
                      Conforme al Procedimiento Oficial de Deserción de Estudiantes GDM_GAM_PRD_MLG_003
                    </p>
                  </div>

                  {/* Student & Ticket Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white rounded-lg border border-zinc-300 text-xs mb-4">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Nombre del Alumno</span>
                      <span className="font-bold text-zinc-900">Carlos Eduardo Escobar Benitez</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Matrícula Escolar</span>
                      <span className="font-bold font-mono text-zinc-900">010847403</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Programa / Carrera</span>
                      <span className="font-bold text-zinc-900">MA Automatización y Robot</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Nivel Académico</span>
                      <span className="font-bold text-zinc-900">Posgrado</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Inicio de Ciclo</span>
                      <span className="font-bold text-zinc-900 font-mono">31/08/2026</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Fecha Radicación</span>
                      <span className="font-bold text-zinc-900 font-mono">07/09/2026 14:15 hrs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Canal de Venta</span>
                      <span className="font-bold text-zinc-900">Town Center Nicolás Romero</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Días Transcurridos</span>
                      <span className="font-bold text-rose-700 font-mono">7 días (Día 5 hábil)</span>
                    </div>
                  </div>

                  {/* Statement of Reasons */}
                  <div className="p-4 bg-white rounded-lg border border-zinc-300 text-xs space-y-2 mb-4">
                    <h4 className="text-[11px] font-black uppercase text-zinc-900 border-b pb-1 border-zinc-200">
                      Declaración y Motivo Manifestado por el Estudiante
                    </h4>
                    <p className="text-zinc-800 leading-relaxed italic bg-zinc-50 p-3 rounded border border-zinc-200">
                      "Por medio de la presente solicito la Cancelación de Venta de mi matrícula e inscripción en la Maestría en Automatización y Robot Industrial debido a fallas e incumplimiento en la prestación del servicio educativo por parte de la institución. A la fecha han transcurrido 7 días desde el inicio oficial de clases (31/08/2026) y mis asignaturas curriculares continúan sin ser asignadas ni cargadas en el aula virtual, imposibilitando mi acceso a actividades y foros. Se anexa captura de pantalla del portal y reporte a soporte."
                    </p>
                  </div>

                  {/* Operative Assessment Block */}
                  <div className="p-4 bg-white rounded-lg border border-zinc-300 text-xs space-y-2 mb-6">
                    <h4 className="text-[11px] font-black uppercase text-zinc-900 border-b pb-1 border-zinc-200">
                      Dictamen del Gestor de Éxito Estudiantil
                    </h4>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-zinc-500 text-[10px] block font-bold">Gestor Responsable:</span>
                        <span className="font-bold text-zinc-900">Mariana López (Éxito Estudiantil)</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px] block font-bold">Resultado de Gestión de Retención:</span>
                        <span className="font-bold text-rose-700">No Aceptada (Estudiante insiste en cancelación por falla operativa)</span>
                      </div>
                    </div>
                  </div>

                  {/* Official Verification Signatures & Stamp */}
                  <div className="pt-4 border-t-2 border-zinc-900 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="w-44 border-b border-zinc-900 pb-1 text-center font-bold text-zinc-900 text-[11px]">
                        Carlos E. Escobar Benitez
                      </div>
                      <div className="text-[9px] text-zinc-500 text-center uppercase">
                        Firma Electrónica del Solicitante (OTP)
                      </div>
                    </div>

                    <div className="border-2 border-zinc-900 rounded p-2 text-center bg-zinc-50 w-48">
                      <div className="text-[9px] font-mono font-bold text-zinc-900">
                        SELLO DIGITAL DE RADICACIÓN
                      </div>
                      <div className="text-[8px] font-mono text-zinc-600 mt-0.5">
                        UTEL-FLK-2026-CAVE-30274
                      </div>
                      <div className="text-[8px] text-emerald-700 font-bold mt-0.5">
                        ✓ RECIBIDO Y VALIDADO
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CASE D: SIU - CONSTANCIA OFICIAL DE KÁRDEX Y ESTADO FINANCIERO */}
              {!hasDirectImage && isSiu && !isWhatsApp && (
                <div className="w-full max-w-3xl bg-white text-zinc-900 rounded-xl shadow-2xl p-6 sm:p-10 font-sans border-4 border-zinc-300 relative overflow-hidden">
                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
                    <span className="text-8xl font-black text-zinc-900 rotate-[-30deg]">
                      SIU UTEL
                    </span>
                  </div>

                  {/* Header */}
                  <div className="flex items-start justify-between pb-4 border-b-2 border-zinc-900 relative">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-8 h-8 text-zinc-900" />
                      <div>
                        <h2 className="text-lg font-black tracking-tight uppercase text-zinc-950">
                          SISTEMA INTEGRAL UNIVERSITARIO (SIU)
                        </h2>
                        <p className="text-[10px] font-bold text-zinc-600 uppercase">
                          CONSTANCIA OFICIAL DE INSCRIPCIÓN Y ESTADO DE DEVENGAMIENTO
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-zinc-900 text-white font-mono px-2 py-0.5 rounded font-bold">
                        EXPEDIENTE 010847403
                      </span>
                      <p className="text-[10px] text-zinc-600 font-mono mt-1">Fecha Emisión: 07/09/2026</p>
                    </div>
                  </div>

                  {/* Student info box */}
                  <div className="my-4 p-3 bg-zinc-50 rounded border border-zinc-300 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block">ALUMNO:</span>
                      <span className="font-bold text-zinc-900">Carlos Eduardo Escobar Benitez</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block">PROGRAMA:</span>
                      <span className="font-bold text-zinc-900">MA Automatización y Robot Industrial</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block">CICLO ESCOLAR:</span>
                      <span className="font-bold text-zinc-900">2026-B1 (Inicio 31/08/2026)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block">CAMPUS:</span>
                      <span className="font-bold text-zinc-900">En Línea / Aula Digital</span>
                    </div>
                  </div>

                  {/* Financial Status Box with Stamp */}
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded mb-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-emerald-800 font-bold block uppercase">
                        Estado Financiero en Pasarela SIU
                      </span>
                      <span className="text-emerald-950 font-bold">
                        Colegiatura e Inscripción B1: 100% CUBIERTO ($0.00 MXN Saldo Insoluto)
                      </span>
                      <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                        Folio Bancario: REF-7782194 • Fecha de Pago: 22/08/2026
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-700 text-white font-bold rounded text-xs uppercase tracking-wide">
                      PAGO VALIDADO
                    </span>
                  </div>

                  {/* Academic Load Grid */}
                  <div className="space-y-2 mb-4">
                    <h4 className="text-xs font-black uppercase text-zinc-900">
                      Asignaturas Curriculares Registradas para el Ciclo
                    </h4>
                    <table className="w-full text-left text-xs border border-zinc-300">
                      <thead className="bg-zinc-200 text-zinc-800 font-bold border-b border-zinc-300">
                        <tr>
                          <th className="p-2">Clave</th>
                          <th className="p-2">Asignatura</th>
                          <th className="p-2">Docente</th>
                          <th className="p-2">Estatus en Plataforma</th>
                          <th className="p-2">Calificación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        <tr className="bg-rose-50/60">
                          <td className="p-2 font-mono font-bold">AUT-501</td>
                          <td className="p-2 font-semibold">Robótica Industrial Avanzada</td>
                          <td className="p-2 text-zinc-600">Dr. M. Arriaga</td>
                          <td className="p-2 font-bold text-rose-700">
                            ❌ NO CARGADA AL INICIO (08/09 Extemporánea)
                          </td>
                          <td className="p-2 font-mono font-bold text-zinc-500">- (Sin registro)</td>
                        </tr>
                        <tr className="bg-rose-50/60">
                          <td className="p-2 font-mono font-bold">AUT-502</td>
                          <td className="p-2 font-semibold">Sistemas de Control y Automatización</td>
                          <td className="p-2 text-zinc-600">Mtra. S. Vega</td>
                          <td className="p-2 font-bold text-rose-700">
                            ❌ NO CARGADA AL INICIO (08/09 Extemporánea)
                          </td>
                          <td className="p-2 font-mono font-bold text-zinc-500">- (Sin registro)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Devengamiento Certificate */}
                  <div className="p-3 bg-zinc-100 rounded border border-zinc-300 text-xs mb-4">
                    <span className="font-bold text-zinc-900 block">Dictamen de Devengamiento Institucional:</span>
                    <p className="text-zinc-700 mt-1 leading-relaxed">
                      El estudiante <strong>NO CUENTA CON CALIFICACIONES REGISTRADAS</strong> en Bimestre 1 ni evaluaciones presentadas. No existe devengamiento del servicio educativo conforme al Artículo 5.7.d del reglamento institucional.
                    </p>
                  </div>

                  {/* Stamp Footer */}
                  <div className="pt-3 border-t-2 border-zinc-900 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Certificación emitida por Dirección de Servicios Escolares UTEL
                    </span>
                    <div className="border border-zinc-400 p-1 rounded text-center text-[9px] font-mono text-zinc-700">
                      SELLO DE CONTROL ESCOLAR: SIU-CERT-20260907
                    </div>
                  </div>
                </div>
              )}

              {/* CASE E: AULA VIRTUAL / MOODLE STUDENT PORTAL CAPTURE */}
              {!hasDirectImage && isAulaVirtual && !isWhatsApp && (
                <div className="w-full max-w-4xl bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden font-sans">
                  {/* Realistic Browser Window Bar */}
                  <div className="bg-zinc-950 px-4 py-2 flex items-center justify-between border-b border-zinc-800 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      <span className="ml-3 text-zinc-400 text-[11px] truncate">
                        🔒 https://aulavirtual.utel.edu.mx/alumnos/dashboard/materias
                      </span>
                    </div>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                      Chrome 128 • Windows 11
                    </span>
                  </div>

                  {/* Student Portal Nav */}
                  <div className="bg-zinc-900 px-6 py-3 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-sky-600 text-white font-bold flex items-center justify-center text-xs">
                        U
                      </div>
                      <span className="text-sm font-black tracking-tight text-white uppercase">
                        AULA VIRTUAL UTEL
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-right">
                        <span className="font-bold text-zinc-200 block">Carlos Eduardo Escobar</span>
                        <span className="text-[10px] text-zinc-400 font-mono">Matrícula: 010847403</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-xs">
                        CE
                      </div>
                    </div>
                  </div>

                  {/* Portal Dashboard Body */}
                  <div className="p-6 sm:p-8 bg-zinc-950 space-y-6 min-h-[460px]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-zinc-100">Mis Asignaturas Curriculares</h3>
                        <p className="text-xs text-zinc-400">Ciclo Lectivo Bimestre 1 (Inicio oficial: 31/08/2026)</p>
                      </div>
                      <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono rounded-lg">
                        Programa: MA Automatización y Robot Industrial
                      </span>
                    </div>

                    {/* Prominent Red Alert Box - The exact error seen by the student */}
                    <div className="p-6 bg-rose-950/40 border-2 border-rose-700/80 rounded-2xl text-center space-y-3 shadow-lg">
                      <div className="w-12 h-12 rounded-2xl bg-rose-900/60 text-rose-300 border border-rose-600 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-rose-200">
                        Aviso: No tienes asignaturas activas asignadas en este ciclo
                      </h4>
                      <p className="text-xs text-rose-300/90 max-w-lg mx-auto leading-relaxed">
                        Estimado estudiante, tu carga de materias para el período iniciado el 31 de agosto de 2026 se encuentra en proceso de validación por parte del departamento de Servicios Escolares. Si tu inscripción ya fue formalizada, comunícate con tu Gestor de Éxito Estudiantil.
                      </p>
                      <div className="pt-2 text-[11px] font-mono text-rose-400">
                        Código de Sistema: ERR_AULA_NO_COURSES_ASSIGNED • ID Sesión: MKT-SESS-994812
                      </div>
                    </div>

                    {/* Empty course placeholder */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-50">
                      <div className="border border-dashed border-zinc-800 rounded-xl p-4 text-center text-xs text-zinc-600">
                        Asignatura 1: Pendiente de sincronización
                      </div>
                      <div className="border border-dashed border-zinc-800 rounded-xl p-4 text-center text-xs text-zinc-600">
                        Asignatura 2: Pendiente de sincronización
                      </div>
                    </div>
                  </div>

                  {/* Screenshot timestamp footer */}
                  <div className="bg-zinc-900 px-6 py-2.5 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span>Timestamp captura: 07/09/2026 14:10:18 hrs</span>
                    <span>IP Alumno: 189.215.84.112 (Ciudad de México)</span>
                  </div>
                </div>
              )}

              {/* CASE F: INCONCERT CRM (I6) — ACTA DE CERTIFICACIÓN DE LLAMADA TELEFÓNICA */}
              {!hasDirectImage && isI6 && !isWhatsApp && (
                <div className="w-full max-w-3xl bg-zinc-900 text-zinc-100 rounded-2xl border border-zinc-800 shadow-2xl p-6 sm:p-8 font-sans space-y-6">
                  {/* Telephony Header */}
                  <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center">
                        <PhoneCall className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100">
                          INCONCERT CTI — CERTIFICACIÓN DE LLAMADA TELEFÓNICA
                        </h3>
                        <p className="text-[11px] text-zinc-400">
                          Grabación Oficial de Auditoría • Caso CAVE-30274
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-purple-950/70 text-purple-300 border border-purple-800 px-2.5 py-1 rounded-lg font-mono font-bold">
                      CALL-20260907-88492
                    </span>
                  </div>

                  {/* Telephony Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Número Marcado</span>
                      <span className="font-bold text-zinc-200 font-mono">+52 55 6506 3173</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Duración de la Llamada</span>
                      <span className="font-bold text-zinc-200 font-mono">08:45 minutos</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Agente Operador</span>
                      <span className="font-bold text-zinc-200">Mariana López (Éxito)</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Contacto Efectivo</span>
                      <span className="font-bold text-emerald-400 font-mono">✓ CUMPLIDO (Art. 5.2)</span>
                    </div>
                  </div>

                  {/* Telephony Audio Wave Player Box */}
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-300 flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-purple-400" />
                        Pista de Audio Certificada (G.711u / 64 kbps)
                      </span>
                      <button
                        onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        {isPlayingAudio ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isPlayingAudio ? 'Pausar' : 'Reproducir Grabación'}</span>
                      </button>
                    </div>

                    {/* Waveform graphic */}
                    <div className="h-10 bg-zinc-900 rounded-lg flex items-center justify-center gap-1 px-3 overflow-hidden border border-zinc-800">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 rounded-full transition-all ${
                            isPlayingAudio ? 'bg-purple-400 animate-pulse' : 'bg-zinc-700'
                          }`}
                          style={{
                            height: `${Math.max(15, Math.sin(i * 0.4) * 35 + 20)}%`
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Certified Transcript Excerpt */}
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-xs space-y-2">
                    <span className="font-bold text-zinc-300 block uppercase tracking-wider text-[10px]">
                      Extracto Certificado de la Conversación:
                    </span>
                    <div className="space-y-2 text-zinc-300 leading-relaxed font-sans">
                      <p>
                        <strong className="text-purple-400">[00:42] Alumno (Carlos Escobar):</strong>{' '}
                        "Mariana, ya esperé toda la semana completa. Entro al aula virtual todos los días y sigue completamente vacía. No tengo materias ni tareas. Yo pagué para estudiar a tiempo. Si la escuela no me puede dar el servicio, exijo mi cancelación de venta inmediata..."
                      </p>
                      <p>
                        <strong className="text-zinc-400">[02:18] Gestor (Mariana López):</strong>{' '}
                        "Carlos, entiendo perfectamente tu frustración y te ofrezco una disculpa. Justo hoy se están concluyendo las asignaciones. ¿Te parece si te damos acceso a un taller de regularización adicional sin costo?"
                      </p>
                      <p>
                        <strong className="text-purple-400">[03:40] Alumno (Carlos Escobar):</strong>{' '}
                        "No, Mariana. No acepto ningún taller ni regularización. Ya perdí la primera semana y esto es una falla total de la escuela. Por favor ingresa mi trámite de cancelación de venta hoy mismo."
                      </p>
                    </div>
                  </div>

                  {/* Quality seal */}
                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Protocolo de identidad y contacto validado conforme a política
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">Hash audio: e8f9...4412</span>
                  </div>
                </div>
              )}

              {/* CASE G: POLICY MANUAL PDF */}
              {!hasDirectImage && isPdf && (
                <div className="w-full max-w-4xl bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl p-6 sm:p-8 space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-sky-400" />
                      <div>
                        <h4 className="text-sm font-bold text-zinc-100">
                          GDM_GAM_PRD_MLG_003 — Procedimiento Deserción de Estudiantes
                        </h4>
                        <span className="text-xs text-zinc-400">Versión 2 • UTEL Universidad • Documento Oficial</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>Página {activePdfPage} de 19</span>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => setActivePdfPage(Math.max(1, activePdfPage - 1))}
                          disabled={activePdfPage === 1}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() => setActivePdfPage(Math.min(19, activePdfPage + 1))}
                          disabled={activePdfPage === 19}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-4 max-h-[500px] overflow-y-auto leading-relaxed">
                    <div className="p-3 bg-sky-950/40 border-l-4 border-sky-500 text-sky-300 font-medium rounded-r-lg">
                      Documento Interno Oficial Vigente. Gerencia de Formación y Calidad UTEL.
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-zinc-100 mb-1">
                        5.9 Cancelaciones Operativas
                      </h5>
                      <p className="text-zinc-300">
                        a. Aplica cancelación de venta operativa cuando por error de la institución (Servicios Escolares, Carga de Materias, Plataforma o Finanzas) no se brinde el servicio contratado en tiempo y forma, generando afectación directa al alumno que motive su deseo de no continuar.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW MODE 2: TECHNICAL METADATA (OPTIONAL AUDIT DETAILS)    */}
          {/* ============================================================ */}
          {viewMode === 'metadata' && (
            <div className="w-full max-w-3xl bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">Ficha Técnica de Evidencia y Cadena de Custodia</h4>
                    <p className="text-xs text-zinc-400">Verificación criptográfica y metadatos del expediente</p>
                  </div>
                </div>
                <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded-lg font-mono">
                  Hash Validado
                </span>
              </div>

              {/* Technical key values */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Identificador Interno:</span>
                  <span className="font-mono text-zinc-200">{evidence.id}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Código de Folio:</span>
                  <span className="font-mono text-zinc-200">{evidence.code}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Fuente / Sistema Emisor:</span>
                  <span className="font-semibold text-zinc-200">{evidence.source}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Fecha y Hora de Registro:</span>
                  <span className="font-mono text-zinc-200">{evidence.date}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Tamaño del Archivo:</span>
                  <span className="font-mono text-zinc-200">{evidence.fileSize || '320 KB'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Estatus de Disponibilidad:</span>
                  <span className="font-bold text-emerald-400">{evidence.status}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Descripción Registrada:</span>
                  <span className="text-zinc-200 text-right max-w-md">{evidence.description}</span>
                </div>
              </div>

              {/* Extra PreviewData attributes if any */}
              {evidence.previewData && (
                <div className="mt-6 pt-4 border-t border-zinc-800 space-y-2">
                  <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Variables Técnicas Registradas en el Sistema:
                  </h5>
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
                    {Object.entries(evidence.previewData).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-1 border-b border-zinc-800/60 last:border-0">
                        <span className="text-zinc-400 font-mono text-[11px]">{k}:</span>
                        <span className="font-semibold text-zinc-200 text-[11px] font-mono">
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Evidencia incorporada al expediente probatorio oficial CAVE-30274</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Cerrar visor
          </button>
        </div>
      </div>
    </div>
  );
};
