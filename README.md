# Network Topology Builder

A frontend-only network diagram editor built with React, TypeScript, Vite, React Flow, Tailwind CSS, html-to-image, and jsPDF.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Projects autosave to the browser key `network-topology-project`.

## Production build

```bash
npm run build
```

The deployable static output is written to `dist/`.

## Netlify

This repository includes `netlify.toml` and an SPA redirect rule. In Netlify, import the repository and use:

- Build command: `npm run build`
- Publish directory: `dist`

No environment variables, server functions, database, or external services are required.

## Project data

JSON export/import preserves the project name, timestamps, devices, positions, interfaces, and connections. PDF and PNG export render the full node bounds rather than only the visible canvas viewport.
