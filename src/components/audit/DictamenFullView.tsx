import { useState, useCallback, useEffect } from 'react';
import { FileText, CheckCircle2, AlertTriangle, Edit, Copy, Download, ShieldCheck, Gavel, Save, X, FileCheck, AlertCircle } from 'lucide-react';
import { DecisionResult } from '../../lib/decision-engine/types';
import { usePDFGeneration } from '../../hooks/usePDFGeneration';
import { AuditCase } from '../../types/audit';

interface DictamenFullViewProps {
  result: DecisionResult | null;
  caseData: AuditCase | null;
  onApprove: () => void;
  onSaveDraft: (text: string) => void;
}

const classificationLabels: Record<string, string> = {
  CANCELACION_VENTA: 'Cancelación de Venta',
  CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE: 'Cancelación de Venta a Solicitud del Estudiante',
  CANCELACION_VENTA_ILOCALIZABLE: 'Cancelación de Venta por Ilocalizable',
  CANCELACION_VENTA_OPERATIVA: 'Cancelación de Venta Operativa',
  CANCELACION_VENTA_PROMESA_NO_CUMPLIDA: 'Cancelación de Venta por Promesa No Cumplida',
  CANCELACION_DE_MATRICULA: 'Cancelación de Matrícula (Mystery Shopper)',
  BAJA: 'Baja Definitiva',
  REQUIERE_REVISION: 'Requiere Revisión Manual'
};

