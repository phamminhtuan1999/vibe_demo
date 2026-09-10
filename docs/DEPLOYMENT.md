# Setup and deployment

## Local development

Use Node 22.12+ or Node 24 and npm. In this folder, run `npm ci`, then `npm run dev`. Open the address Vite prints. `npm test` runs business-rule tests; `npm run build` runs TypeScript checking, generates the hosted guide and produces `dist/`. `npm run preview` serves that production build locally.

## Vercel

This app is deployed as a static Vite site, with no server environment variables. The connected Vercel plugin can publish the contents of `dist/`. The local CLI credential was invalid during initial setup, so the connector is the deployment path for this delivery.

For future CLI deployments, sign in to Vercel, link a dedicated project from this folder, then run:

```sh
npm ci
npm test
npm run build
npx vercel deploy
```

Test the preview, then promote it or deploy with `npx vercel deploy --prod`. The included `vercel.json` declares the Vite framework, build command, `dist` output and baseline response headers. The app uses hash routes for gift details, so detail links also work on simple static hosting.

A Git-connected Vercel project can build on pushes once you put this folder in your own repository. No repository or CI connection was created by this task. Avoid uploading the source reference, backups, or real voucher CSVs into public static assets.

## Operational boundaries

The live demo has no database or server functions to monitor. Vercel serves the built application and documentation; business state stays in each browser. Google Fonts loads the reference font, with system fallbacks. The hosted system diagram uses Mermaid from jsDelivr; the local Markdown document retains the diagram source.

Use a separate protected staging deployment for future real authentication and database work. Do not enter real redeemable codes or driver information into this public browser demo.

Official references: [Vite getting started](https://vite.dev/guide/) and [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).
