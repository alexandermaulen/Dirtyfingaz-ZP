import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const sources = ["index.html", "creator.html", "creator-engine.html", "sw.js", "zp-core.js", "zp-storage.js", "vendor/lame.min.js", "zp-agent.js", "zp-layout.js"];
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

const agent = read("zp-agent.js");
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
assert.match(ui, /data-trim-target="start"/, "IN debe poder seleccionarse directamente.");
assert.match(ui, /data-trim-target="end"/, "OUT debe poder seleccionarse directamente.");
assert.match(ui, /const selectTrimTarget=marker/, "La selección IN/OUT debe activar el rotor maestro.");
assert.match(ui, /state\.active=window\.__zpTrimPhase===1;state\.target=activeTrimTarget/, "La selección de IN/OUT debe activar el rotor en fase 1.");
assert.match(ui, /fineStep=\.00005/, "El rotor debe conservar el ajuste fino incremental.");
assert.match(ui, /commit:true/, "El trim debe persistirse al soltar el rotor.");

assert.match(ui, /creator\.sample\.trim\.set/);
assert.match(ui, /trimPointer/);
assert.match(ui, /__zpTrimRotor/, "El estado del rotor de recorte debe existir.");
assert.match(ui, /fineStep=\.00005/, "Push Enter debe ajustar IN/OUT con resolución fina.");
assert.match(ui, /lx\.dataset\.rotor='Lx'/, "Lx debe identificarse como encoder de navegación.");
assert.match(ui, /pe\.dataset\.rotor='Rx'/, "Rx debe conservar su identidad como encoder contextual.");
assert.match(ui, /const selector='\.b,\.piano-tools button,\.trim-marker/, "Lx debe recorrer herramientas y funciones visibles.");
assert.match(ui, /choose\(direction\)/, "Lx debe cambiar el control enfocado por pasos.");
assert.match(read("zp-agent-registry.json"), /"Lx"/);
assert.match(read("zp-agent-registry.json"), /"Rx"/);
assert.match(agent, /el\.dataset\.rotor==="Lx"/, "El agente debe reconocer Lx como navegación.");
assert.match(agent, /el\.dataset\.rotor==="Rx"/, "El agente debe reconocer Rx como PUSH ENTER.");
assert.match(radioWorker, /selectedControl/, "El backend debe recibir la definición del encoder seleccionado.");

assert.match(ui, /creator\.sample\.trim\.set.*commit:true/, "El rotor debe confirmar la persistencia del recorte.");
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
assert.match(ui, /piano-zoom/, "Los controles +/- del Piano Roll deben estar agrupados.");
assert.match(ui, /zpNudge/, "Debe existir el modo de movimiento MIDI con rotor.");
assert.match(ui, /e\.shiftKey\|\|freeMove/, "SHIFT debe habilitar movimiento MIDI sin cuantización.");
assert.match(ui, /zpLongVelocity/, "La pulsación larga debe abrir herramientas MIDI.");
assert.match(ui, /longPressTimer=setTimeout[\s\S]{0,250},2000\)/, "Las herramientas MIDI deben abrirse tras dos segundos.");
assert.match(ui, /step%2===0/, "El barrido táctil de patrones debe marcar pasos alternos.");
assert.match(ui, /animatePianoPlayhead/, "El playhead debe interpolarse entre pasos.");
assert.match(ui, /data-midi-target="step"/, "El rotor debe permitir mover la nota por pasos.");
assert.match(ui, /data-midi-target="pitch"/, "El rotor debe permitir mover la nota por tono.");
assert.match(ui, /data-midi-target="length"/, "El rotor debe permitir cambiar la duración.");
assert.match(ui, /piano-free-cursor/, "El modo libre debe mostrar un cursor táctil.");
assert.match(ui, /zpNoteInfo/, "Las herramientas deben exponer información MIDI contextual.");
assert.match(ui, /paintPadMidi/, "La selección de pad debe resaltar sus notas MIDI.");
assert.match(ui, /__zpMidiRotorActive/, "El rotor maestro debe cambiar de FX a edición MIDI en modo libre.");

