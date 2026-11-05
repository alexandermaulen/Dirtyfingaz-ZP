# DIRTYFINGAZ ZP · Agent Change Request Protocol

Status: specification only; runtime integration pending. GUI-engine v1 remains unchanged.

## Lifecycle
captured → drafted → validated → exported / copied → reviewed → implemented → tested.
Terminal alternatives: rejected, cancelled or blocked. Creating a request is not permission to apply it.

## Request file
Suggested filename: ZP-REQ-<date>-<short-id>.json
Schema: dirtyfingaz.zp.change-request.v1

Required fields:
- schema, requestId, createdAt, status, intent
- outputType: diagnosis | prompt | code | implementation-plan
- contextSnapshot
- target: controlId, portId, assignmentId, panelId, targetId
- selection: projectId, bankId, padId, targetType
- parameter: key, currentValue, defaultValue, min, max, step, unit
- architecture: guiOwner, engineOwner, storageOwner, workerOwner, protocolVersion
- constraints: branch, protectedFiles, noProductionDeploy, noUnreviewedEngineChanges
- expectedResult, affectedFiles, dependencies, risks, validationPlan
- generatedPrompt or generatedCode (optional)
- approval: required, approvedBy, approvedAt

Never include credentials, access tokens, personal data or audio sample contents.

## Context snapshot
Capture the context when the agent opens. Keep it immutable for that request. If project, bank, pad or panel changes, show a context-changed notice and offer to refresh the snapshot.

## Output modes
- Diagnosis: current behavior, expected behavior, evidence and missing information. No code.
- Prompt: exact scope, files, GUI/engine separation, protocol constraints, acceptance criteria and validation commands.
- Code: bounded proposal with path, insertion/replacement location, dependencies and tests. Never execute eval or write source silently.
- Implementation plan: split GUI, engine, bridge, registry, storage and tests; include order, dependencies and rollback point.

## Repository coordination
- Work only on feat/hybrid-hardware-ui-system.
- Never write to main, merge, publish or deploy without explicit approval.
- Inspect branch head and files before editing.
- Show a diff/proposal before modifying existing code.
- Preserve GUI-engine v1; do not invent commands or handlers.
- Keep GUI, engine, storage and worker ownership explicit.
- Run node scripts/validate.mjs and report exact output.
- If validation cannot run, say so.

## Export strategy
First implementation should export a JSON request to the user's device or copy it to clipboard. Browser code must not assume it can write directly into the Git repository. A reviewed request may be committed under docs/agent/requests/ only after explicit approval. Do not auto-commit exploratory requests.

## Acceptance
- Hold captures selected control and pad context.
- User can choose diagnosis, prompt, code or implementation plan.
- JSON validates and can be exported/copied.
- Holding a knob never modifies source code.
- Agent lists proposed files and reasons.
- Stale context is detected before generating an implementation prompt.
