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


## 10. Registro consolidado de incidencias y cadena de reparación · 2026-11-04 13:40 CLT

Este registro consolida causas raíz distintas. Las ejecuciones duplicadas de GitHub Actions se cuentan como reintentos del mismo fallo, no como defectos independientes.

| ID | Incidencia / causa raíz | Eslabón afectado | Estado | Evidencia / reparación |
|---|---|---|---|---|
| CI-01 | Expresión regular inválida al extraer scripts HTML en el validador | CI / parser de scripts | Corregido | Sustituida por recorrido con `indexOf`; posteriormente se eliminó una llave sobrante que provocaba `Unexpected token 'else'`. |
| BR-01 | El motor emitía `source:"creator.engine"` y el shell esperaba `creator.ui` | Bridge motor → shell | Corregido | El shell acepta el emisor real del motor y el validador exige ambos lados del contrato. |
| DATA-01 | Chops se guardaban en el proyecto por defecto, no en `currentProjectId` | Samples → IndexedDB / proyectos | Corregido | Escritura mediante `saveProjectSample(currentProjectId,...)`. |
| DATA-02 | El cambio de rango IN/OUT sólo actualizaba memoria | Trim → persistencia | Corregido | Guardado al finalizar `pointerup` / `pointercancel`; prueba estática añadida. |
| DATA-03 | El nombre visible del Project Manager podía quedar desincronizado al cargar | Project Manager → GUI | Corregido | Sincronización del campo `#zp-project-name` en refresh y LOAD. |
| SEQ-01 | Cálculo de fila/pad incorrecto en grid de 16 pasos | GUI secuenciador → padId del motor | Corregido | Mapeo por índice real de celda: `Math.floor((index-1)/17)+1`. |
| CI-02 | Test del secuenciador comprobaba una fórmula antigua | Validador → contrato del secuenciador | Corregido | Aserciones actualizadas para las tres rutas: playhead, patrón e interacción. |
| RADIO-01 | El motor creaba `MediaStreamDestination`, pero no exponía `zpGetBroadcastStream` | Audio master Creator → Radio Grid / WebRTC | Corregido en código; QA pendiente | Getter publicado en `window`; Actions run 41869055940 terminó PASS. Falta prueba real entre dos dispositivos y Safari iOS. |

### Eslabones con riesgo residual

1. **Creator GUI ↔ motor:** validar en navegador real todos los comandos, estados ACK/error, pads 1–9 y 16 pasos.
2. **Audio master ↔ Radio Grid:** confirmar que el stream contiene el bus master del Creator, no el micrófono de respaldo; validar autoplay, permisos y reconexión iOS.
3. **Trim ↔ IndexedDB ↔ proyecto:** cambiar IN/OUT, cambiar de proyecto, recargar y comprobar aislamiento de muestras y rangos.
4. **Render WAV/MP3:** probar OfflineAudioContext real en Safari, duración, canales, sample rate, bit depth, encoder MP3 y descarga del archivo completo.
5. **Durable Objects / Worker:** comprobar deploy Wrangler, binding SQLite, WebSocket, persistencia room-state, presencia, señalización y TURN cuando corresponda.
6. **PWA / responsive:** probar instalación, offline, cache versioning, safe areas, orientación y pantalla completa desde iPhone 11 en adelante.
7. **Supabase:** sigue separado. No aplicar cambios ni mezclar con `dirtyfingaz-os`; definir esquema/RLS y migraciones sólo después de aprobar el diseño de datos.

### Estado CI y GitHub verificado

