# DIRTYFINGAZ ZP · Control Context and Port Identity

Status: specification only; runtime wiring pending. GUI-engine contract: v1.

## Purpose
CTRL 1, CTRL 2 and CTRL 3 become context-aware controls. Their mapping follows the selected pad, instrument, pattern, editor or panel. Their identity remains stable while the visible label and parameter assignment change.

## Identity model
| Layer | Canonical ID | Meaning |
|---|---|---|
| Control identity | CTRL-01 / CTRL-02 / CTRL-03 | Stable logical control |
| GUI port | ZP.PORT.CTRL.01 / .02 / .03 | Stable connection point |
| Assignment | ZP.MAP.CTRL.01 / .02 / .03 | Current parameter mapping |
| Selection context | projectId + bankId + padId + targetType | Selected object |
| Parameter | sample.pitch, filter.cutoff, amp.attack | Parameter schema key |
| Engine command | Existing allowlisted command | Request to authoritative engine |

Visible labels may read CTRL 1 · SAMPLE PITCH. Never use the visible label as a primary key.

## Context snapshot
Include schemaVersion, app, surface, module, panel, controlId, portId, assignmentId, projectId, bankId, padId, selectedTargetId, targetType, parameter key/label/value/default/min/max/step/unit, owner, existing command, protocolVersion and context revision. Do not invent missing values; use null and explain why.

## Initial mapping proposal
| Context | CTRL-01 | CTRL-02 | CTRL-03 |
|---|---|---|---|
| Sample pad | Pitch | Start | End |
| Synth pad | Cutoff | Resonance | Amp Attack |
| Piano Roll note | Pitch | Velocity | Length |
| Pattern / pad | Tune | Decay | Pan |
| FX target | Drive / amount | Time / rate | Mix |
| Master | Volume | Width | Output |

This is a proposed profile, not hard-coded behavior. The active parameter schema in zp-agent-registry.json is authoritative. Activate a mapping only when the parameter has a valid owner, range, default, unit and command/handler.

## Gesture contract
- Rotate: adjust the active assignment with normalized, clamped values.
- Triple tap: reset only the active mapped parameter to its schema default. Never reset the entire pad, project, sample or pattern.
- Hold for 3000 ms: open the contextual agent with a frozen context snapshot.
- Cancel hold on early release, pointer cancellation or movement beyond a defined drag threshold.
- A long press must not count as a tap. Add accessible keyboard alternatives.
- Opening the agent creates a proposal workflow; it never executes code or changes source files automatically.

## Reset semantics
Read the default from the parameter registry. Send only an existing allowlisted command through GUI-engine v1. Wait for engine ACK before reflecting the confirmed value. If no default or command exists, disable reset and explain why.

## Pad communication
Publish a GUI context-change event whenever project, bank, pad, instrument, note, effect or panel selection changes. Resolve active parameter mappings from this context. The engine remains authoritative for audio parameter values; GUI may keep transient gesture state only.

## Change request
Every agent request includes context snapshot, user intent, output type, proposed files, dependencies, risks and validation plan. See CHANGE-REQUEST-PROTOCOL.md.

## Acceptance tests
1. Selecting another pad updates all three labels and mappings.
2. Sample and synth pads resolve different schemas.
3. Rotation changes only the mapped parameter.
4. Triple tap restores only the mapped parameter's registry default.
5. A 3-second hold opens the agent once with the correct selected context.
6. Early release does not open the agent.
7. Context changes while editing do not mutate the frozen request snapshot.
8. Missing mappings fail safely with a visible reason.
9. All messages retain protocolVersion 1.
10. No duplicate interactive controls are created.

## Implementation order
1. Audit existing knob DOM and parameter registry.
2. Add stable control/port metadata to existing knobs.
3. Add GUI-only context resolver and label renderer.
4. Add gesture recognition and tests.
5. Add allowlisted reset and ACK handling.
6. Add agent request workflow.
7. Test mobile Safari and run node scripts/validate.mjs.

Do not modify creator-engine.html unless an existing command is proven insufficient. If a new engine capability is unavoidable, define its v1 payload and paired tests first.
