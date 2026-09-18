import { type ReactNode } from 'react';
import { Eye, Inspect, MousePointerClick, GraduationCap, Phone } from 'lucide-react';
import { AuditCase } from '../../types/audit';
import { ExtractedField, FieldConfidence } from '../../lib/extraction/types';

interface DetectedFactsPanelProps {
  caseData: AuditCase;
}

const CONFIDENCE_STYLES: Record<FieldConfidence, string> = {
  ALTA: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  MEDIA: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  BAJA: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  CONFLICTO: 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse',
};

function formatValue(value: any): string {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
}

function FactItem({ label, field }: { label: string; field?: ExtractedField<unknown> }) {
  if (!field) return null;
  const hasValue = field.valor !== null && field.valor !== undefined && field.valor !== '';
  return (
    <div className={`rounded-xl border p-3 ${hasValue ? 'border-zinc-700 bg-zinc-900/60' : 'border-dashed border-zinc-800 bg-zinc-950/40'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
        {field.confianza && (
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${CONFIDENCE_STYLES[field.confianza]}`}>
            {field.confianza === 'ALTA' ? 'Alta' : field.confianza === 'MEDIA' ? 'Media' : field.confianza === 'BAJA' ? 'Baja' : 'Conflicto'}
          </span>
        )}
      </div>
      <p className={`mt-1 text-sm font-semibold ${hasValue ? 'text-white' : 'text-zinc-600 italic'}`}>
        {hasValue ? formatValue(field.valor) : 'No detectado en capturas'}
      </p>
      {hasValue && field.evidenciaId && (
        <p className="mt-1 text-[10px] text-zinc-500">Evidencia {field.evidenciaId}</p>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-bold text-white">
        <span className="text-emerald-500">{icon}</span>
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export function DetectedFactsPanel({ caseData }: DetectedFactsPanelProps) {
  const vf = caseData.visualFacts;
  const aula = vf?.aulaVirtual;
  const siu = vf?.siu;
  const contacto = vf?.contacto;

  const hasFacts = Boolean(aula || siu || contacto);

  if (!hasFacts) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 py-12 text-center text-zinc-500">
        <Eye className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
        <p className="text-lg font-medium text-zinc-400">Sin hechos visuales detectados</p>
        <p className="mt-1 text-sm">Sube capturas del Aula Virtual o del SIU para que el sistema extraiga hechos observables.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Inspect className="h-5 w-5 text-emerald-500" />
        <div>
          <h2 className="text-xl font-bold text-white">Hechos detectados en evidencias visuales</h2>
          <p className="text-sm text-zinc-500">Hechos observables extraídos de capturas de plataforma. Estos hechos alimentan el motor de decisiones.</p>
        </div>
      </div>

      {aula && (
        <Section title="Aula Virtual" icon={<MousePointerClick className="h-4 w-4" />}>
          <FactItem label="Ingreso al aula" field={aula.ingresoAula} />
          <FactItem label="Último acceso al curso" field={aula.ultimoAccesoCurso} />
          <FactItem label="Hora de acceso" field={aula.horaAcceso} />
          <FactItem label="Clics detectados" field={aula.clicsDetectados} />
          <FactItem label="Calificación visible" field={aula.calificacion} />
          <FactItem label="Actividades entregadas" field={aula.actividadesEntregadas} />
          <FactItem label="Materias cargadas" field={aula.materiasCargadas} />
          <FactItem label="Selección de modalidad" field={aula.seleccionModalidad} />
          <FactItem label="Curso" field={aula.curso} />
          <FactItem label="Grupo" field={aula.grupo} />
        </Section>
      )}

      {siu && (
        <Section title="SIU (Sistema Integral Universitario)" icon={<GraduationCap className="h-4 w-4" />}>
          <FactItem label="Estatus del alumno" field={siu.estatusAlumno} />
          <FactItem label="Última sesión" field={siu.ultimaSesion} />
          <FactItem label="Calificaciones registradas" field={siu.calificacionesRegistradas} />
          <FactItem label="Fecha de inicio" field={siu.fechaInicio} />
          <FactItem label="Primer pago" field={siu.primerPago} />
          <FactItem label="Próximo pago" field={siu.proximoPagoMonto} />
        </Section>
      )}

      {contacto && (
        <Section title="Contacto" icon={<Phone className="h-4 w-4" />}>
          <FactItem label="Teléfono registrado" field={contacto.telefonoRegistrado} />
          <FactItem label="Correo registrado" field={contacto.correoRegistrado} />
          <FactItem label="Medio de contacto" field={contacto.medio} />
          <FactItem label="Última interacción" field={contacto.ultimaInteraccion} />
        </Section>
      )}
    </div>
  );
}