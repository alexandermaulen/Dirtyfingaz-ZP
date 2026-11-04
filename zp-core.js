/* DIRTYFINGAZ ZP 1 · Core Runtime Contract v1
   Framework-free command bus and adapter boundary.
   Domain modules register commands; UI adapters dispatch serializable payloads.
*/
(function (root) {
  "use strict";
  function createRuntime(options) {
    const moduleName = options && options.module ? options.module : "app";
    const commands = new Map();
    const listeners = new Map();
    let sequence = 0;

    function emit(type, detail) {
      const handlers = listeners.get(type);
      if (!handlers) return;
      handlers.forEach(function (handler) {
        try { handler(detail); } catch (error) {
          setTimeout(function () { throw error; }, 0);
        }
      });
    }

    function on(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
      return function unsubscribe() {
        const set = listeners.get(type);
        if (set) {
          set.delete(handler);
          if (!set.size) listeners.delete(type);
        }
      };
    }

    function register(type, handler) {
      if (typeof type !== "string" || !type || typeof handler !== "function") {
        throw new TypeError("Comando inválido");
      }
      if (commands.has(type)) throw new Error("Comando duplicado: " + type);
      commands.set(type, handler);
      return function unregister() { commands.delete(type); };
    }

    function execute(type, payload) {
      const handler = commands.get(type);
      const requestId = moduleName + "-" + (++sequence);
      const command = {
        type: type,
        source: moduleName + ".adapter",
        requestId: requestId,
        timestamp: Date.now(),
        payload: payload && typeof payload === "object" ? payload : {}
      };
      if (!handler) {
        const missing = { ok: false, error: { code: "NOT_FOUND", message: "Comando no registrado: " + type, source: moduleName + ".core" }, requestId: requestId };
        emit("command:failed", { command: command, result: missing });
        return missing;
      }
      emit("command:requested", command);
      try {
        const value = handler(command.payload, command);
        if (value && typeof value.then === "function") {
          return value.then(function (data) {
            const result = { ok: true, data: data === undefined ? null : data, requestId: requestId };
            emit("command:completed", { command: command, result: result });
            return result;
          }).catch(function (error) {
            const result = { ok: false, error: { code: error.code || "CORE_ERROR", message: error.message || "Error de ejecución", source: moduleName + ".core" }, requestId: requestId };
            emit("command:failed", { command: command, result: result });
            return result;
          });
        }
        const result = { ok: true, data: value === undefined ? null : value, requestId: requestId };
        emit("command:completed", { command: command, result: result });
        return result;
      } catch (error) {
        const result = { ok: false, error: { code: error.code || "CORE_ERROR", message: error.message || "Error de ejecución", source: moduleName + ".core" }, requestId: requestId };
        emit("command:failed", { command: command, result: result });
        return result;
      }
    }

    return Object.freeze({ on: on, register: register, execute: execute, has: function (type) { return commands.has(type); }, list: function () { return Array.from(commands.keys()); } });
  }
  root.DirtyfingazCore = Object.freeze({ createRuntime: createRuntime, version: "1.0.0" });
})(window);
