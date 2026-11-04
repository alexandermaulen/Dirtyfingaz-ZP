# DIRTYFINGAZ ZP · Auditoría de trazabilidad

**Fecha:** 2026-11-04  
**Rama auditada:** `feat/hybrid-hardware-ui-system`  
**Base de auditoría:** HEAD `b6a288817ebbc54b47e9a2c788a1f33c6d9c4a0b`  
**Alcance:** inspección estática de los archivos publicados en la rama. No equivale a QA táctil en Safari ni a una prueba de audio en dispositivo.

## 1. Arquitectura observada

El Creator utiliza la ruta:

`creator.html (GUI) → postMessage bridge → creator-engine.html (adapter/runtime/audio) → zp-core.js → handlers → Web Audio API / zp-storage.js`

- `creator.html`: interfaz y controles. Emite comandos serializables al iframe de motor.
- `creator-engine.html`: adapta comandos, mantiene estado musical y ejecuta audio.
- `zp-core.js`: bus de comandos con resultados `ok/data` o `ok/error`.
- `zp-storage.js`: IndexedDB para muestras y un proyecto actual.
- `index.html`: shell y navegación entre módulos.
- `sw.js`: caché de shell y estrategia offline.

La separación GUI/motor existe, aunque el adapter y parte del estado de dominio siguen dentro de `creator-engine.html`. Es una separación funcional inicial, no todavía una arquitectura Core totalmente independiente del DOM.

## 2. Matriz de trazabilidad del Creator

| Control / función visible | Evento o comando | Handler / motor | Estado y persistencia | Estado auditado |
|---|---|---|---|---|
| Pads 1–9 | `creator.pad.trigger` | `hitPad()` / `playPad()` | Estado de pad en memoria; sample asociado por pad en IndexedDB | Conectado |
| Play / Stop | `creator.transport.toggle`, `creator.transport.stop` | `startTransport()`, `stopTransport()` | Transporte en memoria | Conectado |
| REC | `creator.record.toggle` | `toggleRecord()` | Graba pasos en el patrón activo; patrón se guarda al guardar proyecto | Conectado |
| BPM +/- | `creator.bpm.adjust` | Handler limita 40–240 BPM | BPM en memoria; guardado en proyecto | Conectado |
| LOOP | `creator.loop.toggle` | Handler de loop/transporte | Estado en memoria | Conectado |
| SONG | `creator.song.toggle` | Cambia modo y posición de canción | Modo/posición en memoria; orden de canción guardado en proyecto | Conectado, QA pendiente |
| Bancos A–D | `creator.pattern.select` | Cambia banco activo | Patrones por banco en memoria; proyecto IndexedDB | Conectado |
| Pasos 1–16 | `creator.pattern.step.toggle` | Alterna paso del pad activo | Patrón en memoria; proyecto IndexedDB | Conectado |
| Clear pattern | `creator.pattern.clear` | Limpia secuencia del pad activo | Memoria hasta guardar | Conectado |
| Load sample | `creator.sample.load.request` y selector de archivo | `loadSample()` / `decodeAudioData()` | Buffer y nombre en IndexedDB | Conectado para formatos decodificables por el navegador |
| Chop ×4 | `creator.sample.chop` | `chopSample()` | Crea hasta cuatro slices en pads libres y guarda cada buffer en IndexedDB | Conectado |
| Clear sample | `creator.sample.clear` | Elimina buffer y registro IndexedDB del pad | IndexedDB | Conectado |
| Trim IN/OUT | Canvas/puntero y `creator.sample.trim.target.toggle` | `setTrimValue()` | Rango en memoria y se incluye al guardar sample | Parcial: validar persistencia del rango en todos los flujos |
| Mute / Solo pad | `creator.pad.mute.toggle`, `creator.pad.solo.toggle` | Handlers de mute/solo | Estado en memoria | Conectado, QA de mezcla pendiente |
| FX sample delay/drive | `creator.fx.sample.delay.toggle`, `creator.fx.sample.drive.toggle` | Delay y waveshaper Web Audio | Estado en memoria | Conectado |
| FX master | `creator.fx.master.toggle` | Conmutación de drive/filter/delay | Estado en memoria | Conectado por comandos de GUI |
| Knobs | `creator.control.set` | Ajusta master, cutoff, resonance, drive y FX amount | Parámetros en memoria; valores por pad guardados parcialmente | Conectado, persistencia parcial |
| Guardar proyecto | `creator.project.save` | `saveSession()` | IndexedDB `projects/current`; copia localStorage legacy | Conectado |
| Restaurar proyecto | Carga inicial `loadSession()` | Recupera proyecto y samples | IndexedDB con fallback de metadatos a localStorage | Conectado |
| Export WAV | `creator.export.wav` | `exportWav()` / `OfflineAudioContext` | Descarga local | Conectado, render limitado al patrón/banco activo y arreglo de cuatro compases |
| Botón volver | `zp-exit-creator` | Shell `show('home')` | No aplica | Conectado |

