import { ReactNode, useState } from 'react';
import { ExternalLink, X, ChevronDown, ChevronUp, Monitor, GraduationCap, Key, Lock } from 'lucide-react';

interface ExternalLinkItem {
  id: string;
  label: string;
  url: string;
  category: 'i6' | 'mas' | 'aula';
  environment: string;
  usernameHint?: string;
  notes?: string;
}

interface ExternalLinksPanelProps {
  onOpenLink?: (url: string, label: string) => void;
}

const EXTERNAL_LINKS: ExternalLinkItem[] = [
  {
    id: 'i6-ventas-1',
    label: 'i6 Ambiente 1 - Ventas',
    url: 'https://utel.i6.inconcertcc.com/inconcert/apps/agent/3082',
    category: 'i6',
    environment: 'Ventas (México)',
    usernameHint: 'Usuario específico de ventas'
  },
  {
    id: 'i6-ee-1',
    label: 'i6 Ambiente 2 - EE',
    url: 'https://cls49-boc.i6.inconcertcc.com/inconcert/apps/agent/login/',
    category: 'i6',
    environment: 'Éxito Estudiantil (México)',
    usernameHint: 'Ej: david.souday@utel2'
  },
  {
    id: 'i6-latam-ventas',
    label: 'i6 LATAM - Ventas',
    url: 'https://cls56-dal.i6.inconcertcc.com/inconcert/apps/agent/1033',
    category: 'i6',
    environment: 'Ventas LATAM (COL, PER, ARG, DOM...)',
    usernameHint: 'Ej: david.souday@utelcol'
  },
  {
    id: 'mas-1',
    label: 'MAS 1',
    url: 'https://mas-utel.inconcertcc.com/login?redirect=%2F',
    category: 'mas',
    environment: 'MAS México',
    usernameHint: 'Credenciales específicas'
  },
  {
    id: 'mas-2',
    label: 'MAS 2',
    url: 'https://mas-utel2.inconcertcc.com/login',
    category: 'mas',
    environment: 'MAS México 2',
    usernameHint: 'Credenciales específicas'
  },
  {
    id: 'mas-latam',
    label: 'MAS LATAM',
    url: 'https://mas-utel-col.inconcertcc.com/login?redirect=%2Fmas%2Fhome',
    category: 'mas',
    environment: 'MAS Colombia/LATAM',
    usernameHint: 'Credenciales específicas'
  },
  {
    id: 'aula-directorio',
    label: 'Directorio Aulas Virtuales',
    url: 'https://aulavirtual.utel.edu.mx/es/directory',
    category: 'aula',
    environment: 'Directorio general de aulas',
    usernameHint: 'Usuario específico por cada aula',
    notes: 'Ingresar al directorio y seleccionar el aula correspondiente al programa del estudiante'
  },
  {
    id: 'aula-uve',
    label: 'Aula UVE',
    url: 'https://aula-uve.scalahed.com/user/index.php?id=1',
    category: 'aula',
    environment: 'UVE (Universidad Virtual Empresarial)',
    usernameHint: 'Credenciales específicas UVE',
    notes: 'Plataforma ScalaHED para programas UVE'
  },
  {
    id: 'aula-unica',
    label: 'Aula UNICA',
    url: '',
    category: 'aula',
    environment: 'UNICA',
    usernameHint: 'Acceso vía SIU',
    notes: 'No hay link directo. Acceder desde SIU → Módulo Aula Virtual UNICA'
  },
  {
    id: 'aula-insurgentes',
    label: 'Aula INSURGENTES',
    url: '',
    category: 'aula',
    environment: 'INSURGENTES',
    usernameHint: 'Acceso vía SIU',
    notes: 'No hay link directo. Acceder desde SIU → Módulo Aula Virtual INSURGENTES'
  },
  {
    id: 'aula-diplomados',
    label: 'Aula Diplomados / Educación Continua',
    url: 'https://educacioncontinua.utel.edu.mx/user/index.php?id=1307',
    category: 'aula',
    environment: 'Diplomados y Educación Continua',
    usernameHint: 'Credenciales específicas Educación Continua',
    notes: 'Plataforma Moodle para diplomados'
  }
];

