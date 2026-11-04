# DIRTYFINGAZ ZP · Cuestionario Maestro V3 y especificación del Copiloto

Estado: decisiones V2 consolidadas; V3 define arquitectura y criterios de implementación.
Rama: feat/hybrid-hardware-ui-system. No escribir en main, no fusionar ni desplegar producción.
Idioma: español. Dispositivos: iPhone 11 en adelante, Safari iOS y navegadores móviles modernos.

## 1. Decisiones aceptadas

| Área | Decisión |
|---|---|
| Prioridad | Agente IA contextual, sin abandonar estabilidad del motor |
| Orientación | all: móvil, tablet y escritorio |
| Trim IN/OUT | drag, pinch, independent, rubber, snap, free, knob, wave, remember, undo |
| Configuración rápida | SHIFT + PAD abre configuración personalizada |
| GUI / motor | Líneas separadas; contrato explícito antes de cambios cruzados |
| Contexto IA | módulo, control, pad, banco, patrón, herramienta, gesto y acción |
| Ventana IA | flotante, movible, redimensionable, minimizable, maximizable y cerrable; inicio arriba a la derecha |
| Acciones | proponer, validar, mostrar cambios, aprobar según riesgo, ejecutar, verificar y deshacer si es reversible |
| Modo desarrollador | temporal durante construcción y pruebas; retirar/bloquear antes de beta pública |
| Backend | Cloudflare coordina API y sesiones; Supabase persiste datos cuando se apruebe el esquema |
| Lenguaje | JavaScript actual; TypeScript incremental para contratos y servicios. No migrar a Java |

## 2. Cuestionario Maestro V3

Los puntos DECIDIDO son requisitos vigentes. POR VALIDAR no bloquea el diseño inicial.

### A. Identidad y contexto
- [x] Copiloto integrado DIRTYFINGAZ ZP, español por defecto.
- [x] Contexto de selección y actividad en tiempo real.
- [ ] POR VALIDAR: perfiles especializados: Productor, Técnico de audio, Diseñador GUI, QA y Arquitecto.
- [ ] POR VALIDAR: contexto compartido entre sesiones/dispositivos y retención.

### B. Interfaz
- [x] Ventana flotante movible y redimensionable.
- [x] Minimizar, maximizar/restaurar y cerrar.
- [x] Posición inicial arriba a la derecha y contexto visible del elemento seleccionado.
- [ ] POR VALIDAR: guardar tamaño/posición por dispositivo y accesibilidad.

### C. Diccionario y acciones
- [x] Catálogo central de controles, comandos, parámetros, rangos y recomendaciones.
- [x] Ejecutar sólo comandos registrados; nunca manipulación arbitraria del DOM.
- [ ] POR VALIDAR: macros para sampleo, beatmaking, mezcla y exportación.
- [ ] POR VALIDAR: presets lo-fi/J-Dilla y mapeo estilo Ableton.

### D. Creator / secuenciador / MIDI
- [x] Preservar 9 pads, 4 bancos y 16 pasos.
- [x] Piano Roll MIDI separado de la grilla clásica.
- [x] SHIFT + PAD abre ajustes personalizados.
- [ ] POR VALIDAR: drag/resize, velocity y cambio de octava en Safari.
- [ ] POR VALIDAR: MIDI IN/OUT, clock sync y export MIDI estándar.

### E. Sample Editor / Trim
- [x] Drag y pinch; IN/OUT independientes.
- [x] Rubber-band, snap, free mode y control por knob.
- [x] Waveform como superficie de edición.
- [x] Recordar rangos por proyecto/pad y permitir undo.
- [ ] POR VALIDAR: snap por transiente, beat, subdivisión o modo híbrido.
- [ ] POR VALIDAR: samples largos, mono/estéreo y frecuencia variable.

### F. Motor de audio
- [x] El motor es dueño de audio, scheduler, estado musical y persistencia.
- [ ] POR VALIDAR: migrar scheduler crítico a AudioWorklet tras medir latencia.
- [ ] POR VALIDAR: peak/RMS, clipping, latencia y recuperación de AudioContext.
- [ ] POR VALIDAR: render multipatrón/canción completa y comparación WAV/MP3.

### G. Cloudflare
- [x] Worker como API gateway y coordinador del agente.
- [x] Durable Objects para salas/presencia y estado efímero.
- [ ] POR VALIDAR: Worker preview aislado y despliegue manual.
- [ ] POR VALIDAR: proveedor/modelo IA, binding/API, streaming y límites.
- [ ] POR VALIDAR: autenticación, rate limit, auditoría y secretos.

