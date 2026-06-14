# World Cup 2026 Analysis Frontend

A small Vite + React app for viewing the World Cup winner analysis in a simple vintage style.

## What changed in this version

- Clean main page with only the main conclusion and value picks
- Detailed data moved into tabs: Value, Teams, Weights and History
- One consistent vintage ledger style
- No gradients, no images, less visual noise
- iPhone-friendly responsive layout
- PWA-style manifest and service worker

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL shown in your terminal.

## View on iPhone over the same Wi-Fi

Run:

```bash
npm run dev -- --host 0.0.0.0
```

Find your Mac IP address:

```bash
ifconfig
```

Then open this on your iPhone Safari:

```text
http://YOUR-MAC-IP:5173
```

Your iPhone and Mac must be on the same Wi-Fi network.

## Build for production

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`.

## Deploy

### Netlify Drop

1. Run `npm run build`.
2. Upload the `dist/` folder to Netlify Drop.
3. Open the Netlify URL on iPhone Safari.

### Vercel

1. Push the folder to GitHub.
2. Import the repo into Vercel.
3. Use default Vite settings.
4. Open the Vercel URL on iPhone Safari.
