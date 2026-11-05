# AGENTE CONTEXTUAL · DIRTYFINGAZ ZP
Versión 0.2 · Cliente local + endpoint IA limitado a Preview

## Objetivo
Asistente de desarrollo integrado en Creator. Debe conocer qué módulo/control está activo, explicar su función, recomendar el siguiente paso y ejecutar únicamente acciones registradas. A futuro podrá ayudar a modificar código y abrir PRs desde una rama de trabajo.

## Estado de implementación de esta versión
- Ventana flotante arrastrable, minimizable, expandible, redimensionable y cerrable.
- Launcher para reabrir la ventana.
- Contexto capturado desde controles enfocados o pulsados: módulo, control, pad, banco, BPM y proyecto cuando el motor los expone.
- Diccionario local de conceptos y recomendaciones.
- Registro allowlist de acciones locales seguras.
- Confirmación para acciones que escriben o alteran el proyecto.
- El cliente consulta POST /api/agent/chat sólo en Cloudflare Preview; nunca llama directamente al proveedor desde el navegador.
- En producción el endpoint permanece desactivado; si la API no está disponible, el diccionario local sigue funcionando.
- El modelo configurado en Preview es @cf/openai/gpt-oss-20b. No se ha desplegado ni probado todavía.
- No ejecuta JavaScript arbitrario ni modifica archivos de repositorio.

## Contrato de contexto
```json
{
  "protocolVersion": 1,
  "app": "dirtyfingaz-zp",
  "surface": "creator",
  "module": "piano-roll",
  "control": "velocity",
  "label": "VELOCITY",
  "projectId": null,
  "padId": null,
  "bank": null,
  "observedAt": "ISO-8601"
}
```
Los valores se capturan desde el DOM visible. Los datos de proyecto/pad/banco sólo se incluyen cuando la GUI los expone explícitamente. No inferir identificadores que no existan.

## Catálogo de acciones
Cada acción define id, descripción, riesgo, permisos, validación y handler. La UI no construye nombres de comandos desde texto libre.

| ID | Acción | Riesgo | Confirmación |
|---|---|---|---|
| `transport.stop` | Detener transporte | Bajo | No |
| `transport.toggle` | Play/Pause | Bajo | No |
| `sample.browse` | Abrir selector de samples | Bajo | No |
| `project.save` | Guardar proyecto actual | Medio | Sí |
| `project.manager` | Abrir gestor de proyectos | Bajo | No |
| `sample.chop` | Cortar sample activo | Destructivo | Sí |
| `pattern.clear` | Limpiar patrón activo | Destructivo | Sí |
| `bpm.up` / `bpm.down` | Ajustar tempo en 1 BPM | Bajo | No |
| `bank.A`–`bank.D` | Seleccionar banco | Bajo | No |
| `fx.drive` | Alternar Drive | Bajo | No |
| `context.inspect` | Explicar contexto detectado | Ninguno | No |

## Interfaz
- Ventana `#zp-agent-window`.
- Barra superior con título, contexto activo, minimizar, expandir/restaurar y cerrar.
- Historial de conversación local.
- Entrada de texto y acciones rápidas.
- Estado minimizado como píldora; botón launcher persistente.
- Drag sólo desde la barra superior; los controles internos no arrastran la ventana.
- Tamaño limitado al viewport y respetando safe areas.

## Flujo de una acción
1. Interpretar una frase contra el catálogo local.
2. Resolver una acción exacta y validar sus parámetros.
3. Si requiere confirmación, mostrar resumen y botones Confirmar/Cancelar.
4. Ejecutar el handler registrado.
5. Recibir ACK/error del bridge cuando la acción usa el motor.
6. Mostrar resultado sin declarar éxito antes de la respuesta.
7. Registrar en memoria de sesión qué acción se intentó y su resultado.

## Arquitectura objetivo de IA remota
```text
Creator GUI
  └─ Context Adapter (DOM + eventos de GUI)
      └─ Agent UI / Chat
          └─ Action Registry (allowlist)
              ├─ Local App Actions → zpBridgeSend → Creator Engine
              └─ Preview Agent API → Cloudflare Worker → Workers AI
                    ├─ Auth/JWT validation
                    ├─ Context and permission validation
                    ├─ Rate limit / audit log
                    ├─ Knowledge retrieval
                    └─ LLM provider adapter
                          └─ Supabase (metadata, knowledge, sessions, audit)
```

## Cloudflare y Supabase
- Worker es la frontera de confianza y orquestador. El navegador no recibe claves secretas.
- Supabase Auth autentica. Postgres conserva metadatos, conocimiento versionado, sesiones y auditoría con RLS.
- Durable Objects se reservan para presencia/sesiones efímeras en tiempo real.
- Binarios: no decidir ni duplicar hasta comparar R2 y Supabase Storage.
- El motor de audio no depende de la latencia de la IA.
- El agente no ejecuta comandos del sistema operativo, SQL libre ni código recibido como texto.

## Evolución de permisos
- L0 lectura contextual.
- L1 recomendaciones y navegación.
- L2 acciones locales registradas.
- L3 propuestas de cambios con diff.
- L4 aplicar en rama feat/* y abrir PR tras confirmación.
- Merge, main, producción, secretos y migraciones destructivas permanecen fuera de alcance por defecto.

## Pruebas de aceptación
- La ventana no bloquea pads, knobs, trim ni Piano Roll cuando está minimizada/cerrada.
- Drag funciona con mouse y touch; no saca la ventana del viewport.
- Maximizar/restaurar conserva acceso a cerrar.
- Contexto cambia al seleccionar un control y no se inventa projectId/padId.
- Comandos desconocidos no ejecutan nada.
- Acciones con escritura requieren confirmación.
- Transporte STOP usa el comando registrado y muestra el ACK/error real.
- El cliente sólo llama al endpoint same-origin /api/agent/chat en Preview; producción y fallback local no llaman a un modelo remoto.
- La GUI y el motor conservan sus contratos actuales.

## Pendiente para completar IA y modo desarrollador
1. Desplegar y probar el endpoint en Cloudflare Preview; verificar coste y límites reales.
2. Añadir autenticación de usuario y rate limit durable antes de cualquier beta pública.
3. Implementar function calling con esquema estricto, validación de parámetros y confirmación en cliente.
4. Decidir backend Supabase exclusivo de ZP; diseñar Auth, ownership, RLS y migraciones antes de crear tablas.
5. Cargar diccionario versionado y RAG; persistencia de sesiones y memoria por proyecto.
6. Añadir integración GitHub App/OAuth restringida a ramas feature, diffs, CI y PR; nunca merge automático.
7. Definir pruebas adversariales, regresión y retirada del modo desarrollador antes de beta.
