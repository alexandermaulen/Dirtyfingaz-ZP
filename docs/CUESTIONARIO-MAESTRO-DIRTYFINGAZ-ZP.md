# CUESTIONARIO MAESTRO · DIRTYFINGAZ ZP

> **Actualización V3 vigente:** el diseño aprobado del copiloto, sus contratos y el orden de ejecución están consolidados en [MASTER-QUESTIONNAIRE-V3-AGENT.md](../MASTER-QUESTIONNAIRE-V3-AGENT.md). Este documento conserva la base original y sus preguntas abiertas.
Versión: 1.0 · Estado: base de arquitectura para completar en pruebas
Rama de trabajo vigente: `feat/dirtyfingaz-zp-clean-integration`

> Objetivo: mantener una especificación viva que conecte producto, GUI, motor de audio, almacenamiento local, Cloudflare, Supabase, seguridad, IA contextual y pruebas. Las respuestas deben convertirse en contratos verificables, no en preferencias aisladas.

## 0. Reglas de gobierno del proyecto

- [x] La GUI y el motor de audio evolucionan en paralelo, con contrato explícito.
- [x] Los cambios se desarrollan en ramas `feat/*`; no escribir en `main` ni fusionar sin autorización explícita.
- [x] Cada cambio funcional debe incluir validación automática y evidencia de QA.
- [x] No declarar funcional una integración sólo porque compile.
- [x] No crear tablas, secretos, políticas o despliegues de producción sin diseño y autorización.
- [ ] Definir propietarios por módulo y matriz de permisos de agentes.
- [ ] Definir estrategia de versiones de API y migración de proyectos antiguos.

## 1. Producto y experiencia

1. ¿Cuál es el producto principal de la primera beta?
   - [ ] Sampler / groovebox autónomo
   - [ ] DAW móvil ligero
   - [ ] Estudio colaborativo online
   - [ ] Ecosistema completo Creator + Radio Grid
   - Decisión actual recomendada: Creator estable como núcleo; Radio Grid beta separada.

2. ¿Qué superficies se consideran prioritarias?
   - [x] iPhone 11 en adelante, Safari iOS
   - [ ] Android Chrome
   - [ ] iPad / tablet
   - [ ] Escritorio
   - [ ] PWA instalada y modo standalone

3. ¿Qué módulos deben estar disponibles sin conexión?
   - [ ] Creator, secuenciador, Piano Roll y samples locales
   - [ ] Project Manager y recuperación local
   - [ ] Render WAV/MP3
   - [ ] Catálogo y Radio Grid requieren red
   - [ ] Agente contextual básico con diccionario local

4. ¿Qué acciones deben conservar respuesta inmediata sin IA remota?
   - [ ] Transporte, pads, secuenciador y parámetros
   - [ ] Recorte IN/OUT, preview y slicing
   - [ ] Guardado local y recuperación
   - [ ] Ayuda contextual y acciones deterministas

## 2. Arquitectura de aplicación

- [x] Shell: navegación y composición de módulos.
- [x] Creator GUI: presentación, gestos y comandos.
- [x] Creator Engine: AudioContext, scheduler, buffers, render y estado de audio.
- [x] Bridge GUI ↔ motor: `protocolVersion`, `source`, `requestId`, ACK/error.
- [x] IndexedDB: persistencia local de proyectos y samples.
- [x] Cloudflare Worker + Durable Objects: endpoints y sesiones realtime de Radio Grid.
- [ ] Definir contrato común de eventos y esquema JSON versionado.
- [ ] Definir política de errores, reintentos, timeout, idempotencia y correlación.
- [ ] Definir observabilidad: logs estructurados, trazas y diagnósticos exportables.

**Decisión de composición:** GUI no escribe directamente en buffers de audio ni en IndexedDB de forma paralela al motor. Envía comandos al motor. El motor confirma estado y persiste mediante el repositorio local. El agente sólo puede usar comandos registrados.

## 3. Motor musical y edición

Marcar cada función como: `Implementada`, `Parcial`, `Pendiente`, `QA real pendiente`.

- [ ] 9 pads y 16 pasos: interacción, scheduler y recuperación.
- [ ] Piano Roll MIDI: pitch, step, length, velocity, drag/resize y cuantización.
- [ ] Bancos A-D y Song Mode.
- [ ] BPM, swing, transporte y sincronización visual.
- [ ] Sample browser, formatos soportados y límites de tamaño.
- [ ] Waveform, transientes, slicing y asignación a pads.
- [ ] IN/OUT: precisión, persistencia, preview y undo.
- [ ] FX: Drive, Delay, Filter, Reverb; orden y routing.
- [ ] Mixer: buses, niveles, mute/solo, clipping y medidores.
- [ ] Render offline WAV/MP3: sample rate, bit depth, bitrate, duración y nombre.
- [ ] Exportación/importación de proyecto: integridad de samples, metadatos y versión.
- [ ] MIDI externo, clock y export MIDI: definir como alcance futuro o beta.

