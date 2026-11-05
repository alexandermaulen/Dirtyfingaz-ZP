# DIRTYFINGAZ ZP 1 · Contrato de arquitectura

**Versión:** 1.0  
**Fecha:** 2026-11-04  
**Referencia de método:** DIRTYFINGAZ OS · Rediseño UI y contrato de integración  
**Repositorio:** https://github.com/alexandermaulen/Dirtyfingaz-ZP

## 1. Decisión de arquitectura

ZP 1 adopta el patrón **UI → Adapter → Core → Services**.

Se comparte con DIRTYFINGAZ OS el método de separación, los criterios de calidad y el formato de integración. Los productos mantienen repositorios, motores, datos, credenciales y despliegues independientes.

~~~text
UI (HTML/CSS)
   │ acciones del usuario / estado visible
   ▼
ADAPTER (controladores y puertos)
   │ comandos tipados / resultados
   ▼
CORE (casos de uso y reglas de dominio)
   │ interfaces de servicio
   ▼
SERVICES (audio, storage, identidad, red, realtime)
~~~

### Responsabilidades

| Capa | Responsabilidad | No debe hacer |
|---|---|---|
| UI | Renderizar, navegar, capturar interacción y mostrar estados | Ejecutar reglas de negocio ni acceder directamente a Supabase |
| Adapter | Validar entradas, traducir eventos a comandos, manejar resultados y errores | Ser dueño del estado de dominio |
| Core | Mantener reglas, estado musical y casos de uso | Depender del DOM, CSS o SDK de proveedor |
| Services | Implementar audio, archivos, persistencia, identidad y red | Decidir comportamiento de interfaz |

## 2. Contrato de comunicación

Toda acción relevante debe tener:
- **type:** nombre estable del evento o comando.
- **payload:** datos serializables y validados.
- **source:** módulo que lo originó.
- **timestamp:** hora de emisión.
- **requestId:** identificador para correlacionar respuesta y error cuando corresponda.

Ejemplo de evento:

~~~js
{
  type: "creator.pad.trigger",
  source: "creator.ui",
  timestamp: Date.now(),
  requestId: "local-unique-id",
  payload: { padId: 1, velocity: 0.85 }
}
~~~

Convenciones:
- Nombres en minúscula con puntos: modulo.recurso.accion.
- IDs estables en formato string; no usar posición visual como identidad persistente.
- Los payloads no transportan objetos DOM, nodos Audio, funciones ni instancias SDK.
- Los comandos que cambian estado devuelven resultado explícito.
- Los errores usan { code, message, source, requestId }; no se silencian.
- La UI representa estados idle, loading, ready, playing, saving, error cuando apliquen.

## 3. Puertos del Core

Los servicios se conectan mediante interfaces reemplazables:

- **AudioEngine:** cargar muestra, disparar pad, transporte, secuenciación, mezcla y render.
- **ProjectRepository:** guardar, cargar, listar y eliminar proyectos.
- **AssetStorage:** persistir y recuperar archivos de audio.
- **IdentityProvider:** obtener sesión y perfil.
- **CatalogRepository:** consultar pistas, artistas, álbumes y playlists.
- **RadioGateway:** descubrir salas, entrar/salir, presencia y permisos.
- **RealtimeGateway:** publicar y recibir eventos efímeros sincronizados.

La implementación local puede sustituir temporalmente servicios remotos, pero debe respetar el mismo contrato. Un mock o demo se identifica explícitamente como tal.

## 4. Módulos de ZP 1

| Módulo | Core / dominio | Servicios previstos |
|---|---|---|
| Music Creator | pads, muestras, patrones, transporte, canción y exportación | AudioEngine, AssetStorage, ProjectRepository |
| Simple Mixer | canales, niveles, mute/solo y salida | AudioEngine |
| Streaming | catálogo, reproducción, favoritos y playlists | CatalogRepository, AssetStorage |
| Radio Grid | estaciones, salas, roles y sesiones | RadioGateway, IdentityProvider, RealtimeGateway |
| Community Mixes | publicaciones, perfiles, follows y likes | IdentityProvider, CatalogRepository, ProjectRepository |

## 5. Estado y persistencia

- Estado efímero de interfaz: memoria de la aplicación.
- Estado de sesión local y preferencias: almacenamiento local apropiado.
- Proyectos y metadatos: repositorio persistente.
- Archivos de audio: almacenamiento de assets, no columnas de texto ni eventos de base de datos.
- Presencia, transporte colaborativo y señales en vivo: canales realtime; no generar un archivo por cada evento.
- Backend futuro: Supabase detrás de adaptadores. El Core no importa SDK de Supabase.