- Rama de desarrollo `feat/hybrid-hardware-ui-system`: HEAD `c02b8539e12a3db319d228e9fae4e06f4b1d449b`.
- GitHub Actions run `41869055940`: job `validate` completado con **success** para ese SHA.
- Los fallos anteriores observados fueron en el mismo paso de validación y se agrupan por causa raíz en la tabla; no son ocho defectos distintos.
- GitHub informa que PR #3 fue fusionado a `main` con merge commit `53b9151b96979da980bd446fa7dbb9f3c3cf3886`. Esta fusión no fue ejecutada por esta intervención. No se realizarán nuevas fusiones ni cambios directos a `main` sin instrucción explícita.
- El corte anterior de la sección 9 queda como evidencia histórica; no debe usarse como estado actual.

### Política de colaboración de agentes, modelos y complementos

- Los conectores disponibles pueden trabajar sobre el repositorio sólo con los permisos de la cuenta/conexión vinculada; no pueden otorgar por sí solos permisos a identidades de agentes o servicios no especificadas.
- Recomendación por defecto: escritura limitada a ramas `feat/*`, revisión por PR y CI obligatorio; `main` protegido y sin escritura directa para agentes.
- Alternativas a aprobar: (A) lectura y diagnóstico solamente; (B) escritura en ramas de trabajo y PR, sin merge; (C) escritura amplia del repositorio, reservada a identidades concretas y con alcance explícito.
- No se conceden permisos de administrador, secretos, producción, Supabase ni despliegue por defecto. La autorización debe identificar el agente/servicio y el nivel exacto.

## 11. Creator · pantalla LCD, waveform y controles de edición · 2026-11-04

### Contrato GUI ↔ motor aplicado
- GUI (creator.html) conserva el bridge versionado zp-engine-command con source, protocolVersion, requestId, ACK y error.
- Motor (creator-engine.html) conserva la propiedad de buffers, análisis, reproducción, tempo y persistencia. La GUI sólo presenta telemetría y solicita acciones.
- El pad activo reproduce el mismo AudioBuffer y el mismo rango IN/OUT utilizado por el waveform editor.

### Funciones añadidas
| ID | Función | GUI | Motor | Estado CI |
|---|---|---|---|---|
| WAVE-01 | Análisis de forma de onda y detección de transientes | Marcadores sobre waveform LCD | Peak local por bins; lista normalizada de transientes | PASS estático |
| WAVE-02 | Slicing automático por transientes | Acción TRNS en LCD | Divide sample en segmentos y guarda en pads vacíos del proyecto actual | PASS estático |
| WAVE-03 | Audition del sample del pad | Acción de preview | creator.sample.preview usa el mismo pad/sample/rango | PASS estático |
| BPM-01 | Rueda vertical de tempo | Drag vertical y rueda | creator.bpm.adjust, límites 40–240 y publicación de estado | PASS estático |
| SEQ-02 | Transporte visual | Barra de progreso sincronizada a los 16 pasos | Mensajes de playhead desde scheduler | PASS estático |
| METER-01 | Alerta de peak | Barra cambia a rojo al superar 0.82 | Medición del pico del bus master y telemetría periódica | PASS estático |
| PIANO-01 | Zoom y desplazamiento | Zoom +/- y scroll horizontal | Patrón de 16 pasos sin mutar los datos guardados | PASS estático |
| PIANO-02 | Herramientas de edición | DRAW/SELECT, SNAP 1/16–1/8–1/4 y CLEAR; zoom - a la izquierda y + a la derecha | Cuantización limitada al step válido 0–15; selección de fila no altera el patrón | PASS estático |
| LCD-01 | Menú del sistema | Overlay dentro del LCD; tema sólo desde THEME/COLOR | No cambia el motor de audio | PASS estático |
| SAMPLE-01 | Browse | Abre selector de archivos del motor | File picker existente | PASS estático |

### Evidencia de integración
- Rama: feat/hybrid-hardware-ui-system.
- HEAD de código actualizado: 19da29f90ae514c2cde0a05e54583893b23a548b.
- GitHub Actions run 41875733973: SUCCESS para ese SHA.
- Archivos modificados: creator.html, creator-engine.html.
- Se corrigieron dos separadores de línea literales que impedían compilar los scripts inline; el SHA final pasó la validación JavaScript y Creator contracts.

