# Contexto para el Plan de Implementación

> **Propósito:** entregar al equipo de implementación el contexto verificado para planificar el desarrollo del nuevo modelo de auditoría **"Mejora Continua"** sobre el sistema Auditor-Cancelaciones.
> **Fecha:** 21/09/2026 · Suplemento a `AUDITORIA_PROYECTO.md`, `ARQUITECTURA_ACTUAL.md` y `GAP_NUEVO_MODELO.md`.

---

## 1. Resumen ejecutivo (formato sección 31)

**Estado general del proyecto.** Sistema en fase Beta funcional. Verificado: motor determinístico de 15 reglas POLICY-LOCKED (`src/lib/decision-engine/`), pipeline de auditoría multimodal IA con política embebida y hash (`src/lib/audit/`), cola asíncrona PostgreSQL + worker daemon (`src/lib/jobs/`), persistencia InsForge (PostgREST + Storage), generación de PDF canónico. Endpoints legacy síncronos marcados `LEGACY / ROLLBACK ONLY`. No autenticación real; la identidad de auditor es un `TEXT` libre. Deuda principal: configuración incompleta, URL IA hardcodeada a Fly.io, docs desalineados, SQL scratch en raíz, y ausencia de modelos de datos para política/reglas/KPIs requeridos por "Mejora Continua".

**Código reutilizable (% estimado).** ≈ 60–65 % de la base (`src/lib/*`: decision-engine, audit, extraction, ai, jobs, insforge, pdf) es reusable/migrable; el resto (App monolith + componentes de auditoría) es específico del dominio. 15 reglas de negocio encapsuladas con `RuleRegistry` desacoplado; tests golden y suite de jobs con fakes listas para CI.

**Cambios estructurales requeridos por el nuevo modelo.** (1) Autenticación + roles (gobierno de cambios); (2) entidades de datos: `policy_versions`, `policy_numerals`, `rules`, `rule_conditions`, `evidence_requirements`, `kpis`, `slas`, `business_calendar`, `policy_audit_log`; (3) RuleRegistry cargado desde datos con versionado persistido en `decision_runs`; (4) indicadores por función + dashboards (aprovechar `ReportsView`/`SettingsView`/`PoliciesView` huérfanos); (5) ciclo de mejora (acciones correctivas + re-medición).

**Riesgos P0/P1.** Ver Sección 3.

**Información faltante.** Ver Sección 4.

**Generados en esta auditoría.** `AUDITORIA_PROYECTO.md`, `ARQUITECTURA_ACTUAL.md`, `GAP_NUEVO_MODELO.md` y este documento.

---

## 2. Archivos importantes (tabla para el planificador)

| Ruta | Rol | Relevancia para Mejora Continua |
|---|---|---|
| `src/lib/decision-engine/rule-engine.ts` | Registry de reglas (register/unregister/getRules) | Punto de extensión para cargar reglas desde datos |
| `src/lib/decision-engine/decision-engine.ts` | `analyzeCancellationCase` (pipeline) | Integración con nueva fuente de reglas |
| `src/lib/decision-engine/types.ts` | `DecisionResult`, `CancellationCase`, `CaseDecisionData` | Contrato de salida a extender con versión de reglas |
| `src/lib/decision-engine/evidence-evaluator.ts` | numeral → evidencia requerida (NODO 21) | Convertir `switch` a tabla `evidence_requirements` |
| `src/lib/decision-engine/conflict-resolver.ts` | resolución de conflictos entre reglas (NODO 18) | Reglas con prioridad versionadas |
| `src/lib/decision-engine/rules/*` (15) | reglas de negocio | Mantener como implementación; config desde DB |
| `src/lib/decision-engine/__tests__/` | suite + golden cases | Red de garantía para cada versión de reglas |
| `src/lib/audit/policy.ts` | `POLICY_META`/`POLICY_INDEX` + texto para modelo | Pasa a leer versiones/numerals vigentes |
| `src/lib/audit/prompt.ts` | system prompt + versión (`AUDIT_PROMPT_VERSION`) | Prompt con numerales vigentes + hash de versión |
| `src/lib/audit/validator.ts` | validación Zod + `validateNormativeRef` | Extender validación de versión de política |
| `src/lib/audit/audit-service.ts` | pipeline multimodal (preparación + llamada) | Sin cambios estructurales; id de versión en resultado |
| `src/lib/audit/types.ts` | `AuditResultSchema` | Añadir versión de política/reglas en `ejecucion` |
| `src/lib/extraction/*` | extracción de hechos (Fase 1/Fase 2) | Modelo de hechos ya opera; vincular a numerales |
| `src/lib/jobs/audit-worker.ts` | worker (claim/heartbeat/síntesis) | Reutilizable; job de agregación KPI nuevo |
| `src/lib/jobs/audit-job-repository.ts` | cola PG + storage | Reutilizable para job de KPIs |
| `src/server/app.ts` | app Express + endpoints legacy | Normalizar; retirar legacy en Fase 5 |
| `src/server/persist.ts` | `/api/persist` (CRUD negocio) | Base para API de configuración de política/reglas |
| `src/server/jobs-router.ts` | `/api/audit/jobs` (202/estado/resultado) | Modelo de API a replicar para jobs de KPI |
| `src/hooks/useInsforgeBackend.ts` | dato frontend (mock fallback) | Extender con endpoints de política/KPIs |
| `src/App.tsx` | orquestador UI (monolith, 754 líneas) | Evaluar split; conectar vistas huérfanas |
| `src/components/global/PoliciesView.tsx` | UI gestión de políticas (huérfana) | Reutilizar para CRUD de numerales/reglas |
| `src/components/global/ReportsView.tsx` | UI reportes (huérfana) | Reutilizar para dashboards KPI |
| `src/components/global/SettingsView.tsx` | UI settings (huérfana) | Reutilizar para calendario/SLAs/thresholds |
| `src/lib/pdf/pdf-generator.ts` | PDF canónico (26 campos) | Extender portada con versión de política |
| `migrations/*.sql` (4) | esquema canónico | Base para nuevas tablas de Mejora Continua |
| `tests/jobs/*` | suite asíncrona offline (fakes) | Extender para race de config y versionado |
| `src/lib/api/config.ts` | ⚠️ `HEAVY_API_BASE` hardcodeado | Corregir como prerrequisito de entorno |
| `.env.example` | ⚠️ incompleto | Completar variables requeridas |
| `vercel.json` / `api/index.ts` / `Dockerfile` / `server.ts` | despliegue | Revisar límite 60s para rutas de config |

