# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AhaBenefits Admin Console: a React 19 + TypeScript + Vite single-page demo of a gift-inventory / shift-multiplier admin tool. It is a browser-only interactive demo with persistent `localStorage` data. There is no backend, auth, or shared database; `docs/SYSTEM-DESIGN.md` describes a *proposed* production architecture that is intentionally not implemented. Do not add servers, secrets, or real integrations without being asked.

`ahabenefits-admin-console.html` is the original supplied mockup and the design source of truth. Preserve it; never edit it. `src/reference-data.json` holds the sample data extracted from it.

## Commands

Requires Node 22.12+ or 24 and npm.

```sh
npm ci                 # install
npm run dev            # Vite dev server (binds 0.0.0.0)
npm test               # vitest run (all tests)
npx vitest run -t "enforces per-driver"   # single test by name
npx vitest run tests/domain.test.ts       # single file
npx tsc -b             # typecheck only (build runs this first)
npm run build          # tsc -b && node scripts/build-guide.mjs && vite build -> dist/
npm run preview        # serve the production build
```

There is no linter or formatter configured. Deployment is static `dist/` on Vercel (`vercel.json` has the SPA rewrite and headers); `npx vercel deploy` after a green `npm test && npm run build`.

## Architecture

Strict layering, top to bottom:

1. **`src/domain.ts`** — Zod schemas (`giftSchema`, `stateSchema`, ...) and *pure state transitions*: `saveGift`, `setMultiplier`, `reviewMultiplier`, `parseCodes`, `importCodes`, `adjustStock`, `redeem`, `validateBackup`, `toCsv`. All business rules live here and nowhere else.
2. **`src/store.tsx`** — `StoreProvider` / `useStore()`. Owns persistence (key `ahabenefits:v1`), the current demo `actor`, the transient `notice` banner, and `download()`.
3. **`src/features/*.tsx`** — one component per workflow (Multiplier, Inventory, GiftForm, ImportCodes, GiftDetail, Settings). They hold form/UI state only and call `commit()` with a domain transition.
4. **`src/components/ui.tsx`** — Modal (native `<dialog>`), Field, Pill, SearchBox, Pager, Empty.
5. **`src/App.tsx`** — shell, hash routing, derived notifications. **`src/main.tsx`** — StrictMode + ErrorBoundary + StoreProvider.

### Transition contract (follow this when adding rules)

```ts
export function doThing(state: State, ..., actor: Actor): State {
  editable(actor);                 // throws for the Viewer role
  const s = structuredClone(state); // never mutate the input
  // validate -> throw Error("human readable message") on failure
  activity(s, sku, actor, "Action", "detail");  // audit trail, newest first
  return s;
}
```

`commit(fn, message)` in the store re-reads and validates the latest `localStorage` snapshot, applies `fn`, writes it back, then updates React. A throw (Zod or `Error`) leaves visible state unchanged and surfaces the message via `notice`. Cross-tab `storage` events replace state in other tabs.

### Things that are easy to break

- **State version.** `stateSchema.version` is `z.literal(1)` and the storage key is `ahabenefits:v1`. Changing the persisted shape needs a version bump plus migration or reset handling; `validateBackup` also rejects duplicate SKUs/codes and orphan records.
- **Seed order.** `tests/domain.test.ts` indexes `seedState().gifts` directly (`gifts[0]` = GIFT-FUEL-50, `[3]` = GIFT-RAIN-KIT, `[6]`, `[7]` = GIFT-DATA-5GB). Reordering or renaming entries in `src/reference-data.json` breaks tests.
- **Time.** Internal timestamps are ISO/UTC; display and calendar-period logic use `Asia/Ho_Chi_Minh` (ICT) via `today()` / `displayTime()`. CSV dates are `dd/mm/yyyy`. Tests freeze the clock at `2026-09-10T14:00:00Z` with fake timers; date-sensitive fixtures assume that.
- **Roles.** Three fixed demo actors in `ACTORS`: Admin, Head of Ops, Viewer. Viewer is read-only. Multiplier values above 2.50 stay `pending` until a *different* actor with the Head of Ops role reviews them; a newer request supersedes older pending ones.
- **Limits.** Imports: 2 MB / 10,000 rows per file, 20,000 codes total, 1,000 gifts. Codes are unique case-insensitively across all SKUs, and redeemed codes stay in inventory to block reimport.
- **Routing.** No router library. Gift detail is `#/gifts/<sku>`, parsed in `App.tsx`; everything else is the inventory view.
- **Gifts are hidden (`status: "inactive"`), never deleted.** Stock for `Physical` gifts is `gift.stock`; for voucher/service gifts it is derived from available, unexpired codes via `quantity()`.

### Docs pipeline

`scripts/build-guide.mjs` concatenates `docs/USER-GUIDE.md`, `FEATURES.md`, `SYSTEM-DESIGN.md`, `DEPLOYMENT.md` into `public/guide.html` during `npm run build`. Edit the Markdown, not the generated HTML. Mermaid blocks in the docs are rendered client-side from jsDelivr.

### Styling

Plain CSS in `src/styles.css` using design tokens from `docs/IMPLEMENTATION-PLAN.md` (#2563EB primary, #F4F6F9 canvas, Be Vietnam Pro, 10px card / 8px button radii). Dark mode is `data-theme` on `<html>`, set from `App.tsx`. Icons are `lucide-react`. Untrusted text is rendered as text, and CSV exports prefix `= + - @` cells to neutralize formulas; keep both.
