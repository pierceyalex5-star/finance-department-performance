# IFAST D365 Transformation Control Tower

A shared, internal D365 implementation control tower organized around IFASTGROUP's enterprise value streams:

- M2O - Market to Order
- O2C - Order to Cash
- F2P - Forecast to Plan
- P2P - Plan to Produce
- S2P - Source to Pay
- W2D - Warehouse to Delivery
- R2R - Record to Report
- Cross-functional: Master Data Management and Quality Management

## Deployment model

This application intentionally follows the lightweight deployment pattern used by the Finance Control Tower:

- GitHub stores and versions the application source.
- One internal Windows/server computer runs the included Node.js server.
- The live shared state is stored in `data/runtime-state.json` on that host.
- Connected browsers receive live updates through Server-Sent Events (SSE).
- No Vercel runtime, Neon database, Teams integration, browser notifications, or third-party application packages are required.

`data/runtime-state.json` and local backups are ignored by Git so normal application updates do not overwrite live project data.

## Start it

Node.js and Git are the only prerequisites.

### Windows

Double-click:

`start-d365.cmd`

The script attempts `git pull --ff-only` first, then starts the server.

### Command line

```bash
node server.js
```

Default address on the host:

`http://localhost:8090`

Other users on the same network can use the host computer's network address, for example:

`http://192.168.1.25:8090`

IT/network rules may require opening TCP port 8090 on the internal host.

## Shared data and backup

On first launch, `data/seed.json` is copied to `data/runtime-state.json`.

Every live edit updates the shared runtime file and is broadcast to connected users. The server also writes one local state backup per day under `data/backups/`.

The UI includes JSON Export and Import for manual backups / migration.

## Current-state source package

The seed data was prepared from the supplied `Process mapping.zip`, including:

- Order to Cash process maps and Visio
- Plan to Manufacture process maps and Visio
- Procure to Pay process maps and Visio
- Detailed Order to Ship Visio
- 2022 pain points and opportunities register
- 2022 process close-out and summary documents
- 2024 Order to Ship current-state report

The imported Visio pages have been converted into editable browser flow objects. These are a starting point and are explicitly marked as requiring BPO validation.

## Functional areas

- Executive transformation cockpit and lifecycle heatmap
- Value-stream workspaces
- Editable As-Is process text
- Editable flow diagrams imported from Visio
- BPO / SME role and responsibility workspace
- Pain point and opportunity register
- Requirements traceability
- To-Be process documentation
- D365 Fit / Gap classification
- Task control tower and status workflow
- Program and task Gantt charts
- Decision register
- Cross-stream handoffs
- Process version snapshots
- Change audit trail
- Linked source-document register

## Important operating note

There is no authentication or role-based security in this prototype. Use it on the same trusted internal network pattern as the Finance Control Tower. If the organization later requires authenticated external access, that should be handled by the approved internal hosting / identity architecture rather than by adding Vercel or Neon.
