const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function cleanText(value, max = 40) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

export class RadioRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      if (request.method !== "GET") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
      return json({
        ok: true,
        service: "DIRTYFINGAZ ZP RadioRoom",
        version: "1.0.1",
        environment: this.env?.ENVIRONMENT || "unknown",
        services: {
          assets: Boolean(this.env?.ASSETS),
          radio: Boolean(this.env?.RADIO_ROOMS),
          agent: this.env?.ENVIRONMENT === "preview" && this.env?.AI_AGENT_ENABLED === "true" && Boolean(this.env?.AI)
        }
      });
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return json({ ok: false, error: "WEBSOCKET_REQUIRED" }, 426);
    }

    const origin = request.headers.get("Origin");
    if (origin) {
      try {
        if (new URL(origin).origin !== url.origin) return json({ ok: false, error: "ORIGIN_DENIED" }, 403);
      } catch {
        return json({ ok: false, error: "INVALID_ORIGIN" }, 403);
      }
    }

    const name = cleanText(url.searchParams.get("name"), 32) || "INVITADO";
    const role = url.searchParams.get("role") === "collaborator" ? "collaborator" : "spectator";
    const clientId = crypto.randomUUID();
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const meta = { clientId, name, role, joinedAt: Date.now() };

    this.state.acceptWebSocket(server, [clientId]);
    server.serializeAttachment(meta);

    const peers = this.state.getWebSockets()
      .filter(socket => socket !== server)
      .map(socket => socket.deserializeAttachment())
      .filter(Boolean);

    const roomState = await this.state.storage.get("roomState");
    server.send(JSON.stringify({ type: "welcome", roomId: url.pathname.split("/").pop(), self: meta, peers, roomState: roomState || null }));
    this.broadcast({ type: "peer-joined", peer: meta }, server);
    this.broadcastPresence();

    return new Response(null, { status: 101, webSocket: client });
  }

  sockets() {
    return this.state.getWebSockets();
  }

  broadcast(message, except = null) {
    const payload = JSON.stringify(message);
    for (const socket of this.sockets()) {
      if (socket === except) continue;
      try { socket.send(payload); } catch { /* socket is already closing */ }
    }
  }

  broadcastPresence() {
    const members = this.sockets().map(socket => socket.deserializeAttachment()).filter(Boolean);
    this.broadcast({
      type: "presence",
      count: members.length,
      collaborators: members.filter(member => member.role === "collaborator").length,
      spectators: members.filter(member => member.role === "spectator").length,
      members: members.map(({ clientId, name, role }) => ({ clientId, name, role }))
    });
  }

  async webSocketMessage(socket, rawMessage) {
    if (typeof rawMessage !== "string" || rawMessage.length > 65536) return;
    let message;
    try { message = JSON.parse(rawMessage); } catch { return; }
    const self = socket.deserializeAttachment();
    if (!self || !message || typeof message.type !== "string") return;

    if (message.type === "signal") {
      const targetId = cleanText(message.to, 64);
      if (!targetId || !message.signal || typeof message.signal !== "object") return;
      const target = this.sockets().find(peer => {
        const meta = peer.deserializeAttachment();
        return meta && meta.clientId === targetId;
      });
      if (target) {
        try { target.send(JSON.stringify({ type: "signal", from: self.clientId, signal: message.signal })); } catch { /* peer left */ }
      }
      return;
    }

    if (message.type === "chat") {
      if (self.role !== "collaborator") return;
      const text = cleanText(message.text, 280);
      if (text) this.broadcast({ type: "chat", from: self.clientId, name: self.name, text, at: Date.now() });
      return;
    }

    if (message.type === "room-state" && self.role === "collaborator") {
      const state = message.state && typeof message.state === "object" ? message.state : {};
      await this.state.storage.put("roomState", state);
      this.broadcast({ type: "room-state", from: self.clientId, state, at: Date.now() }, socket);
    }
  }

  webSocketClose(socket, code, reason) {
    const self = socket.deserializeAttachment();
    if (self) this.broadcast({ type: "peer-left", clientId: self.clientId, name: self.name, code, reason: cleanText(reason, 80) }, socket);
    this.broadcastPresence();
  }

  webSocketError(socket) {
    const self = socket.deserializeAttachment();
    if (self) this.broadcast({ type: "peer-left", clientId: self.clientId, name: self.name }, socket);
    this.broadcastPresence();
  }
}

