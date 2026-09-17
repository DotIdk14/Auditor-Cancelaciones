# Fase 6: Generación de PDF canónico

## Objetivo
Generar un PDF idéntico visualmente al modelo `CaVe-28259`, rellenando exclusivamente los espacios dinámicos definidos en la plantilla canónica. El formato del PDF **no debe alterarse en absoluto**.

## Restricciones no negociables

- El PDF `CaVe-28259` es la plantilla maestra.
- **Solo** se eliminan/reemplazan los datos variables del caso de ejemplo.
- No se agregan campos nuevos, secciones ni metadatos visibles.
- No se eliminan tablas, ni se mueven secciones.
- La trazabilidad técnica reside internamente en el sistema (reglas, evidencias, hechos, excepciones), **nunca** en el PDF.

## Campos dinámicos identificados (22 campos)

| Campo | Origen | Requerido para PDF |
|-------|--------|-------------------|
| `{{folio}}` | Ticket | ✅ |
| `{{estudiante.nombre}}` | Ticket | ✅ |
| `{{estudiante.matricula}}` | Ticket | ✅ |
| `{{estudiante.correo}}` | Ticket | ✅ |
| `{{estudiante.canal}}` | Ticket | ✅ |
| `{{estudiante.programa}}` | Ticket | ✅ |
| `{{estudiante.telefono}}` | Ticket | ✅ |
| `{{fechas.fechaCreacion}}` | Ticket | ✅ |
| `{{fechas.fechaDecision}}` | Ticket | ✅ |
| `{{fechas.fechaInicioCiclo}}` | Ticket | ✅ |
| `{{fechas.fechaSolicitudTicket}}` | Ticket | ✅ |
| `{{fechas.fechaAsignadoDictaminar}}` | Ticket | ✅ |
| `{{fechas.fechaDictamenAplicado}}` | Decisión IA | ✅ |
| `{{solicitud.primerPago}}` | Ticket | ✅ |
| `{{solicitud.politicaSolicitada}}` | Decisión IA | ✅ |
| `{{solicitud.motivo}}` | Ticket | ✅ |
| `{{solicitud.descripcion}}` | Ticket | ✅ |
| `{{comentarios.backOffice}}` | Auditor | ✅ |
| `{{comentarios.helpDesk}}` | Auditor | ✅ |
| `{{comentarios.ser}}` | Auditor | ✅ |
| `{{comentarios.finanzas}}` | Auditor | ✅ |
| `{{resultado.textoDictamen}}` | Decisión IA | ✅ |
| `{{evidencias.cronologicas}}` | Evidencias | ✅ |
| `{{comentarios.auditor}}` | Auditor | ✅ |

## Flujo de generación

1. **Ticket en estado `DICTAMEN_PROPUESTO`** con todas las evidencias cargadas y reglas aplicadas.
2. **Llenado interno**: los 22 campos anteriores se poblarán con los valores reales del ticket.
3. **Validación visual**: cada PDF generado se compara contra la plantilla `CaVe-28259`; si hay diferencia de formato, se bloquea la descarga y avisa al desarrollador.
4. **Descarga**: habilitada únicamente cuando el ticket está dictaminado y el PDF pasa la validación.
5. **Corrección manual**: si el auditor modifica algún campo, se genera una **nueva versión** del PDF; la versión anterior se conserva en el historial del ticket. El formato nunca cambia.

## Estados del ticket relacionados

- `DICTAMEN_PROPUESTO` → El auditor revisa y puede corregir antes de emitir PDF.
- `PDF_EMITIDO` → El ticket avanza al estado final; el PDF ya no puede modificarse.
- `CERRADO` → Ticket archivado con su PDF de definitivo.

## Riesgos principales

- Políticas y anexos faltantes pueden producir decisiones incompletas: **deben bloquear la automatización**.
- Evidencia real contiene datos personales: el repositorio público y los proveedores de IA **no están aprobados** para este uso.
- Una plantilla reconstruida necesita validación visual formal antes de usarse.
- La IA **no debe "aprender" en vivo**: las excepciones requieren revisión y publicación controlada de nuevas reglas.

## Tareas pendientes (para cuando se autorice la fase)

- Implementar motor de plantilla que lea `CaVe-28259` y rellene solo los 22 campos permitidos.
- Crear validador visual de formato (comparar PDF generado vs plantilla base).
- Probar con casos históricos anonimizados para cada tipo de resultado.
- Añadir botón "Descargar PDF" condicionado a `PDF_EMITIDO` y validación exitosa.