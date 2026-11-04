const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function cleanText(value, max = 40) {
  return String(value || "").replace(/[<>\\u0000-\\u001f]/g, "").trim().slice(0, max);
}

export class RadioRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
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

    server.send(JSON.stringify({ type: "welcome", roomId: url.pathname.split("/").pop(), self: meta, peers }));
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

  webSocketMessage(socket, rawMessage) {
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
      this.broadcast({ type: "room-state", from: self.clientId, state: message.state || {}, at: Date.now() }, socket);
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/radio/health") {
      return json({ ok: true, service: "DIRTYFINGAZ ZP Radio Grid", realtime: "durable-object-websocket", version: 1 });
    }

    const match = url.pathname.match(/^\\/api\\/radio\\/rooms\\/([a-z0-9-]{2,48})$/i);
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