assert.match(ui, /zp-engine-piano-state/);
assert.match(engine, /micro:Math\.max\(0,Math\.min\(\.999,Number\(input\.micro\)\|\|0\)\)/, "El motor debe persistir microtiming.");
assert.match(engine, /scheduledAt\+\(Math\.max\(0,Math\.min\(\.999,Number\(note\.micro\)\|\|0\)\)\*beat\)/, "El scheduler debe respetar el microtiming.");


const agentCss = read("zp-agent.css");
const agentRegistry = JSON.parse(read("zp-agent-registry.json"));
assert.equal(agentRegistry.version, "1.0.0", "Debe existir una versión explícita del registro JSON.");
assert.ok(agentRegistry.project?.handoff?.parallelTracks, "El registro debe contener contexto para retomar el desarrollo.");
assert.ok(agentRegistry.parameters.some(item => item.key === "trim.start" && item.command === "creator.sample.trim.set"), "IN debe tener comando de motor registrado.");
assert.ok(agentRegistry.parameters.some(item => item.key === "trim.end" && item.command === "creator.sample.trim.set"), "OUT debe tener comando de motor registrado.");
assert.match(agentCss, /opacity:\.2/, "El agente debe quedar al 20% de opacidad en reposo.");
assert.match(agentCss, /zpAgentTargetPulse/, "El control seleccionado debe tener brillo contextual.");
assert.match(agentCss, /touch-action:none/, "Arrastre y resize deben usar gestos táctiles dedicados.");

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
assert.match(agent, /fetch\("\/api\/agent\/chat"/, "El agente debe usar únicamente el endpoint contextual del Worker.");
assert.doesNotMatch(agent, /new\s+WebSocket\s*\(|\beval\s*\(/, "El cliente no debe abrir sockets propios ni ejecutar código arbitrario.");
assert.match(radioWorker, /\/api\/agent\/chat/);
assert.match(radioWorker, /AGENT_PREVIEW_ONLY/);
assert.match(radioWorker, /env\.AI\.run\(AGENT_MODEL/);
assert.equal(wrangler.vars.AI_AGENT_ENABLED, "false", "La IA debe permanecer apagada en producción.");
assert.equal(wrangler.previews.vars.AI_AGENT_ENABLED, "true", "La IA debe habilitarse sólo en Preview.");
assert.equal(wrangler.previews.ai.binding, "AI");
assert.match(ui, /zp-agent\.css/);
assert.match(ui, /zp-agent\.js/);
assert.match(ui, /shiftControl\?\.classList\.contains\("lit"\)/, "SHIFT + PAD debe abrir configuración contextual.");
assert.match(ui, /pad\.dataset\.padId=String\(i\+1\)/, "Cada pad debe exponer su identidad al agente.");
assert.match(ui, /data-pad-action="mute"/);
assert.match(ui, /zp-agent-runtime-context/);
assert.match(engine, /project:\{id:currentProjectId,name:currentProjectName\}/);
assert.match(agent, /zp-agent-runtime-context/);
assert.match(agent, /zp-agent-registry\.json/, "El agente debe cargar el registro JSON de parámetros.");
assert.match(agent, /parameterKeyFor/, "El agente debe identificar el parámetro seleccionado.");
assert.match(agent, /zp-agent-target-active/, "El parámetro seleccionado debe resaltarse en la GUI.");
assert.match(agent, /zp-agent-param-apply/, "El inspector debe ofrecer aplicación de parámetros permitidos.");
assert.match(agent, /data-code-template="engine"/, "El agente debe incluir composición de código ENGINE.");
assert.match(agent, /data-code-template="bridge"/, "El agente debe incluir composición de código BRIDGE.");
assert.match(agent, /data-code-template="test"/, "El agente debe incluir composición de pruebas.");
assert.match(agent, /autoCloseMs:AUTO_CLOSE_MS/);
assert.match(read("zp-agent-registry.json"), /"version": "1\.0\.0"/);
assert.match(read("zp-agent-registry.json"), /"key": "trim\.start"/);
assert.match(read("zp-agent-registry.json"), /"key": "midi\.velocity"/);
assert.match(radioWorker, /selectedParameter/);
assert.match(radioWorker, /zp-agent-registry\.json/);
assert.match(read("sw.js"), /dirtyfingaz-zp-shell-v12/);
assert.match(read("sw.js"), /zp-agent-registry\.json/);

assert.match(read("sw.js"), /\.\/zp-agent\.js/);

// Encoders laterales adaptativos: montaje GUI, fallback informativo y registro.
assert.match(ui, /\$\('\.mid'\)\.append\(lx\)/, "Lx debe montarse en el contenedor maestro del Creator.");
assert.match(ui, /\$\('\.mid'\)\.append\(pe\)/, "Rx debe montarse en el contenedor maestro del Creator.");
assert.match(ui, /row\('repeat\(6,1fr\)'/, "La fila principal debe liberar el espacio de los encoders laterales.");
assert.match(ui, /window\.__zpLxTarget=el/, "Lx debe publicar el destino seleccionado para Rx.");
assert.match(ui, /mode:'context-scroll'/, "Rx debe desplazar el contenedor contextual cuando no hay edición activa.");
assert.match(ui, /window\.__zpTrimRotor\?\.active\|\|window\.__zpMidiRotorActive/, "El scroll contextual no debe interferir con trim ni MIDI.");
assert.match(agentCss, /\.lx,\.rx\{position:absolute;touch-action:none/, "Lx y Rx deben conservar posicionamiento táctil independiente.");
assert.equal(agentRegistry.layout.encoderPlacement, "sides");
assert.equal(agentRegistry.layout.behavior, "adaptive");
assert.equal(agentRegistry.layout.spacing, "compact");
assert.equal(agentRegistry.layout.mount.Lx, ".mid>.lx");
assert.equal(agentRegistry.layout.mount.Rx, ".mid>.rx");
assert.equal(agentRegistry.controls.Lx.adaptive, true);
assert.equal(agentRegistry.controls.Rx.adaptive, true);
assert.equal(agentRegistry.panelSystem.presentation, "hybrid");
assert.equal(agentRegistry.panelSystem.activation, "hold");
assert.equal(agentRegistry.panelSystem.dock, "side");
assert.deepEqual(agentRegistry.panelSystem.panels.left.map(x=>x.id), ["L1x","L2x","L3x"]);
assert.deepEqual(agentRegistry.panelSystem.panels.right.map(x=>x.id), ["R1x","R2x","R3x"]);
// Runtime adaptive-panel behavior is a pending implementation requirement.
// Keep its approved registry contract validated here; add runtime assertions
// in the same change that implements the GUI/engine integration.


console.log("OK: agente contextual local, allowlist y assets PWA.");
console.log("OK: Piano Roll MIDI, edición de notas, reproducción y persistencia.");
console.log("OK: sintaxis de " + sources.length + " archivos y " + inlineScripts + " scripts inline.");
console.log("OK: bridge GUI/motor, handlers y APIs de proyectos.");

 
// START/END three-phase interaction contract.
assert.match(ui,/window\.__zpTrimPhase=1/);
assert.match(ui,/function setTrimPhase\(phase\)/);
assert.match(ui,/trim-phase-led/);
assert.match(ui,/trimPointers=new Map\(\)/);
assert.match(ui,/window\.__zpTrimPhase===2/);
assert.match(ui,/window\.__zpTrimPhase===3/);
assert.match(ui,/bindTrimEncoder\(lx,"start"\)/);
assert.match(ui,/bindTrimEncoder\(valueEncoder,"end"\)/);
assert.equal(agentRegistry.trimControl.phases["1"].touch,"single-target");
assert.equal(agentRegistry.trimControl.phases["2"].touch,"dual-independent");
assert.equal(agentRegistry.trimControl.phases["3"].encoder.Lx,"trim.start");
assert.equal(agentRegistry.trimControl.phases["3"].encoder.Rx,"trim.end");

 

// Contextual encoders: Lx left rail activation and IN Sample-only control.
assert.ok(ui.includes("knob in-encoder"));
assert.ok(ui.includes("sample-context:not(.piano-open)"));
assert.ok(ui.includes("midContainer.classList.toggle('sample-context',!scr.classList.contains('pr'))"));
assert.ok(ui.includes("setLxContext(!!window.__zpPianoEncoderMode)"));
assert.ok(ui.includes('zpBridgeSend("creator.sample.trim.set",{target:"start"'));
assert.equal(agentRegistry.controls.IN.role, "sample-start-encoder");
assert.equal(agentRegistry.controls.IN.command, "creator.sample.trim.set");
assert.equal(agentRegistry.controls.IN.payload.target, "start");
assert.deepEqual(agentRegistry.controls.IN.visibility.hideWhen, ["pattern-edit", "piano-open"]);
assert.equal(agentRegistry.controls.Lx.placement, "left-side-rail");
assert.equal(agentRegistry.controls.Lx.activation.default, "inactive");
assert.equal(agentRegistry.controls.Lx.role, "master-left-navigation");
assert.equal(agentRegistry.controls.Rx.role, "master-right-output");
assert.equal(agentRegistry.controls.Rx.sampleMapping.payload.target, "end");
assert.equal(agentRegistry.controls.Rx.master, true);



// DIRTYFINGAZ ZP · Questionnaire panel/profile implementation
const layoutSystem = read("zp-layout.js");
assert.match(ui, /zp-layout\.css/, "Creator debe cargar el sistema de paneles.");
assert.match(ui, /zp-layout\.js/, "Creator debe cargar el controlador de layout.");
assert.match(layoutSystem, /HOLD_MS=420/, "Los paneles deben respetar el hold de 420 ms.");
assert.match(layoutSystem, /zp-panel-option-select/, "Las opciones contextuales deben emitir un evento tipado.");
assert.match(layoutSystem, /STORE_KEY="dirtyfingaz-zp-layout-v1"/, "Los perfiles deben persistir localmente.");
assert.match(layoutSystem, /EDIT LAYOUT/, "Debe existir el modo EDIT LAYOUT.");
assert.match(layoutSystem, /DRAG \/ RESIZE BLOQUEADOS/, "La geometría debe esperar la política del Cuestionario 20.");
assert.match(layoutSystem, /AUTOSAVE|DUPLICATE|RENAME|DELETE|RESTORE DEFAULT/, "Deben existir operaciones de perfiles.");
assert.match(shell, /zp-panel-option-select/, "El shell debe validar y retransmitir selecciones del iframe.");
assert.match(read("sw.js"), /dirtyfingaz-zp-shell-v12/);
assert.match(read("sw.js"), /zp-layout\.js/);
console.log("OK: paneles contextuales, perfiles híbridos y EDIT LAYOUT con CM20 protegido.");

assert.equal(agentRegistry.layoutPolicy.status, "pending-user-decision");
assert.equal(agentRegistry.layoutPolicy.geometryEditingEnabled, false);
assert.equal(agentRegistry.layoutPolicy.questionnaire, "CM20");
assert.equal(agentRegistry.layoutProfiles.persistence, "HYBRID");
assert.equal(agentRegistry.layoutProfiles.moduleChange, "LOAD_DEFAULT");
assert.deepEqual(agentRegistry.layoutProfiles.types, ["DEFAULT", "CUSTOM"]);
assert.doesNotMatch(layoutSystem, /zpBridgeSend\\s*\\(/, "Los paneles no deben ejecutar comandos musicales directamente.");
assert.match(layoutSystem, /contextNow\\(\\)===\"pattern\"/);
assert.match(layoutSystem, /contextNow\\(\\)===\"piano\"/);


assert.match(layoutSystem, /schemaVersion:1/);
assert.match(layoutSystem, /requestId/);
assert.match(shell, /data.requestId!==data.payload\?\.requestId/);
