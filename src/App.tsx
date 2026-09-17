import { ReactNode, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileSearch,
  FolderOpen,
  GanttChartSquare,
  Lock,
  Plus,
  ShieldCheck
} from 'lucide-react';
import { MVP_TICKETS } from './mock/tickets';
import { getChronologicalEvidence, Ticket } from './lib/tickets';

const statusLabels: Record<Ticket['status'], string> = {
  BORRADOR: 'Borrador',
  EVIDENCIAS_PENDIENTES: 'Evidencias pendientes',
  PROCESANDO: 'Procesando',
  REQUIERE_REVISION: 'Revisión requerida',
  DICTAMEN_PROPUESTO: 'Dictamen propuesto',
  PDF_EMITIDO: 'PDF emitido',
  CERRADO: 'Cerrado'
};

export default function App() {
  const [tickets] = useState<Ticket[]>(MVP_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState(tickets[0]?.id ?? '');
  const selectedTicket = tickets.find(ticket => ticket.id === selectedTicketId) ?? tickets[0];

  const stats = useMemo(() => ({
    total: tickets.length,
    automaticos: tickets.filter(ticket => ticket.resultado.automatico).length,
    revision: tickets.filter(ticket => ticket.status === 'REQUIERE_REVISION').length
  }), [tickets]);

  if (!selectedTicket) {
    return <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">Sin tickets disponibles.</main>;
  }

  const chronologicalEvidence = getChronologicalEvidence(selectedTicket);
  const appliedRules = selectedTicket.reglas.filter(rule => rule.status === 'APLICADA');
  const blockedRules = selectedTicket.reglas.filter(rule => rule.status !== 'APLICADA');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-zinc-950">
        Saltar al contenido principal
      </a>

      <header className="border-b border-zinc-800 bg-zinc-950/95 px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">MVP Auditor</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Tickets de auditoría de cancelaciones</h1>
            <p className="mt-1 text-sm text-zinc-400">Evidencia cronológica primero, reglas trazables después y resultado al cierre.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300" aria-label="Resumen de tickets">
            <Badge label={`${stats.total} tickets`} />
            <Badge label={`${stats.automaticos} automáticos`} intent="success" />
            <Badge label={`${stats.revision} en revisión`} intent="warning" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[320px_minmax(0,1fr)] md:px-6">
        <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4" aria-label="Bandeja de tickets">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Bandeja</h2>
              <p className="text-xs text-zinc-500">MVP local con datos de ejemplo.</p>
            </div>
            <button className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" type="button">
              <Plus className="h-3.5 w-3.5" /> Nuevo
            </button>
          </div>

          <nav className="mt-4 space-y-2" aria-label="Tickets disponibles">
            {tickets.map(ticket => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setSelectedTicketId(ticket.id)}
                className={`w-full rounded-2xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-400 ${ticket.id === selectedTicket.id ? 'border-emerald-500 bg-emerald-950/30' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'}`}
                aria-current={ticket.id === selectedTicket.id ? 'true' : undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-zinc-100">{ticket.folio}</span>
                  <StatusPill status={ticket.status} />
                </div>
                <p className="mt-2 truncate text-xs text-zinc-400">{ticket.estudiante.nombre ?? 'Sin estudiante asignado'}</p>
                <p className="mt-1 truncate text-[11px] text-zinc-500">{ticket.solicitud.motivo ?? 'Sin motivo'}</p>
              </button>
            ))}
          </nav>
        </aside>

        <main id="main-content" className="space-y-4" tabIndex={-1}>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 md:p-5" aria-labelledby="ticket-title">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-mono text-xs font-semibold text-emerald-400">{selectedTicket.folio}</p>
                <h2 id="ticket-title" className="mt-1 text-xl font-bold text-white">{selectedTicket.estudiante.nombre ?? 'Ticket sin nombre'}</h2>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-300 sm:grid-cols-2 lg:grid-cols-4">
                  <Info label="Matrícula" value={selectedTicket.estudiante.matricula} />
                  <Info label="Programa" value={selectedTicket.estudiante.programa} />
                  <Info label="Política" value={selectedTicket.solicitud.politicaSolicitada} />
                  <Info label="Estado" value={statusLabels[selectedTicket.status]} />
                </dl>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  <FileSearch className="h-4 w-4" /> Corregir excepción
                </button>
                <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-500" aria-disabled="true">
                  <Download className="h-4 w-4" /> PDF pendiente
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 md:p-5" aria-labelledby="evidence-title">
            <SectionHeader icon={<Clock3 className="h-5 w-5" />} title="Evidencia cronológica" description="Las pruebas se ordenan por fecha del hecho antes de mostrar cualquier decisión." id="evidence-title" />
            <ol className="mt-4 space-y-3">
              {chronologicalEvidence.length === 0 ? (
                <EmptyState icon={<FolderOpen className="h-5 w-5" />} title="No hay evidencia cargada" description="Carga capturas, PDFs, audios o transcripciones para habilitar el análisis." />
              ) : chronologicalEvidence.map(evidence => (
                <li key={evidence.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-950 text-xs font-bold text-emerald-300 ring-1 ring-emerald-800">{evidence.ordenCronologico}</span>
                        <h3 className="text-sm font-bold text-white">{evidence.nombreArchivo}</h3>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{evidence.extraccion?.textoExtraido ?? 'Sin extracción disponible todavía.'}</p>
                    </div>
                    <div className="shrink-0 space-y-1 text-xs text-zinc-400 md:text-right">
                      <p><span className="font-semibold text-zinc-200">Fuente:</span> {evidence.fuente}</p>
                      <p><span className="font-semibold text-zinc-200">Fecha:</span> {formatEvidenceDate(evidence.fechaEvidencia)}</p>
                      <p className="font-mono text-[10px] text-zinc-600">sha256: {evidence.sha256.slice(0, 10)}…</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 md:p-5" aria-labelledby="rules-title">
            <SectionHeader icon={<GanttChartSquare className="h-5 w-5" />} title="Trazabilidad de reglas" description="Cada regla muestra si aplica, si bloquea o qué evidencia la respalda." id="rules-title" />
            <div className="mt-4 grid gap-3">
              {selectedTicket.reglas.length === 0 ? (
                <EmptyState icon={<AlertTriangle className="h-5 w-5" />} title="Reglas pendientes" description="Aún no hay evidencia suficiente para iniciar el análisis normativo." />
              ) : selectedTicket.reglas.map(rule => (
                <article key={rule.id} className={`rounded-2xl border p-4 ${rule.status === 'APLICADA' ? 'border-emerald-900 bg-emerald-950/20' : 'border-amber-900 bg-amber-950/20'}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {rule.status === 'APLICADA' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                        <h3 className="text-sm font-bold text-white">Regla {rule.codigoPolitica}: {rule.nombre}</h3>
                      </div>
                      <p className="mt-2 text-xs text-zinc-400">{rule.razon}</p>
                    </div>
                    <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-300">{rule.status.replaceAll('_', ' ')}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 md:p-5" aria-labelledby="result-title">
            <SectionHeader icon={<ShieldCheck className="h-5 w-5" />} title="Resultado al cierre" description="El resultado solo aparece después de revisar evidencia y reglas." id="result-title" />
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              {selectedTicket.resultado.principal ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-emerald-500 px-3 py-1.5 text-sm font-black text-emerald-950">{selectedTicket.resultado.principal.replaceAll('_', ' ')}</span>
                    <span className="rounded-xl border border-zinc-700 px-3 py-1.5 text-sm font-bold text-zinc-200">{selectedTicket.resultado.subtipo?.replaceAll('_', ' ')}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-300">{selectedTicket.resultado.textoDictamen}</p>
                  <p className="flex items-center gap-2 text-xs text-zinc-500"><Lock className="h-3.5 w-3.5" /> La descarga PDF queda bloqueada hasta autorizar la siguiente fase.</p>
                </div>
              ) : (
                <EmptyState icon={<AlertTriangle className="h-5 w-5" />} title="Sin resultado automático" description={selectedTicket.resultado.motivoRevision?.join(' · ') ?? 'Pendiente de evidencias.'} />
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Badge({ label, intent = 'neutral' }: { label: string; intent?: 'neutral' | 'success' | 'warning' }) {
  const styles = intent === 'success' ? 'border-emerald-800 bg-emerald-950 text-emerald-300' : intent === 'warning' ? 'border-amber-800 bg-amber-950 text-amber-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300';
  return <span className={`rounded-full border px-3 py-1 font-semibold ${styles}`}>{label}</span>;
}

function StatusPill({ status }: { status: Ticket['status'] }) {
  const isGood = status === 'DICTAMEN_PROPUESTO' || status === 'PDF_EMITIDO' || status === 'CERRADO';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isGood ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>{statusLabels[status]}</span>;
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 truncate font-semibold text-zinc-200">{value || 'Pendiente'}</dd>
    </div>
  );
}

function SectionHeader({ icon, title, description, id }: { icon: ReactNode; title: string; description: string; id: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-emerald-400">{icon}</div>
      <div>
        <h2 id={id} className="text-base font-bold text-white">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-5 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-500">{icon}</div>
      <h3 className="mt-3 text-sm font-bold text-zinc-200">{title}</h3>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
    </div>
  );
}

function formatEvidenceDate(value?: string): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