### H. Supabase
- [x] Persistencia futura para identidad, proyectos, preferencias, conocimiento y auditoría.
- [x] No crear tablas hasta cerrar modelo, permisos y separación de proyectos.
- [ ] POR VALIDAR: Auth, ownership, Storage, Realtime y RLS.
- [ ] POR VALIDAR: confirmar si dirtyfingaz-os es el proyecto correcto o si ZP requiere un proyecto aislado.
- [ ] POR VALIDAR: migraciones versionadas y pruebas de políticas por rol.

### I. Agente desarrollador
- [x] Modo temporal para inspeccionar, proponer y acompañar cambios.
- [x] Cambios de código como diff revisable y validación CI antes de aceptar.
- [ ] POR VALIDAR: GitHub App/OAuth con permisos mínimos y ramas feat/*.
- [ ] POR VALIDAR: leer logs, crear rama, editar archivos, commits y PR desde el chat.
- [ ] POR VALIDAR: retirar modo desarrollador antes de beta pública.

### J. Calidad y lanzamiento
- [x] CI como puerta de validación.
- [x] Diferenciar PASS estático, PASS CI, preview verificado y QA físico.
- [ ] POR VALIDAR: Playwright para GUI y contratos.
- [ ] POR VALIDAR: matriz iPhone 11+, Safari, Chrome Android, tablet y escritorio.
- [ ] POR VALIDAR: beta privada, telemetría opt-in y rollback.

## 3. Arquitectura

GUI/Creator → bridge versionado → ZP Agent Client → Cloudflare Worker → proveedor IA y herramientas validadas → Supabase para persistencia.

- GUI: informa selección y presenta resultados; no contiene secretos ni autorización.
- Motor: ejecuta comandos conocidos, valida parámetros y conserva el estado musical.
- Cloudflare: autentica, orquesta, limita uso y conecta al proveedor IA.
- Supabase: conserva datos persistentes con ownership/RLS.
- GitHub: fuente de verdad del código; el agente trabaja con diffs, ramas y CI.
- Notion: decisiones y documentación; no sustituye el estado del repositorio.
- Durable Objects: presencia, sesiones y coordinación efímera; no reemplazan Postgres.

## 4. Contrato de contexto

Cada evento del cliente debe incluir schemaVersion, sessionId, module, surface, controlId, selection (pad/bank/pattern), gesture, state observado, capabilities permitidas y timestamp ISO-8601.

Ejemplo conceptual: module=creator; surface=sample-editor; controlId=trim-in; selection={pad:1,bank:A}; gesture=drag; state={sampleLoaded:true,trimStart:0,trimEnd:1}; capabilities=[sample.trim.set,sample.preview].

No enviar audio binario, tokens, credenciales ni datos personales innecesarios. El cliente comunica hechos observados; el agente no inventa estados.

## 5. Contrato de acción

Cada acción debe contener schemaVersion, actionId, requestId, target, parameters, risk, requiresApproval y expectedStateVersion. Debe devolver resultado o error normalizado, y declarar si admite undo. Comandos desconocidos se rechazan.

Niveles:
1. Lectura: explicar/consultar estado; sin confirmación.
2. Reversible: knob, trim o selección; preview y undo.
3. Destructiva: borrar sample/patrón/proyecto; confirmación explícita y snapshot previo.
4. Externa/desarrollador: GitHub, Worker o base de datos; diff, alcance, CI y aprobación específica.
5. Prohibida por defecto: secretos, producción, main, merge y acciones fuera del proyecto.

## 6. Diccionario inicial

| Intención | Acción interna | Riesgo |
|---|---|---|
| Detener | creator.transport.stop | Reversible |
| Reproducir/pausar | creator.transport.toggle | Reversible |
| Guardar proyecto | creator.project.save | Reversible |
| Limpiar patrón | creator.pattern.clear | Destructiva |
| Cambiar banco | creator.pattern.select | Reversible |
| Ajustar BPM | creator.bpm.adjust | Reversible |
| Cortar sample | creator.sample.chop | Destructiva |
| Cambiar IN/OUT | creator.sample.trim.set | Reversible |
| Exportar | creator.export.render | Requiere parámetros |
| Inspeccionar control | consulta de contexto | Lectura |
| Modificar código | GitHub patch workflow | Externa/desarrollador |

## 7. Orden lógico de implementación

| Fase | Entrega | Criterio de cierre |
|---|---|---|
| 0 | Inventario y reparación CI | Validador alineado al código; CI PASS en HEAD |
| 1 | Contrato GUI/motor/contexto | Eventos tipados, origen validado, ACK/error correlacionados |
| 2 | Ventana flotante + contexto | mover, resize, minimizar, maximizar, cerrar; iframe validado |
| 3 | Diccionario local + acciones | catálogo tipado; preview, confirmación, resultado y undo |
| 4 | API Cloudflare | auth, rate limit, proveedor IA intercambiable, herramientas allowlist |
| 5 | Supabase | esquema/migraciones tras aprobar ownership, RLS, Storage y retención |
| 6 | Modo desarrollador GitHub | GitHub App/OAuth, diff, ramas feature, CI y aprobación |
| 7 | QA beta | Safari/iPhone, audio real, regresión, seguridad y rollback |

## 8. Política técnica

- Mantener GUI y motor separados; contrato y pruebas antes de cambios cruzados.
- Preferir TypeScript en módulos nuevos de dominio/servicio; conservar JS donde migrarlo aumente riesgo.
- No introducir framework ni reescribir la app para añadir el copiloto.
- Nunca exponer claves IA, Supabase service role ni GitHub token en frontend.
- No crear tablas ni migraciones hasta aprobar el esquema y confirmar alcance del proyecto.
- Un botón o un PASS estático no certifican funcionamiento real.
- Cada cambio registra SHA, archivos, CI, preview exacto y QA pendiente.
- La beta pública no expone herramientas de edición de código ni permisos de infraestructura.

## 9. Estado inicial verificado

- Repositorio: alexandermaulen/Dirtyfingaz-ZP.
- Rama de trabajo: feat/hybrid-hardware-ui-system.
- main observado en SHA 53b9151b96979da980bd446fa7dbb9f3c3cf3886; rama de trabajo divergida. No modificar main.
- Supabase dirtyfingaz-os: activo, PostgreSQL 17; cero tablas, cero migraciones y cero Edge Functions. Advisors de seguridad/rendimiento sin hallazgos al consultar.
- Cloudflare: wrangler.jsonc declara Worker dirtyfingaz-zp y Durable Object RadioRoom. ENVIRONMENT por defecto figura como production y preview lo sobrescribe; revisar antes de habilitar deploy. No asumir que rama feature equivale a preview.
- CI run 41868187356 falló en SHA 350f8ef26014030988f0636ffe6575d31c751494 porque el motor de ese SHA aún no incluía zpGetBroadcastStream. La rama actual sí contiene el símbolo; validar HEAD actual y no repetir el fallo histórico como si fuera actual.
- Piano Roll MIDI, editor de samples, FX, proyectos y Radio Grid tienen implementación en distintos grados; su existencia en código no certifica QA táctil ni audio real.

## 10. Registro de decisiones

Para cada hito registrar fecha/hora, SHA, archivos, contrato afectado, pruebas, CI, preview, QA de dispositivo, riesgos y siguiente decisión.


## 11. Implementación del copiloto · primer corte

- La rama ya contiene la ventana flotante del agente en Creator: launcher, drag, resize, minimizar, maximizar y cerrar.
- El cliente local inspecciona controles mediante pointerdown/focusin y mantiene un diccionario de ayuda por módulo.
- El estado actual se identifica como modo local sin IA remota. No se presenta como modelo generativo conectado.
- Se amplió el catálogo de acciones con detener/reproducir, selector de muestras, guardar/gestionar proyecto, subir/bajar BPM, bancos A–D, Drive, chop y limpiar patrón.
- Guardar requiere confirmación; chop y limpiar patrón requieren confirmación destructiva.
- Las acciones pasan por zpBridgeSend y esperan ACK/error del motor. No se añadió ejecución arbitraria ni llamadas remotas desde el cliente.
- scripts/validate.mjs incorpora aserciones del catálogo y de la confirmación de acciones destructivas.
- Commits de esta intervención: a709efd58c69c68841b3a44c0ace9d35899eaabc (documentación), 42baeeed50717be41a1fa8ea7c4a41c9df21a808 (acciones del agente), 4e02f2c03761a87a7df159d7c865f2f3545421af (validación).
- Estado CI del último commit: aún no confirmado por un run/check asociado; el endpoint de estado no devolvió checks.
- Pendiente crítico: conectar proveedor IA detrás del Worker, añadir autenticación/limitación de uso, y construir modo desarrollador GitHub con diff y aprobación por acción. Esto requiere credenciales del lado servidor, nunca en el navegador.
