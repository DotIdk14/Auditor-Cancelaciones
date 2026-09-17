import React, { useState, useRef } from 'react';
import {
  AudioWaveform,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  Volume2,
  Info,
  SlidersHorizontal,
  Bookmark,
  Sparkles,
  Phone,
  Plus,
  Upload,
  FileAudio,
  Check,
  Clock,
  Loader2,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { CallRecord, TranscriptSegment } from '../../types/audit';

interface CallTranscriptProps {
  call: CallRecord;
  allCalls?: CallRecord[];
  activeCallId?: string;
  onSelectCall?: (callId: string) => void;
  onAddCall?: (newCall: CallRecord) => void;
  currentPlayTime: number;
  onSeek: (seconds: number) => void;
  onSelectKeyMoment?: (moment: any) => void;
}

export const CallTranscript: React.FC<CallTranscriptProps> = ({
  call,
  allCalls = [call],
  activeCallId = call.id,
  onSelectCall,
  onAddCall,
  currentPlayTime,
  onSeek
}) => {
  const [viewMode, setViewMode] = useState<'conversation' | 'raw_text'>('conversation');
  const [filterKeyword, setFilterKeyword] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [showDropzone, setShowDropzone] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTranscript = (call?.transcript || []).filter(t => {
    if (!filterKeyword.trim()) return true;
    return (
      (t.text || '').toLowerCase().includes(filterKeyword.toLowerCase()) ||
      (t.speakerName || '').toLowerCase().includes(filterKeyword.toLowerCase()) ||
      (t.highlightTags && t.highlightTags.some(tag => (tag || '').toLowerCase().includes(filterKeyword.toLowerCase())))
    );
  });

  // Handle Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processUploadedFile = (file: File) => {
    setIsProcessingUpload(true);
    setProcessingStatus(`Analizando ${file.name} (AssemblyAI Diarization)...`);

    // Simulated speech-to-text pipeline
    setTimeout(() => {
      setProcessingStatus('Diarizando canales: Separando Asesor vs Cliente...');
    }, 900);

    setTimeout(() => {
      setProcessingStatus('Cotejando 6 criterios de contacto efectivo con titular...');
    }, 1800);

    setTimeout(() => {
      const callNumber = (allCalls?.length || 1) + 1;
      const cleanFileName = file.name.replace(/\.[^/.]+$/, "");

      const newCall: CallRecord = {
        id: `CALL-${Date.now()}`,
        title: `Llamada ${callNumber}: ${cleanFileName}`,
        duration: '07:15',
        durationSeconds: 435,
        date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        status: 'TRANSCRIPCION_COMPLETADA',
        campaign: 'AUDITORIA_CALIDAD',
        phoneNumber: call.phoneNumber || '+52 55 0000 0000',
        intentsRatio: '1/1',
        sentiment: 'Neutro',
        detectedIntentions: [
          'Aclaración de estatus académico y administrativo',
          'Ratificación de voluntad del estudiante'
        ],
        keyMoments: [
          { timestamp: '00:12', label: 'Identificación institucional y titular', type: 'contact' },
          { timestamp: '01:45', label: 'Exposición de motivos de deserción', type: 'request' },
          { timestamp: '04:10', label: 'Resolución de auditoría informada', type: 'error' }
        ],
        effectiveContact: {
          efectivo: true,
          criterios: [
            { criterio: 'El contacto debe ser con el titular registrado', cumplido: true, evidencia: 'Titular validado en audio' },
            { criterio: 'Identificación formal de UTEL Universidad', cumplido: true, evidencia: 'Saludo institucional UTEL Calidad' },
            { criterio: 'Información sobre objetivo de la llamada y ciclo', cumplido: true, evidencia: 'Objetivo y ciclo 2026-B expuestos' },
            { criterio: 'Confirmación de datos personales y estatus de pago', cumplido: true, evidencia: 'Datos confirmados' },
            { criterio: 'Manifestación explícita de decisión', cumplido: true, evidencia: 'Estudiante declara postura ante la matrícula' },
            { criterio: 'Respuesta vinculada a política de cancelación', cumplido: true, evidencia: 'Canalización al procedimiento correspondiente' }
          ],
          observaciones: 'Llamada procesada exitosamente mediante diarización de doble canal AssemblyAI.'
        },
        transcript: [
          {
            id: `tr-up-${Date.now()}-1`,
            speaker: 'advisor',
            speakerName: 'Asesor de Calidad',
            start: '00:00',
            end: '00:15',
            startSeconds: 0,
            endSeconds: 15,
            text: `Muy buen día, me comunico del área de Auditoría y Calidad Académica de UTEL Universidad para dar seguimiento a la llamada registrada del expediente.`
          },
          {
            id: `tr-up-${Date.now()}-2`,
            speaker: 'customer',
            speakerName: 'Cliente / Titular',
            start: '00:16',
            end: '00:45',
            startSeconds: 16,
            endSeconds: 45,
            text: `Sí, buenas tardes. Gracias por comunicarse. Necesito saber cuál es el dictamen final de mi solicitud porque dejé asentada toda la documentación correspondiente.`
          },
          {
            id: `tr-up-${Date.now()}-3`,
            speaker: 'advisor',
            speakerName: 'Asesor de Calidad',
            start: '00:46',
            end: '01:25',
            startSeconds: 46,
            endSeconds: 85,
            text: `Correcto, estamos cotejando las bitácoras del aula virtual y los reportes de contacto de InConcert para emitir el dictamen formal conforme al procedimiento de deserción.`
          },
          {
            id: `tr-up-${Date.now()}-4`,
            speaker: 'customer',
            speakerName: 'Cliente / Titular',
            start: '01:26',
            end: '02:05',
            startSeconds: 86,
            endSeconds: 125,
            text: `De acuerdo, quedo a la espera de la resolución en el sistema para confirmar la conclusión formal del trámite.`
          }
        ]
      };

      if (onAddCall) {
        onAddCall(newCall);
      }
      setIsProcessingUpload(false);
      setProcessingStatus('');
      setShowDropzone(false);
      setIsDragging(false);
    }, 2700);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processUploadedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processUploadedFile(file);
    }
  };

  // Quick preset adder (Llamada adicional preconfigurada)
  const handleAddSampleCall = (type: 'retencion' | 'supervisor' | 'inbound') => {
    setIsProcessingUpload(true);
    setProcessingStatus(`Generando y diarizando ${type === 'retencion' ? 'Llamada de Retención' : type === 'supervisor' ? 'Llamada de Supervisión' : 'Llamada Inbound del Alumno'}...`);

    setTimeout(() => {
      const callNum = (allCalls?.length || 1) + 1;
      let newTitle = `Llamada ${callNum}: Retención Adicional`;
      let transcriptText = 'El estudiante reitera que por motivos académicos no continuará.';

      if (type === 'supervisor') {
        newTitle = `Llamada ${callNum}: Validación de Folio por Supervisión`;
        transcriptText = 'Supervisor confirma expediente completo y canaliza a dictamen.';
      } else if (type === 'inbound') {
        newTitle = `Llamada ${callNum}: Contacto Entrante del Estudiante`;
        transcriptText = 'Estudiante llama directamente para consultar estatus de su solicitud.';
      }

      const sampleCall: CallRecord = {
        id: `CALL-${Date.now()}`,
        title: newTitle,
        duration: '06:15',
        durationSeconds: 375,
        date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: '15:30 h',
        status: 'TRANSCRIPCION_COMPLETADA',
        campaign: 'UTEL_SEGUIMIENTO',
        phoneNumber: call.phoneNumber || '+52 55 6506 3173',
        intentsRatio: '1/1',
        sentiment: 'Neutro',
        detectedIntentions: [transcriptText],
        keyMoments: [
          { timestamp: '00:10', label: 'Identificación de titular', type: 'contact' },
          { timestamp: '01:30', label: 'Declaración del estudiante', type: 'request' }
        ],
        effectiveContact: {
          efectivo: true,
          criterios: [
            { criterio: 'El contacto debe ser con el titular registrado', cumplido: true, evidencia: 'Titular validado' },
            { criterio: 'Identificación formal de UTEL Universidad', cumplido: true, evidencia: 'Asesor institucional' },
            { criterio: 'Información sobre objetivo de la llamada', cumplido: true, evidencia: 'Objetivo expuesto' },
            { criterio: 'Confirmación de datos personales', cumplido: true, evidencia: 'Cotejo en CRM' },
            { criterio: 'Manifestación explícita de decisión', cumplido: true, evidencia: 'Ratificación' },
            { criterio: 'Procedimiento de política', cumplido: true, evidencia: 'Canalizado a calidad' }
          ]
        },
        transcript: [
          {
            id: `tr-sample-${Date.now()}-1`,
            speaker: 'advisor',
            speakerName: 'Asesor UTEL',
            start: '00:00',
            end: '00:15',
            startSeconds: 0,
            endSeconds: 15,
            text: `Buenas tardes, me comunico de Gestión de Éxito Estudiantil para dar seguimiento a su caso.`
          },
          {
            id: `tr-sample-${Date.now()}-2`,
            speaker: 'customer',
            speakerName: 'Cliente',
            start: '00:16',
            end: '00:45',
            startSeconds: 16,
            endSeconds: 45,
            text: `Buenas tardes. Sí, confirmo que sigo a la espera del dictamen de cancelación en el sistema.`
          },
          {
            id: `tr-sample-${Date.now()}-3`,
            speaker: 'advisor',
            speakerName: 'Asesor UTEL',
            start: '00:46',
            end: '01:15',
            startSeconds: 46,
            endSeconds: 75,
            text: `Enterado. Toda la información ha sido recopilada y se adjunta a su expediente de auditoría.`
          }
        ]
      };

      if (onAddCall) onAddCall(sampleCall);
      setIsProcessingUpload(false);
      setProcessingStatus('');
      setShowDropzone(false);
    }, 1500);
  };

  return (
    <div id="call-transcript-container" className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md flex flex-col h-full overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.json,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 1. Multiple Calls Selector Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-sky-400" /> Llamadas del caso ({allCalls?.length || 1}):
          </span>

          {(allCalls || [call]).map((c, index) => {
            const isSelected = c.id === activeCallId;
            return (
              <button
                key={c.id}
                onClick={() => onSelectCall && onSelectCall(c.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
                }`}
              >
                <span>Llamada {index + 1}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isSelected ? 'bg-sky-700 text-sky-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {c.duration}
                </span>
                {c.effectiveContact?.efectivo ? (
                  <CheckCircle2 className={`w-3 h-3 ${isSelected ? 'text-emerald-300' : 'text-emerald-400'}`} />
                ) : (
                  <AlertTriangle className={`w-3 h-3 ${isSelected ? 'text-amber-300' : 'text-amber-400'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Toggle dropzone button */}
        <button
          onClick={() => setShowDropzone(!showDropzone)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-xl transition-colors shrink-0 shadow-2xs ${
            showDropzone
              ? 'bg-sky-950 text-sky-300 border border-sky-700'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
        >
          <Plus className="w-3.5 h-3.5 text-sky-400" />
          <span>{showDropzone ? 'Ocultar Carga' : '+ Cargar otra llamada'}</span>
        </button>
      </div>

      {/* 2. Drag & Drop Upload Zone (Collapsible or directly active) */}
      {(showDropzone || isDragging) && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-4 border-b border-dashed transition-all ${
            isDragging
              ? 'bg-sky-950/70 border-sky-500 border-2 ring-4 ring-sky-900/40'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          {isProcessingUpload ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <div className="text-xs font-bold text-slate-200">{processingStatus}</div>
              <p className="text-[11px] text-slate-400">Sincronizando transcripción con el motor de auditoría...</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 cursor-pointer group flex-1"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-950/80 text-sky-400 border border-sky-700 flex items-center justify-center group-hover:bg-sky-900 transition-colors shadow-2xs">
                  <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition-colors">
                    Arrastra aquí tu llamada de audio o haz clic para examinar
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Soporta archivos .MP3, .WAV, .M4A, .OGG o transcripciones .JSON
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons for Testing */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase">O simular:</span>
                <button
                  type="button"
                  onClick={() => handleAddSampleCall('retencion')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] font-medium transition-colors"
                >
                  + Retención
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSampleCall('supervisor')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] font-medium transition-colors"
                >
                  + Supervisión
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSampleCall('inbound')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] font-medium transition-colors"
                >
                  + Inbound
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Transcript Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900 sticky top-0 z-10">
        <div className="text-xs font-semibold text-slate-300">
          Transcripción y Diarización
        </div>

        {/* View mode toggle & search */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search inside transcript */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="Filtrar palabras..."
              className="text-xs bg-slate-950 text-slate-100 placeholder-slate-500 pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500 w-36 sm:w-44 transition-all"
            />
          </div>

          {/* Toggle conversation vs text */}
          <div className="inline-flex rounded-xl bg-slate-950 p-0.5 border border-slate-800 text-xs">
            <button
              id="btn-view-conversation"
              onClick={() => setViewMode('conversation')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'conversation'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Conversación
            </button>
            <button
              id="btn-view-rawtext"
              onClick={() => setViewMode('raw_text')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'raw_text'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Texto plano
            </button>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Conversation View */}
      {viewMode === 'conversation' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Fixed Column Labels */}
          <div className="grid grid-cols-2 bg-slate-950 border-b border-slate-800 px-6 py-2.5 text-xs font-bold text-slate-300 uppercase tracking-wider select-none sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                A
              </span>
              <span className="text-sky-300 font-extrabold">ASESOR DE GESTIÓN / UTEL</span>
            </div>
            <div className="flex items-center gap-2 pl-4 border-l border-slate-800">
              <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold shadow-2xs">
                C
              </span>
              <span className="text-slate-300 font-extrabold">CLIENTE / TITULAR</span>
            </div>
          </div>

          {/* Independent Scrolling Conversation Body */}
          <div 
            id="transcript-scroll-area"
            className="flex-1 overflow-y-auto p-4 md:p-6 divide-y divide-slate-800/80 space-y-4 max-h-[600px]"
          >
            {filteredTranscript.map((segment) => {
              const isAdvisor = segment.speaker === 'advisor';
              const isCurrentlyPlaying =
                currentPlayTime >= segment.startSeconds && currentPlayTime <= segment.endSeconds;

              return (
                <div
                  key={segment.id}
                  onClick={() => onSeek(segment.startSeconds)}
                  className={`pt-4 grid grid-cols-2 gap-4 cursor-pointer group transition-all rounded-xl p-2 ${
                    isCurrentlyPlaying 
                      ? 'bg-sky-950/40 ring-1 ring-sky-500/50' 
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Left Column: Advisor */}
                  {isAdvisor ? (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                        A
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-sky-300">{segment.speakerName || 'Asesor'}</span>
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 group-hover:text-sky-300 transition-colors">
                            {segment.start} – {segment.end}
                          </span>
                          {isCurrentlyPlaying && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-300 bg-sky-900/60 px-2 py-0.5 rounded-full border border-sky-700 animate-pulse">
                              <Volume2 className="w-3 h-3" />
                              Reproduciendo
                            </span>
                          )}
                        </div>

                        {/* Speech Bubble */}
                        <div className="bg-sky-950/70 text-sky-100 text-xs sm:text-[13px] leading-relaxed p-3.5 rounded-2xl rounded-tl-xs border border-sky-800/70 shadow-2xs font-normal">
                          {segment.text}
                        </div>

                        {/* Badges / Highlights */}
                        {segment.highlightTags && segment.highlightTags.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {segment.highlightTags.map((tag, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium border border-slate-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-column-placeholder hidden sm:block"></div>
                  )}

                  {/* Right Column: Customer */}
                  {!isAdvisor ? (
                    <div className="flex items-start gap-3 pl-2 sm:pl-4 sm:border-l sm:border-slate-800">
                      <div className="w-8 h-8 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                        C
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-200">{segment.speakerName || 'Cliente'}</span>
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 group-hover:text-slate-200 transition-colors">
                            {segment.start} – {segment.end}
                          </span>
                          {isCurrentlyPlaying && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 animate-pulse">
                              <Volume2 className="w-3 h-3" />
                              Reproduciendo
                            </span>
                          )}
                        </div>

                        {/* Speech Bubble */}
                        <div className="bg-slate-950 text-slate-200 text-xs sm:text-[13px] leading-relaxed p-3.5 rounded-2xl rounded-tr-xs border border-slate-800 shadow-2xs font-normal">
                          {segment.text}
                        </div>

                        {/* Badges / Highlights */}
                        {segment.highlightTags && segment.highlightTags.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {segment.highlightTags.map((tag, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium border border-slate-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-column-placeholder hidden sm:block"></div>
                  )}
                </div>
              );
            })}

            {filteredTranscript.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                No se encontraron fragmentos de diálogo que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Raw text view */
        <div className="flex-1 overflow-y-auto p-6 max-h-[600px]">
          <div className="space-y-4 font-mono text-xs leading-relaxed text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800">
            {filteredTranscript.map((segment) => (
              <p key={segment.id}>
                <span className="font-bold text-sky-400">[{segment.start} - {segment.end}] {segment.speakerName}: </span>
                {segment.text}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