### Límites y riesgos no certificados
1. El umbral 0.82 es una señal visual de pico digital del bus, no un medidor calibrado de dBFS ni un detector de clipping verdadero.
2. La detección de transientes es heurística por máximos locales. Requiere prueba con kicks, breaks, material tonal y samples con ruido.
3. El slicing automático usa pads vacíos; si no hay espacio, limita la cantidad de cortes y no sobrescribe muestras existentes.
4. El scroll/zoom y la rueda BPM requieren QA táctil en Safari iOS.
5. La grilla actual continúa siendo un editor de patrones por pad/step. Un Piano Roll MIDI completo con pitch, duración de nota y velocity por evento sigue pendiente.
6. No se verificó despliegue Cloudflare para este SHA ni se probó render/sonido real en iPhone.

### Próxima secuencia recomendada
- P1: probar la interacción de cada control y ACK/error en Safari.
- P2: validar transientes, slicing, preview y persistencia por projectId.
- P3: calibrar el medidor de peak con RMS/peak hold y una referencia de nivel.
- P4: evolucionar la grilla actual a Piano Roll con pitch/length/velocity sin romper el modelo de patrones existente.
- Mantener main y Supabase fuera del alcance; no hacer merge.


## 12. Piano Roll MIDI · implementación de eventos editables · 2026-11-04

### Contrato
- GUI: creator.html presenta 24 filas visibles (dos octavas), 16 pasos temporales, notas movibles y redimensionables, cuantización y control de velocity.
- Motor: creator-engine.html administra pianoData por banco y pad, valida los eventos, agenda la reproducción y guarda los datos en el snapshot del proyecto.
- Mensajería: creator.piano.note.upsert / creator.piano.note.delete / creator.piano.notes.clear; retorno de estado por zp-engine-piano-state.
- Evento MIDI interno: id, step, pitch, length y velocity. Límites: step 0–15, pitch 36–96, length 1–(16-step), velocity 1–127.

### Pruebas estáticas añadidas
- scripts/validate.mjs comprueba presencia de Piano Roll, controles de velocity, gestos de drag/resize, comandos registrados, scheduler MIDI y snapshot persistente.
- CI para el último commit de GUI (b7363a6ef234c823de3194ccda5e22f444ff3c0a) quedó en cola al corte de esta bitácora: run 41878177445.
- SHA de motor que incorpora la reproducción de notas y la persistencia: 5a22793de89abb9aa0d8a73e7f90cc064bcac48c.
- Commit del validador MIDI: 3880a00536bcd51ac031548a43a946282d075853.

### Riesgos / QA pendiente
1. Confirmar que el drag/resize responde en Safari iOS con pointer capture y scroll táctil.
2. Escuchar samples con pitch variable y verificar que velocity se aplica una sola vez al nivel final.
3. Comprobar gates de longitud para samples largos y sonidos sintetizados.
4. Probar guardado, recarga, cambio de banco/pad, duplicación de eventos y recuperación de proyectos antiguos.
5. El editor tiene rango visible de dos octavas; OCT-/OCT+ desplaza el rango, sin transposición destructiva de los eventos.
6. La compatibilidad MIDI externa (MIDI IN/OUT, clock sync y export MIDI estándar) no está implementada en esta etapa.

### Estado de seguridad de cambios
- Sólo rama feat/hybrid-hardware-ui-system.
- No modificar main, no merge, no desplegar producción.
- Supabase dirtyfingaz-os continúa independiente y fuera del alcance.


### Revisión de estabilidad adicional
- El estado MIDI ya no se retransmite desde refreshSteps en cada tick; sólo se publica al cambiar nota, pad, banco o proyecto.
- Pointer capture se conserva sobre el elemento de nota durante el drag; la selección visual no reemplaza el nodo capturado.
- Longitud de nota limitada al espacio restante hasta el final de los 16 pasos.
- Mensajes de telemetría LCD/Piano Roll validados por origen y ventana del iframe del motor.
- Song Mode publica el banco activo al avanzar, manteniendo sincronizada la vista de notas.


