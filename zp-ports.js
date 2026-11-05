/* DIRTYFINGAZ ZP · Service Ports v1
 * Local-first adapters. UI and AudioEngine never depend on vendor SDKs.
 * Supabase stays dormant until an authenticated identity + RLS schema exist.
 */
(function (root) {
  "use strict";

  const VERSION = "1.0.0";
  const PROJECT_METHODS = [
    "open", "saveSample", "getSamples", "deleteSample",
    "saveProjectSample", "getProjectSamples", "deleteProjectSample",
    "saveProject", "loadProject", "listProjects", "deleteProject",
    "decodeBuffer"
  ];

  function portError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function createPorts(options) {
    const config = options || {};
    const storage = config.storage || root.DirtyfingazStorage;
    const request = config.fetch || (root.fetch && root.fetch.bind(root));
    const locationRef = config.location || root.location;
    if (!storage) throw portError("STORAGE_PORT_MISSING", "IndexedDB AssetStorage no está disponible.");

    const projects = {};
    PROJECT_METHODS.forEach(function (method) {
      if (typeof storage[method] === "function") {
        projects[method] = storage[method].bind(storage);
      }
    });
    ["saveProject", "loadProject", "listProjects", "deleteProject", "saveProjectSample", "getProjectSamples", "deleteProjectSample", "decodeBuffer"].forEach(function (method) {
      if (typeof projects[method] !== "function") {
        throw portError("STORAGE_CONTRACT_INVALID", "AssetStorage no implementa " + method + ".");
      }
    });
    projects.mode = "local-first";
    projects.provider = "indexeddb";
    projects.version = VERSION;

    const worker = Object.freeze({
      health: async function () {
        if (typeof request !== "function" || !locationRef || !locationRef.origin) {
          throw portError("NETWORK_UNAVAILABLE", "No hay transporte HTTP disponible.");
        }
        const response = await request(new URL("/api/creator/health", locationRef.origin), {
          method: "GET",
          headers: { "Accept": "application/json" },
          credentials: "same-origin"
        });
        if (!response.ok) throw portError("WORKER_UNAVAILABLE", "Worker respondió HTTP " + response.status + ".");
        return response.json();
      }
    });

    const supabaseConfig = config.supabase || root.DIRTYFINGAZ_CONFIG && root.DIRTYFINGAZ_CONFIG.supabase || {};
    const supabase = Object.freeze({
      configured: Boolean(supabaseConfig.url && supabaseConfig.publishableKey),
      request: async function (path, init) {
        if (!supabaseConfig.url || !supabaseConfig.publishableKey) {
          throw portError("SUPABASE_NOT_CONFIGURED", "El puerto Supabase está desconectado; IndexedDB continúa operativo.");
        }
        if (!supabaseConfig.accessToken) {
          throw portError("AUTH_REQUIRED", "Se requiere una sesión autenticada antes de acceder a datos remotos.");
        }
        const normalizedPath = String(path || "");
        if (!normalizedPath.startsWith("/rest/v1/")) {
          throw portError("INVALID_SUPABASE_PATH", "El puerto sólo permite rutas REST de PostgREST.");
        }
        if (typeof request !== "function") throw portError("NETWORK_UNAVAILABLE", "No hay transporte HTTP disponible.");
        const base = String(supabaseConfig.url).replace(/\/+$/, "");
        const headers = new Headers(init && init.headers || {});
        headers.set("apikey", supabaseConfig.publishableKey);
        headers.set("Authorization", "Bearer " + supabaseConfig.accessToken);
        headers.set("Accept", "application/json");
        return request(base + normalizedPath, Object.assign({}, init || {}, {
          headers: headers,
          credentials: "omit"
        }));
      }
    });

    return Object.freeze({
      version: VERSION,
      projects: Object.freeze(projects),
      worker: worker,
      supabase: supabase,
      status: function () {
        return Object.freeze({
          projects: "ready",
          projectProvider: "indexeddb",
          strategy: "local-first",
          worker: "on-demand",
          supabase: supabase.configured ? "configured-auth-required" : "disconnected",
          remoteProjectSync: "disabled-until-identity-and-rls"
        });
      }
    });
  }

  root.DirtyfingazPorts = Object.freeze({
    create: createPorts,
    version: VERSION
  });
})(window);
