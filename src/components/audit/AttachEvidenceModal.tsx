import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  FileCheck
} from 'lucide-react';
import { EvidenceItem, EvidenceSource } from '../../types/audit';

interface AttachEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvidence: (newEvidence: EvidenceItem) => void;
  currentCaseId: string;
}

export const AttachEvidenceModal: React.FC<AttachEvidenceModalProps> = ({
  isOpen,
  onClose,
  onAddEvidence,
  currentCaseId
}) => {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<EvidenceSource>('Capturas');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'document'>('image');
  const [fileSizeText, setFileSizeText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setErrorMsg(null);
    setSelectedFile(file);

    // Format file size
    const sizeInKb = Math.round(file.size / 1024);
    const sizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;
    setFileSizeText(sizeStr);

    if (file.type.startsWith('image/')) {
      setFileType('image');
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setFileType('pdf');
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFileType('document');
      setPreviewUrl(null);
    }

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Por favor ingrese un título para la evidencia probatoria.');
      return;
    }

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newEvidence: EvidenceItem = {
      id: `ev-uploaded-${Date.now()}`,
      code: `EVID-${Date.now().toString().slice(-6)}`,
      name: title.trim(),
      source: source,
      type: fileType,
      status: 'DISPONIBLE',
      statusLabel: 'Cargado',
      date: formattedDate,
      description: description.trim() || 'Documento / imagen probatoria anexada manualmente por el auditor de calidad.',
      fileSize: fileSizeText || '350 KB',
      fileUrl: previewUrl || undefined,
      previewType: fileType === 'image' ? 'image' : fileType === 'pdf' ? 'pdf_view' : 'doc_view',
      previewData: {
        nombreArchivo: selectedFile?.name || `${title}.png`,
        tipoMIME: selectedFile?.type || 'image/png',
        fechaCarga: formattedDate,
        origen: source,
        casoAsociado: currentCaseId,
        tamano: fileSizeText || '350 KB'
      }
    };

    onAddEvidence(newEvidence);
    onClose();
  };

  return (
    <div
      id="attach-evidence-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Adjuntar Evidencia Probatoria</h3>
              <p className="text-[11px] text-zinc-400">Subir imagen o documento original al expediente del caso</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag & Drop File Zone */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Archivo / Captura de Pantalla
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-zinc-400 bg-zinc-800/60'
                  : selectedFile
                  ? 'border-emerald-700/80 bg-emerald-950/20'
                  : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              {previewUrl && fileType === 'image' ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative max-h-40 max-w-full overflow-hidden rounded-lg border border-zinc-700 shadow-md">
                    <img
                      src={previewUrl}
                      alt="Vista previa de la evidencia"
                      className="max-h-36 object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedFile?.name} ({fileSizeText})</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">Haz clic para cambiar la imagen</span>
                </div>
              ) : selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-emerald-400" />
                  <div className="text-xs text-emerald-300 font-semibold">{selectedFile.name}</div>
                  <span className="text-[10px] text-zinc-500">{fileSizeText} • Haz clic para reemplazar</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-medium text-zinc-200">
                    Arrastra tu captura o documento aquí, o <span className="text-zinc-400 underline">haz clic para explorar</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Formatos admitidos: PNG, JPG, JPEG, WEBP, PDF (hasta 15 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Title & Source Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Título del Documento o Captura *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Captura error aula virtual..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Origen / Sistema Emisor
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as EvidenceSource)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              >
                <option value="Capturas">Captura de Pantalla</option>
                <option value="WhatsApp">Chat WhatsApp</option>
                <option value="Flokzu">Ticket Flokzu BPM</option>
                <option value="SIU">Kárdex / SIU Escolar</option>
                <option value="Aula Virtual">Aula Virtual / Moodle</option>
                <option value="I6">Registro Telefónico I6</option>
                <option value="Correo">Correo Electrónico</option>
                <option value="Documentos">Documento Institucional</option>
                <option value="Otros">Otro Soporte Probatorio</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Descripción Probatoria
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detalle qué prueba este documento en relación con la solicitud de cancelación..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-zinc-900 bg-zinc-100 hover:bg-white rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Guardar y Anexar al Expediente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
