# Plan de Refactorización Progresiva y Segura — Auditor de Cancelaciones

**Documento:** Hoja de Ruta de Refactorización, Mitigación de Riesgos y Criterios de Aceptación  
**Fecha:** Septiembre 2026  
**Rol:** Senior Software Architect & QA Engineer  
**Estado:** Propuesta Aprobada para Ejecución por Fases

---

## 1. Principios Rectores y Restricciones No Negociables

1. **Cero Regresiones Normativas:** Ninguna refactorización podrá alterar la clasificación, causa raíz, reglas determinantes, bloqueos duros ni evidencias faltantes de los casos existentes.
2. **Cero Modificaciones Visuales:** La interfaz de usuario, layout, paleta de colores, componentes y flujo interactivo del auditor deben mantenerse 100% idénticos.
3. **Desacoplamiento Estricto:** La lógica jurídica del motor de decisiones debe ser completamente independiente de React y del DOM.
4. **Pasos Atómicos y Verificables:** Cada fase debe concluir con un commit limpio, build exitoso (`npm run build`), TypeScript sin errores (`npm run lint`) y 100% de pruebas aprobadas (`npm test`).
5. **No Añadir Dependencias Innecesarias:** Mantener la arquitectura ligera sin introducir microservicios, frameworks de estado pesados ni backends prematuros.

---

## 2. Fases de la Refactorización

```
[ Fase 0: Baseline y Red de Seguridad ] ──> COMPLETADA
   │  - Documentación de arquitectura y contratos
   │  - Suite de regresión de Golden Cases reproducible (16/16 tests)
   │  - Scripts de verificación automatizados en package.json
   ▼
[ Fase 1: Desacoplamiento de Tipos y Eliminación de Dependencias Cíclicas ]
   │  - Romper el ciclo entre src/types/audit.ts y src/lib/decision-engine/types.ts
   │  - Establecer dirección unidireccional: UI -> Motor
   ▼
[ Fase 2: Capa Adaptadora y Anti-Corruption Layer (ACL) ]
   │  - Formalizar CaseDecisionDataAdapter para aislar datos de formularios/mocks
   │  - Deprecar de forma segura la dualidad de propiedades bilingües en DecisionResult
   ▼
[ Fase 3: Limpieza y Modularidad del Motor de Reglas ]
   │  - Depuración de archivos muertos (operational-error.ts, unreachable-student.ts)
   │  - Registro de reglas extensible con inyección de dependencias
   ▼
[ Fase 4: Desacoplamiento de Estado en UI (Desmantelar Monolito App.tsx) ]
   │  - Extraer custom hooks: useCaseManager, useAudioPlayer, useDecisionEvaluation
   │  - Reducir prop drilling sin alterar el árbol visual ni los estilos
   ▼
[ Fase 5: Preparación para Ejecución Headless / Backend ]
   │  - Exposición del motor como librería isomórfica apta para microservicio o Cloud Run
```

---

## 3. Detalle de Fases de Ejecución

### Fase 1: Desacoplamiento de Tipos y Eliminación de Dependencias Cíclicas
- **Problema Actual:** `src/types/audit.ts` referencia a `decision-engine/types.ts`, y este último importa `CallRecord` y `EducationLevel` de `src/types/audit.ts`.
- **Acción:**
  - Extraer los tipos primitivos compartidos (`EducationLevel`) a un módulo base de tipos del dominio.
  - Asegurar que `src/lib/decision-engine/types.ts` no dependa de ningún archivo de la carpeta `src/types/` ni de `src/components/`.
- **Criterio de Aceptación:** `tsc --noEmit` pasa sin advertencias; ningún archivo dentro de `src/lib/decision-engine/` tiene imports que apunten hacia afuera de su propio directorio.

