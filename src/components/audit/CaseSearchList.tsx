import React, { useState } from 'react';
import {
  Search,
  Filter,
  User,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  FileCheck2,
  FolderOpen,
  Plus
} from 'lucide-react';
import { AuditCase } from '../../types/audit';

interface CaseSearchListProps {
  cases: AuditCase[];
  selectedCaseId: string;
  onSelectCase: (caseItem: AuditCase) => void;
  onOpenAddCaseModal?: () => void;
}

export const CaseSearchList: React.FC<CaseSearchListProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  onOpenAddCaseModal
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = cases.filter(c => {
    const matchesQuery =
      (c.id || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.matricula || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.studentName || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.program || '').toLowerCase().includes(query.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || c.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <div id="case-search-list-view" className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm overflow-hidden">
      {/* Search Header */}
      <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/80">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-zinc-400" />
            <span>Expedientes de Cancelación y Deserción</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Seleccione un caso para consultar evidencias integradas, motor de reglas normativas y dictamen oficial.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por ID CAVE, matrícula o nombre..."
              className="pl-9 pr-3 py-1.5 text-xs bg-zinc-900 text-zinc-100 placeholder-zinc-500 rounded-xl border border-zinc-700 focus:outline-none focus:border-zinc-500 w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-zinc-900 rounded-xl border border-zinc-700 py-1.5 px-3 focus:outline-none font-medium text-zinc-200"
          >
            <option value="ALL">Todos los estatus</option>
            <option value="EN_ANALISIS">En análisis</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="APROBADO">Aprobado</option>
          </select>

          {onOpenAddCaseModal && (
            <button
              onClick={onOpenAddCaseModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Caso</span>
            </button>
          )}
        </div>
      </div>

      {/* Case Table / Card List */}
      <div className="divide-y divide-zinc-800">
        {filtered.map((item) => {
          const isSelected = item.id === selectedCaseId;
          const isApproved = item.status === 'APROBADO';

          return (
            <div
              key={item.id}
              onClick={() => onSelectCase(item)}
              className={`p-4 sm:p-5 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                isSelected
                  ? 'bg-zinc-800/80 border-l-4 border-zinc-400'
                  : 'hover:bg-zinc-800/40'
              }`}
            >
              {/* Left Column: ID, Student info, Program */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono font-bold text-sm text-zinc-100 group-hover:text-white transition-colors">
                    {item.id}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                    {item.matricula}
                  </span>
                  <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                    {item.level}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    Canal: {item.channel}
                  </span>
                </div>

                <div className="text-sm font-semibold text-zinc-200 truncate">
                  {item.studentName}
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span className="truncate">{item.program}</span>
                  <span>•</span>
                  <span>Inicio: {item.startDate}</span>
                  {item.requestDate && (
                    <>
                      <span>•</span>
                      <span>Solicitud: {item.requestDate}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Status, Classification, and Action Button */}
              <div className="flex items-center gap-4 self-end sm:self-center flex-shrink-0">
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    isApproved
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                      : item.status === 'EN_ANALISIS'
                      ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                    {item.statusLabel}
                  </span>

                  {item.dictamen?.classification && (
                    <div className="text-[11px] font-mono text-zinc-400 mt-1">
                      {item.dictamen.classification}
                    </div>
                  )}
                </div>

                <button
                  id={`btn-open-case-${item.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCase(item);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 group-hover:bg-zinc-100 group-hover:text-zinc-900 rounded-xl transition-all shadow-xs"
                >
                  <span>Auditar Caso</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-12 text-center text-xs text-zinc-500">
            No se encontraron expedientes que coincidan con la búsqueda.
          </div>
        )}
      </div>
    </div>
  );
};
