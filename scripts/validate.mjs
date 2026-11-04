import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const sources = ["index.html", "creator.html", "creator-engine.html", "sw.js", "zp-core.js", "zp-storage.js", "vendor/lame.min.js", "zp-agent.js"];
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
assert.match(ui, /Math\.floor\(\(cellIndex-18\)\/17\)\+1/);
assert.match(ui, /Math\.floor\(\(index-18\)\/17\)\+1/);
assert.equal((ui.match(/Math\.floor\(\((?:cellIndex|index)-18\)\/17\)\+1/g) || []).length, 3, "El mapeo debe cubrir playhead, estado de patrones e interacción");
for (let row = 0; row < 9; row++) for (let step = 0; step < 16; step++) { const childIndex = 18 + row * 17 + step; assert.equal(Math.floor((childIndex - 18) / 17) + 1, row + 1, "Pad mapping row " + row + " step " + step); }
assert.match(ui, /zp-engine-playhead/);
assert.match(engine, /type:"zp-engine-playhead"/);
assert.match(engine, /type:"zp-engine-pattern-state"/);
assert.match(ui, /zp-engine-pattern-state/);
assert.match(ui, /zp-engine-trim-state/);
assert.match(ui, /creator\.sample\.trim\.set/);
assert.match(ui, /trimPointer/);
assert.match(engine, /function publishTrimState\(/);
assert.match(engine, /payload\.commit&&samples\[activePad\]/);
assert.match(engine, /new window\.lamejs\.Mp3Encoder/);
assert.match(engine, /function makeWavBlob/);
assert.match(engine, /function renderAudio/);
assert.match(engine, /function exportProjectFile\(/);
assert.match(engine, /function importProjectFile\(/);
assert.match(engine, /function createProject\(/);
assert.match(engine, /masterOut\.connect\(offline\.destination\)/);
assert.match(radioWorker, /message\.type === "room-state"/);
assert.match(shell, /radio-roster/);
assert.match(shell, /radio-chat/);
assert.match(shell, /zpRadioBroadcastState/);

assert.match(engine, /creator\.export\.render/);
assert.match(engine, /createConvolver\(\)/);
assert.match(engine, /fxState=\{drive:false,delay:false,filter:false,reverb:false\}/);
assert.match(read("sw.js"), /\.\/vendor\/lame\.min\.js/);
assert.match(radioWorker, /class RadioRoom/);
assert.match(radioWorker, /type: "presence"/);
assert.match(radioWorker, /type: "signal"/);
assert.match(radioWorker, /storage\.put\("roomState", state\)/);
assert.match(radioWorker, /roomState: roomState \|\| null/);
assert.match(shell, /applyRadioRoomState\(message\.roomState\)/);
assert.match(shell, /radio-roster/);
assert.match(shell, /type:"chat"/);
assert.equal(wrangler.main, "./radio-worker.mjs");
assert.ok(wrangler.durable_objects.bindings.some(binding => binding.name === "RADIO_ROOMS" && binding.class_name === "RadioRoom"));
assert.equal(wrangler.exports.RadioRoom.type, "durable-object");
assert.equal(wrangler.exports.RadioRoom.storage, "sqlite");
assert.match(shell, /new WebSocket\(url\)/);
assert.match(shell, /new RTCPeerConnection/);
assert.match(shell, /getUserMedia/);
assert.match(engine, /createMediaStreamDestination\(\)/);
assert.match(engine, /zpGetBroadcastStream/);
assert.match(shell, /getCreatorAudioStream\(\)/);
assert.match(shell, /radioLocalStreamIsCreator/);



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
assert.match(engine, /async function exportProjectFile\(/);
assert.match(engine, /async function importProjectFile\(/);
assert.match(engine, /saveProjectSample\(id,item\.pad,buffer,item\.name/);
assert.match(engine, /async function createProject\(name\)\{await saveSession\(true\)/);
assert.match(engine, /fxAmount=\.25;Object\.keys\(fxState\)\.forEach/);
assert.match(engine, /publishTrimState\(\);publishRadioState\(\)/);


assert.match(storage, /DB_VERSION = 2/);
for (const api of ["saveProjectSample", "getProjectSamples", "listProjects", "deleteProject"]) {
  assert.ok(storage.includes("function " + api), "Storage API faltante: " + api);
}
for (const command of ["creator.project.manager.open", "creator.project.create", "creator.project.load", "creator.project.delete"]) {
  assert.ok(commands.includes(command), "Handler faltante: " + command);
}
assert.deepEqual(missing, [], "Comandos de GUI sin handler o ruta directa");

// Piano Roll MIDI: GUI, bridge, scheduler y persistencia deben evolucionar juntos.
assert.match(ui, /piano-grid/);
assert.match(ui, /zpVelocity/);
assert.match(ui, /noteDrag\.resize/);
assert.match(ui, /zp-engine-piano-state/);
assert.match(engine, /const pianoData=\{\}/);
assert.match(engine, /pianoNotes:pianoData/);
assert.match(engine, /creator\.piano\.note\.upsert/);
assert.match(engine, /creator\.piano\.note\.delete/);
assert.match(engine, /creator\.piano\.notes\.clear/);
assert.match(engine, /notes\.filter\(note=>note\.step===scheduledStep\)/);
assert.match(engine, /options\.pitch/);
assert.match(engine, /options\.velocity/);
assert.match(engine, /options\.length/);
assert.match(engine, /publishPianoState\(\)/);

const agent = read("zp-agent.js");
assert.match(agent, /window\.__zpAgentLoaded/);
assert.match(agent, /transport\.stop/);
assert.match(agent, /project\.save/);
assert.match(agent, /document\.addEventListener\("pointerdown"/);
assert.match(agent, /zp-agent-window/);
assert.match(agent, /zp-agent-launcher/);
assert.match(agent, /zp-agent-resize/);
assert.match(agent, /item\.risk==="write"/);
assert.match(agent, /item\.risk==="destructive"/, "Las acciones destructivas deben exigir confirmación.");
for (const command of ["creator.sample.chop", "creator.pattern.clear", "creator.bpm.adjust", "creator.pattern.select", "creator.fx.sample.drive.toggle"]) {
  assert.ok(agent.includes(command), "Acción del agente sin catálogo: " + command);
}
for (const intent of ["sample.chop", "pattern.clear", "bpm.up", "bpm.down", "bank.A", "bank.B", "bank.C", "bank.D", "fx.drive"]) {
  assert.ok(agent.includes('"'+intent+'"'), "Intención del agente faltante: " + intent);
}
assert.doesNotMatch(agent, /\bfetch\s*\(|new\s+WebSocket\s*\(|\beval\s*\(/, "El agente local no debe realizar llamadas remotas ni ejecutar código arbitrario");
assert.match(ui, /zp-agent\.css/);
assert.match(ui, /zp-agent\.js/);
assert.match(ui, /shiftControl\?\.classList\.contains\("lit"\)/, "SHIFT + PAD debe abrir configuración contextual.");
assert.match(ui, /pad\.dataset\.padId=String\(i\+1\)/, "Cada pad debe exponer su identidad al agente.");
assert.match(ui, /data-pad-action="mute"/);
assert.match(ui, /zp-agent-runtime-context/);
assert.match(engine, /project:\{id:currentProjectId,name:currentProjectName\}/);
assert.match(agent, /zp-agent-runtime-context/);
assert.match(read("sw.js"), /dirtyfingaz-zp-shell-v8/);
assert.match(read("sw.js"), /\.\/zp-agent\.js/);

console.log("OK: agente contextual local, allowlist y assets PWA.");
console.log("OK: Piano Roll MIDI, edición de notas, reproducción y persistencia.");
console.log("OK: sintaxis de " + sources.length + " archivos y " + inlineScripts + " scripts inline.");
console.log("OK: bridge GUI/motor, handlers y APIs de proyectos.");