### Fase 2: Capa Adaptadora y Normalización Limpia
- **Problema Actual:** `decision-engine.ts` mezcla lógica de orquestación con adaptadores de compatibilidad para datos planos (`CaseDecisionData`). Además, `DecisionResult` genera simultáneamente `appliedRules` y `reglasAplicadas`.
- **Acción:**
  - Extraer la función `normalizeToCancellationCase` a un archivo dedicado `src/lib/decision-engine/adapters/case-adapter.ts`.
  - Crear un mapeador unificado que garantice que la UI reciba un modelo canónico pero mantenga getters para las claves legacy durante el periodo de transición.
- **Criterio de Aceptación:** `npm test` continúa ejecutando 16/16 pruebas exitosas.

### Fase 3: Limpieza y Modularidad del Motor de Reglas
- **Problema Actual:** Existen dos archivos huérfanos (`operational-error.ts` y `unreachable-student.ts`) en la carpeta de reglas que confunden a desarrolladores y auditores.
- **Acción:**
  - Validar que ninguna prueba ni componente importe dichos archivos.
  - Eliminar con seguridad los dos archivos muertos.
  - Configurar un `RuleRegistry` que permita instanciar o filtrar reglas dinámicamente si en el futuro se requieren perfiles de auditoría por campus o país.
- **Criterio de Aceptación:** Build limpio, reducción de líneas de código redundantes, suite de pruebas intacta.

### Fase 4: Desacoplamiento de Estado en UI (`App.tsx`)
- **Problema Actual:** `App.tsx` acumula 424 líneas con 13 `useState`, manejando simultáneamente reproducción de audio, apertura de modales, sincronización de expedientes y llamadas al motor.
- **Acción:**
  - Crear `src/hooks/useAuditorState.ts`: gestiona lista de casos, selección de caso activo, persistencia en memoria de dictamen y sandbox.
  - Crear `src/hooks/useAudioPlayer.ts`: encapsula el temporizador `setInterval`, play/pause y seek de tiempo.
  - `App.tsx` se convertirá en un componente de layout limpio de menos de 180 líneas, enfocado únicamente en la composición visual.
- **Criterio de Aceptación:** Inspección visual idéntica pixel por pixel; reproducción de audio y navegación entre tabs funcionando fluidamente.

### Fase 5: Preparación para Ejecución Headless / Backend
- **Problema Actual:** Si se requiere auditar miles de casos en batch, el motor actualmente sólo se ejecuta dentro del bundle de Vite del cliente.
- **Acción:**
  - Asegurar que `src/lib/decision-engine/` tenga cero dependencias de APIs del navegador (como `window`, `localStorage` o `document`).
  - Preparar un endpoint Express `/api/audit/evaluate` ligero cuando se apruebe la transición full-stack.
- **Criterio de Aceptación:** El motor se puede empaquetar y ejecutar en Node.js puro sin dependencias de entorno gráfico.

---

## 4. Matriz de Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Estrategia de Mitigación |
|---|---|---|---|
| **Divergencia en evaluación de casos de borde** | Alta | Crítico | Validación obligatoria contra los 4 Casos Dorados (`golden-cases.ts`) antes de cada merge o cambio. |
| **Ruptura de UI por renombre de propiedades** | Media | Alto | Mantener getters y propiedades virtuales durante la fase de transición; verificar con TypeScript estricto. |
| **Pérdida de interactividad en el Sandbox de Ficha Técnica** | Media | Medio | Prueba manual y automatizada de que la modificación de flags en `CaseInfoTab` dispara el recálculo inmediato del dictamen. |
| **Desfase en la sincronización del audio diarizado** | Baja | Medio | Aislar el hook de audio sin tocar la lógica de marcas de tiempo en segundos (`startSeconds`, `endSeconds`). |

---

## 5. Protocolo de Verificación para Cada Etapa

Cada desarrollador o agente que trabaje en las fases posteriores deberá ejecutar de forma secuencial:

```bash
# 1. Comprobación de tipos y contratos estáticos
npm run lint

# 2. Ejecución de la suite completa de reglas y golden cases
npm test

# 3. Compilación de producción de la aplicación
npm run build
```

Solo si los tres comandos concluyen con código de salida `0` se considerará aprobada la iteración.
