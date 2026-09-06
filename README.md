# Navi

Coastal sailing navigation for a Hallberg-Rassy 342 on the south and south-east of England.

Charts, wind, depth, IALA marks (day and night identification), safe-sailing checks and route plotting — all from open data.

Installable **PWA**. Deploys to **Vercel** as a static app. **No hosted database** — routes and course packs live in IndexedDB / Cache Storage on the device.

See the [product requirements document](docs/PRD.md).

## Develop

```bash
npm install
npm test
npm run dev
```

## Build / Vercel

```bash
npm run build
```

`vercel.json` pins framework **Vite**, output **`dist`**, and the official SPA rewrite to `/index.html`.

If the production URL is 404, Vercel is almost certainly building **`main`**, which started as a README-only commit. Deploy this app branch (or merge PR #1 into `main`), then redeploy. In the Vercel project: Framework = Vite, Output Directory = `dist`, Production Branch = the branch that contains `vite.config.ts`.
