import { useCallback, useEffect, useRef, useState } from 'react';
import { mockAuditCases } from '../mock/audit-cases';
import { AuditCase, EvidenceItem } from '../types/audit';
import {
  approveDictamenApi,
  attachEvidenceApi,
  createTicketApi,
  deleteEvidenceApi,
  getTicketSnapshotApi,
  listTicketsApi,
  saveDictamenApi,
  saveEvaluationApi,
  updateTicketApi,
} from '../lib/insforge/persist-api';
import {
  buildCreateTicketInput,
  buildTicketUpdates,
  evidenceRowToItem,
  mapEvidenceForUpload,
  snapshotToAuditCase,
} from '../lib/insforge/adapters';

interface UseInsforgeBackendResult {
  cases: AuditCase[];
  loading: boolean;
  usingBackend: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addCase: (c: AuditCase, files?: File[]) => Promise<void>;
  attachEvidence: (caseId: string, evidence: EvidenceItem, file?: File | null) => Promise<void>;
  removeEvidence: (caseId: string, evidenceId: string) => Promise<void>;
  updateCase: (caseId: string, updates: Partial<AuditCase>) => Promise<void>;
  saveDictamen: (caseId: string, options: { text: string; status?: string }) => Promise<void>;
  approveDictamen: (caseId: string, text?: string) => Promise<void>;
  persistEvaluation: (caseId: string, decisionData: unknown) => Promise<void>;
}

function inferTipoByMime(mime: string): string {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('audio/')) return 'AUDIO';
  return 'DOC';
}

