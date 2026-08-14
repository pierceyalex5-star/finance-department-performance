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

The D365 dashboard intentionally uses the same deployment pattern as the Finance Control Tower:

- GitHub is the source repository and shared data store.
- GitHub Pages hosts the web dashboard.
- There is no Vercel deployment.
- There is no Neon database.
- There is no application server or external backend.
- There is no Teams integration or notification service.
- Viewers need no credentials because the project data is public.
- Editors use a fine-grained GitHub token with `Contents: Read and write` permission for this repository. The token is stored only in that editor's browser and is never committed to the repository.

The existing repository Pages workflow publishes the Finance Control Tower at the site root and the D365 Control Tower under `/d365-control-tower/`.

## Shared editing and automatic synchronization

The collaboration model mirrors the Finance Control Tower:

1. The browser loads the deployed JSON baseline from GitHub Pages.
2. When an editor changes a process, process step, task, BPO/SME, requirement, issue, decision, milestone or flowchart, the affected JSON file is marked dirty.
3. After a short debounce, the browser commits the updated JSON directly to GitHub through the GitHub Contents API.
4. Before overwriting a file, the app compares the current GitHub version with the version from which the editor started. If another editor changed that same area first, the save is blocked as a conflict rather than silently overwriting their work.
5. A small `data/sync.json` marker is updated after the save.
6. The existing GitHub Pages workflow redeploys the latest repository state.
7. Other open browsers poll the deployed sync marker and automatically refresh when a newer version is available.

Git history is therefore the version trail for shared edits.

## Editor setup

For people who need to modify the shared dashboard:

1. Create a fine-grained GitHub personal access token.
2. Limit repository access to `pierceyalex5-star/finance-department-performance`.
3. Grant `Contents: Read and write`.
4. The first time that person edits something, the dashboard asks for the token.
5. The token is saved only in browser local storage on that device.

People who only need to view the dashboard do not need a token.

## Baseline data structure

The shared project model is modular to reduce editing conflicts:

- `data/framework.json` - value streams, BPOs, SMEs and governance framework
- `data/processes.json` - process hierarchy and As-Is process metadata
- `data/registers.json` - pain points, opportunities, requirements, decisions and Fit/Gap
- `data/tasks.json` - execution tasks
- `data/milestones.json` - program milestones
- `data/flows/manifest.json` - list of process-flow chunks
- `data/flows/*.json` - editable process diagrams
- `data/sync.json` - lightweight synchronization marker

Detailed flowcharts are stored separately by value stream / chunk so editing one detailed process does not require rewriting every process map.

## Current-state source package

The current-state baseline was prepared from the supplied `Process mapping.zip`, including the available artifacts for:

- Order to Cash
- Plan to Manufacture / Plan to Produce
- Procure to Pay / Source to Pay
- Detailed Order to Ship / Warehouse to Delivery
- pain points and opportunities
- process close-out and summary documentation

The enterprise value-stream structure and draft BPO assignments are based on the supplied `IFAST D365 Introduction.pdf`.

Imported process-flow objects remain working As-Is drafts until the assigned BPO and SMEs validate them.

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
- Process / Git version trail
- Linked source-document register

## Collaboration guideline

Different value streams and different process-flow chunks can be edited in parallel. For a workshop where several people are discussing the same detailed process map, use one designated editor for that map at a time. This keeps the workshop simple and minimizes Git conflicts.

## URL structure

Once the Pages deployment completes, the D365 dashboard is available beneath the existing Finance Control Tower GitHub Pages site at:

`/d365-control-tower/`

The exact public Pages hostname is controlled by the repository's existing GitHub Pages configuration.