## 3. Hallazgos y límites

### Corregido en esta auditoría

- El service worker precargaba `creator-engine.html`, pero no los dos scripts que el motor necesita para arrancar: `zp-core.js` y `zp-storage.js`.
- En modo offline, el HTML del motor podía estar disponible mientras sus dependencias no estaban en caché, dejando Creator sin runtime o persistencia.
- Se añadieron ambos scripts a la lista `CORE` del service worker. La caché continúa versionada como `dirtyfingaz-zp-shell-v4`; el cambio de recursos precargados no requiere alterar el nombre de caché para instalar una nueva versión del worker, pero debe comprobarse en navegador.

### Pendiente de implementación / validación

1. **Project Launcher:** no se observa aún una pantalla completa con New / Load / Import Project / Import Sound / Recent / Recover. El almacenamiento expone un único registro `current`, no una biblioteca de proyectos.
2. **Persistencia de sesión completa:** el proyecto guarda BPM, banco, patrones, orden de canción y parámetros de pad; no se serializa el estado completo de FX, transporte, modo de grabación ni todos los parámetros de interfaz.
3. **REX / REX2:** el selector acepta formatos de audio habituales, pero no se encontró parser de contenedor REX/REX2 ni lectura de slices/metadata. No declarar soporte REX funcional todavía.
4. **Audio y exportación:** no se encontró AudioWorklet. El scheduler usa Web Audio API convencional. Export WAV renderiza el banco activo con cuatro compases, no una canción multipatrón completa.
5. **Mixer principal:** los tres faders de `index.html` actualizan su propia UI, pero no están conectados a tres buses independientes del motor Creator. El botón de tono usa un oscilador de prueba.
6. **Streaming / Radio / Community:** la interfaz identifica explícitamente contenido DEMO; no hay catálogo remoto, presencia, identidad ni audio colaborativo real.
7. **Contrato del bridge:** el motor valida `ev.source`, `ev.origin` y el tipo de paquete. El shell recibe `zp-exit-creator` sin comprobar origen/fuente; conviene endurecer el receptor al consolidar navegación.
8. **Resultados del bridge:** el motor emite ACK, pero el adaptador GUI no correlaciona ACK con `requestId` ni refleja estados loading/ready/error de forma sistemática.
9. **Binding GUI:** varios controles se enlazan por texto visible mediante normalización de etiquetas. Es frágil ante cambios de copy o etiquetas duplicadas; migrar gradualmente a `data-command` y payloads explícitos.
10. **Pruebas:** no se encontraron pruebas automatizadas de contrato, audio, storage ni regresión responsive en el root inspeccionado. QA real en Safari iPhone 11 sigue pendiente.

## 4. Contrato de integración recomendado

Mantener GUI y motor en archivos separados. Toda orden debe conservar:

