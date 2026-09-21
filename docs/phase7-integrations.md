# Fase 7: Integraciones futuras y operación

## Objetivo
Preparar el sistema para crecer cuando lleguen las APIs oficiales de las instituciones, manteniendo la carga manual como alternativa permanente y segura.

## Arquitectura de conectores (por cuando se autoricen)

Los conectores están diseñados como módulos de **solo lectura** que se integran al flujo existente sin modificar Floknu ni el motor normativo:

| Conector | Fuente | Datos que aporta | Seguridad |
|----------|--------|------------------|-----------|
| **Flokzu** | Ticket existente | Datos iniciales (folio, estudiante, políticas, motivo, evidencias adjuntas) | Cuentas de servicio con permisos mínimos, MFA cuando aplica, sin escritura sobre Flokzu |
| **SIU** | Historial académico | Calificaciones, fechas, estado de pagos, matrícula | Token OAuth2 con scope `read:academic`, auditoría de cada consulta |
| **I6** | Grabaciones y transcripciones | Audios completos, transcripciones diarizadas, metadatos de llamadas | Encriptado en tránsito, hash SHA-256 de cada archivo, retention policy definida |
| **Aula Virtual** | Capturas de pantalla, actividad | Estados de ingreso, calificaciones publicadas, foros de presentación | Validación de credenciales institucionales, registro de cada consulta en bitácora |

## Flujo cuando están disponibles las APIs

1. **Creación de ticket**: el auditor ingresa el folio Flokzu o nombre/matrícula (igual que hoy).
2. **Carga automática de evidencias**: los conectores recuperan solo la evidencia necesaria y la incorporan al mismo expediente.
3. **Análisis y dictamen**: el flujo es idéntico al actual (IA + motor normativo), sin cambios en la lógica.
4. **PDF canónico**: se genera igual que con carga manual; los datos vienen de las APIs, pero el formato se protege igual.
5. **Bitácora de consultas**: cada consulta a una fuente externa queda registrada: qué se pidió, cuándo, por quién, y el resultado.

## Migración desde carga manual

- No se borra la funcionalidad manual; siempre permanece como alternativa.
- Cuando un conector provee datos, estos se marcan con `fuente: 'API_Flokzu'` etc.
- El auditor puede invalidadar un dato traído por API y volver a cargarlo manualmente.
- Las reglas y el PDF no se ven afectados; solo cambia el origen de los datos.

## Seguridad y cumplimiento

- **Credenciales de servicio**, nunca personales.
- **MFA** cuando la institución lo requiera.
- **Auditoría completa** de cada consulta externa (quién, cuándo, qué se solicitó).
- **Encriptación en tránsito** (TLS 1.3 mínimo) y en reposo.
- **Política de retención** de datos: las evidencias traídas por API tienen el mismo tiempo de conservación que las cargadas manualmente.

## Estado actual

- Las fases 1-5 están implementadas y operativas.
- Los conectores definitivos se implementarán **cuando las autoridades educativas entreguen las APIs oficiales y autoricen su uso**.
- Hasta entonces, el sistema funciona con carga manual validada, que es el escenario garantizado y auditado.

## Tareas pendientes (para cuando se autoricen las APIs)

- Implementar adaptadores de solo lectura para Flokzu, SIU, I6, Aula Virtual.
- Probar cada conector con entornos de staging antes de producción.
- Definir los contratos de datos (JSON schemas) para cada fuente.
- Configurar auditoría y reporte de consultas externas.
- Documentar procedimientos de migración si algún día se retirara la carga manual.