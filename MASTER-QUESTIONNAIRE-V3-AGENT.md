# MASTER QUESTIONNAIRE V3 · DIRTYFINGAZ ZP
Estado: especificación viva de desarrollo · Corte: 2026-11-04
Rama de integración vigente: `feat/dirtyfingaz-zp-clean-integration`

Este documento consolida las elecciones ya entregadas, decisiones de arquitectura, estado verificable y preguntas que todavía bloquean la beta. Las selecciones del usuario no se deben volver a preguntar como si estuvieran pendientes.

## 1. Decisiones ya entregadas por el usuario

### 1.1 Trim / Sample Editor · multi-selección V2

El usuario seleccionó todas estas capacidades:

- [x] `drag`: mover IN/OUT arrastrando.
- [x] `pinch`: zoom/ajuste con gesto multitáctil.
- [x] `independent`: límites IN y OUT independientes.
- [x] `rubber`: selección tipo rubber-band / banda elástica.
- [x] `snap`: ajuste a transientes, grid o puntos de referencia.
- [x] `free`: edición libre sin cuantización.
- [x] `knob`: ajuste con perilla.
- [x] `wave`: edición visual sobre waveform.
- [x] `remember`: recordar el último rango.
- [x] `undo`: historial de edición y deshacer/rehacer.

**Comentario de bloque:** al mantener SHIFT y tocar un PAD se abre una configuración más personalizada.

**Conexión solicitada:** conectar el recorte con alguna síntesis compatible. La síntesis concreta y su contrato todavía no están especificados; no acoplar directamente el waveform a un sintetizador sin definir entrada, modulación, límites y persistencia.

### 1.2 Prioridad y orientación

- [x] Prioridad declarada: IA primero.
- [x] Orientación declarada: `all`, es decir, adaptar la interfaz a las orientaciones y tamaños soportados, no bloquearla a un único formato.
- [x] Mantener compatibilidad desde iPhone 11 en adelante y ampliar a tablet/escritorio sin romper la jerarquía táctil.

### 1.3 SHIFT + PAD

Implementación actual observada en la GUI:
- [x] SHIFT + PAD abre panel contextual del pad.
- [x] El panel expone MUTE, SOLO, PREVIEW y LOAD SAMPLE.
- [x] Cada pad expone `data-pad-id`.
- [x] El panel expone el pad configurado en `data-pad-id`.

Siguientes expansiones previstas, no declaradas como ya implementadas:
- [ ] Sample y browser por pad.
- [ ] Trim IN/OUT por pad.
- [ ] Pitch y nivel.
- [ ] ADSR.
- [ ] Filtro.
- [ ] FX y routing.
- [ ] Síntesis / sample híbrido.
- [ ] MIDI y presets.

## 2. Objetivo de producto

DIRTYFINGAZ ZP es una estación musical móvil con arquitectura modular:
- Creator Shell: navegación, composición y responsive.
- Creator GUI: controles, gestos, feedback y contexto.
- Creator Engine: audio, scheduler, samples, parámetros y estado musical.
- Local Storage: proyectos y assets locales.
- Cloudflare: API, coordinación realtime y agente IA.
- Supabase: futuro backend de identidad, metadatos y conocimiento persistente, sólo cuando se confirme como backend de ZP.

La prioridad inmediata es una experiencia funcional y verificable, no una demo visual.

## 3. Contratos para evitar errores de composición

### 3.1 Propiedad de estado

| Dominio | Dueño | Persistencia |
|---|---|---|
| AudioContext, buffers, transporte, scheduler | Creator Engine | No persistir objetos AudioBuffer |
| Notas, patrones, bancos, BPM y parámetros | Creator Engine | Snapshot de proyecto |
| Interacción, foco, paneles, drag y layout | Creator GUI | Preferencias puntuales |
| Proyectos, samples, ranges y revisiones locales | IndexedDB / repositorio local | IndexedDB |
| Identidad, permisos, metadatos sincronizados | Supabase, pendiente de aprobación | PostgreSQL / Storage |
| API IA, validación y orquestación | Cloudflare Worker | Sin estado autoritativo musical |
| Presencia y sesiones colaborativas efímeras | Durable Objects | Estado de sesión temporal |
| Acciones permitidas del agente | Action Registry del cliente + validación Worker | Catálogo versionado |

### 3.2 Contrato de mensajes

