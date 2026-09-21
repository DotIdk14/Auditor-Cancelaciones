import { ReactNode } from 'react';
import { Calendar, MapPin, Phone, Mail, User, GraduationCap, Building, FileText, AlertTriangle, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { AuditCase } from '../../types/audit';

interface CaseInfoTabProps {
  caseData: AuditCase;
}

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export function CaseInfoTab({ caseData }: CaseInfoTabProps) {
  const statusColors = {
    EN_ANALISIS: 'bg-sky-950/50 text-sky-400 border-sky-800',
    PENDIENTE_REVISION: 'bg-amber-950/50 text-amber-400 border-amber-800',
    DICTAMINADO: 'bg-emerald-950/50 text-emerald-400 border-emerald-800',
    APROBADO: 'bg-emerald-950/50 text-emerald-400 border-emerald-800',
    RECHAZADO: 'bg-rose-950/50 text-rose-400 border-rose-800'
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
              <User className="h-5 w-5 text-sky-400" />
              Datos del Estudiante
            </h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Nombre Completo</dt>
                <dd className="mt-1 font-semibold text-white">{caseData.studentName}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Matrícula</dt>
                <dd className="mt-1 font-mono font-semibold text-zinc-200">{caseData.matricula}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Programa Académico</dt>
                <dd className="mt-1 font-semibold text-zinc-200">{caseData.program}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Nivel Educativo</dt>
                <dd className="mt-1 font-semibold text-zinc-200">{caseData.level}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Canal de Venta</dt>
                <dd className="mt-1 font-semibold text-zinc-200">{caseData.channel}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Teléfono de Contacto</dt>
                <dd className="mt-1 font-semibold text-zinc-200">{caseData.studentContactNumber}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
              <Calendar className="h-5 w-5 text-sky-400" />
              Cronología del Caso
            </h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Fecha de Inicio de Ciclo</dt>
                <dd className="mt-1 font-semibold text-zinc-200">{formatDate(caseData.startDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Fecha de Solicitud</dt>
                <dd className="mt-1 font-semibold text-zinc-200">{formatDate(caseData.requestDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Días Corridos desde Inicio</dt>
                <dd className="mt-1 font-mono font-bold text-sky-400">{caseData.daysFromStart} días</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Días Hábiles desde Inicio</dt>
                <dd className="mt-1 font-mono font-bold text-emerald-400">{caseData.workingDaysFromStart} días hábiles</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
              <FileText className="h-5 w-5 text-sky-400" />
              Solicitud y Causal Reportada
            </h3>
            <div className="space-y-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Política Solicitada</dt>
                <dd className="mt-1 font-semibold text-zinc-200">{caseData.requestedPolicy}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Motivo / Descripción</dt>
                <dd className="mt-1 text-zinc-300 leading-relaxed">{caseData.requestReason}</dd>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Llamadas Registradas
            </h3>
            <div className="space-y-3">
              {caseData.primaryCall && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 rounded bg-sky-950/50 text-sky-400 text-xs font-bold">Principal</span>
                      <div>
                        <p className="font-medium text-white">{caseData.primaryCall.title}</p>
                        <p className="text-xs text-zinc-400">{caseData.primaryCall.date} • {caseData.primaryCall.duration}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      caseData.primaryCall.status === 'TRANSCRIPCION_COMPLETADA'
                        ? 'bg-emerald-950 text-emerald-300'
                        : 'bg-amber-950 text-amber-300'
                    }`}>
                      {caseData.primaryCall.status}
                    </span>
                  </div>
                </div>
              )}
              {caseData.secondaryCalls && caseData.secondaryCalls.length > 0 && (
                <div className="space-y-2">
                  {caseData.secondaryCalls.map((call, index) => (
                    <div key={call.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded bg-amber-950/50 text-amber-400 text-xs font-bold">Secundaria {index + 1}</span>
                          <div>
                            <p className="font-medium text-white">{call.title}</p>
                            <p className="text-xs text-zinc-400">{call.date} • {call.duration}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          call.status === 'TRANSCRIPCION_COMPLETADA'
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-amber-950 text-amber-300'
                        }`}>
                          {call.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!caseData.primaryCall && (!caseData.secondaryCalls || caseData.secondaryCalls.length === 0) && (
                <div className="text-center py-6 text-zinc-500">
                  <XCircle className="h-10 w-10 mx-auto text-zinc-700 mb-2" />
                  <p>No hay llamadas registradas en este expediente</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Estado del Dictamen
            </h3>
            <div className="space-y-4">
              <div className={`rounded-xl border p-4 ${statusColors[caseData.dictamen.status as keyof typeof statusColors] || 'border-zinc-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {caseData.dictamen.status === 'APROBADO' && <CheckCircle2 className="h-5 w-5" />}
                  {caseData.dictamen.status === 'PENDIENTE_REVISION' && <AlertTriangle className="h-5 w-5" />}
                  <span className="font-bold text-white">{caseData.dictamen.status}</span>
                </div>
                <p className="text-sm text-zinc-300">Clasificación: {caseData.dictamen.classification}</p>
                <p className="text-sm text-zinc-300">Confianza: {Math.round(caseData.dictamen.confidence * 100)}%</p>
                {caseData.dictamen.approvedBy && (
                  <p className="text-xs text-zinc-500 mt-2">
                    Aprobado por: {caseData.dictamen.approvedBy} • {formatDate(caseData.dictamen.approvedAt || '')}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
              <Building className="h-5 w-5 text-sky-400" />
              Campaña y Origen
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">Campaña</dt>
                <dd className="mt-1 font-mono text-zinc-200">{caseData.campaign}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}