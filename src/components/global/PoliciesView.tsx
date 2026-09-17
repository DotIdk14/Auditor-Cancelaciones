import React, { useState } from 'react';
import {
  BookOpen,
  Scale,
  Search,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const PoliciesView: React.FC = () => {
  const [search, setSearch] = useState('');

  const articles = [
    {
      id: 'Art. 5.7.a',
      title: 'Cancelación de Venta a Solicitud del Estudiante',
      scope: 'Solicitud previa al inicio formal de clases.',
      criteria: 'Si el estudiante manifiesta su deseo expreso de no iniciar antes del día 1 del ciclo lectivo, procede Cancelación de Venta sin penalización.',
      action: 'CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE'
    },
    {
      id: 'Art. 5.7.b',
      title: 'Baja Académica por Solicitud Posterior al Inicio',
      scope: 'Solicitud presentada después del inicio formal de clases.',
      criteria: 'Si el ciclo ya inició y el estudiante solicita retiro sin que medie una falla atribuible a la institución, se procesa como Baja con cobro proporcional devengado.',
      action: 'BAJA'
    },
    {
      id: 'Art. 5.7.c',
      title: 'Cancelación de Venta por Causa Imputable a la Institución',
      scope: 'Falla administrativa, tecnológica u operativa atribuible a UTEL.',
      criteria: 'Aplica cuando la deserción es originada por carga tardía de asignaturas en aula virtual, errores no subsanados en 20 días naturales o cobros indebidos. Prevalece sobre cualquier solicitud del estudiante.',
      action: 'CANCELACION_VENTA_OPERATIVA'
    },
    {
      id: 'Art. 5.7.d',
      title: 'Bloqueo Normativo por Calificaciones Registradas (Hard Blocker)',
      scope: 'Estudiantes con evaluaciones o calificaciones en Bimestre 1.',
      criteria: 'Si el estudiante cuenta con calificaciones en plataforma, el servicio académico se considera formalmente devengado. Queda terminantemente prohibida la Cancelación de Venta; la única vía procedente es Baja.',
      action: 'BAJA (BLOQUEO_ESTRICTO)'
    },
    {
      id: 'Art. 5.6',
      title: 'Protocolo de Ilocalizables y Agotamiento de Contacto',
      scope: 'Estudiantes sin contacto efectivo tras matriculación.',
      criteria: 'Requiere constancia documentada de un mínimo de 15 llamadas telefónicas y 6 comunicaciones escritas (correo/WhatsApp) sin respuesta para dictaminar cancelación por ilocalizable.',
      action: 'CANCELACION_VENTA_ILOCALIZABLE'
    }
  ];

  const filtered = articles.filter(a =>
    a.id.toLowerCase().includes(search.toLowerCase()) ||
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.criteria.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div id="policies-view" className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
              Compendio Normativo y Procedimiento de Deserción
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Código Oficial: <span className="font-mono text-zinc-300 font-semibold">GDM_GAM_PRD_MLG_003</span> • Universidad Tecnológica Latinoamericana en Línea
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por artículo o causal..."
            className="w-full bg-zinc-950 text-zinc-200 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Articles Cards */}
      <div className="space-y-4">
        {filtered.map((art) => (
          <div
            key={art.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-xs bg-zinc-800 text-zinc-200 px-2.5 py-1 rounded-lg border border-zinc-700">
                  {art.id}
                </span>
                <h3 className="font-bold text-sm text-zinc-100">
                  {art.title}
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 self-start sm:self-auto">
                {art.action}
              </span>
            </div>

            <div className="text-xs text-zinc-400 space-y-1">
              <div><strong className="text-zinc-300">Alcance:</strong> {art.scope}</div>
              <p className="text-zinc-300 leading-relaxed"><strong className="text-zinc-300">Criterio Reglamentario:</strong> {art.criteria}</p>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500">
            No se encontraron artículos con el término buscado.
          </div>
        )}
      </div>
    </div>
  );
};
