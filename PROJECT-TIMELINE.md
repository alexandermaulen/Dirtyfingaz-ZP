# DIRTYFINGAZ ZP · Cronograma y línea de tiempo

**Corte de contexto:** 2026-11-04  
**Rama de trabajo:** `feat/hybrid-hardware-ui-system`  
**HEAD verificado al abrir este registro:** `653569f0c318408dc9527a857ee17ee1fbedbd2e`  
**CI del HEAD anterior:** [run 41870648909 · SUCCESS](https://github.com/alexandermaulen/Dirtyfingaz-ZP/actions/runs/41870648909)  
**Regla de seguridad:** no escribir en `main`, no mover refs de `main`, no fusionar PR. Supabase `dirtyfingaz-os` permanece fuera del alcance.

Este documento es la bitácora cronológica del proyecto. Se actualiza después de cada cambio relevante y conserva tanto los hitos como los pendientes. Los estados distinguen código, CI, preview y pruebas físicas: un PASS estático no significa que una función haya sido probada en Safari.

## 1. Línea de tiempo de cambios verificados

| Fecha / orden | Hito | Evidencia | Estado |
|---|---|---|---|
| 2026-11-04 · base | Se consolidó la rama híbrida de trabajo para GUI, motor, secuenciador, storage y Radio Grid. | Rama `feat/hybrid-hardware-ui-system`; historial GitHub. | Base activa |
| 2026-11-04 · Creator | Se integraron mejoras del Creator: secuenciador de 16 pasos, mapeo de pads, trim IN/OUT, Project Manager, render WAV/MP3 y efectos. | `AUDIT-TRAZABILIDAD.md`, secciones 7–8. | Código registrado; QA físico pendiente |
| 2026-11-04 · Radio Grid | Se conectó el flujo de sala, presencia/señalización y el camino de audio del Creator hacia WebRTC. | `radio-worker.mjs`, `wrangler.jsonc`, auditoría técnica. | Código presente; prueba entre dispositivos pendiente |
| 2026-11-04 · RADIO-01 | El motor expuso `window.zpGetBroadcastStream` para entregar el stream del bus master. | Commit `c02b8539e12a3db319d228e9fae4e06f4b1d449b`; [CI 41869055940](https://github.com/alexandermaulen/Dirtyfingaz-ZP/actions/runs/41869055940). | CI PASS; QA Safari/P2P pendiente |
| 2026-11-04 · auditoría | Se consolidaron ocho causas raíz de fallos de CI y su cadena de reparación. | Commit `a257429c728ffcd1f53720776692ef58d0000871`; [CI 41869336972](https://github.com/alexandermaulen/Dirtyfingaz-ZP/actions/runs/41869336972). | CI PASS |
| 2026-11-04 · colaboración | Se añadió política de agentes/modelos/conectores con escritura limitada a ramas de feature, sin secretos, producción ni Supabase. | Commit `653569f0c318408dc9527a857ee17ee1fbedbd2e`; [CI 41870648909](https://github.com/alexandermaulen/Dirtyfingaz-ZP/actions/runs/41870648909); [.github/agent-policy.json](https://github.com/alexandermaulen/Dirtyfingaz-ZP/blob/feat/hybrid-hardware-ui-system/.github/agent-policy.json). | CI PASS; política declarativa |
| 2026-11-04 · cronología | Se crea este registro como fuente compacta para recuperar el estado y viajar por hitos. | Este archivo y su página espejo en Notion. | En curso |

### Nota sobre main y PR

GitHub registra que el PR #3 fue fusionado previamente en `main`, con merge commit `53b9151b96979da980bd446fa7dbb9f3c3cf3886`. Esta bitácora no atribuye esa fusión a esta intervención. Desde la autorización actual, `main` queda fuera de alcance: no se harán escrituras, merges ni actualizaciones de referencias.

## 2. Cronograma de trabajo pendiente

El cronograma es por hitos y dependencias, no una promesa de fechas calendario. Cada fase se cierra sólo con evidencia.

| Orden | Fase | Trabajo | Criterio de salida | Estado |
|---|---|---|---|---|
| P0 | Control de cambios | Mantener ramas `feat/*`, CI obligatorio, política de agentes y revisión de PR. | Cambios aislados y trazables; `main` intacta. | Parcial: política declarada, reglas GitHub de protección inexistentes |
| P1 | Contrato GUI ↔ motor | Auditar comandos, requestId, ACK/error, origen/ventana, estados visibles y controles táctiles. | Pruebas de contrato para todos los comandos y sin regresiones. | Pendiente |
| P2 | Audio / Radio Grid | Verificar bus master real, fallback de micrófono, permisos, autoplay, reconexión y WebRTC entre dos dispositivos. | Prueba de ida y vuelta documentada en Safari y segundo dispositivo. | Pendiente |
| P3 | Proyectos / storage | Probar crear, guardar, cargar, importar, exportar y borrar; aislamiento de samples y trim por projectId. | Matriz de persistencia superada después de recargar. | Pendiente |
| P4 | Render | Probar WAV/MP3 completo en Safari: duración, canales, sample rate, bit depth, efectos y descarga. | Archivos reproducibles y parámetros verificados. | Pendiente |
| P5 | Responsive / PWA | iPhone 11 en adelante: viewport, safe areas, orientación, instalación, caché y modo offline. | Checklist físico aprobado. | Pendiente |
| P6 | Cloudflare preview | Verificar cuenta/Worker objetivo y habilitar despliegue exclusivamente de preview con credenciales limitadas. | URL de preview del SHA exacto y logs de deploy PASS. | Bloqueado por autorización de conexión/credenciales |
| P7 | Backend futuro | Diseñar identidad, proyectos, assets, salas, RLS y migraciones sólo si se aprueba un backend propio para ZP. | Arquitectura y permisos aprobados antes de DDL. | En espera; no tocar `dirtyfingaz-os` |

## 3. Panel de nivel de contexto

Este panel mide la **calidad de la información disponible para retomar el proyecto**, no la memoria interna del modelo ni el porcentaje de código terminado.

| Dimensión | Evidencia actual | Nivel |
|---|---|---|
| Código y rama | HEAD y rama consultados directamente en GitHub. | Alto |
| CI | Run 41870648909 terminó SUCCESS para el HEAD 653569f. | Alto |
| Arquitectura / incidencias | Auditoría con mapa GUI-motor y ocho causas raíz. | Alto |
| Decisiones y diseño | Notion contiene especificaciones y decisiones, aunque algunas secciones históricas pueden estar desactualizadas. | Alto, requiere sincronización |
| Preview Cloudflare | URL histórica conocida; no se verificó un deploy nuevo para el HEAD actual. | Parcial |
| QA en dispositivos | Safari/iPhone 11 y prueba P2P real pendientes. | Bajo |

**Lectura del contexto:** alto para continuar trabajo de código y diagnóstico estático; parcial para afirmar despliegue; insuficiente para certificar experiencia real en iPhone, render completo y colaboración P2P.

### Fuentes de verdad y precedencia

1. GitHub: código, ramas, commits y ejecuciones CI.
2. Esta línea de tiempo: secuencia compacta de hitos y estado del contexto.
3. Notion: decisiones, especificaciones y planificación.
4. Cloudflare: sólo una URL y un despliegue comprobados pueden confirmar preview.
5. QA físico: evidencia explícita de Safari/dispositivo; no se infiere desde CI.

Si dos fuentes discrepan, prevalece la evidencia más reciente consultada directamente. Se registra la discrepancia, no se borra el historial.

## 4. Formato obligatorio para cada nuevo evento

Añadir una entrada con estos campos:

- **Fecha/hora (Chile):**
- **Hito / ID:**
- **Objetivo:**
- **Agente o responsable:**
- **Rama:**
- **Archivos afectados:**
- **Commit SHA:**
- **CI / run:**
- **Preview URL y SHA desplegado:**
- **Pruebas realizadas:**
- **Resultado:** PASS / FAIL / PARCIAL / BLOQUEADO.
- **Pendientes y riesgos:**
- **Nivel de contexto tras el cambio:**

No registrar un deploy, prueba o autorización como completado si no hay evidencia verificable.

## 5. Comandos de recuperación conversacional

Cuando el usuario solicite cualquiera de estas frases, recuperar este archivo y la página Notion, comparar contra GitHub y presentar el estado actualizado:

- **“Muéstrame la línea de tiempo”**: cronología completa y enlaces.
- **“Viaja al hito [nombre/fecha]”**: reconstruir el estado conocido en ese punto, sin confundirlo con HEAD actual.
- **“¿Qué cambió desde [fecha/SHA]?”**: comparar commits, auditoría, CI y tareas.
- **“Nivel de contexto”**: mostrar dimensiones completas, evidencia faltante y confianza de continuidad.
- **“Cronograma pendiente”**: fases abiertas, dependencias y siguiente paso ejecutable.

**Regla permanente:** cada cambio relevante actualiza esta bitácora y su espejo en Notion. Mantener separados GUI y motor; definir contrato antes de tocar ambos. No modificar `main`, no hacer merge y no tocar Supabase.
