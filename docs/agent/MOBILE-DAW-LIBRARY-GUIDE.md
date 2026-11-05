# DIRTYFINGAZ ZP · Mobile DAW Development Library Guide

Status: curated technical knowledge for the contextual agent. Target: mobile-first web DAW, Safari iOS and Android. Evaluate libraries as isolated capabilities; do not replace the existing audio engine by default.

## Current ZP context
- 9-pad × 16-step sequencer.
- Sample pads, IN/OUT trim and waveform editor.
- Piano Roll with MIDI note editing and microtiming.
- Web Audio engine: creator-engine.html.
- GUI and interaction: creator.html.
- GUI-engine bridge protocol v1.
- IndexedDB persistence: zp-storage.js.
- Agent and parameter registry: zp-agent.js and zp-agent-registry.json.
- Cloudflare Worker / Radio Grid.
- Existing WAV and MP3 export paths.

The agent must inspect existing implementation before suggesting a library and avoid duplicate functionality.

## Curated library catalogue

### Tone.js
Docs: https://tonejs.github.io/docs/
Repo: https://github.com/Tonejs/Tone.js
License: MIT.
Use: optional musical utilities, synthesis prototypes, musical-time abstractions, effects experiments and sample-accurate scheduling.
ZP decision: do not replace the custom engine or scheduler. Consider only an isolated prototype/adapter sharing the existing AudioContext safely. Never create a competing AudioContext or Transport.
Mobile note: start/resume audio from a user gesture; test iOS foreground/background interruptions.

### wavesurfer.js
Docs: https://wavesurfer.xyz/
Repo: https://github.com/katspaugh/wavesurfer.js
License: BSD-3-Clause.
Use: waveform visualization, region overlays, timeline, minimap, envelope and spectrogram UI.
ZP decision: current sample editor already has waveform and trim behavior. Do not replace without profiling and feature-gap analysis. Consider only a comparison prototype. Engine remains owner of sample buffer and IN/OUT values.
Mobile note: test touch dragging, pinch/zoom, large files, decoded peak memory and synchronization with engine trim state.

### @tonejs/midi
Docs/repo: https://github.com/Tonejs/Midi
License: MIT.
Use: parse and write Standard MIDI Files, tracks, notes, tempo, time signatures and control changes.
ZP decision: strong candidate for MIDI import/export adapter around existing Piano Roll model. Convert to internal note schema; do not make it owner of note state or scheduler.
Mobile note: test file input, large MIDI files, tempo maps and round-trip import/export.

### Meyda
Docs: https://meyda.js.org/
Repo: https://github.com/meyda/meyda
License: MIT.
Use: audio analysis such as RMS, energy, spectral centroid, spectral flatness, loudness and MFCC.
ZP decision: optional analysis layer for agent diagnostics, visualizer assistance, sample classification or parameter suggestions. Keep it out of the real-time audio-critical path unless profiling proves safe.
Mobile note: bounded analysis windows; avoid expensive continuous extraction on older devices.

### Native Web Audio API / AudioWorklet
Docs: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
AudioWorklet support: https://caniuse.com/wf-audio-worklet
Use: authoritative DSP, audio graph, scheduling primitives and custom processors.
ZP decision: preferred foundation because ZP already uses a custom Web Audio engine. Prefer native APIs and existing engine over adding a framework for simple operations.
Mobile note: compatibility tables list AudioWorklet in iOS Safari from 14.5 onward; real-device QA is still required.

### Web MIDI / WEBMIDI.js
Docs: https://webmidijs.org/docs/getting-started/
Support: https://caniuse.com/midi
Use: external MIDI device input/output where the browser exposes Web MIDI.
ZP decision: optional capability with feature detection and fallback. WEBMIDI.js wraps Web MIDI; it cannot add native support to Safari iOS where the API is unsupported.
Mobile note: do not make external hardware MIDI a required feature for iPhone Safari.

### orDrumbox (reference, not dependency)
Site: https://www.ordrumbox.com/
Project claims MIT license.
Use: UX/product reference for browser drum machine, step sequencing, synthesis, offline PWA and project export.
ZP decision: study ideas only; do not assume its architecture fits ZP.

## ZP library priorities
| Priority | Candidate | Reason |
|---|---|---|
| 1 | Native Web Audio / AudioWorklet | Existing engine; no duplicate audio owner |
| 2 | @tonejs/midi | Focused MIDI file adapter |
| 3 | Meyda | Measurable audio features for agent analysis |
| 4 | wavesurfer.js | Waveform UI reference; existing editor already exists |
| 5 | Tone.js | Useful isolated prototypes; overlaps current synth/effects/scheduler |
| Conditional | WEBMIDI.js | Only on browsers with native Web MIDI |

## Agent knowledge behavior
When a DAW problem is reported:
1. Identify active ZP module and selected target.
2. Inspect current implementation and existing APIs.
3. Match missing capability to this catalogue.
4. Compare license, mobile support, dependency cost, AudioContext ownership and overlap.
5. Recommend native, reuse-existing, prototype-library or do-not-add.
6. List exact ZP files affected.
7. Propose a minimal proof-of-concept and tests before installation.
8. Never add CDN/package dependencies without an approved implementation request.

## Compatibility facts
- Modern Safari iOS supports Web Audio and AudioWorklet; compatibility tables list AudioWorklet from iOS Safari 14.5.
- Web MIDI is not natively supported by Safari on iOS in current compatibility data.
- Browser audio commonly requires an explicit user gesture to start/resume the context.
- Profile waveform decoding, AudioBuffers, FFT analysis and long sessions on an iPhone 11-class device.
- Browser support does not guarantee acceptable mobile UX or performance.

## Sources checked
- https://tonejs.github.io/docs/
- https://github.com/Tonejs/Tone.js
- https://github.com/tonejs/tone.js/wiki/Transport
- https://wavesurfer.xyz/
- https://www.npmjs.com/package/wavesurfer.js
- https://github.com/Tonejs/Midi
- https://meyda.js.org/
- https://github.com/meyda/meyda
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- https://caniuse.com/wf-audio-worklet
- https://caniuse.com/midi
- https://webmidijs.org/docs/getting-started/
- https://www.ordrumbox.com/