**Contrato obligatorio para cada módulo:** estado dueño, comando de entrada, evento de salida, esquema, persistencia, límites, errores y pruebas.

## 4. Datos, proyectos y sincronización

1. Fuente de verdad por dominio:
   - Audio en tiempo real: Creator Engine.
   - Edición local y recuperación: IndexedDB.
   - Identidad, permisos, metadatos y sincronización: Supabase.
   - Presencia y coordinación efímera: Durable Objects.
   - Assets grandes: decidir entre Supabase Storage y R2 según acceso, coste y flujo.

2. Modelo de entidades propuesto:
   - `profiles`: identidad pública mínima.
   - `projects`: propietario, nombre, versión, metadatos y timestamps.
   - `project_revisions`: snapshots/versiones recuperables.
   - `assets`: metadatos, hash, tamaño, formato y ubicación.
   - `project_assets`: relación proyecto/asset/pad.
   - `rooms`: sala, propietario, modo y configuración.
   - `room_members`: identidad, rol y presencia persistente cuando aplique.
   - `agent_sessions`: sesión de agente y contexto permitido.
   - `agent_actions`: acción propuesta/confirmada/ejecutada, resultado y auditoría.
   - `knowledge_entries`: diccionario de módulos, controles, errores y procedimientos.

3. ¿Qué se sincroniza?
   - [ ] Sólo metadatos al inicio; assets permanecen locales.
   - [ ] Assets bajo demanda con hash y reanudación.
   - [ ] Snapshots de proyecto y revisiones.
   - [ ] Presets y preferencias.
   - [ ] Estado colaborativo de sesión en tiempo real.

4. Resolución de conflictos:
   - [ ] Última escritura gana (sólo para preferencias simples).
   - [ ] Versionado optimista con `revision` y conflicto explícito.
   - [ ] Merge por entidad para patrones y notas.
   - [ ] No sincronizar automáticamente buffers efímeros del audio.

## 5. Cloudflare ↔ Supabase

**Responsabilidades recomendadas**

| Servicio | Responsabilidad | No debe hacer |
|---|---|---|
| Cloudflare Worker | API pública, validación, rate limit, orquestación y proxy autenticado | Ser la base de datos maestra |
| Durable Objects | Presencia, locks efímeros, sala y mensajes realtime | Guardar toda la biblioteca personal |
| R2 (si se aprueba) | Assets binarios y entregas grandes | Reemplazar metadatos relacionales |
| Supabase Auth | Identidad y sesión | Delegar permisos a datos editables por el usuario |
| Supabase Postgres | Metadatos, relaciones, historial y políticas RLS | Ser el scheduler de audio |
| Supabase Storage | Archivos si se decide centralizar ahí | Duplicar assets en R2 sin política |

- [ ] Confirmar estrategia única para binarios: Supabase Storage o R2, o híbrida con reglas claras.
- [ ] Worker valida JWT de Supabase antes de operaciones privadas.
- [ ] Nunca enviar service-role/secret keys al navegador.
- [ ] RLS habilitado en todas las tablas expuestas.
- [ ] Políticas basadas en `auth.uid()` y ownership; no confiar en user metadata.
- [ ] Definir retención, exportación y borrado de datos.
- [ ] Probar permisos de usuario A frente a recursos de usuario B.
- [ ] Definir CORS, orígenes permitidos, límites y rate limits.

**Estado observado al inicio de esta especificación:** proyecto Supabase `dirtyfingaz-os` activo, PostgreSQL 17, schema `public` sin tablas y sin Edge Functions. No se han aplicado migraciones en esta fase.

## 6. Agente IA contextual

- [x] Ventana flotante de desarrollo como primera capa de UI.
- [x] Captura contextual local de módulo, control y foco.
- [x] Diccionario inicial y acciones deterministas registradas.
- [x] Endpoint de IA remota detrás del Worker, limitado a Preview; falta despliegue y QA real.
- [ ] Function calling con acciones tipadas, RAG y memoria persistente.
- [ ] Integración GitHub para propuestas de diff y PR desde rama feature.
- [ ] Recuperación de conocimiento por versión de app y módulo (RAG pendiente).
- [ ] Memoria por proyecto con consentimiento y límites.
- [ ] Generación de planes de cambio y diff antes de escribir código.
- [ ] Integración GitHub en rama de trabajo con PR, nunca merge automático.
- [ ] Diagnóstico de errores correlacionado con logs, CI y versión.
- [ ] Evaluación de respuestas y pruebas de regresión del agente.

**Permisos por nivel**

