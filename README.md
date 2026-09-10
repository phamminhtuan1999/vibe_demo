# AhaBenefits Admin Console

A working React + TypeScript implementation of the supplied `ahabenefits-admin-console.html`. The original mockup is preserved. The app runs on Vite and deploys as static assets to Vercel.

**Delivery mode:** interactive demo with persistent browser data. There is no shared database, real sign-in, merchant integration, or live driver system. Role selection simulates access rules. Use sample data only.

## Run locally

Use Node 22.12+ or Node 24 and npm.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. To validate and build:

```sh
npm test
npm run build
npm run preview
```

## Documentation

- [User guide](docs/USER-GUIDE.md): walkthroughs and operating rules.
- [Feature matrix](docs/FEATURES.md): implemented behavior and production boundaries.
- [System design](docs/SYSTEM-DESIGN.md): current architecture, data model, production API and transaction design.
- [Deployment](docs/DEPLOYMENT.md): hosting and update instructions.
- [Design and QA](docs/QA.md): browser acceptance and visual comparison.
- [Implementation plan](docs/IMPLEMENTATION-PLAN.md): scope and design tokens.

The hosted app also includes `/guide.html`, linked from its footer.

## Source map

- `src/domain.ts`: schema validation and pure business transitions.
- `src/seed.ts`: sample inventory, drivers, codes and historical records.
- `src/store.tsx`: versioned local storage, cross-tab refresh, commit errors and downloads.
- `src/features/`: multiplier, inventory, gift details, imports, settings.
- `src/components/ui.tsx`: modal, form, table pagination, search and status primitives.
- `tests/domain.test.ts`: meaningful domain regression tests.

Static hosting publishes only the built `dist/` assets. No secrets are required. Browser storage is tied to the origin: localhost and the hosted URL have separate data. Export/restore a JSON backup to transfer a demo between them.
