/* DIRTYFINGAZ ZP 1 · IndexedDB AssetStorage
   Persists project state and decoded sample buffers without coupling the audio engine.
*/
(function (root) {
  "use strict";
  const DB_NAME = "dirtyfingaz-zp-assets";
  const DB_VERSION = 2;
  const SAMPLE_STORE = "samples";
  const PROJECT_STORE = "projects";
  const PROJECT_SAMPLE_STORE = "projectSamples";
  let dbPromise;

  function open() {
    if (!("indexedDB" in root)) return Promise.reject(new Error("IndexedDB no disponible"));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      const request = root.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function (event) {
        const db = request.result, tx = request.transaction;
        if (!db.objectStoreNames.contains(SAMPLE_STORE)) db.createObjectStore(SAMPLE_STORE, { keyPath: "pad" });
        if (!db.objectStoreNames.contains(PROJECT_STORE)) db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(PROJECT_SAMPLE_STORE)) {
          const projectSamples = db.createObjectStore(PROJECT_SAMPLE_STORE, { keyPath: ["projectId", "pad"] });
          if (event.oldVersion < 2 && db.objectStoreNames.contains(SAMPLE_STORE)) {
            const cursor = tx.objectStore(SAMPLE_STORE).openCursor();
            cursor.onsuccess = function () {
              const item = cursor.result;
              if (!item) return;
              const legacy = item.value;
              projectSamples.put(Object.assign({}, legacy, { projectId: "current" }));
              item.continue();
            };
          }
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { dbPromise = null; reject(request.error || new Error("No se pudo abrir la base local")); };
      request.onblocked = function () { dbPromise = null; reject(new Error("Base local bloqueada por otra pestaña")); };
    });
    return dbPromise;
  }

  function transact(storeName, mode, action) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let result;
        try { result = action(store); } catch (error) { reject(error); return; }
        tx.oncomplete = function () { resolve(result && result.result !== undefined ? result.result : result); };
        tx.onerror = function () { reject(tx.error || new Error("Error de persistencia")); };
        tx.onabort = function () { reject(tx.error || new Error("Transacción cancelada")); };
      });
    });
  }

  function encodeBuffer(buffer, pad, name, range) {
    const channels = [];
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) channels.push(new Float32Array(buffer.getChannelData(ch)));
    return { pad: Number(pad), name: String(name || "SAMPLE").slice(0, 80), sampleRate: buffer.sampleRate, length: buffer.length, channels: channels, range: range || { start: 0, end: 1 }, updatedAt: Date.now() };
  }

  function decodeBuffer(record, audioContext) {
    const channelCount = record.channels.length;
    const buffer = audioContext.createBuffer(channelCount, record.length, record.sampleRate);
    for (let ch = 0; ch < channelCount; ch++) buffer.copyToChannel(new Float32Array(record.channels[ch]), ch);
    return buffer;
  }

  function saveProjectSample(projectId, pad, buffer, name, range) {
    const record = Object.assign({}, encodeBuffer(buffer, pad, name, range), { projectId: String(projectId || "current") });
    return transact(PROJECT_SAMPLE_STORE, "readwrite", function (store) { return store.put(record); });
  }
  function getProjectSamples(projectId) {
    const id = String(projectId || "current");
    return transact(PROJECT_SAMPLE_STORE, "readonly", function (store) { return store.getAll(); })
      .then(function (records) { return records.filter(function (item) { return item.projectId === id; }); });
  }
  function deleteProjectSample(projectId, pad) {
    return transact(PROJECT_SAMPLE_STORE, "readwrite", function (store) { return store.delete([String(projectId || "current"), Number(pad)]); });
  }
  function saveSample(pad, buffer, name, range) { return saveProjectSample("current", pad, buffer, name, range); }
  function getSamples() { return getProjectSamples("current"); }
  function deleteSample(pad) { return deleteProjectSample("current", pad); }
  function saveProject(data, projectId, name) {
    const id = String(projectId || "current"), now = Date.now();
    return transact(PROJECT_STORE, "readwrite", function (store) {
      const request = store.get(id);
      request.onsuccess = function () {
        const previous = request.result;
        store.put({ id: id, name: String(name || previous && previous.name || "Proyecto sin título").slice(0, 80), data: data, createdAt: previous && previous.createdAt || now, updatedAt: now });
      };
      return request;
    });
  }
  function loadProject(projectId) {
    return transact(PROJECT_STORE, "readonly", function (store) { return store.get(String(projectId || "current")); }).then(function (record) { return record ? record.data : null; });
  }
  function listProjects() {
    return transact(PROJECT_STORE, "readonly", function (store) { return store.getAll(); }).then(function (items) {
      return items.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); }).map(function (item) {
        return { id: item.id, name: item.name || "Proyecto sin título", updatedAt: item.updatedAt || 0 };
      });
    });
  }
  function deleteProject(projectId) {
    const id = String(projectId || "");
    if (!id || id === "current") return Promise.reject(new Error("No se puede eliminar el proyecto de recuperación"));
    return Promise.all([
      transact(PROJECT_STORE, "readwrite", function (store) { return store.delete(id); }),
      getProjectSamples(id).then(function (items) {
        return Promise.all(items.map(function (item) { return deleteProjectSample(id, item.pad); }));
      })
    ]);
  }

  root.DirtyfingazStorage = Object.freeze({
    open: open,
    saveSample: saveSample,
    getSamples: getSamples,
    deleteSample: deleteSample,
    saveProjectSample: saveProjectSample,
    getProjectSamples: getProjectSamples,
    deleteProjectSample: deleteProjectSample,
    saveProject: saveProject,
    loadProject: loadProject,
    listProjects: listProjects,
    deleteProject: deleteProject,
    decodeBuffer: decodeBuffer,
    version: "2.0.0"
  });
})(window);
