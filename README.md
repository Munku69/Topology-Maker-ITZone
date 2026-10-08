<p align="center">
  <img src="public/itzone.png" alt="ITZone" width="180" />
</p>

# Network Topology Builder

Network Topology Builder is a modern, browser-based workspace for designing and documenting network infrastructure. It provides an approachable drag-and-drop workflow inspired by tools such as Packet Tracer and draw.io, while remaining lightweight, private, and simple to deploy.

Build a topology with a categorized library of network, endpoint, server, security, and operations equipment. Configure device and interface information, choose physical cable types, optionally assign endpoint ports, and export the finished network as an editable project or a professional report.

Everything runs locally in the browser. There is no backend, account system, database, telemetry service, or cloud project storage.

## Features

- Collapsible, categorized drag-and-drop device library
- 34 device types using the selected ITZone topology icon set
- Packet Tracer-style cable workflow with optional port selection
- Parallel links between the same two devices
- Movable cable endpoints with device-outline attachment points
- Rounded elbow cable routing with clean device entry and exit paths
- Saved feature toggles for cable visibility, device labels, and port prompts
- Copper straight-through, crossover, fiber, and serial cables
- Device, hostname, management IP, subnet, and description fields
- Configurable interfaces, VLAN IDs, roles, addresses, and descriptions
- Editable connection ports, cable types, and link descriptions
- Pan, zoom, MiniMap, background grid, and automatic fit-to-view
- Automatic browser-local saving and session recovery
- Browser-only project manager with create, switch, rename, duplicate, and delete actions
- Editable JSON project import and export
- Complete-topology PNG export
- Multi-page PDF reports with device and interface inventories
- Light and dark interface themes
- Static deployment with no server-side dependencies

## Technology

- React and TypeScript
- Vite
- React Flow (`@xyflow/react`)
- Tailwind CSS
- Lucide React
- `html-to-image`
- jsPDF

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed by Vite, normally `http://localhost:5173`.

On Windows PowerShell systems that block `npm.ps1`, use:

```powershell
npm.cmd install
npm.cmd run dev
```

## Production build

```bash
npm run build
```

The deployable static site is generated in `dist/`. You can test it locally with:

```bash
npm run preview
```

## Deploy to Netlify

The project includes `netlify.toml` and an SPA redirect rule. Import the repository into Netlify and configure:

- Build command: `npm run build`
- Publish directory: `dist`

No environment variables, server functions, databases, or external services are required.

## Project persistence

Projects autosave to a browser-local project library under the `network-topology-projects` key. The active project automatically returns when the application is reopened from the same browser and site address. Existing installations using the original `network-topology-project` key are migrated automatically.

Browser storage is specific to the current browser and origin. Use **Export > Project JSON** to create a portable backup or transfer a topology between computers, browsers, localhost, and the deployed Netlify site.

JSON projects preserve device positions, properties, interfaces, connections, cable types, project metadata, and timestamps. PDF and PNG exports calculate the full topology bounds, so devices outside the currently visible viewport are included.

## Author

Created by **Munkh Odbayar**, working as a **Cyber Security Engineer at ITZone LLC**.
