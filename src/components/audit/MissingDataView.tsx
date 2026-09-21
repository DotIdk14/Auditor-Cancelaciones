import { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleX,
  FileText,
  Gavel,
  Pencil,
  Plus,
  ShieldAlert,
  X
} from 'lucide-react';
import { AuditCase, ManualOverrides } from '../../types/audit';
import { DecisionResult } from '../../lib/decision-engine/types';
import { OPTIONAL_FIELDS, PDFPreflightResult, getResolvedValue, isBlank } from '../../lib/audit/pdf-preflight';

interface MissingDataViewProps {
  caseData: AuditCase;
  result: DecisionResult | null;
  preflight: PDFPreflightResult;
  onSaveOverrides: (updates: Partial<ManualOverrides>) => void;
  onGoToDictamen: () => void;
}

const GROUP_ORDER = ['Datos del estudiante', 'Evidencias', 'Fechas', 'Solicitud', 'Comentarios de áreas', 'Observaciones'];

function statusBadge(status: string) {
  switch (status) {
    case 'detected':
      return {
        text: 'Detectado',
        className: 'bg-emerald-950/40 text-emerald-400 border-emerald-800',
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    case 'manually_added':
      return {
        text: 'Agregado manual',
        className: 'bg-sky-950/40 text-sky-400 border-sky-800',
        icon: <Check className="h-3 w-3" />,
      };
    case 'missing_optional':
      return {
        text: 'Sin dato',
        className: 'bg-zinc-900 text-zinc-500 border-zinc-800',
        icon: <CircleX className="h-3 w-3" />,
      };
    default:
      return {
        text: 'Pendiente',
        className: 'bg-amber-950/40 text-amber-400 border-amber-800',
        icon: <ShieldAlert className="h-3 w-3" />,
      };
  }
}

function InlineField({
  caseData,
  field,
  onSave,
}: {
  caseData: AuditCase;
  field: (typeof OPTIONAL_FIELDS)[number];
  onSave: (updates: Partial<ManualOverrides>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const resolved = getResolvedValue(caseData, field.key, field.readSource);
  const isManual = !isBlank(caseData.manualOverrides?.[field.key]);
  const status = isManual ? 'manually_added' : isBlank(resolved) ? 'missing_optional' : 'detected';
  const badge = statusBadge(status);

  const displayValue = field.key === 'primerPago'
    ? resolved === true ? 'Si' : resolved === false ? 'No' : ''
    : String(resolved ?? '');

  const startEdit = () => {
    setDraft(displayValue);
    if (field.key === 'primerPago') {
      setDraft(String(resolved ?? ''));
    }
    setEditing(!editing);
  };

  const commit = () => {
    let value: unknown = draft;
    if (field.key === 'primerPago') {
      if (draft === 'Si' || draft === 'true') value = true;
      else if (draft === 'No' || draft === 'false') value = false;
      else value = undefined;
    }
    onSave({ [field.key]: value === '' ? undefined : value } as Partial<ManualOverrides>);
    setEditing(false);
  };

  const clearOverride = () => {
    onSave({ [field.key]: undefined } as Partial<ManualOverrides>);
    setEditing(false);
  };

  const isBoolean = field.key === 'primerPago';

  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-zinc-800/60 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-zinc-200">{field.label}</span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${badge.className}`}>
            {badge.icon}
            {badge.text}
          </span>
        </div>

        {editing ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isBoolean ? (
              <div className="flex gap-1">
                {['Si', 'No'].map(option => (
                  <button
                    key={option}
                    onClick={() => setDraft(option)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      draft === option ? 'bg-emerald-700 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                placeholder="Dejar vacío para limpiar"
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
              />
            )}
            <button
              onClick={commit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <Check className="h-3.5 w-3.5" />
              Guardar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {isManual && (
              <button
                onClick={clearOverride}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/30"
              >
                Limpiar
              </button>
            )}
          </div>
        ) : (
          <p className={`mt-1 text-sm truncate ${isBlank(resolved) ? 'text-zinc-600 italic' : 'text-zinc-400'}`}>
            {isBlank(resolved) ? 'Sin dato cargado' : displayValue}
          </p>
        )}
      </div>

      {!editing && (
        <button
          onClick={startEdit}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
        >
          {isManual ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {isManual ? 'Editar' : 'Agregar'}
        </button>
      )}
    </div>
  );
}

export function MissingDataView({ caseData, result, preflight, onSaveOverrides, onGoToDictamen }: MissingDataViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const optionalMissing = preflight.optional.length;
  const blocking = preflight.blocking;

  const groups = useMemo(() => {
    const byGroup = new Map<string, (typeof OPTIONAL_FIELDS)[number][]>();
    for (const field of OPTIONAL_FIELDS) {
      const list = byGroup.get(field.group) || [];
      list.push(field);
      byGroup.set(field.group, list);
    }
    return GROUP_ORDER.map(group => ({ group, fields: byGroup.get(group) || [] }));
  }, []);

  const toggleGroup = (group: string) => {
    setCollapsed(prev => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-sky-950/40 border border-sky-800 p-2">
            <FileText className="h-5 w-5 text-sky-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">Datos faltantes</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Revisión opcional. El PDF puede generarse aunque falten datos administrativos; se dejan en blanco hasta que se agreguen.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className={`rounded-xl border p-4 ${preflight.canGenerate ? 'border-emerald-800 bg-emerald-950/20' : 'border-rose-800 bg-rose-950/20'}`}>
            <p className={`text-xs font-bold uppercase tracking-wide ${preflight.canGenerate ? 'text-emerald-400' : 'text-rose-400'}`}>
              {preflight.canGenerate ? 'Listo para generar PDF' : 'PDF bloqueado'}
            </p>
            <p className="mt-1 text-sm text-zinc-300">
              {preflight.canGenerate
                ? optionalMissing
                  ? `Faltan ${optionalMissing} dato(s) opcional(es). Puedes generar de todos modos.`
                  : 'Todos los datos del documento están completos.'
                : `${blocking.length} dato(s) imprescindible(s) sin resolver.`}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Datos detectados</p>
            <p className="mt-1 text-sm text-zinc-300">{preflight.fields.filter(f => f.status === 'detected').length} campos con valor automático</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Agregados manuales</p>
            <p className="mt-1 text-sm text-zinc-300">{preflight.fields.filter(f => f.status === 'manually_added').length} campos editados por auditor</p>
          </div>
        </div>

        {blocking.length > 0 && (
          <div className="mt-4 rounded-xl border border-rose-800 bg-rose-950/30 p-3">
            <div className="flex items-center gap-2 text-rose-300">
              <ShieldAlert className="h-4 w-4" />
              <span className="text-sm font-bold">No se puede generar el PDF hasta resolver:</span>
            </div>
            <ul className="mt-2 space-y-1">
              {blocking.map(item => (
                <li key={item.key} className="text-sm text-rose-200">• {item.label}</li>
              ))}
            </ul>
          </div>
        )}

        {preflight.warnings.map((warning, i) => (
          <div key={i} className="mt-3 rounded-xl border border-amber-800 bg-amber-950/30 p-3 text-sm text-amber-200">
            {warning}
          </div>
        ))}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={onGoToDictamen}
            disabled={!preflight.canGenerate}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            <Gavel className="h-4 w-4" />
            Ir a dictamen y generar PDF
          </button>
          <span className="text-xs text-zinc-500">
            {preflight.canGenerate
              ? 'En la pestaña Dictamen puedes descargar el documento ahora o más tarde.'
              : 'Completa los campos imprescindibles desde las evidencias o a mano para continuar.'}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map(({ group, fields }) => {
            if (fields.length === 0) return null;
            const isCollapsed = collapsed[group];
            const missingCount = fields.filter(f => {
              const manual = caseData.manualOverrides?.[f.key];
              const resolved = getResolvedValue(caseData, f.key, f.readSource);
              return isBlank(manual) && isBlank(resolved);
            }).length;

            return (
              <section key={group} className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden">
                <button
                  onClick={() => toggleGroup(group)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-zinc-900/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{group}</span>
                    {missingCount > 0 && (
                      <span className="rounded-full bg-amber-950/50 border border-amber-800 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        {missingCount} sin dato
                      </span>
                    )}
                  </div>
                  {isCollapsed ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronUp className="h-4 w-4 text-zinc-500" />}
                </button>
                {!isCollapsed && (
                  <div className="px-4">
                    {fields.map(field => (
                      <div key={field.key}>
                        <InlineField caseData={caseData} field={field} onSave={onSaveOverrides} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}