**Estado actual (2026-11-04):** Creator utiliza IndexedDB para proyectos y samples, con patrones, BPM, parámetros y rangos IN/OUT asociados al proyecto. La GUI y el motor se comunican mediante bridge `postMessage`; la verificación funcional en Safari sigue pendiente. Radio Grid incorpora un Worker con Durable Object SQLite para presencia y señalización WebSocket, más audio P2P WebRTC entre colaboradores. La identidad es temporal por invitado; no hay autenticación, perfiles persistentes ni servidor TURN configurado. El despliegue del Worker y la prueba entre dispositivos siguen pendientes.

## 6. Reglas de implementación

1. Inspeccionar el archivo y sus dependencias antes de modificar.
2. Mantener una referencia funcional y realizar cambios pequeños, reversibles y por módulo.
3. No reemplazar funciones reales por botones decorativos ni mocks sin etiquetarlos.
4. Separar el comportamiento del motor de la representación visual.
5. No acoplar reglas de dominio al DOM, a un framework o a un proveedor.
6. Validar sintaxis, flujo funcional y regresión responsive por separado.
7. Probar Safari iOS en dispositivo antes de declarar compatibilidad real.
8. Registrar commit, archivos, pruebas ejecutadas, resultados y limitaciones.
9. Publicar preview verificable antes de producción; no desplegar a producción sin autorización.

## 7. Formato de resultado de una acción

Éxito:

~~~js
{ ok: true, data: { /* resultado */ }, requestId: "..." }
~~~

Error:

~~~js
{ ok: false, error: { code: "INVALID_INPUT", message: "Descripción", source: "creator.adapter" }, requestId: "..." }
~~~

Códigos sugeridos: INVALID_INPUT, NOT_FOUND, NOT_READY, PERMISSION_DENIED, PERSISTENCE_FAILED, AUDIO_ERROR, NETWORK_ERROR.

## 8. Plan de adopción

- [x] Definir el contrato común y documentar los límites actuales.
- [ ] Introducir un bus de eventos/adaptador compartido en Creator sin alterar su motor de audio.
- [ ] Extraer el estado y los casos de uso del Creator fuera del DOM.
- [x] Añadir persistencia de muestras y proyectos con IndexedDB detrás de AssetStorage.
- [ ] Aplicar el mismo patrón a Simple Mixer.
- [x] Definir contratos de salas, presencia y señalización WebRTC para Radio Grid.\n- [ ] Incorporar identidad autenticada, perfiles y permisos persistentes.\n- [ ] Configurar TURN y validar conectividad entre redes móviles/Wi-Fi.
- [ ] Conectar catálogo y streaming mediante repositorios.
- [ ] Incorporar Supabase solo después de validar los contratos locales.
- [ ] Añadir pruebas de contrato y regresión para cada módulo.

## 9. Criterio de aceptación

Una capa está separada cuando puede probarse sin cargar la interfaz; un servicio puede sustituirse sin reescribir el Core; cada control ejecuta un caso de uso identificable; y los estados de error y éxito llegan a la UI de forma explícita.

**Principio rector:** compartir arquitectura, contratos, criterios de calidad y método de trabajo; mantener independientes los productos, sus motores, datos e infraestructura.



## 8. Paneles adaptativos y perfiles de layout

- zp-layout.js pertenece a GUI/Adapter: administra selección de panel, contexto visual, perfiles y eventos hacia el copiloto.
- zp-layout.css implementa el dock compacto responsive sin alterar el layout del motor.
- zp-agent-registry.json es la fuente de verdad de grupos L1x–L3x / R1x–R3x, contextos y política geométrica.
- La selección de una opción emite zp-panel-option-select; no dispara audio ni escribe parámetros del motor salvo que exista un comando allowlisted y contrato explícito.
- Perfiles: DEFAULT definido por código y CUSTOM persistido localmente; estrategia HYBRID. Cambio de módulo carga DEFAULT.
- CM20 mantiene bloqueadas las operaciones geométricas drag/resize hasta definir posicionamiento, alineación, colisiones y límites.


### Evento contextual GUI → copiloto

Las selecciones de panel usan un evento separado del puerto musical:
- `zp-panel-option-select` incluye schemaVersion, requestId, source, timestamp, side, group, option, context y profile.
- El iframe Creator lo retransmite al Shell con protocolVersion 1 y origin same-origin.
- El Shell valida sourceWindow, origin, protocolVersion, requestId y schemaVersion antes de emitir el CustomEvent que consume el copiloto.
- Este evento no es un comando del AudioEngine. No cambia parámetros musicales ni estado del scheduler.


## 10. Puertos y adaptadores de servicios

- `zp-ports.js` implementa los puertos ProjectRepository, WorkerGateway y SupabaseGateway.
- Creator inyecta ProjectRepository sobre IndexedDB sin cambiar las operaciones existentes del motor.
- WorkerGateway consulta `/api/health` en el mismo origen desplegado.
- SupabaseGateway permanece inactivo hasta recibir sesión autenticada y configuración pública; no habilita sincronización ni escrituras por defecto.
- La PWA incluye el adaptador de puertos en su caché versionada.
- Contrato y criterios de aceptación: `docs/SERVICE-PORTS-V1.md`.