| Nivel | Alcance |
|---|---|
| L0 | Leer contexto visible y documentación |
| L1 | Recomendar y navegar |
| L2 | Ejecutar acciones seguras registradas en la app |
| L3 | Preparar cambios de código en rama de trabajo y mostrar diff |
| L4 | Aplicar cambios confirmados y abrir PR |
| Bloqueado por defecto | Merge, main, producción, secretos, migraciones destructivas y permisos de administración |

Toda acción debe tener `actionId`, esquema de entrada, validación, permiso requerido, riesgo, confirmación cuando corresponda, timeout, resultado y registro de auditoría.

## 7. Seguridad, calidad y resiliencia

- [ ] Validación de mensajes entre iframes por `source`, `origin`, versión y requestId.
- [ ] Allowlist de comandos; rechazar nombres desconocidos.
- [ ] Esquemas de entrada estrictos y límites de payload.
- [ ] Evitar ejecución arbitraria de código, SQL, shell o URLs recibidas del chat.
- [ ] Confirmación explícita para escritura, borrado, publicación y cambios de infraestructura.
- [ ] Secretos únicamente en variables protegidas del servidor.
- [ ] Pruebas unitarias de acciones, contratos e invariantes.
- [ ] Pruebas de integración GUI ↔ motor ↔ storage.
- [ ] Pruebas E2E en Safari iOS y Android Chrome.
- [ ] Pruebas de rendimiento con proyectos y samples grandes.
- [ ] Pruebas offline, reconexión y recuperación ante fallos.
- [ ] Auditoría de dependencias y licencias.

## 8. Publicación y beta

- [ ] Definir criterios de beta cerrada.
- [ ] Crear entorno preview aislado de producción.
- [ ] Confirmar despliegue Worker/Pages y binding Durable Objects.
- [ ] Verificar health checks y logs por entorno.
- [ ] Probar Radio Grid entre dos dispositivos y revisar STUN/TURN.
- [ ] Probar render completo WAV y MP3 en Safari.
- [ ] Probar instalación PWA, safe areas y pantalla completa.
- [ ] Crear procedimiento de rollback.
- [ ] Separar telemetría de datos personales y permitir desactivarla.

## 9. Decisiones pendientes de respuesta del equipo

Estas decisiones no bloquean el diseño inicial del agente local; sí bloquean la conexión remota y la beta:

1. Binarios: Supabase Storage, R2 o híbrido.
2. Identidad: cuenta obligatoria desde el inicio o invitado local con vinculación posterior.
3. Colaboración: sincronizar proyectos completos o sólo sesiones/controles en vivo.
4. IA: proveedor/modelo, presupuesto y política de retención.
5. Autonomía: qué acciones puede ejecutar sin confirmación.
6. Memoria: por proyecto, por usuario o ambas.
7. Beta: privada por invitación o pública limitada.

## 10. Criterio de salida

Una función sólo pasa a `VERIFICADA` cuando:
- el contrato está documentado;
- la GUI y el motor intercambian datos válidos;
- la persistencia sobrevive a recarga y cambio de proyecto;
- el validador/CI pasa para el SHA exacto;
- la prueba real del dispositivo objetivo se registra;
- no introduce regresiones en los módulos dependientes.

**Regla de cierre:** ningún indicador visual, mock, demo o respuesta de IA equivale a una operación real completada.


## Actualización V3 · Copiloto y coordinación de servicios

- El cliente local del agente ya tiene ventana flotante, diccionario y allowlist de acciones. SHIFT + PAD abre configuración rápida del pad.
- El contexto del motor ahora informa pad activo, banco, BPM e identidad del proyecto.
- Cloudflare Worker implementa POST /api/agent/chat con Workers AI (@cf/openai/gpt-oss-20b), disponible sólo en Preview. Producción permanece desactivada.
- El agente usa el modelo para responder y orientar; las acciones de app siguen siendo deterministas y pasan por allowlist + bridge. Function calling y ejecución de propuestas generadas por IA quedan pendientes.
- No se ha desplegado ni probado el endpoint en Cloudflare Preview.
- Supabase dirtyfingaz-os sigue sin tablas/migraciones/Edge Functions y no está confirmado como backend de ZP. No se modificó.
- No se migra a Java; TypeScript se incorpora gradualmente para contratos/servicios.
- Fuente canónica y plan por fases: [MASTER-QUESTIONNAIRE-V3-AGENT.md](../MASTER-QUESTIONNAIRE-V3-AGENT.md).



## Consolidación de respuestas de Cuestionarios Maestros · 4 noviembre 2026

**Base de integración vigente:** `main` actualizado con PR #4 y PR #5. Esta rama limpia parte de ese `main`; la rama antigua no es base de integración.

