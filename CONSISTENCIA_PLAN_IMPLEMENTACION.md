# CONSISTENCIA PLAN IMPLEMENTACIÓN

## Estado de los gates

### PRE-F0 READINESS
PASS

Requisitos cumplidos:
- roadmap F0-F9 consistente;
- backlog y prompts sincronizados;
- no hay migraciones destructivas planeadas;
- repositorio y entornos necesarios están disponibles;
- rollback conceptual definido.

### F0 EXIT GATE
PENDING

Requisitos pendientes de ejecución real:
- hardcoding eliminado;
- `.env.example` completo;
- `tsc --noEmit` / lint en verde;
- golden baseline ejecutado;
- jobs baseline ejecutado;
- DDL real inspeccionado;
- RLS actual documentado.

### F1 ENTRY GATE
PENDING

Requisitos pendientes:
- F0 EXIT green;
- decisión de identidad/auth suficiente;
- estrategia RBAC aprobada;
- DDL/RLS de producción conocido;
- backup/rollback disponible.

F0 puede iniciar antes de resolver decisiones de negocio de F1+.

---

## Contradicciones corregidas

1. Circuito circular de gate
   - Se separó `PRE-F0`, `F0 EXIT` y `F1 ENTRY` para evitar exigir resultados de F0 antes de iniciar F0.

2. Dependencia `ruleset_members` / `rules`
   - Se corrigió el orden de creación: `rules` primero, luego condiciones, evidencia, ruleset, members, decision runs y adapter.

3. Fuentes de verdad duplicadas
   - Se definió precedencia explícita:
     base rule config → ruleset overrides → snapshot/hash ejecutado.
   - `evidence_requirements` queda como tabla canónica; `ruleset_members` solo permite overrides.

4. Versionado de reglas
   - Se eligió el modelo A: cada fila de `rules` es una versión inmutable.
   - No `UPDATE` in-place sobre `APPROVED/ACTIVE`.
   - La modificación normativa crea una nueva versión y recalcula el hash del ruleset determinísticamente.

5. RBAC incompleto
   - Se completó explícitamente con `roles`, `permissions`, `role_permissions`, `user_roles`.
   - El proveedor final de identidad queda desacoplado del diseño.

6. `policy_audit_log` incompleto
   - Se formalizó el DDL y el modelo con `actor_verifiable`, `actor_legacy`, `entity_type`, `entity_id`, `action`, `before_snapshot`, `after_snapshot`, `reason`, `created_at`.
   - Se dejó claro que contradicciones IA no van aquí; van a `consistency_events`.

7. Inmutabilidad
   - Se definió explícitamente que `policy_version`, `rules`, `ruleset_versions`, `ruleset_members`, `decision_runs` y `rule_evaluations` históricas son inmutables después de `APPROVED/ACTIVE`.
   - La política de protección preferida fue: servicio de dominio + API + trigger/constraint DB, con RLS como control de acceso y no como reemplazo de integridad.

8. Prompts incompletos
   - Se expandieron los prompts con contexto, objetivo, dependencias, archivos, cambios permitidos, pasos, migraciones, tests, rollback, criterios y DoD.

9. Plan principal sincronizado
   - Se actualizó `PLAN_IMPLEMENTACION_MEJORA_CONTINUA.md` para usar exactamente las fases F0–F9 nombradas según el canon final.

---

## Decisiones que siguen dependiendo del negocio

1. Proveedor final de identidad/auth.
2. Política normativa canónica y numerales oficiales.
3. Aprobadores y roles de policy/ruleset en producción.
4. Calendario institucional y días hábiles reales.
5. KPIs operativos y owners del proceso.
6. Backfill histórico y política de retención legacy.

---

## ¿Puede iniciar F0?

Sí, F0 puede iniciar.

La razón es que el bloqueo anterior era conceptual y circular; ahora quedó separado en gates reales y el plan ya no exige resultados de F0 antes de comenzar F0.

Requisito mínimo para iniciar:
- PRE-F0 READINESS en PASS;
- acceso a repositorio y entornos;
- guardado de rollback conceptual;
- no se implementará aún F1 ni migración de dominio.

---

## Ticket exacto que debe ejecutarse primero

`MC-F0-001` — Configuración sin URL hardcodeada.

Es el primer ticket porque:
- desbloquea entorno reproducible;
- elimina hardcoding antes de cualquier validación funcional;
- permite que lint, bootstrap y golden entren en una fase verificable;
- prepara la base para F0 EXIT.

---

## Conclusión

La preparación documental ya quedó corregida para no re-diseñar la arquitectura ni lanzar negocio aún. El paquete está listo para pasar por la ejecución real de F0, con gates claros, dependencia ordenada y diseño robusto de versionado, RBAC y auditabilidad.