---

## 3. Riesgos P0/P1 (detalle operativo)

### P0 — Críticos
1. **`HEAVY_API_BASE` hardcodeada** (`src/lib/api/config.ts` → `https://auditor-api-9e29e329-252e-481c-a632-95b71ee3df51.fly.dev`). El navegador conversa con un servicio externo a InsForge. *Acción:* parametrizar por entorno o consolidar el runtime; actualizar docs.
2. **Sin autenticación y con service key en servidor.** `getAdminClient` usa API key de servicio; si se filtra, RLS se anula. Identidad de auditor = `TEXT`; políticas de tickets comparadas contra `auth.uid()::text` (mitigación parcial).
3. **`.env.example` incompleto** (faltan `INSFORGE_URL`, `INSFORGE_ANON_KEY`, `INSFORGE_API_KEY`, `DATABASE_URL`, `AI_*`, `AUDIT_*`). Onboarding y reproducción de entornos frágil.

### P1 — Altos
4. **Despliegue bifurcado** — misma app como daemon (puerto 3001, sin límite) y función Vercel (60 s). Rutas síncronas pesadas inviables en Vercel.
5. **Dos interpretaciones de la política** (motor TS + prompt IA) sin mecanismo de consistencia versionado.
6. **`decision_runs` sin versión de política/reglas** — imposible reproducir/trazar dictámenes históricos con el nuevo modelo.
7. **Migración reglas desde datos** — regresión potencial en las 15 reglas sin tests golden ejecutados (no verificables aquí por ausencia de Node).
8. **Sin métricas/KPIs** — la función principal del modelo "Mejora Continua" (medir y mejorar) no existe.

---

## 4. Información faltante (BLOQUEANTE / IMPORTANTE / DESEABLE)

### BLOQUEANTE
1. Definición oficial de "Mejora Continua" para el proceso (alcance, KPIs, frecuencia, dueño).
2. Requisitos reales de auth/roles y usuarios destino.
3. Confirmación de si el frontend seguirá usando Fly.io o migra a InsForge/backend propio.
4. Estado real del DDL en producción (policies/RLS) y del bucket de storage.

### IMPORTANTE
5. Calendario institucional de días hábiles y feriados.
6. SLAs por etapa y dueños (calidad, matrícula, éxito estudiantil, finanzas).
7. Nivel de detalle de KPIs (función, canal, periodo).
8. Estrategia de datos históricos (backfill de versiones en `decision_runs`).
9. Workflow de aprobación de nuevas versiones de política/reglas.
10. Presupuesto de tokens IA por dictamen tras el cambio de prompt.

### DESEABLE
11. Integraciones automatizadas SIU/I6/Flokzu/Aula Virtual (docs/phase7).
12. Notificaciones de cambios de política.
13. Exportación de reportes de cumplimiento.

---

## 5. Direcciones de implementación recomendadas (resumen)

1. **Fase 0:** sanear gobernanza técnica (config, CI con `tsc --noEmit` + `test:golden` + `test:jobs`, limpiar SQL scratch, decidir Tailwind 4 vs 3.4 y `strict`).
2. **Fase 1:** Auth + roles + FKs reales; tablas de política y bitácora.
3. **Fase 2:** Reglas como datos con fallback embebido; versionado en `decision_runs`; suite de consistencia motor↔IA.
4. **Fase 3:** calendario, ventanas configurables, SLAs, KPIs, dashboards (reutilizar huérfanos).
5. **Fase 4:** ciclo de mejora (planes de acción, re-medición, promoción draft→activa con aprobación).
6. **Fase 5:** retiro de endpoints legacy y UI huérfanos.

> Regla de oro del equipo: **correcto antes que rápido** — cada cambio de política/reglas debe poder reproducirse y auditarse; la suite golden y los tests de jobs son la red de seguridad no negociable.