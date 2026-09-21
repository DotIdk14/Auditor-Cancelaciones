import { ReactNode, useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface ExternalLinkViewerProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  label: string;
}

const ALLOWED_DOMAINS = [
  'i6.inconcertcc.com',
  'mas-utel.inconcertcc.com',
  'mas-utel2.inconcertcc.com',
  'mas-utel-col.inconcertcc.com',
  'aulavirtual.utel.edu.mx',
  'aula-uve.scalahed.com',
  'educacioncontinua.utel.edu.mx',
];

function isUrlAllowed(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

export function ExternalLinkViewer({ isOpen, onClose, url, label }: ExternalLinkViewerProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIframeLoaded(false);
      setIframeError(false);
      setIsLoading(true);
    }
  }, [isOpen, url]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setIsLoading(false);
    setIframeError(false);
  };

  const handleIframeError = () => {
    setIframeError(true);
    setIsLoading(false);
    setIframeLoaded(false);
  };

  const openInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const retryLoad = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      setIframeError(false);
      iframeRef.current.src = url;
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  const urlAllowed = isUrlAllowed(url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-[90vw] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-950/30 border border-sky-800 flex-shrink-0">
              <ExternalLink className="h-5 w-5 text-sky-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white truncate">{label}</h3>
              <p className="text-xs text-zinc-500 truncate">{url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openInNewTab}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-xs"
              aria-label="Abrir en nueva pestaña"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nueva pestaña</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors ml-2"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative min-h-[60vh]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
              <div className="flex flex-col items-center gap-4 text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
                <p className="text-sm">Cargando {label}...</p>
              </div>
            </div>
          )}

          {iframeError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10 p-6">
              <div className="text-center max-w-md">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-950/30 border border-amber-800 mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-amber-400" />
                </div>
                <h4 className="font-bold text-white mb-2">No se puede incrustar este sitio</h4>
                <p className="text-zinc-400 text-sm mb-4">
                  {urlAllowed
                    ? 'Este sitio bloquea la incrustación en iframes (política de seguridad X-Frame-Options o CSP).'
                    : 'Este dominio no está en la lista permitida por seguridad.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={openInNewTab}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir en nueva pestaña
                  </button>
                  {urlAllowed && (
                    <button
                      onClick={retryLoad}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reintentar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={urlAllowed ? url : 'about:blank'}
            className="w-full h-full border-0"
            title={label}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
            allow="clipboard-read; clipboard-write"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{ 
              display: iframeLoaded || iframeError ? 'block' : 'none',
              height: '100%',
              width: '100%',
              minHeight: '60vh'
            }}
          />
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Los enlaces se abren en iframe. Si no carga, use "Abrir en nueva pestaña".
          </p>
          <button
            onClick={openInNewTab}
            className="px-3 py-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Abrir en pestaña
          </button>
        </div>
      </div>
    </div>
  );
}