Cada mensaje GUI ↔ motor debe conservar:
- `protocolVersion`
- `source`
- `requestId`
- `command`
- `payload` validado
- ACK o error correlacionado
- timeout y manejo de reintentos cuando aplique

No introducir comandos libres ni estado duplicado en GUI.

### 3.3 Versiones y validación

- Contratos versionados.
- Esquemas JSON estrictos.
- Tests de handlers y mensajes.
- Pruebas de persistencia y cambio de proyecto.
- CI sobre el SHA exacto.
- QA real en Safari iOS, Android Chrome y escritorio antes de marcar VERIFICADO.

## 4. Agente contextual / IA

### 4.1 Comportamiento esperado

El agente debe:
- Conocer el módulo y control seleccionado.
- Conocer pad, banco, BPM y proyecto activo cuando la app los exponga.
- Explicar controles y relaciones entre módulos.
- Consultar un diccionario de funciones, procedimientos, errores y contratos.
- Recomendar el siguiente paso de trabajo o prueba.
- Ejecutar acciones de aplicación sólo desde una allowlist.
- Preparar cambios de programación con plan, diff y validación.
- Mantener historial/contexto sin interferir con el audio.

### 4.2 UI implementada

- Ventana flotante draggable.
- Minimizar, maximizar/restaurar, cerrar y reabrir desde launcher.
- Redimensionamiento con control táctil.
- Historial de conversación y entrada.
- Contexto desde eventos DOM y evento de estado del motor.
- Modo local con diccionario y acciones deterministas.
- Cliente remoto llama únicamente a `POST /api/agent/chat`.

### 4.3 Acciones registradas actuales

| Acción | Comando del motor | Riesgo |
|---|---|---|
| Stop / Play-Pause | `creator.transport.stop/toggle` | Bajo |
| Abrir selector | `creator.sample.load.request` | Bajo |
| Preview | `creator.sample.preview` | Bajo |
| Mute / Solo pad | `creator.pad.mute/solo.toggle` | Bajo |
| Cortar sample | `creator.sample.chop` | Destructivo, confirmar |
| Limpiar patrón | `creator.pattern.clear` | Destructivo, confirmar |
| Guardar proyecto | `creator.project.save` | Escritura, confirmar |
| Abrir Project Manager | `creator.project.manager.open` | Bajo |
| Subir/Bajar BPM | `creator.bpm.adjust` | Bajo |
| Seleccionar banco A-D | `creator.pattern.select` | Bajo |
| Alternar Drive | `creator.fx.sample.drive.toggle` | Bajo |

El modelo no ejecuta directamente comandos, código ni SQL. Las acciones musicales siguen pasando por la allowlist del cliente y el bridge.

### 4.4 IA remota en Cloudflare Preview

- Modelo configurado: `@cf/openai/gpt-oss-20b`.
- Binding: `env.AI`.
- Endpoint: `POST /api/agent/chat`.
- Sólo se habilita cuando `ENVIRONMENT=preview` y `AI_AGENT_ENABLED=true`.
- Producción queda desactivada con `AI_AGENT_ENABLED=false`.
- El endpoint valida Origin, tamaño de payload, historial y contexto, y aplica rate limit temporal por IP.
- No se ha probado el endpoint desplegado en Cloudflare; CI estático no equivale a inferencia real.
- No hay function calling conectado a acciones de la app todavía.
- No hay integración GitHub de escritura todavía.

El modelo GPT-OSS 20B se eligió como base de copiloto de programación; tiene contexto de 128k, soporte de function calling/reasoning y zero data retention en Workers AI. La documentación vigente indica un precio de referencia de USD 0,20 por millón de tokens de entrada y USD 0,30 por millón de salida. La función de herramientas seguirá deshabilitada hasta contar con esquemas, permisos y confirmación explícita.

### 4.5 Permisos por niveles

- L0: leer contexto.
- L1: explicar y recomendar.
- L2: ejecutar acciones musicales allowlisted.
- L3: preparar propuesta de cambio de código y diff.
- L4: aplicar en rama `feat/*` y abrir PR, previa confirmación.
- Bloqueado por defecto: merge, `main`, producción, secretos, SQL libre, shell, borrado masivo y migraciones destructivas.

## 5. Cloudflare ↔ Supabase

### Cloudflare

- Worker: API y frontera de validación.
- Workers AI: inferencia del agente.
- Durable Objects: salas y coordinación realtime.
- R2: candidato para binarios grandes si el flujo lo justifica.