const agentRate = new Map();
const AGENT_MODEL = "@cf/openai/gpt-oss-20b";
const AGENT_SYSTEM = [
  "Eres DIRTYFINGAZ ZP Copilot, asistente técnico integrado en una estación de producción musical.",
  "Responde siempre en español, con precisión y orientado a la tarea.",
  "Usa el contexto de interfaz recibido como evidencia; si un dato no existe, dilo. Nunca inventes controles, estados ni resultados.",
  "Conoces GUI, pads, secuenciador de 16 pasos, Piano Roll MIDI, Sample Editor, trim IN/OUT, FX, proyectos, exportación y Radio Grid.",
  "La GUI y el motor están separados. La GUI comunica eventos; el motor ejecuta audio y estado. Respeta el bridge versionado.",
  "Cloudflare coordina API y sesiones; Supabase será persistencia estructurada cuando se apruebe su esquema y RLS.",
  "Puedes recomendar acciones locales registradas, pero no afirmes que las ejecutaste. La interfaz solicita aprobación y valida la allowlist.",
  "No solicites ni expongas secretos, tokens, claves ni datos personales. No sugieras editar main, fusionar o desplegar producción.",
  "Para cambios de código, propone un plan y un diff verificable; no inventes que GitHub fue modificado.",
  "Actúas como copiloto de arquitectura y desarrollo de DIRTYFINGAZ ZP. Al retomar una sesión reconstruye rama, SHA, archivos, CI, preview, auditoría y tareas pendientes con evidencia disponible; no inventes continuidad.",
  "La fuente de verdad de controles y parámetros es zp-agent-registry.json. Usa el parámetro seleccionado y su definición JSON para explicar rango, unidad, propietario, comando, payload y dependencias. Si no existe en el registro, declara que falta registrarlo.",
  "Para recomendar bibliotecas DAW móviles, consulta la base de conocimiento MOBILE-DAW-LIBRARY-GUIDE.md incluida en el contexto. Prioriza APIs nativas y módulos existentes; compara licencia, soporte Safari iOS, costo de CPU/memoria y solapamiento. No recomiendes Tone.js como reemplazo del motor ZP ni WEB MIDI como función nativa disponible en Safari iOS.",
  "El contrato de arquitectura es: creator.html = GUI y selección; creator-engine.html = audio, scheduler y estado autoritativo; zp-core.js = utilidades/runtime; zp-storage.js = IndexedDB y aislamiento de proyectos; radio-worker.mjs = API contextual y Radio Grid; sw.js = caché offline; scripts/validate.mjs = contratos y pruebas estáticas.",
  "Toda función que cruce GUI y motor requiere contrato explícito, protocolo versionado, requestId, ACK/error, timeout, validación de payload y prueba en ambos lados. No dupliques estado del motor en la GUI.",
  "Al recomendar configuración, indica valor actual observado, rango permitido, valor propuesto, motivo, impacto audible/visual, dependencias y forma de revertir. Distingue valor observado, inferencia y recomendación.",
  "Al componer código, genera bloques separados para JSON, GUI, bridge, engine y validator. Incluye rutas reales, nombres de comandos, validación, límites, ACK/error, persistencia y pruebas. No mezcles snippets de capas distintas.",
  "Nunca uses eval, Function, ejecución arbitraria, acceso libre al repositorio ni comandos no registrados. Los snippets son propuestas para revisión; los cambios de código deben validarse antes de integrarse.",
  "Para aplicar parámetros en vivo, usa únicamente comandos y parámetros presentes en zp-agent-registry.json y confirma que el motor respondió ACK. No afirmes que un cambio se aplicó sólo porque se envió.",
  "El usuario autorizó explícitamente editar el repositorio, validar, fusionar y desplegar cambios del proyecto. Mantén los cambios trazables, conserva los contratos GUI/motor y no expongas secretos."
].join("\n");

