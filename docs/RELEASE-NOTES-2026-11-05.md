# DIRTYFINGAZ ZP · Integration Preview · 2026-11-05

## Changes in this integration

- Lx is the Sample IN master; Rx is the Sample OUT master. The independent ghost IN encoder is removed.
- CTRL 1, CTRL 2 and CTRL 3 control per-PAD Attack, Decay and Release.
- Utility toggles ADR / ADSR. Envelope mode and per-PAD values are included in each local project snapshot.
- PROJECT is the entry point for the LCD system menu. Rx navigates the menu and PUSH ENTER selects.
- The project manager is rendered in the visible Creator UI and exposes create, save, load, delete, import and export.
- GitHub status reads the current integration branch and merged PR #6.
- Preview deployment uses wrangler.preview.jsonc, a separate Worker with AI enabled and no Durable Object namespace binding. Production Worker configuration is unchanged.

## Validation

The branch workflow runs node scripts/validate.mjs before deploying. Visual, audio, Safari/iOS touch, and live Worker behavior still require device-level verification.