export function useInsforgeBackend(): UseInsforgeBackendResult {
  const [cases, setCases] = useState<AuditCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingBackend, setUsingBackend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const casesRef = useRef<AuditCase[]>([]);
  const dictamenVersionRef = useRef<Record<string, string>>({});
  const initializedRef = useRef(false);

  useEffect(() => {
    casesRef.current = cases;
  }, [cases]);

  const getBackendId = useCallback((caseId: string): string => {
    const found = casesRef.current.find(c => c.id === caseId);
    return found?.backendId ?? caseId;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listTicketsApi();
      const snapshots = await Promise.all(rows.map(row => getTicketSnapshotApi(row.id)));
      const auditCases = snapshots.map(snapshotToAuditCase);
      const versionMap: Record<string, string> = {};
      snapshots.forEach(snapshot => {
        const latest = [...snapshot.dictamenVersions].sort((a, b) => b.version - a.version)[0];
        if (latest) versionMap[snapshot.ticket.folio] = latest.id;
      });
      dictamenVersionRef.current = versionMap;
      setCases(auditCases);
      setUsingBackend(true);
      setError(null);
    } catch (err) {
      console.warn('InsForge backend no disponible, usando datos locales:', err);
      setUsingBackend(false);
      setError(err instanceof Error ? err.message : 'Backend no disponible');
      if (initializedRef.current === false) {
        setCases(mockAuditCases);
      }
    } finally {
      setLoading(false);
      initializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addCase = useCallback(
    async (c: AuditCase, files?: File[]) => {
      if (!usingBackend) {
        setCases(prev => [c, ...prev]);
        return;
      }
      const row = await createTicketApi(buildCreateTicketInput(c));
      if (files && files.length > 0) {
        for (const file of files) {
          await attachEvidenceApi(row.id, file, {
            nombreArchivo: file.name,
            tipo: inferTipoByMime(file.type),
            fuente: 'OTRO',
          });
        }
      }
      await refresh();
    },
    [usingBackend, refresh],
  );

  const attachEvidence = useCallback(
    async (caseId: string, evidence: EvidenceItem, file?: File | null) => {
      if (!usingBackend || !file) {
        setCases(prev => prev.map(t => (t.id === caseId ? { ...t, evidences: [...t.evidences, evidence] } : t)));
        return;
      }
      const backendId = getBackendId(caseId);
      const meta = mapEvidenceForUpload(evidence);
      const row = await attachEvidenceApi(backendId, file, { ...meta, descripcion: evidence.description });
      const item = evidenceRowToItem(row, backendId);
      setCases(prev => prev.map(t => (t.id === caseId ? { ...t, evidences: [item, ...t.evidences] } : t)));
    },
    [usingBackend, getBackendId],
  );

  const removeEvidence = useCallback(
    async (caseId: string, evidenceId: string) => {
      if (usingBackend) {
        const backendId = getBackendId(caseId);
        await deleteEvidenceApi(backendId, evidenceId);
      }
      setCases(prev =>
        prev.map(t => (t.id === caseId ? { ...t, evidences: t.evidences.filter(e => e.id !== evidenceId) } : t)),
      );
    },
    [usingBackend, getBackendId],
  );

  const updateCase = useCallback(
    async (caseId: string, updates: Partial<AuditCase>) => {
      const current = casesRef.current.find(t => t.id === caseId);
      if (!current) return;
      const next = { ...current, ...updates };

      if (usingBackend) {
        const backendId = getBackendId(caseId);
        await updateTicketApi(backendId, buildTicketUpdates(current, updates));
      }

      setCases(prev => prev.map(t => (t.id === caseId ? next : t)));
    },
    [usingBackend, getBackendId],
  );

  const saveDictamen = useCallback(
    async (caseId: string, options: { text: string; status?: string }) => {
      const current = casesRef.current.find(t => t.id === caseId);
      if (!current) return;

      if (usingBackend) {
        const backendId = getBackendId(caseId);
        const row = await saveDictamenApi(backendId, {
          text: options.text,
          status: options.status ?? 'BORRADOR',
          classification: current.dictamen.classification,
          confidence: current.dictamen.confidence,
          rootCause: current.dictamen.rootCause,
          createdBy: 'Auditor Principal',
        });
        dictamenVersionRef.current[caseId] = row.id;

        const status = row.status === 'APROBADO' ? 'APROBADO' : row.status === 'PENDIENTE_REVISION' ? 'PENDIENTE_REVISION' : 'BORRADOR';
        setCases(prev =>
          prev.map(t =>
            t.id === caseId
              ? { ...t, dictamen: { ...t.dictamen, text: options.text, status } }
              : t,
          ),
        );
      } else {
        setCases(prev =>
          prev.map(t =>
            t.id === caseId
              ? { ...t, dictamen: { ...t.dictamen, text: options.text, status: (options.status ?? 'BORRADOR') as never } }
              : t,
          ),
        );
      }
    },
    [usingBackend, getBackendId],
  );

  const approveDictamen = useCallback(
    async (caseId: string, text?: string) => {
      const current = casesRef.current.find(t => t.id === caseId);
      if (!current) return;

      if (!usingBackend) {
        const approvedAt = new Date().toISOString();
        setCases(prev =>
          prev.map(t =>
            t.id === caseId
              ? {
                  ...t,
                  status: 'APROBADO' as const,
                  dictamen: {
                    ...t.dictamen,
                    status: 'APROBADO' as const,
                    text: text ?? t.dictamen.text,
                    approvedBy: 'Auditor Principal',
                    approvedAt,
                  },
                }
              : t,
          ),
        );
        return;
      }

      const backendId = getBackendId(caseId);
      let versionId = dictamenVersionRef.current[caseId];
      if (!versionId) {
        const row = await saveDictamenApi(backendId, {
          text: text ?? current.dictamen.text ?? 'Dictamen aprobado por el auditor de calidad.',
          status: 'PENDIENTE_REVISION',
          classification: current.dictamen.classification,
          confidence: current.dictamen.confidence,
          rootCause: current.dictamen.rootCause,
          createdBy: 'Auditor Principal',
        });
        versionId = row.id;
        dictamenVersionRef.current[caseId] = row.id;
      }

      await approveDictamenApi(backendId, versionId, 'Auditor Principal');
      const approvedAt = new Date().toISOString();
      setCases(prev =>
        prev.map(t =>
          t.id === caseId
            ? {
                ...t,
                status: 'APROBADO' as const,
                dictamen: {
                  ...t.dictamen,
                  status: 'APROBADO' as const,
                  text: text ?? t.dictamen.text,
                  approvedBy: 'Auditor Principal',
                  approvedAt,
                },
              }
            : t,
        ),
      );
    },
    [usingBackend, getBackendId],
  );

  const persistEvaluation = useCallback(
    async (caseId: string, decisionData: unknown) => {
      if (!usingBackend) return;
      const backendId = getBackendId(caseId);
      try {
        await saveEvaluationApi(backendId, decisionData as Record<string, unknown>);
      } catch (err) {
        console.warn('No se pudo persistir la evaluación:', err);
      }
    },
    [usingBackend, getBackendId],
  );

  return {
    cases,
    loading,
    usingBackend,
    error,
    refresh,
    addCase,
    attachEvidence,
    removeEvidence,
    updateCase,
    saveDictamen,
    approveDictamen,
    persistEvaluation,
  };
}