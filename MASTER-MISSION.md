# DIRTYFINGAZ ZP · MASTER MISSION ANCHOR

**Status:** Authorized and active · 2026-11-05  
**Canonical application:** https://alexandermaulen.github.io/Dirtyfingaz-ZP/  
**Repository:** https://github.com/alexandermaulen/Dirtyfingaz-ZP  
**Production branch:** `main`  
**Single active implementation branch:** `feat/mission-anchor-pages-main`

## Mission statement

DIRTYFINGAZ ZP is the only application in scope. Every implementation task, code change, validation, and release decision in this mission must serve the application published at the canonical GitHub Pages URL. This document is the repository-level source of truth for agents and contributors.

> DIRTYFINGAZ ZP · GitHub Pages · Creator GUI + Audio Engine · una sola fuente de verdad.

## Non-negotiable destination rules

- GitHub Pages is the only production destination.
- `main` is the only publishing branch. `.github/workflows/deploy-pages.yml` deploys it.
- Do not deploy, preview, mirror, or redirect mission work to Cloudflare Workers, alternate hosts, other repositories, or other projects.
- Cloudflare preview workflow is validation-only. No credentials, Wrangler deploy, Worker publishing, routes, or DNS changes are part of this mission.
- Supabase and all other external projects remain out of scope.
- Do not create additional implementation branches for this mission. Continue on `feat/mission-anchor-pages-main` and open/update a PR to `main`.
- No automatic merge. Owner review/approval is required before a PR is merged into `main`.
- Do not delete branches, files, workflows, or historical documentation as part of consolidation without a separate evidence-based review.

## Application architecture

1. `index.html`: application shell and entry point.
2. `creator.html`: Creator GUI, loaded by the shell.
3. `creator-engine.html`: audio engine, loaded by Creator.
4. `zp-core.js` and `zp-storage.js`: core runtime and project persistence.
5. GUI-to-engine communication uses the existing bridge. GUI and engine are separate ownership tracks.

### GUI / engine integration contract

- GUI work owns presentation, controls, layout, and UI state.
- Engine work owns audio runtime, scheduling, command handling, and persistence.
- Any cross-layer change must first state the message contract, payload, source/origin validation, request correlation, ACK/error behavior, and file ownership.
- Do not silently rename commands, message fields, or storage shapes.
- Validate both sides of the bridge after an integrated change.

## Mandatory execution sequence

1. Read this file and `.github/agent-policy.json` before starting.
2. Confirm the task belongs to DIRTYFINGAZ ZP and the canonical Pages application.
3. Inspect the current implementation and tests before editing.
4. Keep changes on `feat/mission-anchor-pages-main`.
5. Make the smallest coherent change; do not refactor unrelated areas.
6. Run `node scripts/validate.mjs` and any relevant focused checks.
7. Review the diff for GUI/engine contract and persistence regressions.
8. Open or update a PR targeting `main`; wait for owner review before merge.
9. After merge, verify the GitHub Pages workflow and canonical URL. Never report deployment success based only on a commit or PR.
10. Record the resulting commit SHA, validation result, and deployment status in the handoff.

## Validation and release

- Static/contract gate: `node scripts/validate.mjs`.
- CI: `.github/workflows/validate.yml` and the mission validation workflow.
- Production release: GitHub Pages workflow on `main` only.
- Safari/iPhone interaction and audio behavior require device QA when affected. Static CI is not proof of device-level behavior.
- Service-worker cache changes must update all corresponding validator expectations and be checked for stale-resource behavior.

## Explicitly out of scope

Cloudflare Worker deployment, Cloudflare production routes/DNS, Supabase schema/data/functions, unrelated repositories, experimental applications, and alternate deployment URLs.

## Current consolidation checkpoint

- Authorization received: 2026-11-05.
- Canonical destination and branch strategy recorded here.
- Mission branch created from `main`.
- No existing branches or application files deleted.
- Declarative agent policy is not a substitute for GitHub rulesets/branch protection. Repository enforcement must be verified separately; never claim a protection rule exists without evidence.