## 13. Cuestionario maestro y agente contextual local · 2026-11-04

### Documentación incorporada
- `docs/CUESTIONARIO-MAESTRO-DIRTYFINGAZ-ZP.md`: especificación maestra de producto, arquitectura, motor, datos, Cloudflare/Supabase, agente, seguridad, calidad y beta.
- `docs/ARQUITECTURA-AGENTE-CONTEXTUAL.md`: contrato de contexto, catálogo de acciones, niveles de permisos, arquitectura objetivo y pruebas de aceptación.

### Agente contextual v0.1
- Se incorporó `zp-agent.js` y `zp-agent.css` en Creator.
- Ventana flotante con arrastre táctil, minimizar, maximizar/restaurar, resize y cierre; launcher para reabrir.
- Captura contexto desde controles enfocados/pulsados: etiqueta, módulo, identificador DOM y metadatos explícitos si existen.
- Diccionario local de pads/samples, trim, Piano Roll, secuenciador, FX, proyectos, render, Radio Grid y tempo.
- Catálogo allowlist: detener, play/pause, abrir selector de muestras, guardar proyecto (con confirmación) y abrir Project Manager.
- El agente escucha eventos de ACK/error/timeout del bridge y comunica el resultado real.
- No hace llamadas remotas, no ejecuta texto arbitrario y no modifica archivos GitHub. No es todavía un LLM remoto; es la base contextual y de acciones deterministas.
- Los recursos se precargan en PWA; caché actualizada a `dirtyfingaz-zp-shell-v8`.

### Corrección adicional del secuenciador
- La estructura real de `#gr` contiene 17 elementos antes de la primera fila de celdas: esquina superior + 16 encabezados de pasos; cada fila añade etiqueta + 16 celdas.
- Se unificaron los tres cálculos de padId (playhead, estado de patrón e interacción) a `Math.floor((index-18)/17)+1`.
- Se añadió una prueba de las 9 filas × 16 pasos contra los índices reales del grid.
- La causa del CI fallido era que la aserción exigía tres ocurrencias de una fórmula mientras la ruta de patrón utilizaba una fórmula equivalente distinta. La inspección del DOM permitió normalizar las tres rutas y añadir prueba de los 144 casos.

### Evidencia GitHub
- Rama: `feat/hybrid-hardware-ui-system`.
- SHA de código con corrección de secuenciador y agente: `24116e03d266d8c14e6cf5a92aa4636f20bb5f2d`.
- GitHub Actions run `41885854130`: **SUCCESS**, job validate.
- Documentación y commits de agente se mantienen sólo en rama de desarrollo. No se ha solicitado ni ejecutado merge a main.

### Estado de infraestructura observado
- Supabase `dirtyfingaz-os`: `ACTIVE_HEALTHY`, PostgreSQL 17, schema `public` sin tablas y sin Edge Functions.
- No se crearon tablas, políticas RLS, secrets ni migraciones.
- Wrangler configura Worker-first para `/api/*` y binding Durable Object `RADIO_ROOMS`; no se verificó despliegue Cloudflare para este corte.
- No existe todavía endpoint remoto de IA ni proveedor/modelo configurado.