async function handleAgentChat(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  if (env.ENVIRONMENT !== "preview" || env.AI_AGENT_ENABLED !== "true") {
    return json({ ok: false, error: "AGENT_PREVIEW_ONLY" }, 404);
  }
  if (!env.AI || typeof env.AI.run !== "function") {
    return json({ ok: false, error: "AI_BINDING_MISSING" }, 503);
  }
  const origin = request.headers.get("Origin");
  const requestUrl = new URL(request.url);
  try {
    if (!origin || new URL(origin).origin !== requestUrl.origin) {
      return json({ ok: false, error: "ORIGIN_DENIED" }, 403);
    }
  } catch {
    return json({ ok: false, error: "ORIGIN_DENIED" }, 403);
  }
  const ip = request.headers.get("CF-Connecting-IP") || "preview-client";
  const now = Date.now();
  const bucket = agentRate.get(ip);
  if (bucket && now - bucket.start < 60000 && bucket.count >= 12) {
    return json({ ok: false, error: "RATE_LIMITED" }, 429);
  }
  if (!bucket || now - bucket.start >= 60000) agentRate.set(ip, { start: now, count: 1 });
  else bucket.count++;
  if (Number(request.headers.get("Content-Length") || 0) > 18000) return json({ ok: false, error: "PAYLOAD_TOO_LARGE" }, 413);
  const raw = await request.text();
  if (raw.length > 18000) return json({ ok: false, error: "PAYLOAD_TOO_LARGE" }, 413);
  let input;
  try { input = JSON.parse(raw); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
  const message = cleanText(input?.message, 2000);
  if (!message) return json({ ok: false, error: "MESSAGE_REQUIRED" }, 400);
  const rawContext = input.context && typeof input.context === "object" ? input.context : {};
  let registry = null;
  let mobileDawKnowledge = "";
  try {
    const registryResponse = await env.ASSETS.fetch(new Request(new URL("/zp-agent-registry.json", requestUrl.origin)));
    if (registryResponse.ok) registry = await registryResponse.json();
  } catch {}
  try {
    const knowledgeResponse = await env.ASSETS.fetch(new Request(new URL("/docs/agent/MOBILE-DAW-LIBRARY-GUIDE.md", requestUrl.origin)));
    if (knowledgeResponse.ok) mobileDawKnowledge = (await knowledgeResponse.text()).slice(0, 9000);
  } catch {}
  const parameterKey = cleanText(rawContext.parameterKey, 80);
  const selectedParameter = Array.isArray(registry?.parameters) ? registry.parameters.find(item => item.key === parameterKey) || null : null;
  const rawParameterValue = Number(rawContext.parameterValue);
  const selectedControl = registry?.controls?.[cleanText(rawContext.control, 60)] || null;
  const context = {
    app: cleanText(rawContext.app, 60),
    module: cleanText(rawContext.module, 40),
    surface: cleanText(rawContext.surface, 60),
    control: cleanText(rawContext.control, 60),
    label: cleanText(rawContext.label, 90),
    parameterKey,
    parameterValue: Number.isFinite(rawParameterValue) && selectedParameter ? Math.max(Number(selectedParameter.min ?? 0), Math.min(Number(selectedParameter.max ?? 1), rawParameterValue)) : null,
    selectedParameter,
    selectedControl,
    padId: rawContext.padId !== null && rawContext.padId !== undefined && rawContext.padId !== "" && Number.isFinite(Number(rawContext.padId)) ? Math.max(1, Math.min(9, Number(rawContext.padId))) : null,
    bank: ["A", "B", "C", "D"].includes(rawContext.bank) ? rawContext.bank : null,
    bpm: rawContext.bpm !== null && rawContext.bpm !== undefined && rawContext.bpm !== "" && Number.isFinite(Number(rawContext.bpm)) ? Math.max(40, Math.min(240, Number(rawContext.bpm))) : null,
    projectId: cleanText(rawContext.projectId, 80),
    projectName: cleanText(rawContext.projectName, 80),
    trimTarget: ["start", "end"].includes(rawContext.trimTarget) ? rawContext.trimTarget : null,
    midiTarget: ["step", "pitch", "length", "velocity"].includes(rawContext.midiTarget) ? rawContext.midiTarget : null,
    transport: cleanText(rawContext.transport, 24),
    agentVersion: cleanText(rawContext.agentVersion, 20),
    workflow: cleanText(rawContext.workflow, 60),
    registryVersion: cleanText(registry?.version, 20),
    projectContext: registry?.project || null
  };
  const history = Array.isArray(input.history) ? input.history.slice(-8).filter(item =>
    item && ["user", "assistant"].includes(item.role) && typeof item.content === "string"
  ).map(item => ({ role: item.role, content: cleanText(item.content, 1200) })) : [];
  const messages = [
    { role: "system", content: AGENT_SYSTEM },
    { role: "system", content: "Contexto actual de la app (datos observados): " + JSON.stringify(context) },
    ...(mobileDawKnowledge ? [{ role: "system", content: "Base de conocimiento de bibliotecas DAW móviles para DIRTYFINGAZ ZP (referencia técnica; no instalar dependencias sin aprobación):\\n" + mobileDawKnowledge }] : []),
    ...history,
    { role: "user", content: message }
  ];
  try {
    const result = await env.AI.run(AGENT_MODEL, { messages, max_tokens: 1000, temperature: 0.2 });
    const reply = typeof result?.response === "string" ? result.response :
      typeof result?.choices?.[0]?.message?.content === "string" ? result.choices[0].message.content : "";
    if (!reply) return json({ ok: false, error: "EMPTY_MODEL_RESPONSE" }, 502);
    return json({ ok: true, reply, model: AGENT_MODEL, usage: result?.usage || null });
  } catch (error) {
    console.error("ZP agent inference failed:", error?.message || "unknown");
    return json({ ok: false, error: "AI_UPSTREAM_FAILED" }, 502);
  }
}

async function handleGithubStatus(request, env) {
  if (request.method !== "GET") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  if (env.ENVIRONMENT !== "preview") return json({ ok: false, error: "PREVIEW_ONLY" }, 404);
  const owner = "alexandermaulen", repo = "Dirtyfingaz-ZP", branch = "main";
  const base = "https://api.github.com/repos/" + owner + "/" + repo;
  const headers = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "DIRTYFINGAZ-ZP-Agent" };
  const read = async path => {
    const response = await fetch(base + path, { headers });
    if (!response.ok) throw new Error("GITHUB_API_" + response.status);
    return response.json();
  };
  const [repository, branchData, pullRequest, workflows] = await Promise.allSettled([
    read(""),
    read("/branches/" + encodeURIComponent(branch)),
    read("/pulls/6"),
    read("/actions/runs?branch=" + encodeURIComponent(branch) + "&per_page=5")
  ]);
  const value = (result, fallback = null) => result.status === "fulfilled" ? result.value : fallback;
  const repoData = value(repository), branchValue = value(branchData), pr = value(pullRequest), runs = value(workflows);
  if (!repoData && !branchValue) return json({ ok: false, error: "GITHUB_READ_FAILED" }, 502);
  const commit = branchValue?.commit || {};
  return json({
    ok: true,
    repository: repoData ? { full_name: repoData.full_name, visibility: repoData.private ? "private" : "public", default_branch: repoData.default_branch, html_url: repoData.html_url } : null,
    branch: branchValue ? { name: branchValue.name, sha: commit.sha, commitMessage: commit.commit?.message?.split("\n")[0] || "", committedAt: commit.commit?.committer?.date || null, html_url: commit.html_url } : null,
    pullRequest: pr ? { number: pr.number, title: pr.title, state: pr.state, draft: pr.draft, html_url: pr.html_url, head_sha: pr.head?.sha, base: pr.base?.ref } : null,
    workflowRuns: (runs?.workflow_runs || []).map(run => ({ name: run.name, status: run.status, conclusion: run.conclusion, head_sha: run.head_sha, html_url: run.html_url, created_at: run.created_at })),
    partial: [repository, branchData, pullRequest, workflows].some(result => result.status === "rejected"),
    access: "read-only",
    source: "GitHub REST API"
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/creator/health") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
      }
      const payload = {
        ok: true,
        service: "DIRTYFINGAZ ZP Creator",
        version: "1.0.2",
        environment: env.ENVIRONMENT || "unknown",
        services: {
          assets: Boolean(env.ASSETS),
          radio: Boolean(env.RADIO_ROOMS),
          agent: env.ENVIRONMENT === "preview" && env.AI_AGENT_ENABLED === "true" && Boolean(env.AI)
        }
      };
      return request.method === "HEAD"
        ? new Response(null, { status: 200, headers: JSON_HEADERS })
        : json(payload);
    }
    if (url.pathname === "/api/agent/health") {
      const enabled = env.ENVIRONMENT === "preview" && env.AI_AGENT_ENABLED === "true" && !!env.AI;
      return json({ ok: enabled, enabled, model: AGENT_MODEL, environment: env.ENVIRONMENT || "unknown" });
    }
    if (url.pathname === "/api/agent/chat") return handleAgentChat(request, env);
    if (url.pathname === "/api/agent/github/status") return handleGithubStatus(request, env);
    if (url.pathname.startsWith("/api/agent/")) return json({ ok: false, error: "NOT_FOUND" }, 404);

    if (url.pathname === "/api/radio/health") {
      return json({ ok: true, service: "DIRTYFINGAZ ZP Radio Grid", realtime: "durable-object-websocket", version: 1 });
    }

    const match = url.pathname.match(/^\/api\/radio\/rooms\/([a-z0-9-]{2,48})$/i);
    if (match) {
      if (request.method !== "GET") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
      if (!env.RADIO_ROOMS) return json({ ok: false, error: "RADIO_ROOMS_BINDING_MISSING" }, 503);
      const id = env.RADIO_ROOMS.idFromName(match[1].toLowerCase());
      return env.RADIO_ROOMS.get(id).fetch(request);
    }

    if (url.pathname.startsWith("/api/radio/")) return json({ ok: false, error: "NOT_FOUND" }, 404);
    return env.ASSETS.fetch(request);
  }
};
