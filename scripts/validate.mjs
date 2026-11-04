import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const sources = ["index.html", "creator.html", "creator-engine.html", "sw.js", "zp-core.js", "zp-storage.js", "vendor/lame.min.js"];
let inlineScripts = 0;

for (const path of sources) {
  const source = read(path);
  if (path.endsWith(".html")) {
    let cursor = 0;
    while ((cursor = source.indexOf("<script", cursor)) !== -1) {
      const tagEnd = source.indexOf(">", cursor);
      const close = source.indexOf("</script>", tagEnd + 1);
      if (tagEnd < 0 || close < 0) throw new Error("Etiqueta script incompleta en " + path);
      const attributes = source.slice(cursor, tagEnd);
      const code = source.slice(tagEnd + 1, close);
      if (!attributes.includes("src=")) {
        new Function(code);
        inlineScripts++;
      }
      cursor = close + 9;
    }
  } else {
    new Function(source);
  }
}

const ui = read("creator.html");
const engine = read("creator-engine.html");
const shell = read("index.html");
const storage = read("zp-storage.js");
const radioWorker = read("radio-worker.mjs");
const wrangler = JSON.parse(read("wrangler.jsonc"));
new Function(radioWorker.replace(/^export class /gm, "class ").replace(/^export default /gm, "const __default = "));
const commands = [...engine.matchAll(/runtime\.register\(["']([^"']+)/g)].map((match) => match[1]);
const custom = ["creator.sample.load.request", "creator.pad.select", "creator.sample.trim.target.toggle", "creator.sample.trim.set", "creator.control.set"];
const sent = [...ui.matchAll(/zpBridgeSend\(["']([^"']+)/g)].map((match) => match[1]);
const missing = [...new Set(sent)].filter((command) => !commands.includes(command) && !custom.includes(command));

assert.match(ui, /repeat\(16,minmax\(0,1fr\)\)/, "La GUI debe mostrar 16 pasos");
assert.match(ui, /s<=16/);
assert.match(ui, /Math\.min\(15,Number\(cell\.dataset\.s\)\|\|0\)/);
assert.match(ui, /index-17\)\/17/);
assert.match(ui, /zp-engine-playhead/);
assert.match(engine, /type:"zp-engine-playhead"/);
assert.match(ui, /zp-engine-trim-state/);
assert.match(ui, /creator\.sample\.trim\.set/);
assert.match(ui, /trimPointer/);
assert.match(engine, /function publishTrimState\(/);
assert.match(engine, /payload\.commit&&samples\[activePad\]/);
assert.match(engine, /new window\.lamejs\.Mp3Encoder/);
assert.match(engine, /function makeWavBlob/);
assert.match(engine, /function renderAudio/);
assert.match(engine, /creator\.export\.render/);
assert.match(engine, /createConvolver\(\)/);
assert.match(engine, /fxState=\{drive:false,delay:false,filter:false,reverb:false\}/);
assert.match(read("sw.js"), /\.\/vendor\/lame\.min\.js/);
assert.match(radioWorker, /class RadioRoom/);
assert.match(radioWorker, /type: "presence"/);
assert.match(radioWorker, /type: "signal"/);
assert.equal(wrangler.main, "./radio-worker.mjs");
assert.ok(wrangler.durable_objects.bindings.some(binding => binding.name === "RADIO_ROOMS" && binding.class_name === "RadioRoom"));
assert.equal(wrangler.exports.RadioRoom.type, "durable-object");
assert.equal(wrangler.exports.RadioRoom.storage, "sqlite");
assert.match(shell, /new WebSocket\(url\)/);
assert.match(shell, /new RTCPeerConnection/);
assert.match(shell, /getUserMedia/);



assert.match(ui, /protocolVersion:1/);
assert.match(ui, /requestId/);
assert.match(engine, /packet\.protocolVersion!==1/);
assert.match(engine, /zp-engine-ack/);
assert.match(engine, /zp-engine-error/);
assert.match(shell, /e\.source!==frame\?\.contentWindow/);
assert.match(shell, /e\.data\?\.source!=='creator\.engine'/);
assert.match(engine, /source:"creator\.engine"/);
assert.match(engine, /saveProjectSample\(currentProjectId,n,slice,sampleNames\[n\],ranges\[n\]\)/);
assert.match(engine, /saveProjectSample\(currentProjectId,activePad,samples\[activePad\],sampleNames\[activePad\],ranges\[activePad\]\)/);
assert.match(engine, /projectDialog\.querySelector\("#zp-project-name"\)\.value=currentProjectName/);

assert.match(storage, /DB_VERSION = 2/);
for (const api of ["saveProjectSample", "getProjectSamples", "listProjects", "deleteProject"]) {
  assert.ok(storage.includes("function " + api), "Storage API faltante: " + api);
}
for (const command of ["creator.project.manager.open", "creator.project.create", "creator.project.load", "creator.project.delete"]) {
  assert.ok(commands.includes(command), "Handler faltante: " + command);
}
assert.deepEqual(missing, [], "Comandos de GUI sin handler o ruta directa");
console.log("OK: sintaxis de " + sources.length + " archivos y " + inlineScripts + " scripts inline.");
console.log("OK: bridge GUI/motor, handlers y APIs de proyectos.");
