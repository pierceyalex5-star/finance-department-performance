(function(){
  let cqSelectedL2 = null;

  const CQ_SOURCES = {
    cost: [
      ['231103_PoC_Bilan.pptx','POC objectives, cost structure, allocation bases, readiness gaps and next steps'],
      ['230707_Infasco_Structure du coût de production(formule).xlsx','Formula-based manufacturing cost structure, costing drivers and D365 questions'],
      ['230126_Infasco_Coût de production_GL.xlsx','GL, manufacturing-cost classification, WIP, posting and allocation concepts'],
      ['230912 ABC.xlsx','Actual cost pools and allocation drivers by production area'],
      ['Antonio operations-Couts.xlsx','Operation/cost-category rate prototype by process'],
      ['231017 Bloc #3 - Item master Bom & Route - Preuve de Concept.xlsx','Item/BOM/route/resource prototype and product attributes'],
      ['231108_Suivi_Projet_Cout_Production_std_Createch.xlsx','Historical costing project actions, dependencies and D365 resource data'],
      ['230712 ERP Module Production - Stratégie Infasco.pdf','Block model, WIP inventory points and route simplification strategy'],
      ['230418_Étapes de la gamme_V2.pdf','Manufacturing flow for bolts and nuts'],
      ['FF Bible vitesse.xls','Machine/product speed reference to validate engineering and route standards']
    ],
    quality: [
      ['01-QUA-002 Gestion des produits non conformes.pdf','Non-conformance identification, quarantine, disposition, deviation, rework and release controls'],
      ['TT 02-TT-007 (31-015) Recettes traitement thermique.pdf','Controlled heat-treatment recipe parameters and responsibilities'],
      ['TT 00 Formation traitement thermique.ppt','Metallurgical controls, furnace atmosphere, quench, TUS/SAT and process risks'],
      ['TT dessin Traitement thermique four.pdf','Physical furnace/process-flow reference'],
      ['231017 Bloc #3 - Item master Bom & Route - Preuve de Concept.xlsx','PPAP, quality attributes and heat-treatment constraints by item'],
      ['230418_Étapes de la gamme_V2.pdf','Quality checkpoints embedded in manufacturing flow']
    ]
  };

  const COST_WORK = [
    {id:'CA-01',title:'Validate inventory block / WIP architecture',stream:'P2P',owner:'Plan to Produce + Finance',priority:'Critical',phase:'M-02 / M-03',status:'Revalidate prior design',fit:'Standard D365',source:'230712 ERP Module Production - Stratégie Infasco.pdf',note:'Confirm Raw → Annealed WIP → Black WIP → FG as true inventory decoupling points; avoid creating an item at every operation.'},
    {id:'CA-02',title:'Define engineered, planned and standard cost governance',stream:'R2R',owner:'Finance + Operations + Engineering',priority:'Critical',phase:'M-02',status:'Decision required',fit:'Standard + governance',source:'Historical POC + D365 costing versions',note:'Define ownership, approved assumptions, version naming, refresh cadence, sign-off and bridge rules.'},
    {id:'CA-03',title:'Define UOM / weight / piece architecture',stream:'MDM',owner:'Master Data + P2P',priority:'Critical',phase:'M-02 / M-03',status:'Open gap',fit:'Configuration + integration',source:'POC / current-state manufacturing maps',note:'Resolve coil, lb, ton, piece, basket and product-specific conversion logic before BOM/route migration.'},
    {id:'CA-04',title:'Validate BOM, route and resource hierarchy',stream:'P2P',owner:'Plan to Produce',priority:'Critical',phase:'M-02 / M-03',status:'Revalidate prior design',fit:'Standard D365',source:'231017 Bloc #3 - Item master Bom & Route - Preuve de Concept.xlsx',note:'Separate financial cost centers from production units, resource groups, individual resources and cost categories.'},
    {id:'CA-05',title:'Establish engineering standards for rates, yields and setup',stream:'P2P',owner:'Engineering + Operations',priority:'High',phase:'M-02',status:'Data validation required',fit:'Planned cost simulation / route standards',source:'FF Bible vitesse.xls',note:'Separate technical capability, sustainable planning rate and approved standard-cost rate.'},
    {id:'CA-06',title:'Capture actual machine and labor execution',stream:'P2P',owner:'Operations + IT',priority:'Critical',phase:'M-03 / M-04',status:'Integration candidate',fit:'Production execution / MES integration',source:'231103_PoC_Bilan.pptx',note:'Actual machine time, labor time, output, setup and scrap are required to explain production efficiency.'},
    {id:'CA-07',title:'Define standard overhead and normal-capacity methodology',stream:'R2R',owner:'Finance + Operations',priority:'Critical',phase:'M-02 / M-03',status:'Decision required',fit:'Costing sheet / cost categories',source:'230912 ABC.xlsx',note:'Use predetermined standard rates for inventory costing; use actual cost accounting separately for spending/absorption analysis.'},
    {id:'CA-08',title:'Design actual cost accounting and allocation bases',stream:'R2R',owner:'Finance',priority:'High',phase:'M-03',status:'Prior work available',fit:'D365 Cost accounting',source:'230912 ABC.xlsx',note:'Preserve area, QA time, machine hours, headcount, forklift and other causal drivers for actual support-cost allocations.'},
    {id:'CA-09',title:'Design subcontract coating and external processing',stream:'S2P',owner:'Source to Pay + P2P',priority:'Critical',phase:'M-02 / M-03',status:'Open gap',fit:'Standard subcontracting',source:'Historical coating work / process maps',note:'Use vendor resource, service product, PO, receipt and invoice controls; retire spreadsheets as the approved price source.'},
    {id:'CA-10',title:'Resolve Galvano legal-entity / site operating model',stream:'Program',owner:'Business Owner + P2P + S2P + R2R',priority:'Critical',phase:'M-02 / M-03',status:'Decision required',fit:'Fit-gap decision',source:'Manufacturing flow / Galvano current-state map',note:'Choose internal route, transfer, intercompany or subcontract pattern based on ownership, legal entity and billing.'},
    {id:'CA-11',title:'Design GL posting, absorption and variance structure',stream:'R2R',owner:'Finance',priority:'Critical',phase:'M-03',status:'Prior work available',fit:'Standard D365 posting profiles',source:'230126_Infasco_Coût de production_GL.xlsx',note:'Trace operational events to WIP, inventory, COGS, PPV, production variances, scrap and absorption/spending variance.'},
    {id:'CA-12',title:'Define cost of non-quality accounting',stream:'QM',owner:'Quality + Finance',priority:'High',phase:'M-03',status:'Cross-functional design',fit:'Standard + analytics',source:'01-QUA-002 Gestion des produits non conformes.pdf',note:'Connect scrap, sort, rework, corrective processing, deviation and external quality costs to Cost Accounting.'},
    {id:'CA-13',title:'Design cross-company lot genealogy',stream:'QM',owner:'Quality + MDM + IT',priority:'High',phase:'M-03 / M-04',status:'Integration/reporting candidate',fit:'Reporting / integration',source:'Manufacturing + Galvano flows',note:'Preserve a group-wide immutable lot identity where traceability crosses companies.'},
    {id:'CA-14',title:'Validate standard-cost activation and revaluation governance',stream:'R2R',owner:'Finance',priority:'High',phase:'M-03',status:'Decision required',fit:'Standard D365',source:'D365 standard cost design',note:'Define pending-cost review, approval, activation calendar, effective date and inventory-revaluation control.'}
  ];

  const DATA_READINESS = [
    ['Item master','MDM','Prior prototype exists','Amber','Validate attributes, status model and SKU rationalization'],
    ['BOMs','P2P','Prior POC exists','Amber','Validate completeness and ownership'],
    ['Routes / operations','P2P','Prior POC + process maps','Amber','Validate route simplification and alternatives'],
    ['Machine resources','P2P','Historical mapping exists','Amber','Confirm resource-group and costing-resource design'],
    ['Machine speeds / setup','Engineering','Bible vitesse + POC','Red / Amber','Separate theoretical, planned and standard rates'],
    ['Piece / billet weights','MDM / Engineering','Known inconsistencies','Red','Establish controlled source and tolerance'],
    ['UOM conversions','MDM','Known gap','Red','Resolve lb ↔ piece ↔ coil / basket rules'],
    ['Direct labor assignment','Operations / HR','Historical inconsistency','Red','Align labor reporting with work centers / cost objects'],
    ['Actual machine time','Operations','Incomplete','Red','Define PFE/MES capture'],
    ['Cost centers','Finance','Prior redesign exists','Amber','Validate against D365 financial dimensions'],
    ['Cost categories / overhead','Finance / P2P','Prototype exists','Amber','Define approved rate methodology and normal capacity'],
    ['External coating prices','S2P','Historical governance gap','Red','Contract / PO / service-price ownership required'],
    ['Quality recipes / standards','QM','Controlled documents exist','Green / Amber','Map references and revision governance to D365/MES'],
    ['Non-conformance rules','QM','Controlled procedure exists','Green / Amber','Map dispositions, security and accounting consequences']
  ];

  const FIT_GAP = [
    ['Costing versions / BOM roll-up','Standard D365','Configure standard and planned costing versions; no custom cost engine.'],
    ['Engineered cost','Management design','Represent as a controlled engineering baseline, preferably a dedicated Planned-cost version or engineering dataset; it is not a separate native D365 costing type.'],
    ['Planned cost','Standard D365','Use Planned cost costing versions for simulation; does not drive transaction valuation.'],
    ['Standard cost','Standard D365','Use approved Standard cost costing version as active inventory / COGS and variance basis.'],
    ['Cost groups / costing sheet','Standard D365','Preserve material, labor, machine, subcontract, variable OH and fixed OH decomposition.'],
    ['Production variances','Standard D365','Use quantity, price, substitution and lot-size categories by cost group.'],
    ['Actual overhead allocation','Standard D365 Finance','Use Cost accounting for actual support-cost pools and statistical allocation bases.'],
    ['Subcontract plating','Standard D365','Use subcontract operations, vendor resources and procurement controls.'],
    ['Scale / basket / production capture','Integration candidate','Integrate actual weight, piece count, lot/license plate and production order.'],
    ['Furnace recipe execution','Integration candidate','Keep detailed process control in furnace/GSP/MES; D365 owns production/quality context and result.'],
    ['Quality hold / nonconformance','Standard D365','Configure quality orders, inventory blocking, nonconformance and disposition workflow.'],
    ['Cross-company genealogy','Reporting / integration','Use common lot identity and consolidated reporting where standard trace stops at legal-entity boundary.']
  ];

  const QUALITY_CONTROLS = [
    ['QM-01','Suspect or unidentified material','Treat as non-conforming / blocked until disposition','Quality','01-QUA-002'],
    ['QM-02','Release authority','Only authorized Quality roles may change approval status; packaging/shipment must respect release status','Quality','01-QUA-002'],
    ['QM-03','Related assembly quarantine','Quarantine related kits when a component lot is quarantined','Quality + W2D','01-QUA-002'],
    ['QM-04','Sort / corrective processing','Require Quality re-evaluation before returning to conforming status','Quality + P2P','01-QUA-002'],
    ['QM-05','Major defect disposition','No deviation for major defects; scrap according to procedure','Quality','01-QUA-002'],
    ['QM-06','PPAP deviation','Retain customer authorization, authorized quantity and expiry','Quality + M2O','01-QUA-002'],
    ['QM-07','IT / system incident','Affected lots become suspect when an IT issue can compromise conformity','Quality + IT','01-QUA-002'],
    ['QM-08','Heat-treatment reprocessing','Track passes and authorization threshold for repeated heat treatment','Quality + P2P','01-QUA-002'],
    ['QM-09','Heat-treatment recipe governance','Respect furnace/load/temperature/carbon/quench/time parameters and OF-specific instructions','Quality + P2P','TT 02-TT-007'],
    ['QM-10','Cost of non-quality','Capture and trend scrap, sort, rework, deviations and corrective costs','Quality + R2R','01-QUA-002']
  ];

  const COST_POSTINGS = [
    ['Purchase receipt / invoice','Raw material at standard','Purchase price variance','Supplier actual vs active material standard'],
    ['Material issue','Production WIP – material','Inventory','Component issue at standard'],
    ['Route / job reporting','Production WIP – conversion','Labor / machine / OH absorbed','Reported time × approved cost-category rates'],
    ['Report as finished','Finished goods at standard','Production WIP','Output enters inventory at active FG standard'],
    ['End production order','Variance accounts','WIP / absorption clearing','Finalize quantity, price, substitution and lot-size variances'],
    ['Sale / invoice','COGS at standard','Finished goods inventory','Standard inventory cost flows to COGS'],
    ['Standard activation','Inventory revaluation','Inventory cost revaluation','On-hand revalued from prior to new standard'],
    ['Period analysis','Actual plant spend','Absorbed manufacturing cost','Separate spending / absorption analysis in Finance']
  ];

  function costTriad(){
    return `<div class="cq-triad">
      <div class="cq-cost engineered"><span>1 · Technical baseline</span><h3>Engineered Cost</h3><p>What the product <b>should cost technically</b> under an approved engineering design.</p><ul><li>Engineering BOM / route</li><li>Technical or validated sustainable machine speed</li><li>Setup, crew, yield and scrap assumptions</li><li>Technical material consumption</li><li>Economic process assumptions</li></ul><div class="cq-foot"><b>D365 treatment</b><small>Internal management concept. Store as a controlled engineering baseline; a dedicated <i>Planned cost</i> costing version is a strong standard option for simulation.</small></div></div>
      <div class="cq-arrow">→</div>
      <div class="cq-cost planned"><span>2 · Forward-looking management view</span><h3>Planned Cost</h3><p>What management <b>expects the product to cost</b> for a future period or scenario.</p><ul><li>Expected steel / purchased-material cost</li><li>Expected labor and machine rates</li><li>Expected efficiency and capacity</li><li>Planned subcontract prices</li><li>Budget / forecast overhead assumptions</li></ul><div class="cq-foot"><b>D365 treatment</b><small>Native Planned-cost costing version for simulations. Does not become the transaction valuation basis.</small></div></div>
      <div class="cq-arrow">→</div>
      <div class="cq-cost standard"><span>3 · Approved accounting baseline</span><h3>Standard Cost</h3><p>What Finance has <b>approved and frozen for posting</b>.</p><ul><li>Approved material standard</li><li>Approved route / cost-category rates</li><li>Approved costing-sheet overhead</li><li>Approved accounting lot size</li><li>Controlled effective date / activation</li></ul><div class="cq-foot"><b>D365 treatment</b><small>Native Standard-cost costing version. Drives inventory/COGS valuation and standard-cost variances when activated.</small></div></div>
    </div>
    <div class="cq-feedback"><b>Actual execution & actual GL spend</b><span>Actual material quantity · machine/labor time · output · scrap · supplier invoices · payroll · energy · maintenance</span><i>→ explains variances and feeds the next engineering / planning / standard-setting cycle</i></div>`;
  }

  function comparisonMatrix(){
    const rows=[
      ['Primary question','What should it cost technically?','What do we expect it to cost?','What cost will we post?'],
      ['Primary owner','Engineering + Operations','FP&A / Finance + Operations / Procurement','Finance with Operations approval inputs'],
      ['Material basis','Engineering usage × technical/economic price assumption','Forecast purchase price / sourcing scenario','Approved standard material cost'],
      ['Labor / machine','Technical time / sustainable rate / crew','Expected performance and planned rates','Approved route times and cost-category rates'],
      ['Overhead','Economic / causal process burden','Budgeted / forecast burden','Predetermined approved costing-sheet rate'],
      ['Efficiency','Ideal / demonstrated / engineered','Expected achievable','Frozen standard'],
      ['D365 object','Management baseline; use Planned version or engineering data','Planned-cost costing version','Standard-cost costing version'],
      ['Accounting impact','None','None','Inventory, WIP, COGS, revaluation and variances'],
      ['Refresh','When engineering design/capability changes','Budget / forecast / scenario cadence','Controlled activation cadence'],
      ['Main comparison','Engineered vs Planned = operational / planning challenge','Planned vs Standard = policy / timing / forecast bridge','Standard vs Actual = purchasing / production / absorption variances']
    ];
    return `<div class="card table-wrap cq-table"><table class="data-table"><thead><tr><th>Dimension</th><th>Engineered</th><th>Planned</th><th>Standard</th></tr></thead><tbody>${rows.map(r=>`<tr>${r.map((x,i)=>`<${i?'td':'th'}>${esc(x)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function costWorkPackages(filterStream=''){
    const rows=COST_WORK.filter(x=>!filterStream||x.stream===filterStream||x.stream==='Program'||filterStream==='R2R'&&['P2P','S2P','MDM','QM'].includes(x.stream));
    return `<div class="cq-work-grid">${rows.map(x=>`<div class="card cq-work-card"><div class="cq-work-head"><span>${esc(x.id)} · ${esc(x.stream)}</span>${badge(x.priority)}</div><h3>${esc(x.title)}</h3><div class="cq-work-meta"><b>${esc(x.status)}</b><span>${esc(x.phase)}</span></div><p>${esc(x.note)}</p><div class="cq-fit">${esc(x.fit)}</div><small><b>Owner:</b> ${esc(x.owner)}<br><b>Evidence:</b> ${esc(x.source)}</small></div>`).join('')}</div>`;
  }

  function dataReadiness(){return `<div class="card table-wrap cq-table"><table class="data-table"><thead><tr><th>Dataset</th><th>Owner</th><th>Evidence</th><th>Readiness</th><th>Next control</th></tr></thead><tbody>${DATA_READINESS.map(r=>`<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${badge(r[3])}</td><td>${esc(r[4])}</td></tr>`).join('')}</tbody></table></div>`}
  function fitGapTable(){return `<div class="card table-wrap cq-table"><table class="data-table"><thead><tr><th>Requirement / design</th><th>Fit classification</th><th>Direction</th></tr></thead><tbody>${FIT_GAP.map(r=>`<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div>`}
  function postingTrace(){return `<div class="card table-wrap cq-table"><table class="data-table"><thead><tr><th>Business event</th><th>Debit / value destination</th><th>Credit / variance</th><th>Control logic</th></tr></thead><tbody>${COST_POSTINGS.map(r=>`<tr>${r.map((x,i)=>`<td>${i===0?`<b>${esc(x)}</b>`:esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
  function sourceLibrary(kind){return `<div class="cq-source-grid">${CQ_SOURCES[kind].map(s=>`<div class="card cq-source"><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div>`).join('')}</div>`}

  function varianceCenter(){
    const groups=[
      ['Purchasing',['Purchase price variance','Material-price / sourcing bridge','Supplier / service price exceptions']],
      ['Production',['Production quantity / usage','Production price / cost-category rate','Production substitution','Production lot size','Scrap / yield / rework']],
      ['Finance / plant',['Labor spending','Energy spending','Maintenance spending','Fixed-OH spending','Volume / absorption','Over / under absorption']]
    ];
    return `<div class="cq-variance-grid">${groups.map(g=>`<div class="card pad"><h3>${esc(g[0])}</h3>${g[1].map(x=>`<div class="cq-variance-row"><b>${esc(x)}</b><span>Definition → driver → source → owner → accounting → test case</span></div>`).join('')}</div>`).join('')}</div><div class="notice"><b>Design principle:</b> D365 production variances and Finance plant-spending / absorption variances are related but not interchangeable. The dashboard keeps them as separate analytical layers.</div>`;
  }

  function qualityWorkspace(focus){
    const controls=QUALITY_CONTROLS.filter(x=>!focus||focus==='Quality planning'||focus==='Quality analytics'||
      (focus==='Non-conformance'&&['QM-01','QM-02','QM-03','QM-04','QM-05','QM-06','QM-07','QM-08','QM-10'].includes(x[0]))||
      (focus==='Corrective actions'&&['QM-04','QM-08','QM-10'].includes(x[0]))||
      (focus==='In-process quality'&&['QM-02','QM-07','QM-08','QM-09'].includes(x[0]))||
      (focus==='Specifications & standards'&&['QM-06','QM-09'].includes(x[0]))||
      (focus==='Inspection plans'&&['QM-02','QM-04','QM-09'].includes(x[0]))||
      (focus==='Sampling & testing'&&['QM-04','QM-09'].includes(x[0]))||
      (focus==='Finished-product quality'&&['QM-02','QM-05','QM-06'].includes(x[0])));
    return `<div class="cq-workspace">
      <div class="cq-banner"><div><span>L2 drill-down · Quality</span><h2>${esc(focus||'Quality design hub')}</h2><p>Trace controlled procedures into D365 requirements, execution controls, integrations, accounting consequences and UAT.</p></div><div class="cq-health"><b>Fit-to-standard first</b><span>Quality orders · blocking · nonconformance · controlled integration</span></div></div>
      <div class="cq-tabs"><button data-cq-section="quality-controls" class="active">Controls</button><button data-cq-section="heat">Heat Treatment</button><button data-cq-section="nonconformance">Non-conformance</button><button data-cq-section="quality-cost">Cost of Quality</button><button data-cq-section="quality-sources">Sources</button></div>
      <div class="cq-section active" data-cq-panel="quality-controls"><div class="section-title"><h2>Quality control requirements</h2><span>${controls.length} controls in this view</span></div><div class="card table-wrap cq-table"><table class="data-table"><thead><tr><th>ID</th><th>Control</th><th>Target rule</th><th>Owner</th><th>Evidence</th></tr></thead><tbody>${controls.map(r=>`<tr><td>${r[0]}</td><td><b>${esc(r[1])}</b></td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="cq-section" data-cq-panel="heat"><div class="section-title"><h2>Heat-treatment system boundary</h2><span>D365 context · furnace/MES execution</span></div><div class="cq-system-flow"><div class="card"><b>D365 owns</b><span>Production order · item · batch/lot · route · quality requirement · recipe/reference ID · status/result</span></div><i>↔</i><div class="card"><b>Furnace / GSP / MES owns</b><span>Temperature · carbon potential · conveyor time/speed · quench parameters · atmosphere · detailed process execution</span></div></div><div class="notice"><b>Customization direction:</b> integrate the furnace/process-control layer; do not rebuild furnace-control logic inside D365.</div><div class="card pad cq-recipe"><h3>Controlled recipe dimensions already documented</h3><div class="chip-row"><span class="chip">Loading rate</span><span class="chip">Separation time</span><span class="chip">Furnace zones / temperature</span><span class="chip">Carbon %</span><span class="chip">Conveyor time</span><span class="chip">Quench oil</span><span class="chip">Tempering</span><span class="chip">OF-specific instructions</span><span class="chip">PPAP / product requirements</span></div></div></div>
      <div class="cq-section" data-cq-panel="nonconformance"><div class="section-title"><h2>Non-conformance disposition</h2><span>controlled workflow</span></div><div class="cq-ncr-flow"><div class="cq-node">Suspect / unidentified product</div><i>→</i><div class="cq-node">Quarantine / block</div><i>→</i><div class="cq-node">Authorized Quality review</div></div><div class="cq-dispositions"><div>Scrap</div><div>Sort</div><div>Corrective processing / rework</div><div>Accept with deviation</div><div>Accept conforming</div></div><div class="notice"><b>Release rule:</b> sort and corrective processing require Quality re-evaluation; major defects are not eligible for deviation under the current procedure.</div></div>
      <div class="cq-section" data-cq-panel="quality-cost"><div class="section-title"><h2>Cost of non-quality → Cost Accounting</h2><span>cross-functional trace</span></div><div class="cq-quality-cost">${[['Scrap','Scrap / material loss'],['Sort','Inspection / labor / external sort'],['Rework','Extra material, labor, machine and OH'],['Corrective subcontract','Vendor / freight / service'],['Quality hold','Working capital / inventory aging'],['Customer issue','Claims / credits / logistics / containment']].map(x=>`<div class="card"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div><button class="btn primary" data-jump-l2="R2R|Cost accounting">Open Cost Accounting</button></div>
      <div class="cq-section" data-cq-panel="quality-sources"><div class="section-title"><h2>Source evidence</h2><span>historical + controlled quality documentation</span></div>${sourceLibrary('quality')}</div>
    </div>`;
  }

  function costWorkspace(mode){
    const title=mode==='standard'?'Standard Cost & Production Variance':'Cost Accounting Design Hub';
    const subtitle=mode==='standard'?'P2P execution → product standard → production variances → order close':'R2R hub connecting product costing, actual plant economics, postings, quality costs and the implementation workplan';
    return `<div class="cq-workspace">
      <div class="cq-banner"><div><span>L2 drill-down · ${mode==='standard'?'Plan to Produce':'Record to Report'}</span><h2>${title}</h2><p>${subtitle}</p></div><div class="cq-health"><b>Historical foundation available</b><span>Revalidate before configuration · prioritize data and governance gaps</span></div></div>
      <div class="cq-tabs"><button data-cq-section="triad" class="active">Cost Triad</button><button data-cq-section="work">Workplan</button><button data-cq-section="fit">Fit / Gap</button><button data-cq-section="data">Data Readiness</button><button data-cq-section="variance">Variances</button><button data-cq-section="accounting">Accounting Trace</button><button data-cq-section="sources">Sources</button></div>
      <div class="cq-section active" data-cq-panel="triad"><div class="section-title"><h2>Engineered vs Planned vs Standard Cost</h2><span>three distinct baselines · one controlled bridge</span></div>${costTriad()}${comparisonMatrix()}<div class="cq-related"><b>Related L2</b><button data-jump-l2="P2P|BOM / formula & route">BOM / route</button><button data-jump-l2="P2P|Labor / machine reporting">Labor / machine</button><button data-jump-l2="QM|Quality analytics">Quality / CONQ</button></div></div>
      <div class="cq-section" data-cq-panel="work"><div class="section-title"><h2>Cost & Inventory Design Authority work packages</h2><span>project-management view</span></div>${costWorkPackages(mode==='standard'?'P2P':'R2R')}<div class="notice"><b>Governance:</b> do not create another BPO. Use a cross-functional Cost & Inventory Design Authority with named decision rights across P2P, R2R, S2P, MDM, Quality and Forecast to Plan.</div></div>
      <div class="cq-section" data-cq-panel="fit"><div class="section-title"><h2>Fit-to-standard register</h2><span>standard → configuration → integration → extension</span></div>${fitGapTable()}</div>
      <div class="cq-section" data-cq-panel="data"><div class="section-title"><h2>Data readiness</h2><span>migration and measurement prerequisites</span></div>${dataReadiness()}</div>
      <div class="cq-section" data-cq-panel="variance"><div class="section-title"><h2>Variance center</h2><span>purchasing · production · finance</span></div>${varianceCenter()}</div>
      <div class="cq-section" data-cq-panel="accounting"><div class="section-title"><h2>Business event → accounting trace</h2><span>subledger / voucher design target</span></div>${postingTrace()}<div class="cq-system-flow"><div class="card"><b>Product standard layer</b><span>BOM + Route + Costing Sheet → inventory / COGS + D365 production variances</span></div><i>+</i><div class="card"><b>Actual plant layer</b><span>Payroll + energy + maintenance + indirects → actual Cost accounting → spending / absorption analysis</span></div></div></div>
      <div class="cq-section" data-cq-panel="sources"><div class="section-title"><h2>Source evidence library</h2><span>prior work retained as implementation evidence</span></div>${sourceLibrary('cost')}</div>
    </div>`;
  }

  function genericL2Workspace(streamId,label){
    const rel = (streamId==='P2P' && ['BOM / formula & route','Labor / machine reporting','In-process quality'].includes(label));
    if(rel){
      const links = label==='In-process quality'
        ? `<button class="btn primary" data-jump-l2="QM|In-process quality">Open Quality design hub</button><button class="btn" data-jump-l2="R2R|Cost accounting">Open Cost Accounting</button>`
        : `<button class="btn primary" data-jump-l2="P2P|Production costing / variance">Open Standard Cost</button><button class="btn" data-jump-l2="R2R|Cost accounting">Open Cost Accounting</button>`;
      return `<div class="cq-workspace"><div class="cq-banner"><div><span>L2 drill-down · ${esc(streamId)}</span><h2>${esc(label)}</h2><p>This capability is a dependency of the Cost & Inventory design. Use the linked hub to trace standards, data requirements, fit-gap and accounting impacts.</p></div></div><div class="cq-related big">${links}</div></div>`;
    }
    return `<div class="cq-workspace"><div class="cq-banner"><div><span>L2 drill-down · ${esc(streamId)}</span><h2>${esc(label)}</h2><p>Capability drill-down shell. Link requirements, process maps, tasks, decisions, fit-gap, data objects and UAT evidence here as the design matures.</p></div></div></div>`;
  }

  function l2Workspace(streamId,label){
    if(streamId==='P2P'&&label==='Production costing / variance')return costWorkspace('standard');
    if(streamId==='R2R'&&label==='Cost accounting')return costWorkspace('accounting');
    if(streamId==='QM')return qualityWorkspace(label);
    return genericL2Workspace(streamId,label);
  }

  const _streamOverviewCQ = streamOverview;
  streamOverview = function(s,ps,fs){
    const base=_streamOverviewCQ(s,ps,fs);
    const chips=(s.l2||[]).map((x,i)=>`<button class="cq-l2-card ${cqSelectedL2===`${s.id}|${x}`?'active':''}" data-l2-drill="${esc(s.id)}|${esc(x)}"><span>${esc(s.id)}.L2.${String(i+1).padStart(2,'0')}</span><b>${esc(x)}</b><small>${['Production costing / variance','Cost accounting'].includes(x)||s.id==='QM'?'Detailed design workspace available':'Open L2 drill-down'}</small></button>`).join('');
    const workspace=cqSelectedL2&&cqSelectedL2.startsWith(`${s.id}|`)?l2Workspace(s.id,cqSelectedL2.split('|').slice(1).join('|')):'';
    return `${base}<div class="section-title cq-l2-title"><h2>L2 capability drill-down</h2><span>click a capability to open the project workspace</span></div><div class="cq-l2-grid">${chips}</div>${workspace}`;
  };

  const _streamInventoryCQ = streamInventory;
  streamInventory = function(s,ps,fs){
    const html=_streamInventoryCQ(s,ps,fs);
    const workspace=cqSelectedL2&&cqSelectedL2.startsWith(`${s.id}|`)?l2Workspace(s.id,cqSelectedL2.split('|').slice(1).join('|')):'';
    return html.replaceAll('class="inventory-row"','class="inventory-row cq-inventory-l2"').replace(/<div class="inventory-row cq-inventory-l2"><span>([^<]+)<\/span><b>([^<]+)<\/b><\/div>/g,(m,id,label)=>`<button class="inventory-row cq-inventory-l2" data-l2-drill="${esc(s.id)}|${esc(label)}"><span>${id}</span><b>${label}</b></button>`)+workspace;
  };

  const _renderCockpitCQ = renderCockpit;
  renderCockpit = function(){
    const base=_renderCockpitCQ();
    const critical=COST_WORK.filter(x=>x.priority==='Critical').length;
    const red=DATA_READINESS.filter(x=>String(x[3]).startsWith('Red')).length;
    return `${base}<div class="section-title"><h2>Costing & Quality design readiness</h2><span>new cross-functional drill-downs</span></div><div class="grid two-col"><button class="card cq-exec-card" data-jump-l2="R2R|Cost accounting"><span>Cost Accounting</span><h3>Engineered → Planned → Standard → Actual</h3><p>${critical} critical design packages · ${red} red / red-amber data prerequisites</p><div class="cq-exec-tags"><i>Costing versions</i><i>WIP</i><i>Variances</i><i>Absorption</i></div></button><button class="card cq-exec-card" data-jump-l2="QM|Quality planning"><span>Quality</span><h3>Quality planning → execution → non-conformance → cost of quality</h3><p>${QUALITY_CONTROLS.length} seeded control requirements from controlled procedures</p><div class="cq-exec-tags"><i>Heat treatment</i><i>PPAP</i><i>Quarantine</i><i>CONQ</i></div></button></div>`;
  };

  const _bindPageCQ = bindPage;
  bindPage = function(){
    _bindPageCQ();
    $$('[data-l2-drill]').forEach(b=>b.onclick=()=>{cqSelectedL2=b.dataset.l2Drill;render();setTimeout(()=>$('.cq-workspace')?.scrollIntoView({behavior:'smooth',block:'start'}),30)});
    $$('[data-jump-l2]').forEach(b=>b.onclick=()=>{const [sid,...rest]=b.dataset.jumpL2.split('|');selectedStream=sid;streamTab='overview';cqSelectedL2=`${sid}|${rest.join('|')}`;view='streams';$$('#mainNav button').forEach(x=>x.classList.toggle('active',x.dataset.view==='streams'));render();setTimeout(()=>$('.cq-workspace')?.scrollIntoView({behavior:'smooth',block:'start'}),30)});
    $$('[data-cq-section]').forEach(b=>b.onclick=()=>{const w=b.closest('.cq-workspace'),key=b.dataset.cqSection;$$('[data-cq-section]',w).forEach(x=>x.classList.toggle('active',x===b));$$('[data-cq-panel]',w).forEach(x=>x.classList.toggle('active',x.dataset.cqPanel===key))});
  };
})();