### Supabase

- Auth: identidad y sesión.
- Postgres: perfiles, proyectos, revisiones, assets metadata, sesiones y conocimiento.
- Storage: candidato para assets si se decide centralizar allí.
- RLS: aislamiento por usuario/proyecto.

### Estado verificado

- Proyecto `dirtyfingaz-os` activo y saludable, PostgreSQL 17.
- Schema `public` sin tablas; sin Edge Functions ni migraciones.
- No se han creado tablas ni políticas.
- Aún no se confirma que `dirtyfingaz-os` sea el backend definitivo de DIRTYFINGAZ ZP.

### Decisión pendiente

No duplicar el almacenamiento binario. Comparar R2 y Supabase Storage y elegir un flujo canónico. Si se usa Supabase, Worker valida JWT y ownership; nunca exponer service-role en navegador.

## 6. Roadmap ordenado

### Fase A · IA y acompañamiento en Preview
- [x] Ventana contextual y diccionario base.
- [x] Contexto de GUI + pad/banco/BPM/proyecto.
- [x] Action Registry local con confirmaciones.
- [x] Endpoint Worker y binding Workers AI en código.
- [ ] Despliegue y prueba real de /api/agent/health y /api/agent/chat.
- [ ] Comprobar coste, límites y latencia reales.
- [ ] Añadir autenticación y rate limit durable antes de beta pública.
- [ ] RAG/diccionario versionado.

### Fase B · Trim / Sample Editor
- [ ] Drag y pinch en waveform.
- [ ] IN/OUT independientes.
- [ ] Rubber-band.
- [ ] Snap / Free.
- [ ] Control knob y waveform.
- [ ] Remember por sample/proyecto.
- [ ] Undo/Redo.
- [ ] Conexión con síntesis bajo contrato independiente.
- [ ] Pruebas de precisión, persistencia y multitouch en iOS.

### Fase C · Pads y motor híbrido
- [x] SHIFT + PAD básico: MUTE, SOLO, PREVIEW, LOAD SAMPLE.
- [ ] Completar configuración por pad.
- [ ] Conectar trim, pitch, ADSR, filtro y FX con el motor.
- [ ] Diseñar contrato de síntesis y modulación.
- [ ] Persistir parámetros por pad y proyecto.
- [ ] Asegurar que cambios GUI no rompan AudioContext ni scheduler.

### Fase D · Backend y colaboración
- [ ] Confirmar backend Supabase de ZP.
- [ ] Diseñar Auth, ownership, RLS y migraciones.
- [ ] Definir Storage binario R2 vs Supabase.
- [ ] Sincronización de metadatos y revisiones.
- [ ] Radio Grid E2E con dos dispositivos, reconexión y TURN.

### Fase E · Modo desarrollador y beta
- [ ] GitHub App/OAuth o integración segura.
- [ ] Sólo rama feature, cambios por diff y PR.
- [ ] CI, revisión y confirmación humana.
- [ ] Eliminar/ocultar modo desarrollador antes de beta pública, según decisión.
- [ ] Criterios de beta cerrada y rollback.

## 7. Preguntas que sí siguen abiertas

1. ¿Se confirma `dirtyfingaz-os` como backend de DIRTYFINGAZ ZP o se crea un proyecto Supabase dedicado?
2. ¿Assets binarios en R2 o Supabase Storage?
3. ¿Qué síntesis concreta se conecta al trim y qué parámetros modula?
4. ¿Qué acciones del agente requieren confirmación siempre? Recomendación: todas las destructivas y cualquier escritura fuera de estado musical temporal.
5. ¿Memoria IA por usuario, por proyecto o ambas?
6. ¿Modo desarrollador con GitHub App/OAuth o sólo flujo de diff/PR desde el entorno actual?
7. ¿Beta cerrada por invitación o pública limitada?

## 8. Criterio de cierre

Una capacidad sólo se considera VERIFICADA cuando:
- el contrato está documentado;
- la GUI y el motor intercambian datos válidos;
- el estado se persiste y recupera;
- los permisos se prueban con usuarios distintos;
- CI pasa en el SHA exacto;
- el dispositivo objetivo se prueba realmente;
- no existen regresiones en módulos conectados.

**Regla de gobierno:** mantener el trabajo en `feat/hybrid-hardware-ui-system`. No modificar `main`, no fusionar y no desplegar producción sin autorización explícita.