const categoryConfig = {
  i6: { icon: Monitor, color: 'text-sky-400', bg: 'bg-sky-950/30', border: 'border-sky-800', label: 'i6' },
  mas: { icon: GraduationCap, color: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-800', label: 'MAS' },
  aula: { icon: Lock, color: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-800', label: 'Aula Virtual' }
};

export function ExternalLinksPanel({ onOpenLink }: ExternalLinksPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const groupedLinks = EXTERNAL_LINKS.reduce((acc, link) => {
    if (!acc[link.category]) acc[link.category] = [];
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, ExternalLinkItem[]>);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-xl shadow-2xl transition-all duration-300 flex items-center gap-2 ${
          isOpen
            ? 'bg-slate-900 border border-emerald-500 px-4 py-3'
            : 'bg-emerald-600 border border-emerald-500 px-3 py-3'
        }`}
        aria-label={isOpen ? 'Cerrar enlaces externos' : 'Abrir enlaces externos'}
      >
        <ExternalLink className="h-5 w-5 text-white" />
        {!isOpen && <span className="font-semibold text-white">Accesos Externos</span>}
        {isOpen && (
          <>
            <span className="text-xs text-emerald-300">Enlaces de evidencia</span>
            <ChevronUp className="h-4 w-4 text-emerald-300" />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-96 max-h-[60vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-emerald-400" />
              Enlaces para Obtención de Evidencias
            </h3>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-3 space-y-3 max-h-[50vh] overflow-y-auto">
            {Object.entries(groupedLinks).map(([category, links]) => {
              const config = categoryConfig[category as keyof typeof categoryConfig];
              const Icon = config.icon;
              const isExpanded = expandedCategory === category;

              return (
                <div key={category} className="rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-900/50 transition-colors"
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bg} ${config.border}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{config.label}</p>
                      <p className="text-xs text-slate-500">{links.length} entorno{links.length > 1 ? 's' : ''}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

{isExpanded && (
                      <div className="px-4 pb-3 pt-2 space-y-2 border-t border-slate-800 animate-in slide-in-from-top-2 duration-150">
                        {links.map(link => {
                          const hasUrl = link.url && link.url.length > 0;
                          const handleClick = () => {
                            if (hasUrl && onOpenLink) {
                              onOpenLink(link.url, link.label);
                            }
                          };
                          return (
                            <div
                              key={link.id}
                              onClick={hasUrl && onOpenLink ? handleClick : undefined}
                              className={`block p-3 rounded-xl transition-all cursor-pointer ${
                                hasUrl
                                  ? 'bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/50'
                                  : 'bg-slate-800/50 border border-slate-700 cursor-not-allowed opacity-70'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {hasUrl ? (
                                  <ExternalLink className="h-5 w-5 text-sky-400 group-hover:text-sky-300 mt-0.5 flex-shrink-0" />
                                ) : (
                                  <span className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0">
                                    <Lock className="h-5 w-5" />
                                  </span>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-white truncate">{link.label}</p>
                                    {!hasUrl && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-950/50 text-amber-300 border border-amber-800">
                                        Acceso vía SIU
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 truncate">{link.environment}</p>
                                  {link.usernameHint && (
                                    <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                                      <Key className="h-3 w-3" />
                                      <span>{link.usernameHint}</span>
                                    </p>
                                  )}
                                  {link.notes && (
                                    <p className="text-[11px] text-slate-500 mt-1">{link.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                </div>
              );
            })}

            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-500 text-center mb-3">
                <Key className="h-3 w-3 inline align-middle mr-1" />
                Cada entorno requiere usuario y contraseña específicos. Solicita credenciales a tu coordinador.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}