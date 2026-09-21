# MATRIZ DE REUSO / REFACTOR / ELIMINAR

## 1. Principio

La base funcional del proyecto ya tiene valor. La estrategia es reutilizar y extender, no duplicar ni reemplazar la fuente de verdad actual.

## 2. Decisión clave

No se crea `case` SQL, ni `evidence` paralelo, ni `case_fact` como otra fuente de verdad.
- `tickets` = raíz del caso
- `evidences` = evidencia documental/multimedia
- `extracted_facts` = hechos derivados
- `decision_runs` = resultado final de evaluación

Si existe un contexto adicional del caso, se añadirá una tabla explícita y acotada, con nombre útil, pero no un nuevo “modelo de caso” duplicado.

## 3. Matriz

### `src/lib/decision-engine/`
- Clasificación: `REUSAR` + `EXTENDER`
- Razón: es el motor determinístico central, validado y cubierto por tests golden.
- Acción: mantener la lógica actual y conectarla a `policy_version` + `ruleset_versions`.

### `src/lib/audit/`
- Clasificación: `REUSAR` + `EXTENDER`
- Razón: ya tiene lógica de IA, extracción y validación.
- Acción: conservar como capa de apoyo y distinguirlo del resultado final del motor determinístico.

### `src/lib/extraction/`
- Clasificación: `REUSAR` + `EXTENDER`
- Razón: está conectada a hechos, citas y evidencia.
- Acción: ampliar metadatos de versión y result en `extracted_facts` y `evidences`.

### `src/lib/ai/`
- Clasificación: `REUSAR` + `RESTRINIR`
- Razón: sirve para extracción, clasificación y explicación.
- Acción: no decidir final; registrar contradicciones en `consistency_events`.

### `src/lib/jobs/`
- Clasificación: `REUSAR`
- Razón: la cola asíncrona es valida para jobs pesados.
- Acción: reutilizar para KPI, SLA y notificaciones, no crear colas paralelas.

### `src/lib/insforge/`
- Clasificación: `REUSAR` + `REFACTOR`
- Razón: ya es el punto de acceso a la base de datos.
- Acción: reforzar repositorios y adaptadores de dominio, no duplicar lógica en React.

### `src/lib/pdf/`
- Clasificación: `REUSAR` + `EXTENDER`
- Razón: generación canónica ya funcional.
- Acción: añadir metadatos de policy/ruleset y versionado de dictamen, sin reescribirlo.

### `src/App.tsx`
- Clasificación: `REFACTOR`
- Razón: monolito con alto valor funcional, pero necesita separar caso y proceso.
- Acción: hacer refactor incremental, no reescritura total.

### `src/hooks/`
- Clasificación: `REUSAR` + `REFACTOR`
- Razón: existen hooks funcionales y otros huérfanos.
- Acción: mantener los activos y aislar los muros muertos.

### `src/components/global/PoliciesView.tsx`
- Clasificación: `REUSAR` + `REFACCTOR`
- Razón: es la base del workflow de policy.
- Acción: conectarlo a `policy_version`, `ruleset_versions` y `policy_audit_log`.

### `src/components/global/ReportsView.tsx`
- Clasificación: `REUSAR` + `REFACCTOR`
- Razón: sirve de base para dashboard de proceso.
- Acción: conectarlo a `kpis` y `corrective_actions` y no a lógica dispersa en React.

### `src/server/app.ts`
- Clasificación: `REUSAR` + `REFACTOR`
- Razón: centraliza endpoints y rutas actual.
- Acción: modularizar por dominio y dejar legacy bajo feature flag.

### `src/server/jobs-router.ts`
- Clasificación: `REUSAR`
- Razón: es el canal principal de jobs.
- Acción: mantenerlo como base para KPI, SLA y aggregation jobs.

### Endpoints legacy
- Clasificación: `DEPRECAR` + `ELIMINAR` en F9
- Razón: sirven para rollback y debug.
- Acción: dejarlos bajo feature flag con paridad comprobada antes de quitarse.

### `src/server/progress.ts`
- Clasificación: `REFACTOR` + `DEPRECAR`
- Razón: estado en memoria no es producción-safe.
- Acción: dejar como fallback de debug y mover progreso a DB.

---

## 4. Resultado esperado

- nadie duplica `case` ni evidencia;
- el sistema mantiene la base actual y la mejora sobre ella;
- los huérfanos se eliminan solo con paridad comprobada;
- la deuda se reduce sin destruir funcionalidad operativa.
