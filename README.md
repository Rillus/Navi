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

Vercel project settings: framework **Vite**, output `dist`, no environment variables. The included `vercel.json` sets SPA fallback and no-cache headers for the service worker.