const dictamenTemplates: Record<string, string> = {
  CANCELACION_VENTA_OPERATIVA: `DICTAMEN DE CANCELACIÓN DE VENTA OPERATIVA

EXPEDIENTE: [FOLIO]
ESTUDIANTE: [NOMBRE] - MATRÍCULA: [MATRÍCULA]
PROGRAMA: [PROGRAMA]
FECHA DE INICIO DE CICLO: [FECHA_INICIO]
FECHA DE SOLICITUD: [FECHA_SOLICITUD]

ANTECEDENTES:
El estudiante [NOMBRE], matricula [MATRÍCULA], inscrito en el programa [PROGRAMA], presentó solicitud de desvinculación con fecha [FECHA_SOLICITUD], manifestando como causal: [MOTIVO].

ANÁLISIS NORMATIVO:
Con fundamento en el artículo 5.3 del Procedimiento de Deserción de Estudiantes (GDM_GAM_PRD_MLG_003), y tras la evaluación de las evidencias obrantes en el expediente, se determina que la cancelación procede bajo la causal de CANCELACIÓN DE VENTA OPERATIVA, toda vez que se acreditó [CAUSA_RAIZ].

EVIDENCIAS VALORADAS:
[EVIDENCIAS]

CONCLUSIÓN:
En virtud de lo expuesto, este Órgano Dictaminador resuelve declarar PROCEDENTE la CANCELACIÓN DE VENTA OPERATIVA a favor del estudiante [NOMBRE], matricula [MATRÍCULA], ordenando la tramitación correspondiente ante las áreas competentes.

CIUDAD DE MÉXICO, A [FECHA_ACTUAL].

__________________________
AUDITOR DE CALIDAD
[FIRMA]`,
  CANCELACION_VENTA_ILOCALIZABLE: `DICTAMEN DE CANCELACIÓN DE VENTA POR ILOCALIZABLE

EXPEDIENTE: [FOLIO]
ESTUDIANTE: [NOMBRE] - MATRÍCULA: [MATRÍCULA]
PROGRAMA: [PROGRAMA]
FECHA DE INICIO DE CICLO: [FECHA_INICIO]
FECHA DE SOLICITUD: [FECHA_SOLICITUD]

ANTECEDENTES:
El estudiante [NOMBRE], matricula [MATRÍCULA], inscrito en el programa [PROGRAMA], fue sujeto a protocolo de localización conforme al artículo 5.7 del Procedimiento de Deserción de Estudiantes (GDM_GAM_PRD_MLG_003).

ANÁLISIS NORMATIVO:
Se verificó el cumplimiento riguroso de los intentos mínimos de contacto: mínimo 15 llamadas telefónicas en días y horarios distintos, y 6 interacciones escritas alternadas, sin lograr contacto efectivo con el titular. Asimismo, se constató la ausencia de actividad académica en plataforma (sin ingreso a aula virtual, sin calificaciones, sin actividades entregadas).

EVIDENCIAS VALORADAS:
[EVIDENCIAS]

CONCLUSIÓN:
En virtud de lo expuesto, y al haberse agotado el protocolo de ilocalizable sin respuesta del estudiante ni actividad académica acreditada, este Órgano Dictaminador resuelve declarar PROCEDENTE la CANCELACIÓN DE VENTA POR ILOCALIZABLE a favor del estudiante [NOMBRE], matricula [MATRÍCULA].

CIUDAD DE MÉXICO, A [FECHA_ACTUAL].

__________________________
AUDITOR DE CALIDAD
[FIRMA]`,
  BAJA: `DICTAMEN DE BAJA DEFINITIVA

EXPEDIENTE: [FOLIO]
ESTUDIANTE: [NOMBRE] - MATRÍCULA: [MATRÍCULA]
PROGRAMA: [PROGRAMA]
FECHA DE INICIO DE CICLO: [FECHA_INICIO]
FECHA DE SOLICITUD: [FECHA_SOLICITUD]

ANTECEDENTES:
El estudiante [NOMBRE], matricula [MATRÍCULA], inscrito en el programa [PROGRAMA], presenta [CAUSA_RAIZ] que impide la procedencia de cancelación de venta.

ANÁLISIS NORMATIVO:
Con fundamento en el artículo 5.1 del Procedimiento de Deserción de Estudiantes (GDM_GAM_PRD_MLG_003), al acreditarse [CAUSA_RAIZ], procede la tramitación de BAJA DEFINITIVA en lugar de cancelación de venta, toda vez que el estudiante ha devengado el servicio educativo.

EVIDENCIAS VALORADAS:
[EVIDENCIAS]

CONCLUSIÓN:
Este Órgano Dictaminador resuelve declarar IMPROCEDENTE la cancelación de venta y ORDENAR la tramitación de BAJA DEFINITIVA a favor del estudiante [NOMBRE], matricula [MATRÍCULA], conforme a los lineamientos institucionales.

CIUDAD DE MÉXICO, A [FECHA_ACTUAL].

__________________________
AUDITOR DE CALIDAD
[FIRMA]`,
  DEFAULT: `DICTAMEN DE [CLASIFICACION]

EXPEDIENTE: [FOLIO]
ESTUDIANTE: [NOMBRE] - MATRÍCULA: [MATRÍCULA]
PROGRAMA: [PROGRAMA]
FECHA DE INICIO DE CICLO: [FECHA_INICIO]
FECHA DE SOLICITUD: [FECHA_SOLICITUD]

ANTECEDENTES:
El estudiante [NOMBRE], matricula [MATRÍCULA], inscrito en el programa [PROGRAMA], presentó solicitud de desvinculación con fecha [FECHA_SOLICITUD], manifestando como causal: [MOTIVO].

ANÁLISIS NORMATIVO:
Tras la evaluación normativa correspondiente, se determina la clasificación de [CLASIFICACION] con fundamento en [CAUSA_RAIZ].

EVIDENCIAS VALORADAS:
[EVIDENCIAS]

CONCLUSIÓN:
En virtud de lo expuesto, este Órgano Dictaminador resuelve [CONCLUSION].

CIUDAD DE MÉXICO, A [FECHA_ACTUAL].

__________________________
AUDITOR DE CALIDAD
[FIRMA]`
};

