# IFAST D365 Transformation Control Tower

A shared D365 implementation control tower organized around IFASTGROUP's enterprise value streams:

- M2O - Market to Order
- O2C - Order to Cash
- F2P - Forecast to Plan
- P2P - Plan to Produce
- S2P - Source to Pay
- W2D - Warehouse to Delivery
- R2R - Record to Report
- Cross-functional: Master Data Management and Quality Management

## Deployment model

This application follows the same lightweight deployment pattern as the Finance Control Tower:

- GitHub stores and versions the application code and baseline JSON data.
- One approved internal Windows/server computer runs the included dependency-free Node.js server.
- The live shared project state is stored locally on that host in `data/runtime-state.json`.
- Connected browsers receive live changes through Server-Sent Events (SSE).
- No Vercel runtime, Neon database, Teams integration, browser notifications, or third-party Node packages are used.

`data/runtime-state.json` and `data/backups/` are ignored by Git, so a normal `git pull` updates the application without overwriting the team's live project data.

## Start the shared dashboard

Prerequisites on the internal host:

- Git
- Node.js

### Windows

From the cloned repository, open `d365-control-tower` and double-click:

`start-d365.cmd`

The launcher attempts `git pull --ff-only` and then runs the shared server.

### Command line

```bash
cd d365-control-tower
node server.js
```

Default address on the host:

`http://localhost:8090`

Other team members on the same network use the host computer's network name or IP, for example:

`http://192.168.1.25:8090`

IT/network rules may require allowing inbound TCP 8090 on the internal host.

## Baseline and live data

The GitHub baseline is modular and is loaded from:

- `data/framework.json` - value streams, BPOs, SMEs and governance framework
- `data/processes.json` - process hierarchy and As-Is process metadata
- `data/registers.json` - pain points, opportunities, requirements, decisions and Fit/Gap
- `data/tasks.json` - execution tasks
- `data/milestones.json` - program milestones
- `data/flows/manifest.json` and `data/flows/*.json` - editable process-flow objects

On first launch, `server.js` assembles those files into `data/runtime-state.json`. From that point forward, the runtime file is the shared live source of truth for the team.

Every successful edit:

1. is checked against the current shared version of the affected data file / flow chunk;
2. is written to `data/runtime-state.json`;
3. is added to the local audit trail;
4. is broadcast to connected browsers;
5. is followed by a refresh from the shared state so concurrent changes in other areas are retained.

The server writes a daily local backup under `data/backups/`. The UI also supports full JSON Export and Import.

## Current-state source package

The baseline process library was prepared from the supplied `Process mapping.zip`, including the available current-state artifacts for:

- Order to Cash
- Plan to Manufacture / Plan to Produce
- Procure to Pay / Source to Pay
- Detailed Order to Ship / Warehouse to Delivery
- pain points and opportunities
- process close-out and summary documentation

Imported process-flow objects are working drafts and should be validated by the assigned BPO and SMEs before being treated as an approved As-Is baseline.

## Functional areas

- Executive transformation cockpit and lifecycle heatmap
- Value-stream workspaces
- Editable As-Is process text
- Editable flow diagrams derived from the current-state process maps
- BPO / SME role and responsibility workspace
- Pain point and opportunity register
- Requirements traceability
- To-Be process documentation
- D365 Fit / Gap classification
- Task control tower and status workflow
- Program and task Gantt charts
- Decision register
- Cross-stream handoffs
- Process version / audit information
- Linked source-document register

## Collaboration behavior

This is a shared-state application, not a browser-only static dashboard. Team members who open the same internal server address see the same runtime state.

Changes are conflict-checked at the logical data-file level and process-flow-chunk level. Two people can work safely in different areas, but during workshops it is still preferable to use one designated editor for the same detailed process map at a time.

## Security / infrastructure note

The current deployment contains no application authentication or role-based access control. It is intended to run on the same approved/trusted internal-network pattern as the Finance Control Tower. If the organization later requires authenticated remote access, that should be added through the organization's approved hosting and identity architecture rather than by introducing Vercel or Neon.
