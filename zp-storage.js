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
  const DEFAULT_PROJECT_ID = "zp1-default";
  let dbPromise;

  function open() {
    if (!("indexedDB" in root)) return Promise.reject(new Error("IndexedDB no disponible"));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      const request = root.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains(SAMPLE_STORE)) db.createObjectStore(SAMPLE_STORE, { keyPath: "pad" });
        if (!db.objectStoreNames.contains(PROJECT_STORE)) db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(PROJECT_SAMPLE_STORE)) db.createObjectStore(PROJECT_SAMPLE_STORE, { keyPath: "id" });
        if (db.objectStoreNames.contains(SAMPLE_STORE)) { const legacy=request.transaction.objectStore(SAMPLE_STORE), cursorRequest=legacy.openCursor(); cursorRequest.onsuccess=function(){const cursor=cursorRequest.result;if(!cursor)return;const item=cursor.value;request.transaction.objectStore(PROJECT_SAMPLE_STORE).put(Object.assign({},item,{id:DEFAULT_PROJECT_ID+":"+Number(item.pad),projectId:DEFAULT_PROJECT_ID}));cursor.continue();}; }
        if (db.objectStoreNames.contains(PROJECT_STORE)) { const projects=request.transaction.objectStore(PROJECT_STORE), oldProject=projects.get("current"); oldProject.onsuccess=function(){if(oldProject.result){const target=projects.get(DEFAULT_PROJECT_ID);target.onsuccess=function(){if(!target.result){const copy=oldProject.result;copy.id=DEFAULT_PROJECT_ID;projects.put(copy);}};}}; }
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

  function sampleId(projectId, pad) { return String(projectId || DEFAULT_PROJECT_ID) + ":" + Number(pad); }
  function saveSample(pad, buffer, name, range, projectId) {
    const pid = String(projectId || DEFAULT_PROJECT_ID), record = encodeBuffer(buffer, pad, name, range);
    record.id = sampleId(pid, pad); record.projectId = pid;
    return transact(PROJECT_SAMPLE_STORE, "readwrite", function (store) { return store.put(record); });
  }
  function getSamples(projectId) {
    const pid = String(projectId || DEFAULT_PROJECT_ID);
    return transact(PROJECT_SAMPLE_STORE, "readonly", function (store) { return store.getAll(); })
      .then(function (records) { return records.filter(function (item) { return item.projectId === pid; }); });
  }
  function deleteSample(pad, projectId) {
    return transact(PROJECT_SAMPLE_STORE, "readwrite", function (store) { return store.delete(sampleId(projectId, pad)); });
  }
  function saveProject(data, projectId) {
    const pid = String(projectId || DEFAULT_PROJECT_ID);
    return transact(PROJECT_STORE, "readwrite", function (store) { return store.put({ id: pid, data: data, updatedAt: Date.now() }); });
  }
  function loadProject(projectId) {
    const pid = String(projectId || DEFAULT_PROJECT_ID);
    return transact(PROJECT_STORE, "readonly", function (store) { return store.get(pid); }).then(function (record) { return record ? record.data : null; });
  }

  root.DirtyfingazStorage = Object.freeze({
    open: open,
    saveSample: saveSample,
    getSamples: getSamples,
    deleteSample: deleteSample,
    saveProject: saveProject,
    loadProject: loadProject,
    decodeBuffer: decodeBuffer,
    version: "2.0.0"
  });
})(window);
