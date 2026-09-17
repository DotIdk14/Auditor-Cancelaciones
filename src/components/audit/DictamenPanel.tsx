import React, { useState } from 'react';
import {
  FileCheck,
  Edit3,
  CheckCircle,
  Clock,
  Send,
  Save,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { DictamenData } from '../../types/audit';

interface DictamenPanelProps {
  dictamen: DictamenData;
  onUpdateDictamen: (updated: DictamenData) => void;
  onApproveDictamen: () => void;
}

export const DictamenPanel: React.FC<DictamenPanelProps> = ({
  dictamen,
  onUpdateDictamen,
  onApproveDictamen
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(dictamen.text);
  const [editClassification, setEditClassification] = useState(dictamen.classification);
  const [editRootCause, setEditRootCause] = useState(dictamen.rootCause);

  const handleSaveEdit = () => {
    onUpdateDictamen({
      ...dictamen,
      classification: editClassification,
      rootCause: editRootCause,
      text: editText,
      modifiedByAuditor: true
    });
    setIsEditing(false);
  };

  const isApproved = dictamen.status === 'APROBADO';

  return (
    <div id="dictamen-panel" className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 flex items-center justify-center">
            <FileCheck className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Dictamen del Auditor
          </h3>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
          isApproved
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
            : 'bg-indigo-950/80 text-indigo-300 border-indigo-700'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-400' : 'bg-indigo-400'}`}></span>
          {isApproved ? 'Dictamen Aprobado' : 'Pendiente de revisión'}
        </span>
      </div>

      {/* Body */}
      <div className="py-3">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tipo de dictamen / clasificación
              </label>
              <select
                value={editClassification}
                onChange={(e) => setEditClassification(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-sky-500 font-semibold"
              >
                <option value="Cancelación de Venta Operativa">Cancelación de Venta Operativa</option>
                <option value="Cancelación por Ilocalizable">Cancelación por Ilocalizable</option>
                <option value="Cancelación de Venta Regular">Cancelación de Venta Regular</option>
                <option value="Cancelación de Venta por Promesa no Cumplida">Cancelación de Venta por Promesa no Cumplida</option>
                <option value="Cancelación de Venta por Ajuste no Aplicado">Cancelación de Venta por Ajuste no Aplicado</option>
                <option value="Baja Definitiva por Calificaciones Registradas">Baja Definitiva por Calificaciones Registradas</option>
                <option value="Baja Definitiva a Solicitud del Estudiante">Baja Definitiva a Solicitud del Estudiante</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Causa raíz
              </label>
              <input
                type="text"
                value={editRootCause}
                onChange={(e) => setEditRootCause(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Fundamentación del dictamen
              </label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={4}
                className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-sky-500 leading-relaxed resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-2xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar cambios</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-black text-slate-100">
                {dictamen.classification}
              </div>
              {dictamen.modifiedByAuditor && (
                <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-medium">
                  Modificado por auditor
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              {dictamen.text}
            </p>

            {isApproved && (
              <div className="mt-2.5 p-3 bg-emerald-950/40 border border-emerald-600/50 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-semibold text-emerald-200 block">
                      Aprobado por: {dictamen.approvedBy || 'Ian Jarquín (Auditor de Calidad)'}
                    </span>
                    <span className="text-[10px] text-emerald-400/80 font-mono">
                      Fecha de firma: {dictamen.approvedAt || new Date().toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700 font-bold px-2 py-0.5 rounded">
                  Firma Electrónica Válida
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!isEditing && (
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <button
            id="btn-editar-dictamen"
            onClick={() => {
              setEditText(dictamen.text);
              setEditClassification(dictamen.classification);
              setEditRootCause(dictamen.rootCause);
              setIsEditing(true);
            }}
            disabled={isApproved}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 border border-slate-700 transition-colors disabled:opacity-40"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <span>Editar dictamen</span>
          </button>

          <button
            id="btn-aplicar-dictamen"
            onClick={onApproveDictamen}
            disabled={isApproved}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              isApproved
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white hover:shadow-sky-500/20'
            }`}
          >
            <CheckCircle className="w-4 h-4 fill-current text-white/90" />
            <span>{isApproved ? 'Dictamen Aprobado' : 'Aprobar dictamen'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
