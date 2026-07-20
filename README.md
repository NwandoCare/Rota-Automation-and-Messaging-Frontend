# RotaAssist Frontend

Nwando Care's rota review, manual allocation, and WhatsApp change-notification
app. Companion to OneTouch — see `rota-system-design_1.md` for the full system
design (note: the wall-chart and WebSocket sections of that document are
superseded by the simpler design below).

## Stack

Vite · React 19 · TypeScript · TanStack Query (server state) · zustand (unsaved
draft state) · Tailwind CSS v4 · MSW (mock API) · react-router · sonner (toasts)

No WebSocket layer: OneTouch has no webhooks and the backend will not push
events. After every save/send the app refetches via TanStack Query
invalidation.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 — mock API enabled
npm run build      # type-check + production bundle (MSW excluded)
```

Requires Node.js ≥ 20.

## The Rota screen

Form-based allocation (no drag-and-drop):

- **Unassigned shifts panel** — every unassigned visit for the selected
  date/area, each row with time inputs and an add-carer control for quick
  assignment.
- **Client shifts panel** — pick a client from the dropdown to view and edit
  all their shifts for the day: change times, add/remove carers, or cancel
  the visit.
- **Multiple carers per shift** — double-up calls are first-class: assigned
  carers show as removable chips and "+ Add carer" appends another
  (`visit.carer_ids` is an array in the API contract; empty = unassigned).
  Messaging handles the fan-out: added carers get "now covering", removed get
  "no longer covering", kept carers get the time change, and the client's
  message lists every assigned carer.
- All edits are local drafts until the single **Save** (tray shows the pending
  count with per-item undo). Save posts each visit's `version`; per-item
  conflicts come back as `status: "conflict"` and are flagged on the row —
  never silently overwritten.
- After a successful save the messaging modal proposes one WhatsApp message
  per affected carer/client (2×2 template matrix; a visit starting **< 48 h**
  away picks the emergency variant).

## Mock mode vs the real Python backend

The app currently runs against an in-browser mock API (MSW) with **synthetic
data only** — "Carer 12", "Client B7". No real service user or staff data
exists anywhere in this codebase, and none may be added to the mocks.

| File | Role |
|---|---|
| `src/api/types.ts` | **The API contract.** Hand this to the backend team — every request/response shape the frontend expects. |
| `src/mocks/handlers.ts` | Executable spec of the endpoints, incl. per-item conflict behaviour on `POST /changes`. |
| `.env.development` / `.env.production` | `VITE_USE_MOCKS`, `VITE_API_BASE_URL`. |

To switch to the real backend: set `VITE_USE_MOCKS=false` and point
`VITE_API_BASE_URL` at it (the dev server proxies `/api` to
`http://localhost:8000`, see `vite.config.ts`). No feature code changes.

Auth is mocked (`src/features/auth/auth.ts`); implement `GoogleOidcAuth`
behind the same `AuthProvider` interface when the backend's OIDC flow exists.

## Branding

Brand orange `#ef770f` is defined once as the `brand` palette in
`src/index.css` — buttons, active tabs, and focus rings all derive from it.
Logo (`src/assets/nwando-logo-white.png`, dark header) and icon
(`src/assets/nwando-icon.png`, login page + favicon) are the official Nwando
Care assets.

## Where things live

```
src/api/         contract types, fetch client, query keys, hooks
src/lib/         Europe/London date helpers
src/mocks/       seeded synthetic data, in-memory db, MSW handlers
src/features/
  auth/          login page, guard, AuthProvider
  dashboard/     stat cards + profile card
  rota/          RotaPage (client dropdown + shift editing), ShiftRow,
                 draftStore.ts (unsaved edits), DraftTray (single Save)
  messaging/     post-save modal, 2×2 template matrix (templates.ts)
```

The layout is responsive down to 375 px-wide phones: controls stack, dialogs
and the draft tray clamp to the viewport, and shift rows wrap.

## Behaviour notes

- The mock deliberately forces a conflict the first time you save any visit
  whose numeric id is divisible by 13, so the conflict UI is demonstrable.
- Setting a finish time at or before the start time (non-overnight) shows a
  warning toast but does not hard-block — coordinators may be mid-edit.
- Mock data regenerates identically on every reload (seeded PRNG); in-session
  saves persist until refresh.
