# DIRTYFINGAZ ZP · Service Ports v1

**Estado:** implementación inicial en rama `integration/service-ports-v1`  
**Objetivo:** sustituir dependencias directas por puertos reemplazables sin interrumpir el flujo musical.

## Mapa de responsabilidades

| Puerto | Adaptador activo | Estado |
|---|---|---|
| ProjectRepository / AssetStorage | IndexedDB (`zp-storage.js`) | Activo, local-first |
| WorkerGateway | mismo origen, `/api/health` | Health check bajo demanda |
| SupabaseGateway | REST PostgREST con publishable key + access token | Dormido hasta identidad y RLS |
| AudioEngine | Web Audio dentro de `creator-engine.html` | Sin cambios de backend |
| GUI ↔ Engine | `postMessage`, protocolVersion 1, requestId + ACK/error | Se conserva |

## Reglas de los puertos

1. La GUI no importa SDK ni accede a Supabase directamente.
2. El motor recibe el repositorio de proyectos mediante el adaptador local.
3. IndexedDB sigue siendo la fuente operativa local. La ausencia de red no bloquea creación, reproducción ni guardado local.
4. Supabase no recibe escrituras hasta definir identidad, propiedad de proyectos, esquema y políticas RLS. El adaptador exige access token y limita las rutas a `/rest/v1/`.
5. El Worker se consulta bajo demanda; no se usa un puerto TCP local ni se fija un puerto de desarrollo. En producción las rutas son relativas al origen desplegado.
6. Los secretos nunca se almacenan en HTML, JSON público o el bundle del cliente. La publishable key puede configurarse públicamente; la service-role key nunca debe llegar al navegador.

## Contrato de integración

```js
const ports = window.DirtyfingazPorts.create({
  storage: window.DirtyfingazStorage
});

ports.projects.saveProject(snapshot, projectId, projectName);
ports.worker.health();
ports.supabase.request("/rest/v1/projects", { method: "GET" });
ports.status();
```

El método Supabase anterior sólo es utilizable cuando el host inyecta `DIRTYFINGAZ_CONFIG.supabase` con URL, publishable key y access token de una sesión autenticada. Sin esos valores falla con un error tipado y no altera el repositorio local.

## Criterios de aceptación de esta fase

- El Creator conserva las mismas operaciones de IndexedDB.
- Los puertos se pueden sustituir sin modificar el motor.
- El Worker publica un health endpoint sin revelar bindings ni credenciales.
- Supabase permanece sin tablas/escrituras hasta cerrar el modelo de identidad y RLS.
- El validador estático comprueba la presencia del contrato y la carga del adaptador.

## Pendiente antes de sincronización remota

- Definir Auth (usuarios, sesiones, invitado y recuperación).
- Definir ownership y modelo de proyectos/assets.
- Crear migraciones versionadas con RLS por propietario.
- Implementar sincronización idempotente, conflictos y reintentos.
- Añadir pruebas entre dispositivos y Safari iOS.
