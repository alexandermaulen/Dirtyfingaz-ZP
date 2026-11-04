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

**Estado actual:** Creator conserva BPM, patrones y orden de canción en localStorage; las muestras aún viven en memoria durante la sesión. La persistencia de audio en IndexedDB sigue pendiente. Radio Grid conserva salas de demostración locales; aún no hay presencia, identidad remota ni colaboración sincronizada.

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
- [ ] Definir contratos de identidad, salas y presencia para Radio Grid.
- [ ] Conectar catálogo y streaming mediante repositorios.
- [ ] Incorporar Supabase solo después de validar los contratos locales.
- [ ] Añadir pruebas de contrato y regresión para cada módulo.

## 9. Criterio de aceptación

Una capa está separada cuando puede probarse sin cargar la interfaz; un servicio puede sustituirse sin reescribir el Core; cada control ejecuta un caso de uso identificable; y los estados de error y éxito llegan a la UI de forma explícita.

**Principio rector:** compartir arquitectura, contratos, criterios de calidad y método de trabajo; mantener independientes los productos, sus motores, datos e infraestructura.
