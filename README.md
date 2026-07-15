# Kaltura Conversational Avatar — Demo & Admin Panel

React + Vite demo for Kaltura's Conversational Avatar APIs
(<https://docs.kaltura.com/models/documentations/avatar/conversational-apis/>), with a
side-by-side comparison of the two integration modes, an admin panel exposing every
documented option, and structured error logging for the streaming sessions.

## Run it

```bash
cp .env.example .env   # fill in Kaltura credentials (see below)
npm install
npm run dev            # web on :5173, API proxy on :8787
```

## What's inside

### Demo page
Two panels against the same published avatar flow:

- **Socket SDK** — Socket.IO control plane + WebRTC/WHEP media. Full event stream,
  typed errors, mic control, `sendText`, DPP injection on `ready`.
- **Iframe SDK** — sandboxed embed, coarse postMessage events, DPP injection on
  `showing-agent` (+500ms per the docs).

Until a flow has its Client ID / Flow ID configured, panels run a **mock adapter**
that simulates the documented lifecycle, transcript, and error codes through the
exact same adapter + logging pipeline — including on-demand error simulation
(1003, 2004, 4002, 5003).

> **SDK scripts** default to the official embed SDK builds
> (`github.com/kaltura/conversational-avatar-embed-sdk` via jsDelivr, pinned
> `@2.7.4`; both UMD bundles expose `window.KalturaAvatarSDK`). Paste a flow's
> Client ID + Flow ID in the admin panel and the demo panels go live — the
> script URLs only need changing for a custom deployment.

### Admin panel
- **Conversational flows** — registry of your published flows (there is no public
  list endpoint for flows; they live in Kaltura Studio).
- **SDK settings** — every documented constructor option per flow: connection/reconnect,
  media & mic constraints, GenUI, endpoint & TURN overrides, Iframe SDK config, and a
  Dynamic Page Prompt (DPP) editor with JSON validation.
- **VOD avatar templates** — the 36 presenter templates via `avatarTemplate/list`,
  background configuration (`color` / `library` / `entry`), avatar creation via
  `avatar/upsert`, and PNG previews via `avatar/preview`.

### Server proxy (`server/index.mjs`)
Keeps Kaltura credentials out of the browser:

- `POST /api/avatars/templates` → `avatarTemplate/list`
- `POST /api/avatars/upsert` → `avatar/upsert`
- `GET  /api/avatars/:id/preview` → `avatar/preview` (PNG)
- `POST /api/logs` → collects client streaming logs into `logs/client-streaming.log`

Auth: set `KALTURA_KS` directly, **or** set `KALTURA_PARTNER_ID` + `KALTURA_ADMIN_SECRET`
and the proxy mints an admin KS via `session.start` (cached, auto re-minted on 401/403).
With no credentials the template gallery serves the documented fallback list so the UI
still works end-to-end.

### Error logging (`src/logging/logger.ts`)
- Every SDK event is logged with `sessionId` + `flowId` correlation.
- Lifecycle events feed a **breadcrumb ring buffer**; error entries carry the trail
  that led to them.
- Typed SDK errors map `recoverable → warn` (auto-reconnect handles it) and
  `fatal → error`.
- Batches ship to `/api/logs` every 5s; `navigator.sendBeacon` flushes on `pagehide`
  so a closed tab doesn't lose the batch.

## Region

VOD endpoints default to US East (`nvp1`); set `KALTURA_REGION` to `irp2`, `frp2`,
`cap2`, `sgp2`, or `syp2` for other regions. Conversational endpoints are US-hosted
(`*.avatar.us.kaltura.ai`) and configurable per flow in the admin panel.