function fieldValue(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function OfficialDictamenTemplate({ caseData, result, dictamenText }: { caseData: AuditCase | null; result: DecisionResult; dictamenText: string }) {
  const decisionData = (caseData?.decisionData || {}) as Record<string, unknown>;
  const dictamenAplicado = result.analizadoEn
    ? new Date(result.analizadoEn).toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const Cell = ({ label, value, labelClass = 'bg-[#bfcee8]' }: { label: string; value?: string; labelClass?: string }) => (
    <>
      <div className={`border border-black px-2 py-1.5 text-[12px] font-bold leading-tight ${labelClass}`}>{label}</div>
      <div className="border border-black px-2 py-1.5 text-[10px] leading-tight min-h-[30px] whitespace-pre-wrap">{value}</div>
    </>
  );

  const LongRow = ({ label, value, height = 'min-h-[34px]' }: { label: string; value?: string; height?: string }) => (
    <div className="grid grid-cols-[185px_1fr]">
      <div className={`border border-black bg-[#fff1c9] px-2 py-1.5 text-[12px] font-bold leading-tight ${height}`}>{label}</div>
      <div className={`border border-black px-2 py-1.5 text-[9px] leading-tight whitespace-pre-wrap ${height}`}>{value}</div>
    </div>
  );

  return (
    <div className="mx-auto w-[720px] bg-white px-10 py-8 text-black shadow-2xl shadow-black/40">
      <h1 className="mb-9 text-center text-2xl font-black underline">{caseData?.id || 'XXX'}</h1>

      <div className="grid grid-cols-3 text-black">
        <Cell label="Nombre" value={caseData?.studentName} labelClass="bg-[#d4e3e7]" />
        <Cell label="Matrícula" value={caseData?.matricula} labelClass="bg-[#d4e3e7]" />
        <Cell label="Correo" value={fieldValue(decisionData.correo)} labelClass="bg-[#d4e3e7]" />
        <Cell label="Canal" value={caseData?.channel} />
        <Cell label="Programa" value={caseData?.program} />
        <Cell label="Fecha de creación" value={fieldValue(decisionData.fechaCreacion)} />
        <Cell label="Fecha Decisión" value={fieldValue(decisionData.fechaDecision)} />
        <Cell label="Fecha de inicio de ciclo" value={caseData?.startDate} />
        <Cell label="Fecha solicitud de ticket" value={caseData?.requestDate} />
        <Cell label="Asignado a Dictaminar" value={fieldValue(decisionData.fechaAsignadoDictaminar)} />
        <Cell label="Última sesión" value="" />
        <Cell label="Teléfono" value={caseData?.studentContactNumber} />
      </div>

      <div className="grid grid-cols-3">
        <div className="border border-black bg-[#bfcee8] px-2 py-2 text-[12px] font-bold">Primer pago</div>
        <div className="border border-black px-2 py-2 text-[10px]" />
        <div className="border border-black px-2 py-1 text-center text-2xl leading-none text-red-500">⊘</div>
      </div>

      <LongRow label="Política que aplica/solicitada" value={caseData?.requestedPolicy} />
      <LongRow label="Motivo" value={caseData?.requestReason} />
      <LongRow label="Descripción" value={fieldValue(decisionData.descripcion)} />
      <LongRow label="Comentarios BO" value={fieldValue(decisionData.backOffice)} height="min-h-[48px]" />
      <LongRow label="Comentarios HelpDesk" value={fieldValue(decisionData.helpDesk)} height="min-h-[82px]" />
      <div className="grid grid-cols-[150px_35px_1fr]">
        <div className="border border-black bg-[#fff1c9] px-2 py-1.5 text-[11px]">Jacqueline</div>
        <div className="border border-black bg-[#fff1c9]" />
        <div className="border border-black" />
        <div className="border border-black bg-[#fff1c9] px-2 py-1.5 text-[11px]">Claudia</div>
        <div className="border border-black bg-[#fff1c9]" />
        <div className="border border-black" />
      </div>
      <LongRow label="Comentarios SER" value={fieldValue(decisionData.ser)} height="min-h-[42px]" />
      <LongRow label="Comentarios Finanzas" value={fieldValue(decisionData.finanzas)} height="min-h-[42px]" />
      <div className="grid grid-cols-[185px_1fr]">
        <div className="border border-black bg-[#8bec6f] px-2 py-3 text-[12px] font-black italic">Dictamen aplicado el:</div>
        <div className="border border-black px-2 py-3 text-[10px]">{dictamenAplicado}</div>
      </div>

      <div className="mt-28">
        <span className="bg-cyan-300 px-1 text-[12px] font-bold">Dictamen:</span>
        <p className="mt-8 whitespace-pre-wrap text-[12px] leading-relaxed">{dictamenText}</p>
      </div>

      <div className="mt-20 space-y-5 text-[12px] leading-relaxed">
        <p className="font-bold">Se comparten evidencias del caso:</p>
        <p>------------------- Localizable/activo en AV</p>
        <p>la cancelación del ticket para que la alumna continúe con sus estudios con normalidad, ya que sí ha ingresado a su aula, tiene selección de modalidad de evaluación, realizó actividades y ya cuenta con calificación en su materia, por lo que no se considera una alumna ilocalizable para EE y se procede a cerrar el ticket.</p>
        <p>—----------------- Ilocalizable</p>
        <p>De acuerdo a la política y a las evidencias encontradas y compartidas, se determina una Cancelación de Venta por Estudiante Ilocalizable.</p>
        <p>No se encontró evidencia de contacto efectivo con el alumnX por ninguno de los medios oficiales, a pesar de que se realizaron los intentos mínimos de acuerdo a la política (5.2, b). Adicional a ello, han transcurrido más de xx días desde su inicio de ciclo (xxx) y el alumnX sigue siendo NUNCA en AV, por lo cual, se procede a aplicar la CV.</p>
        <p>—----------------- Sin intentos mínimos</p>
        <p>De acuerdo a la política y a las evidencias encontradas y compartidas, se determina la cancelación del ticket, debido a que no cuenta con los intentos mínimos de contacto de acuerdo a la política (5.2, b). Solamente cuenta con X interacciones por medios escritos y X llamadas en estas 2 semanas para considerarse como ilocalizable. Por lo cual, no aplica para una cv y se recomienda agotar los intentos mínimos, por todos los canales oficiales de contacto para poder localizar al estudiante.</p>
        <p>—----------------- A solicitud del Estudiante</p>
        <p>De acuerdo a la política y a las evidencias encontradas y compartidas, se determina una Cancelación de Venta a Solicitud del Estudiante ya que se pudo confirmar que él/la alumno/a solicitó no continuar previo a su inicio de clases programado para el xx/xx. Dicha solicitud fue realizada mediante xx con EE el día xx/xx en donde compartió que no seguiría debido a</p>
        <p>Captura de la política</p>
        <p>Evidencias a subir</p>
        <p className="font-bold">Mensaje para el alumno</p>
        <p>Estimadx</p>
        <p>Damos por finalizado este proceso ya que detectamos en el sistema que te encuentras ingresando a tu materia curricular, por lo que te invitamos a seguir entregando tus actividades en tiempo y forma.</p>
        <p>Recuerda que estamos para apoyarte con todas tus dudas a través de los siguientes medios de contacto del equipo de Éxito Estudiantil:</p>
        <p>MX: +525589770707<br />LATAM: +525592522985<br />+525592522986</p>
        <p>Oficina virtual:<br />https://utel.edu.mx/oficina-virtual?utm_source=oficinas-virtuales&utm_medium=SIU&utm_campaign=oficinas-virtuales&utm_content=sitio-oficinas-virtuales-siu-18-12</p>
        <p>¡Mucho éxito!</p>
        <p>EE Insurgentes: 5513289027<br />EE UVE: [Teléfono: 55536841430 / WhatsApp: 5596254885]<br />EE Diplos: +525536841474<br />EE UNICA: Tel: 5536841429 / WhatsApp: 5596254885</p>
        <p>—----------------------------------------</p>
        <p>Damos por finalizado este proceso, ya que detectamos en el sistema que estás apunto de iniciar tus clases este xx/00, por lo cual, te deseamos el mayor de los éxitos en esta nueva etapa en tu vida.</p>
        <p className="font-bold">EVIDENCIAS DE OTRAS ÁREAS</p>
        <p className="text-center"><span className="bg-green-400 px-1 font-bold">NOTAS Y EVIDENCIAS PROPIAS</span></p>
        <p><span className="bg-orange-300 px-1 font-bold">Campañas de contacto:</span></p>
        {caseData?.evidences?.filter(e => e.type === 'image' && e.fileUrl?.startsWith('data:image/')).map(e => (
          <div key={e.id} className="break-inside-avoid py-6">
            <img src={e.fileUrl} alt={e.name} className="mx-auto max-h-[430px] max-w-full object-contain" />
            <p className="mt-4">{e.description}</p>
          </div>
        ))}
        <div className="pt-40 text-center"><span className="bg-blue-700 px-1 font-bold text-white">OBSERVACIONES FINALES</span></div>
      </div>
    </div>
  );
}

export function DictamenFullView({ result, caseData, onApprove, onSaveDraft }: DictamenFullViewProps) {
  const [editMode, setEditMode] = useState(false);
  const [dictamenText, setDictamenText] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfVersion, setPdfVersion] = useState<number | null>(null);

  const { generatePDF, isGenerating, error: pdfError, canGenerate } = usePDFGeneration();

  const template = dictamenTemplates[result?.classification || 'DEFAULT'] || dictamenTemplates.DEFAULT;

  const generateDefaultDictamen = useCallback(() => {
    if (!result) return '';
    return template
      .replace(/\[FOLIO\]/g, caseData?.id || 'CAVE-XXXXXX')
      .replace(/\[NOMBRE\]/g, caseData?.studentName || 'Nombre del Estudiante')
      .replace(/\[MATRÍCULA\]/g, caseData?.matricula || '000000000')
      .replace(/\[PROGRAMA\]/g, caseData?.program || 'Programa Académico')
      .replace(/\[FECHA_INICIO\]/g, caseData?.startDate || 'DD/MM/AAAA')
      .replace(/\[FECHA_SOLICITUD\]/g, caseData?.requestDate || 'DD/MM/AAAA')
      .replace(/\[MOTIVO\]/g, result.rootCause.replace(/_/g, ' ').toLowerCase())
      .replace(/\[CAUSA_RAIZ\]/g, result.rootCause.replace(/_/g, ' ').toLowerCase())
      .replace(/\[CLASIFICACION\]/g, classificationLabels[result.classification] || result.classification)
      .replace(/\[EVIDENCIAS\]/g, result.evidenceReferences.join('\n') || 'Evidencias del expediente')
      .replace(/\[FECHA_ACTUAL\]/g, new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/\[CONCLUSION\]/g, `declarar ${result.classification === 'REQUIERE_REVISION' ? 'REQUIERE REVISIÓN' : 'PROCEDENTE la ' + (classificationLabels[result.classification] || result.classification).toLowerCase()}`);
  }, [result, caseData]);

  useEffect(() => {
    if (!dictamenText && result) {
      setDictamenText(generateDefaultDictamen());
    }
  }, [result, caseData, dictamenText, generateDefaultDictamen]);

  const handleGeneratePDF = useCallback(async () => {
    if (!caseData || !result) return;

    const pdfResult = await generatePDF(caseData, result);
    if (pdfResult) {
      const blob = new Blob([pdfResult.pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CaVe-${caseData.id}-v${pdfResult.version}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setPdfGenerated(true);
      setPdfVersion(pdfResult.version);
    }
  }, [caseData, result, generatePDF]);

  const canGenerateNow = caseData && canGenerate(caseData);

  if (!result) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-zinc-500">
          <Gavel className="h-16 w-16 mx-auto text-zinc-700 mb-4" />
          <p className="font-medium text-zinc-400 text-lg">Sin dictamen disponible</p>
          <p className="text-sm mt-1">Ejecuta el análisis para generar el dictamen</p>
        </div>
      </div>
    );
  }

  if (!dictamenText) {
    setDictamenText(generateDefaultDictamen());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Dictamen generado</h2>
          <p className="text-sm text-zinc-500 mt-1">Vista tipo documento. Modifica solo si necesitas ajustar el texto antes del PDF.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowTemplateSelector(true)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 rounded-xl font-medium flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Plantillas
          </button>
          {editMode ? (
            <>
              <button
                onClick={() => {
                  onSaveDraft(dictamenText);
                  setEditMode(false);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Guardar
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 rounded-xl font-medium"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 rounded-xl font-medium flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Modificar dictamen
              </button>
              <button
                onClick={onApprove}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Certificar
              </button>
              {canGenerateNow && (
                <button
                  onClick={handleGeneratePDF}
                  disabled={isGenerating}
                  className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                    isGenerating
                      ? 'bg-amber-600 text-white cursor-not-allowed'
                      : 'bg-sky-600 hover:bg-sky-500 text-white'
                  }`}
                >
                  {isGenerating ? <AlertCircle className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                  {isGenerating ? 'Generando...' : pdfGenerated ? `PDF v${pdfVersion} generado` : 'Generar PDF'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Expediente</dt>
              <dd className="mt-1 font-mono font-bold text-emerald-400">{caseData?.id || 'CAVE-XXXXXX'}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Clasificación</dt>
              <dd className="mt-1 font-semibold text-white">{classificationLabels[result.classification] || result.classification}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Confianza</dt>
              <dd className="mt-1 font-bold text-sky-400">{Math.round(result.confidence * 100)}%</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Fecha</dt>
              <dd className="mt-1 font-semibold text-zinc-200">{new Date().toLocaleDateString('es-MX')}</dd>
            </div>
          </div>
        </div>

        {pdfError && (
          <div className="px-4 py-3 bg-rose-950/30 border-b border-rose-800 flex items-center gap-2 text-rose-300 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Error al generar PDF: {pdfError.message}</span>
          </div>
        )}

        {pdfGenerated && (
          <div className="px-4 py-3 bg-emerald-950/30 border-b border-emerald-800 flex items-center gap-2 text-emerald-300 text-sm">
            <FileCheck className="h-4 w-4 flex-shrink-0" />
            <span>PDF canónico generado v{pdfVersion} - SHA256 verificado</span>
          </div>
        )}

        {editMode ? (
          <div className="p-4 lg:p-6">
            <div className="mb-3 rounded-xl border border-amber-900/60 bg-amber-950/20 p-3 text-sm text-amber-200">
              Estás modificando el texto fuente del dictamen. Guarda para regresar a la vista de documento.
            </div>
            <textarea
              value={dictamenText}
              onChange={e => setDictamenText(e.target.value)}
              className="w-full h-[560px] bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none font-mono text-sm leading-relaxed resize-y"
              placeholder="Redacte el dictamen oficial..."
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto border-t border-zinc-800 bg-zinc-950/80 p-4 lg:p-8">
            <OfficialDictamenTemplate caseData={caseData} result={result} dictamenText={dictamenText} />
          </div>
        )}

        <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex flex-wrap gap-3">
          <button
            onClick={() => navigator.clipboard.writeText(dictamenText)}
            className="flex-1 sm:flex-none py-2 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 font-medium flex items-center justify-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copiar Texto
          </button>
          <button
            onClick={() => {
              const blob = new Blob([dictamenText], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `dictamen-${caseData?.id || 'CAVE-XXXXXX'}-${new Date().toISOString().split('T')[0]}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex-1 sm:flex-none py-2 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 font-medium flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar .txt
          </button>
        </div>
      </div>

      {showTemplateSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-2xl max-h-[80vh] animate-in slide-in-from-bottom-4 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Seleccionar Plantilla</h3>
              <button onClick={() => setShowTemplateSelector(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {Object.entries(dictamenTemplates).map(([key, tmpl]) => (
                <button
                  key={key}
                  onClick={() => {
                    setDictamenText(tmpl
                      .replace(/\[FOLIO\]/g, caseData?.id || 'CAVE-XXXXXX')
                      .replace(/\[NOMBRE\]/g, caseData?.studentName || 'Nombre del Estudiante')
                      .replace(/\[MATRÍCULA\]/g, caseData?.matricula || '000000000')
                      .replace(/\[PROGRAMA\]/g, caseData?.program || 'Programa Académico')
                      .replace(/\[FECHA_INICIO\]/g, caseData?.startDate || 'DD/MM/AAAA')
                      .replace(/\[FECHA_SOLICITUD\]/g, caseData?.requestDate || 'DD/MM/AAAA')
                      .replace(/\[MOTIVO\]/g, result.rootCause.replace(/_/g, ' ').toLowerCase())
                      .replace(/\[CAUSA_RAIZ\]/g, result.rootCause.replace(/_/g, ' ').toLowerCase())
                      .replace(/\[CLASIFICACION\]/g, classificationLabels[result.classification] || result.classification)
                      .replace(/\[EVIDENCIAS\]/g, result.evidenceReferences.join('\n') || 'Evidencias del expediente')
                      .replace(/\[FECHA_ACTUAL\]/g, new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }))
                      .replace(/\[CONCLUSION\]/g, `declarar ${result.classification === 'REQUIERE_REVISION' ? 'REQUIERE REVISIÓN' : 'PROCEDENTE la ' + (classificationLabels[result.classification] || result.classification).toLowerCase()}`)
                    );
                    setShowTemplateSelector(false);
                    setEditMode(true);
                  }}
                  className="w-full text-left p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 transition-colors"
                >
                  <p className="font-medium text-white">{key.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{tmpl.slice(0, 200)}...</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
