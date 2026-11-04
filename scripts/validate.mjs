import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const sources = ["index.html", "creator.html", "creator-engine.html", "sw.js", "zp-core.js", "zp-storage.js"];
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
const commands = [...engine.matchAll(/runtime\.register\(["']([^"']+)/g)].map((match) => match[1]);
const custom = ["creator.sample.load.request", "creator.pad.select", "creator.sample.trim.target.toggle", "creator.control.set"];
const sent = [...ui.matchAll(/zpBridgeSend\(["']([^"']+)/g)].map((match) => match[1]);
const missing = [...new Set(sent)].filter((command) => !commands.includes(command) && !custom.includes(command));

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