### Próximo orden técnico
1. QA de ventana flotante y acciones en Safari iOS; validar ACK/error y no interferencia con pads/knobs.
2. Añadir pruebas E2E de contexto y de las acciones registradas.
3. Definir proveedor de IA, autenticación Supabase JWT, límites y permisos antes del endpoint Worker.
4. Diseñar migraciones y RLS en Supabase; revisión previa antes de aplicarlas.
5. Decidir almacenamiento binario R2 vs Supabase Storage.
6. Habilitar herramientas de programación sólo con diff, rama feat/* y PR; nunca merge automático.


## 14. Cuestionario V3 y Copiloto IA · 2026-11-04

### Fuente canónica
- Se creó `MASTER-QUESTIONNAIRE-V3-AGENT.md` en la raíz del repositorio.
- Consolida las respuestas V2 del usuario: trim multi-selección `drag, pinch, independent, rubber, snap, free, knob, wave, remember, undo`; SHIFT+PAD para configuración personalizada; conexión trim-síntesis pendiente de contrato; prioridad IA; orientación `all`.
- Se repararon los enlaces desde `docs/CUESTIONARIO-MAESTRO-DIRTYFINGAZ-ZP.md` al documento V3.

### Copiloto contextual
- SHIFT + PAD expone configuración rápida MUTE/SOLO/PREVIEW/LOAD SAMPLE e identidad del pad.
- Agente contextual recibe pad activo, banco, BPM, proyecto y etiqueta/control visible.
- Catálogo local incluye transporte, sample browse/preview/chop, patrón clear, save/project manager, BPM, bancos A-D, Drive, Mute y Solo.
- Acciones destructivas y escrituras requieren confirmación; el modelo no ejecuta comandos directamente.
- Ventana flotante tiene drag, minimizar, maximizar/restaurar, cierre, launcher y handle de resize táctil.

### Workers AI
- Worker tiene `POST /api/agent/chat` y `GET /api/agent/health`.
- Modelo: `@cf/openai/gpt-oss-20b`, binding `AI`.
- Endpoint bloqueado salvo `ENVIRONMENT=preview` y `AI_AGENT_ENABLED=true`; producción mantiene `AI_AGENT_ENABLED=false`.
- Se validan Origin, método, tamaño, contexto, historial y rate limit temporal por IP.
- El rate limit actual vive en memoria del isolate; no equivale a rate limit durable ni autenticación. Antes de beta pública deben añadirse identidad, autorización y límites durables.
- No se ha verificado despliegue ni inferencia real en Cloudflare Preview.
- No se habilitó function calling para acciones de app; sólo conversación contextual y Action Registry local.

### Estado de integración
- Supabase `dirtyfingaz-os` sigue sin tablas/migraciones/Edge Functions y no se modificó.
- R2 vs Supabase Storage, autenticación, RLS, memoria persistente y backend definitivo siguen pendientes de decisión.
- No se migró a Java; se mantiene HTML/CSS/JS y TypeScript gradual para contratos nuevos.
- Modo de programación GitHub (diff, rama feature, PR) todavía no está conectado al agente.

### CI
- SHA validado: `d73270fe0c876025bbd87cce0ff895433706069f`.
- GitHub Actions run `41887071325`: **SUCCESS**, job validate.
- No se modificó `main`, no se hizo merge y no se desplegó producción.

## 14. Piano Roll / Pattern Edit · mejoras de interacción · 2026-11-04

- Controles de zoom `+` y `−` agrupados, mayores y con zona táctil ampliada.
- El playhead del Piano Roll interpola entre pasos con `requestAnimationFrame`, usando el BPM y el último paso confirmado por el motor.
- Al cambiar de pad, la GUI recibe su estado MIDI y resalta las notas de ese pad dentro del Piano Roll.
- Barrido táctil sobre Pattern Edit alterna pasos pares (atajo de cada dos pasos) sin exigir taps individuales.
- Pulsación de dos segundos sobre una nota abre MIDI Tools con información STEP / PITCH / LEN / VEL y selección del parámetro que controlará el rotor.
- El botón `↕` activa edición libre; el rotor maestro `.pe` mueve pitch, step, length o velocity según el objetivo seleccionado. Si no hay nota seleccionada, desplaza el rango visible del teclado.
- Mantener SHIFT durante el arrastre desactiva cuantización. En iPhone, el botón de modo libre sustituye la tecla SHIFT.
- El cursor de movimiento libre se representa como retícula visible sobre el Piano Roll.
- El motor conserva `micro` (0..0.999 de un paso) en cada nota y programa su reproducción con ese offset, permitiendo microtiming real en vez de sólo mover visualmente el bloque.
- La edición MIDI sigue entrando por `creator.piano.note.upsert` y conserva persistencia de proyecto; no se modifica el contrato del bridge.
- CI: run `41887880916` completó `validate` en SUCCESS para SHA `965e5bfcd9a903b0dca7f4541b9876c9594ca8d1`, incluyendo controles de información MIDI, selector de destino del rotor, cursor libre y nuevas aserciones.
- Pruebas de dispositivo aún pendientes: gesto táctil continuo, rotor, SHIFT con teclado externo y reproducción de microtiming en Safari iOS.


## 16. Agente contextual · Inspector JSON y herramientas de desarrollo · 2026-11-04

- Se amplió el agente a v0.3 con selección contextual del control tocado, resaltado visual del objetivo y ficha de parámetro.
- El cliente lee `zp-agent-registry.json`; ese registro define módulo, owner, tipo, min/max/step/default, comando y payload. La misma fuente JSON es consultada por el Worker para enriquecer el contexto de IA.
- El inspector permite aplicar en vivo sólo parámetros con comando registrado. El payload se construye desde el JSON, sustituyendo `$value`, y la confirmación depende del ACK del motor. Parámetros MIDI aún sin comando dedicado quedan en modo informativo/desarrollo.
- Se añadieron herramientas de composición por botón: JSON, GUI, BRIDGE, ENGINE y TEST. Los snippets son borradores revisables, copiables y consultables con la IA; no se ejecutan automáticamente ni escriben código en el repositorio.
- El registro incluye contexto de arquitectura, responsabilidades de archivos, separación GUI/motor, reglas de rama, enlaces del proyecto y estado de handoff para retomar sesiones.
- Ventana flotante: opacidad de reposo 20%, opacidad completa durante interacción/foco, drag desde cabecera, resize desde esquina, controles táctiles y sin autofocus al abrir para evitar zoom de Safari. El temporizador cierra el agente tras 10 segundos de inactividad y cancela confirmaciones pendientes.
- Service Worker actualizado a caché v9 e incluye el registro JSON para disponibilidad offline.
- Worker consulta el JSON del asset y entrega al modelo la definición del parámetro y el contexto de arquitectura. La IA permanece habilitada sólo en Preview.
- Validación estática añadida para registro, inspector, snippets y carga PWA. Pendiente ejecutar CI en el SHA final y QA real en Safari iPhone 11.
- Sin cambios en `main`, sin merge, sin cambios de esquema Supabase.


## 17. Encoders Lx / Rx · 2026-11-04

- Se incorporó Lx a la izquierda de Rx en la fila PUSH ENTER. Lx recorre en ciclo las herramientas y funciones visibles (botones, herramientas Piano Roll, marcadores IN/OUT, destinos MIDI y controles LCD), enfoca el elemento, lo resalta y lo desplaza a la vista. No ejecuta la acción seleccionada.
- Rx conserva el comportamiento existente de PUSH ENTER: trim IN/OUT, MIDI en modo libre y FX amount cuando no hay otro modo activo. Se conserva el selector funcional `.pe` y se añade la identidad explícita `data-rotor=Rx`.
- Ambos encoders quedan identificados en `zp-agent-registry.json`. El agente distingue Lx como navegación y Rx como control contextual; el Worker adjunta la definición del encoder seleccionado al contexto de IA.
- Lx usa pasos de navegación de 14 grados y permite avanzar/retroceder mediante flechas de teclado cuando está enfocado.
- Validación estática de sintaxis inline de Creator: PASS (3 scripts). JSON del registro válido. Pendiente CI en el SHA final y prueba real en Safari iPhone 11, incluyendo foco, scroll, tacto y ACK/error/persistencia de un parámetro.
