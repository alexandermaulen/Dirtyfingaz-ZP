# AGENTE CONTEXTUAL · DIRTYFINGAZ ZP
Versión 0.1 · Diseño e integración inicial local

## Objetivo
Asistente de desarrollo integrado en Creator. Debe conocer qué módulo/control está activo, explicar su función, recomendar el siguiente paso y ejecutar únicamente acciones registradas. A futuro podrá ayudar a modificar código y abrir PRs desde una rama de trabajo.

## Estado de implementación de esta versión
- Ventana flotante arrastrable, minimizable, expandible, redimensionable y cerrable.
- Launcher para reabrir la ventana.
- Contexto capturado desde controles enfocados o pulsados.
- Diccionario local de conceptos y recomendaciones.
- Registro allowlist de acciones locales seguras.
- Confirmación para acciones que escriben o alteran el proyecto.
- No llama a un modelo remoto ni finge tener acceso a GitHub, Cloudflare o Supabase.
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
              └─ Agent API → Cloudflare Worker
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
- No se realiza llamada de red desde el agente local.
- La GUI y el motor conservan sus contratos actuales.

## Pendiente antes de IA real
1. Acordar proveedor/modelo y presupuesto.
2. Diseñar autenticación y sesiones.
3. Implementar endpoint Worker con JWT, rate limits y logs.
4. Preparar esquema/migraciones Supabase y políticas RLS.
5. Cargar diccionario versionado y recuperación contextual.
6. Añadir herramientas GitHub restringidas a rama de desarrollo y PR.
7. Definir conjunto de pruebas adversariales y regresión.