**Estado general:** Cuestionarios 01–19 confirmados por el usuario. La recuperación disponible no conserva el detalle literal completo de 01, 07, 09 y 10; no se rellenan por inferencia. Cuestionario 20 sigue pendiente.

### Respuestas confirmadas recuperadas

- **CM02 · superficies/módulos:** selección inicial de 16 PADs, Step Sequencer, Piano Roll, Sample Editor, Synth Editor, Mixer, Browser y Arrangement. La cantidad de PADs fue corregida posteriormente a **9 uniformes**, decisión vigente.
- **CM03 · navegación:** pestañas superiores, mantener PAD presionado, Lx contextual, menú desplegable y botones físicos dedicados. Dirección visual vigente: LCD Nokia 1990 + lenguaje digital inspirado en Mega Man X4, sin personajes.
- **CM04 · funciones:** SHIFT, UNDO/REDO, COPY/PASTE, QUANTIZE, NOTE REPEAT, ERASE, PAD BANK, OCTAVE, OVERDUB y FUNCTION/MENU.
- **CM05 · comportamiento PAD:** Velocity, Pressure/Hold, Multitouch, Sample Trigger, Note Trigger, Pattern Trigger, Scene/Clip Launch y comportamiento contextual inteligente.
- **CM06 · feedback PAD:** sistema híbrido LCD + neón; estados activo/inactivo, intensidad de velocity, PAD seleccionado, reproducción, grabación y color según tipo de sonido.
- **CM08 · PAD dock:** posición inferior, adaptación desplegable, visibilidad persistente, orientación vertical y reglas de uniformidad, orden estable y ausencia de solapamiento.
- **CM11 · información PAD:** waveform como jerarquía principal; mantener visibles número, nombre, waveform, tipo, velocity, banco, color y estado; actualizar waveform, velocity y estado en tiempo real.
- **CM12 · lenguaje visual:** tipografía híbrida, tamaño equilibrado, waveform híbrida e indicadores combinados de color, LED, borde y pixel; sin modificaciones adicionales.
- **CM13 · indicadores:** velocity en barra + número; Pressure/Hold por presión; selección por borde; feedback mediante flash, pulso, onda y pixel; sin modificaciones adicionales.
- **CM14 · PADs:** ubicación inferior, expansión desplegable, persistencia, orientación vertical y distribución uniforme, ordenada y sin solapamiento.
- **CM15 · adaptación:** módulo compacto; dock, scroll, header, touch, overflow y transition; combinar reajuste automático con desplazamiento independiente.
- **CM16 · jerarquía:** paneles; priorizar panel activo, preservar valores/ajustes y ofrecer acceso rápido a secundarios; sin modificaciones adicionales.
- **CM17 · navegación de paneles:** tabs; panel activo resaltado; resize, remember, drag y restore; reorganización sólo al activar EDIT LAYOUT.
- **CM06 · estética de los 9 PADs:** híbrido LCD + neón; indicadores activo/inactivo, velocity, PAD seleccionado, reproducción, grabación y color por tipo de sonido.
- **CM18 · edición de layout:** activar desde menú; herramientas drag, resize, save y cancel; salir automáticamente después de guardar; sin modificaciones adicionales.
- **CM19 · perfiles:** persistencia HYBRID; perfiles DEFAULT/CUSTOM; AUTOSAVE, DUPLICATE, RENAME y DELETE; al cambiar de módulo cargar DEFAULT; sin modificaciones adicionales.
- **Reglas de Creator confirmadas en conversaciones posteriores:** nueve PADs uniformes; IN a la izquierda y OUT a la derecha como controles maestros en contexto Sample; CTRL 1 Attack, CTRL 2 Decay, CTRL 3 Release; ADR/ADSR seleccionable desde Utility y guardado por proyecto. FUNCTION/MENU/PIANO no se abre automáticamente, sólo desde PROJECT. El agente flotante debe ser compacto, centrado, translúcido, 80% de opacidad, estética CRT/pixel y LED rojo.

### Datos aún no recuperados literalmente

- **CM01, CM07, CM09 y CM10:** constan dentro del conjunto 01–19 confirmado, pero la fuente disponible no devuelve sus opciones/comentarios exactos. Se mantienen registrados como confirmados con detalle pendiente de recuperación, sin inventar valores.

### Cuestionario Maestro 20 · pendiente

Faltan decisiones explícitas para:
- Posicionamiento: FREE / GRID / HYBRID / ZONES.
- Alineación: selección pendiente.
- Colisiones: PREVENT / PUSH / ALLOW / MANUAL.
- Límites: CONTAINED / PARTIAL / FREE.

No activar drag/resize geométrico hasta que estas cuatro reglas queden confirmadas. La interfaz puede conservar navegación por tabs, selección de grupos, opciones contextuales y perfiles híbridos sin ejecutar comandos del motor.