- `type`: comando estable, por ejemplo `creator.pad.trigger`.
- `payload`: datos serializables y validados.
- `source`: módulo emisor.
- `requestId`: correlación de ACK/error.
- `timestamp`: instante de emisión.

El bridge debe verificar origen y ventana emisora en ambos sentidos, devolver resultado explícito y mantener el estado visible sincronizado con el motor. No mover lógica de audio a `creator.html` para resolver problemas visuales.

## 5. Secuencia de trabajo propuesta

1. Endurecer bridge y estados de ACK/error sin alterar los handlers de audio.
2. Crear pruebas de contrato para cada comando y pruebas de persistencia IndexedDB.
3. Implementar Project Repository multi-proyecto y Project Launcher.
4. Completar persistencia de parámetros y recuperación de sesión.
5. Construir mixer real con buses y routing compartidos con AudioEngine.
6. Implementar parser REX/REX2 y slicing basado en metadata.
7. Mejorar exportación a canción completa y evaluar AudioWorklet.
8. Ejecutar QA de Safari iOS, orientación, instalación PWA y modo offline.

## 6. Evidencia y criterio de estado

- **Conectado:** se encontró control/evento y handler correspondiente en el código.
- **Parcial:** existe comportamiento, pero persistencia, estado o cobertura son incompletos.
- **Pendiente:** no se encontró implementación funcional en los archivos inspeccionados.
- **QA pendiente:** la conexión estática existe, pero no se ha probado la interacción real en navegador/dispositivo.

Esta auditoría es estática. No declara éxito de reproducción, rendimiento, compatibilidad física ni despliegue en Cloudflare.


## 7. Actualización de implementación · 2026-11-04

**Rama:** feat/hybrid-hardware-ui-system  
**Estado:** código integrado en desarrollo; despliegue Cloudflare y QA Safari pendientes.

### Creator / secuenciador y samples

- La GUI visible ahora representa 16 pasos y mapea las filas a los 9 pads del motor.
- El motor publica el playhead por el bridge para mantener sincronizada la pantalla exterior.
- La forma de onda exterior recibe una reducción de datos del sample real; el gesto táctil IN/OUT actualiza el rango y persiste al finalizar el gesto en IndexedDB.
- El control Import/Export abre el Project Manager. Crear un proyecto guarda primero la sesión activa.
- Se incorporó reverb por convolución al motor, junto a Drive, Delay y Filter.

### Render

- Diálogo de render con WAV PCM 16/24 bit y MP3 128/192/256 kbps.
- Selector de 44.1/48 kHz, 1/2/4/8 barras por banco y banco actual o secuencia A-D.
- El render offline incorpora patrones, samples, pitch, niveles, mute/solo y efectos activos.
- Encoder lamejs 1.2.1 se incluye localmente para render MP3 offline; atribución y licencia LGPL-3.0 en THIRD-PARTY-NOTICES.md.

### Radio Grid

