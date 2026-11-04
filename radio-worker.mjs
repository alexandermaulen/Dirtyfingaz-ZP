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
    if (url.pathname === "/api/agent/chat") return handleAgentChat(request, env);
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
  "Para cambios de código, propone un plan y un diff verificable; no inventes que GitHub fue modificado."
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
  const raw = await request.text();
  if (raw.length > 18000) return json({ ok: false, error: "PAYLOAD_TOO_LARGE" }, 413);
  let input;
  try { input = JSON.parse(raw); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
  const message = cleanText(input?.message, 2000);
  if (!message) return json({ ok: false, error: "MESSAGE_REQUIRED" }, 400);
  const rawContext = input.context && typeof input.context === "object" ? input.context : {};
  const context = {
    module: cleanText(rawContext.module, 40),
    surface: cleanText(rawContext.surface, 60),
    control: cleanText(rawContext.control, 60),
    label: cleanText(rawContext.label, 90),
    padId: rawContext.padId !== null && rawContext.padId !== undefined && rawContext.padId !== "" && Number.isFinite(Number(rawContext.padId)) ? Math.max(1, Math.min(9, Number(rawContext.padId))) : null,
    bank: ["A", "B", "C", "D"].includes(rawContext.bank) ? rawContext.bank : null,
    bpm: rawContext.bpm !== null && rawContext.bpm !== undefined && rawContext.bpm !== "" && Number.isFinite(Number(rawContext.bpm)) ? Math.max(40, Math.min(240, Number(rawContext.bpm))) : null,
    projectName: cleanText(rawContext.projectName, 80)
  };
  const history = Array.isArray(input.history) ? input.history.slice(-8).filter(item =>
    item && ["user", "assistant"].includes(item.role) && typeof item.content === "string"
  ).map(item => ({ role: item.role, content: cleanText(item.content, 1200) })) : [];
  const messages = [
    { role: "system", content: AGENT_SYSTEM },
    { role: "system", content: "Contexto actual de la app (datos observados): " + JSON.stringify(context) },
    ...history,
    { role: "user", content: message }
  ];
  try {
    const result = await env.AI.run(AGENT_MODEL, { messages, max_tokens: 600, temperature: 0.2 });
    const reply = typeof result?.response === "string" ? result.response :
      typeof result?.choices?.[0]?.message?.content === "string" ? result.choices[0].message.content : "";
    if (!reply) return json({ ok: false, error: "EMPTY_MODEL_RESPONSE" }, 502);
    return json({ ok: true, reply, model: AGENT_MODEL, usage: result?.usage || null });
  } catch (error) {
    console.error("ZP agent inference failed:", error?.message || "unknown");
    return json({ ok: false, error: "AI_UPSTREAM_FAILED" }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/agent/health") {
      return json({ ok: env.ENVIRONMENT === "preview" && !!env.AI, enabled: env.ENVIRONMENT === "preview" && !!env.AI, model: AGENT_MODEL, environment: env.ENVIRONMENT || "unknown" });
    }
    if (url.pathname === "/api/agent/chat") return handleAgentChat(request, env);
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