- Nuevo radio-worker.mjs con Durable Object RadioRoom, presencia, señalización WebSocket y relay de mensajes WebRTC.
- wrangler.jsonc declara binding RADIO_ROOMS, export SQLite y ejecución Worker-first para /api/*.
- UI conecta salas a través de /api/radio/rooms/{roomId}; los colaboradores pueden compartir audio de micrófono P2P y los espectadores reciben las pistas remotas.
- Identidad temporal de invitado. Autenticación, TURN, persistencia de perfiles y retransmisión de audio interno del Creator siguen pendientes.

### Verificación ejecutada

- Sintaxis JavaScript comprobada para HTML principal, Creator GUI, motor, service worker, core, storage y encoder MP3.
- Sintaxis del Worker comprobada tras adaptar el módulo ES para la comprobación local.
- Configuración Wrangler parseada como JSON y binding/export SQLite comprobados.
- Comandos enviados por GUI comparados con handlers registrados y rutas especiales; no se encontraron comandos sin handler.
- Encoder MP3 instanciado y probado con un bloque PCM de silencio; generó bytes de cierre MP3.
- No verificado: ejecución real de OfflineAudioContext en Safari, export WAV/MP3 completo, audio P2P entre dos dispositivos, migración/deploy Durable Object en Cloudflare, ni prueba táctil iPhone 11.


## 8. Integración funcional adicional · 2026-11-04

- Secuenciador GUI de 16 pasos conectado al motor; mapeo de las 9 filas de pads corregido usando el índice real de celdas del grid. La GUI refleja el patrón y playhead publicados por el motor, sin depender de un temporizador visual autónomo.
- Recorte IN/OUT táctil conectado al motor. La GUI recibe la forma de onda del sample activo y el motor persiste el rango al confirmar el gesto.
- Render offline con selección WAV PCM 16/24-bit o MP3 128/192/256 kbps, 44.1/48 kHz, 1/2/4/8 barras y banco actual o secuencia A-D. El render respeta master gain, filtro, samples, pitch, niveles, mute/solo y FX habilitados.
- Project Manager incluye crear, guardar, cargar, eliminar, importar y exportar proyectos; los samples se incluyen en el paquete JSON del proyecto.
- Radio Grid ahora muestra roster de sala y chat, expone controles de audio para reproducción remota en Safari/iOS y conecta el estado de patrones/BPM/controles del Creator al canal room-state entre colaboradores.
- Verificación estática adicional ejecutada desde el repositorio: sintaxis de 4 scripts inline, core, storage, service worker, encoder y Worker; binding/export SQLite; comandos GUI con handlers; integración de render, proyectos, recorte y Radio Grid. Resultado: PASS.

**Pendiente de prueba real:** Actions para el último SHA sigue en cola; no se ha verificado el despliegue de esta revisión en Cloudflare, la exportación completa desde Safari iOS, la conexión P2P entre dos dispositivos ni el comportamiento táctil en iPhone 11. La identidad de Radio Grid sigue siendo temporal y el audio colaborativo transmite micrófono, no el bus interno del Creator.


### Radio Grid · salida de audio del Creator

- El motor expone su bus master mediante MediaStreamDestination para que un colaborador pueda transmitir el audio del Creator por WebRTC P2P.
- Si no existe un bus activo, la conexión colaboradora usa el micrófono como alternativa.
- El stream del motor no se detiene al salir de una sala; los tracks de micrófono sí se detienen. La validación entre dos dispositivos sigue pendiente.


## 9. Corte de estado y sincronización · 2026-11-04 13:22 CLT

### Evidencia GitHub
- Rama de desarrollo inspeccionada: `feat/hybrid-hardware-ui-system`.
- HEAD verificado: `841e8c0493ee509ca8dcc6402168c91b24a7aec9`.
- Pull Request #3 continúa abierto y apunta a `main`; no se ha fusionado.
- Los workflows de validación observados para HEAD están en cola. No declarar CI aprobado hasta consultar una ejecución terminada para este SHA.
- El árbol del repositorio contiene Creator GUI y motor, core, storage, UI CSS, Worker Radio Grid, configuración Wrangler, encoder MP3 y scripts de validación.
- La auditoría de código no sustituye QA Safari/iPhone, prueba de audio renderizado ni conectividad Radio Grid entre dispositivos.

### Evidencia Supabase
- Proyecto conectado: `dirtyfingaz-os`, región `sa-east-1`, estado `ACTIVE_HEALTHY`, PostgreSQL 17.
- La inspección de esquema `public` no devolvió tablas.
- No se aplicaron migraciones ni cambios de base de datos en este corte.
- Próximo paso: definir modelo de identidad, proyectos, assets y salas; revisar RLS y permisos antes de crear tablas o exponer datos.

### Regla de actualización
- Este corte es una fotografía verificable, no una declaración de que todas las funciones estén terminadas.
- En cada nuevo hito actualizar SHA, CI, despliegue, pruebas de dispositivo y estado de Supabase por separado.
