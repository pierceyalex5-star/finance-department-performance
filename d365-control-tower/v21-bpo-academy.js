(function(){
  'use strict';

  const VERSION='V21';
  const REGISTER_KEY='bpoOffsiteTraining';
  const tr=(en,fr)=>((window.D365_I18N?.language||localStorage.getItem('ifast-d365-language')||'en')==='fr'?fr:en);
  const e=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const d=()=>typeof data==='function'?data():{};

  const STREAMS=[
    {id:'M2O',name:'Market to Order',bpo:'Diane Madeiros',start:'Market / customer opportunity',end:'Accepted customer order',frStart:'Opportunité marché / client',frEnd:'Commande client acceptée'},
    {id:'O2C',name:'Order to Cash',bpo:'Danielle-Dominique Prevost',start:'Accepted customer order',end:'Cash received / applied',frStart:'Commande client acceptée',frEnd:'Encaissement reçu / appliqué'},
    {id:'F2P',name:'Forecast to Plan',bpo:'Martin Despres',start:'Demand signals & planning inputs',end:'Approved supply / planned orders',frStart:'Signaux de demande et intrants',frEnd:'Plan approuvé / ordres planifiés'},
    {id:'P2P',name:'Plan to Produce',bpo:'Louis-Philippe Deragon',start:'Approved production requirement',end:'Finished goods produced, accepted & available',frStart:'Besoin de production approuvé',frEnd:'Produits finis produits, acceptés et disponibles'},
    {id:'S2P',name:'Source to Pay',bpo:'TBD - External Recruit',start:'Requirement for material / service',end:'Supplier obligation settled',frStart:'Besoin de matière / service',frEnd:'Obligation fournisseur réglée'},
    {id:'W2D',name:'Warehouse to Delivery',bpo:'Jacynthe Dupont',start:'Material / product requiring movement',end:'Product delivered',frStart:'Matière / produit à déplacer',frEnd:'Produit livré'},
    {id:'R2R',name:'Record to Report',bpo:'Dimitru Raileanu',start:'Financially relevant transactions',end:'Closed books & approved reporting',frStart:'Transactions à incidence financière',frEnd:'Livres fermés et reporting approuvé'}
  ];

  const XFUNCTIONAL=[
    {id:'MDM',name:'Master Data Management',bpo:'Danielle Jacques',desc:'Governance, ownership, standards, creation, approval, maintenance, quality, reference data, hierarchies, change and security.',fr:'Gouvernance, propriété, normes, création, approbation, maintenance, qualité, données de référence, hiérarchies, changement et sécurité.'},
    {id:'QM',name:'Quality Management',bpo:'Louis-Philippe Corriveau',desc:'Quality planning, specifications, inspection, sampling, non-conformance, corrective actions, supplier, production and customer quality.',fr:'Planification qualité, spécifications, inspection, échantillonnage, non-conformité, actions correctives et qualité fournisseur, production et client.'}
  ];

  const AGENDA=[
    ['08:30','09:00','1','Context & value chain','Contexte et chaîne de valeur','Understand why the program is organized end-to-end and where each BPO is accountable.','Comprendre pourquoi le programme est organisé de bout en bout et où chaque BPO est imputable.'],
    ['09:00','10:00','2','Mission & the BPO mandate','Mission et mandat du BPO','Build the team mission; distinguish accountability from coordination and SME expertise.','Construire la mission d’équipe; distinguer imputabilité, coordination et expertise SME.'],
    ['10:00','10:15','','Break','Pause','',''],
    ['10:15','11:15','3','Control Tower operating system','Système de gestion de la tour de contrôle','Learn the dashboard, hierarchy, source-of-truth rules and workshop lifecycle.','Maîtriser le tableau de bord, la hiérarchie, les sources officielles et le cycle des ateliers.'],
    ['11:15','12:00','4','Process ownership & handoffs','Propriété des processus et passages de relais','Practice L1/L2/L3 thinking and define acceptance at stream boundaries.','Pratiquer la logique L1/L2/L3 et définir l’acceptation aux interfaces.'],
    ['12:00','13:00','','Lunch','Dîner','',''],
    ['13:00','14:00','5','Fit-to-standard, requirements & decisions','Fit-to-standard, exigences et décisions','Turn business facts into requirements, options, decisions and traceable work.','Transformer les faits d’affaires en exigences, options, décisions et travail traçable.'],
    ['14:00','14:45','6','RAID, escalation & governance','RAID, escalade et gouvernance','Calibrate uncertainty and blockers; know when the BPO decides and when Steering must decide.','Calibrer l’incertitude et les blocages; savoir quand le BPO décide et quand le comité doit décider.'],
    ['14:45','15:00','','Break','Pause','',''],
    ['15:00','15:45','7','Data, controls, testing & sign-off','Données, contrôles, essais et approbation','Treat readiness as evidence, not a meeting outcome.','Traiter la préparation comme une preuve, non comme le simple résultat d’une réunion.'],
    ['15:45','16:30','8','Rules of engagement workshop','Atelier des règles d’engagement','Ratify how the BPO team will work, debate, document, escalate and close the loop.','Ratifier la façon de collaborer, débattre, documenter, escalader et fermer la boucle.'],
    ['16:30','17:00','9','Commitments & first 30 days','Engagements et 30 premiers jours','Capture commitments, owners, next actions and the cadence after the offsite.','Capturer les engagements, responsables, prochaines actions et la cadence après l’offsite.']
  ];

  const DEFAULT_MISSION_EN='Design, validate, test and drive adoption of an integrated D365 operating model for IFASTGROUPE, prioritizing enterprise value, business continuity, data quality and effective controls.';
  const DEFAULT_MISSION_FR="Concevoir, valider, tester et faire adopter un modèle opérationnel D365 intégré pour IFASTGROUPE, en privilégiant la valeur d’entreprise, la continuité des opérations, la qualité des données et l’efficacité des contrôles.";
  const DEFAULT_RULES_EN=[
    'Enterprise before function: optimize the end-to-end value stream, not a local department.',
    'Standard before customization: adopt D365 standard where possible; justify every exception.',
    'Interfaces are part of the process: a handoff is not done until the receiver accepts it.',
    'Data and controls are designed early, not added at the end.',
    'Facts before preferences: use volumes, risks, controls, cost, user impact and system capability.',
    'Decide at the lowest competent level; escalate when authority or thresholds are exceeded.',
    'One source of truth: process, requirements, decisions, RAID, tasks and approvals live in the Control Tower.',
    'No silent veto: raise disagreement early, with evidence and a proposed path forward.',
    'Challenge the idea, respect the person.',
    'Adoption is a deliverable: configuration alone is not done.'
  ].join('\n');
  const DEFAULT_RULES_FR=[
    "L’entreprise avant la fonction : optimiser le flux de bout en bout, non un département local.",
    'Le standard avant la personnalisation : adopter le standard D365 lorsque possible et justifier chaque exception.',
    'Les interfaces font partie du processus : un passage de relais est terminé lorsque le receveur l’accepte.',
    'Les données et les contrôles sont conçus tôt, non ajoutés à la fin.',
    'Les faits avant les préférences : utiliser volumes, risques, contrôles, coûts, impacts utilisateurs et capacités système.',
    'Décider au niveau compétent le plus proche; escalader lorsque l’autorité ou les seuils sont dépassés.',
    'Une seule source de vérité : processus, exigences, décisions, RAID, tâches et approbations vivent dans la tour de contrôle.',
    'Pas de veto silencieux : exprimer le désaccord tôt, avec preuves et solution proposée.',
    'Défier l’idée, respecter la personne.',
    'L’adoption est un livrable : la configuration seule ne signifie pas terminé.'
  ].join('\n');

  function saved(){return state.registers?.[REGISTER_KEY]||{};}
  function val(key,fallback=''){const x=saved()[key];return x===undefined||x===null||x===''?fallback:x;}
  function isFr(){return tr('en','fr')==='fr';}
  function missionDefault(){return isFr()?DEFAULT_MISSION_FR:DEFAULT_MISSION_EN;}
  function rulesDefault(){return isFr()?DEFAULT_RULES_FR:DEFAULT_RULES_EN;}

  function liveMetrics(){
    const x=d(),open=t=>!['Closed','Approved','Resolved','Decided','Passed','Complete','Validated'].includes(t.status);
    const tasks=(x.tasks||[]).filter(t=>!['Closed','Approved'].includes(t.status));
    const raid=(x.raid||[]).filter(open);
    const dec=(x.decisions||[]).filter(t=>!['Closed','Decided'].includes(t.status));
    const tests=state.registers?.testScenarios||[];
    const workshops=state.registers?.workshopReadiness||[];
    return {tasks:tasks.length,raid:raid.length,dec:dec.length,tests:tests.length,workshops:workshops.length};
  }

  function navButton(){
    const nav=document.querySelector('#mainNav');
    if(!nav||nav.querySelector('[data-view="bpoacademy"]'))return;
    const b=document.createElement('button');
    b.dataset.view='bpoacademy';b.className='v21-main-nav-academy';b.textContent=tr('BPO Academy','Académie BPO');
    const before=nav.querySelector('[data-view="steering"]');
    if(before)nav.insertBefore(b,before);else nav.appendChild(b);
  }

  function sectionNav(){
    const items=[['valuechain','1',tr('Value chain','Chaîne de valeur')],['mission','2',tr('Mission & role','Mission et rôle')],['dashboard','3',tr('Dashboard','Tableau de bord')],['handoffs','4',tr('Process & handoffs','Processus et relais')],['fit','5',tr('Fit-to-standard','Fit-to-standard')],['raid','6','RAID'],['evidence','7',tr('Evidence & sign-off','Preuves et approbation')],['rules','8',tr('Rules','Règles')],['commit','9',tr('Commitments','Engagements')]];
    return `<div class="v21-section-nav">${items.map(x=>`<button data-academy-anchor="${x[0]}"><span>${x[1]}</span>${e(x[2])}</button>`).join('')}</div>`;
  }

  function valueChain(){
    return `<section class="v21-block" id="v21-valuechain">
      <div class="v21-eyebrow">${tr('INTRODUCTION · SOURCE: IFAST D365 INTRODUCTION, AUGUST 2026','INTRODUCTION · SOURCE : IFAST D365 INTRODUCTION, AOÛT 2026')}</div>
      <div class="v21-heading-row"><div><h2>${tr('IFASTGROUPE D365 Project Structure','Structure du projet D365 IFASTGROUPE')}</h2><p>${tr('The program is organized around seven enterprise value streams, supported by two cross-functional capabilities. BPO assignments remain a project draft until formally ratified.','Le programme est structuré autour de sept chaînes de valeur d’entreprise, soutenues par deux capacités transversales. Les affectations BPO demeurent une version projet jusqu’à ratification formelle.')}</p></div><button class="btn" data-academy-go="streams">${tr('Open Value Streams','Ouvrir les chaînes de valeur')}</button></div>
      <div class="v21-value-layout">
        <div class="v21-xf-col">${XFUNCTIONAL.map(x=>`<div class="v21-xf-card"><span>${e(x.id)}</span><b>${e(x.name)}</b><small>${e(x.bpo)}</small><p>${e(isFr()?x.fr:x.desc)}</p></div>`).join('')}</div>
        <div class="v21-chain">${STREAMS.map((x,i)=>`<button class="v21-stream-card" data-academy-stream="${x.id}"><span class="v21-stream-num">${i+1}</span><strong>${e(x.id)}</strong><b>${e(x.name)}</b><small>${e(x.bpo)}</small><div><em>${tr('Starts','Début')}</em>${e(isFr()?x.frStart:x.start)}</div><div><em>${tr('Ends','Fin')}</em>${e(isFr()?x.frEnd:x.end)}</div></button>`).join('')}</div>
      </div>
      <div class="v21-handoff-strip"><b>${tr('Key rule:','Règle clé :')}</b> ${tr('the BPO owns the end-to-end outcome and its interfaces. The BPO does not personally perform every activity; they mobilize SMEs, arbitrate business choices and obtain the required validations.','le BPO est imputable au résultat de bout en bout et à ses interfaces. Il n’exécute pas personnellement toutes les activités; il mobilise les SME, arbitre les choix d’affaires et obtient les validations requises.')}</div>
    </section>`;
  }

  function agenda(){
    return `<section class="v21-block"><div class="v21-eyebrow">${tr('ONE-DAY OFFSITE','JOURNÉE HORS SITE')}</div><h2>${tr('Training + working session agenda','Agenda de formation + ateliers de travail')}</h2><div class="v21-agenda">${AGENDA.map(a=>`<div class="v21-agenda-row ${a[2]?'':'is-break'}"><time>${a[0]}–${a[1]}</time><span>${a[2]||'•'}</span><div><b>${e(isFr()?a[4]:a[3])}</b>${a[5]||a[6]?`<small>${e(isFr()?a[6]:a[5])}</small>`:''}</div></div>`).join('')}</div></section>`;
  }

  function mission(){
    const m=val('mission',missionDefault()),north=val('northStar',tr('One coherent operating model, reliable data, embedded controls, clear decisions and users ready for go-live.','Un seul modèle opérationnel cohérent, des données fiables, des contrôles intégrés, des décisions claires et des utilisateurs prêts pour la mise en service.'));
    return `<section class="v21-block" id="v21-mission"><div class="v21-eyebrow">MODULE 2 · 09:00</div><h2>${tr('Mission & the BPO mandate','Mission et mandat du BPO')}</h2>
      <div class="v21-grid-2"><div class="v21-card"><h3>${tr('Mission workshop','Atelier de mission')}</h3><p>${tr('Start from the draft below. Debate the words that change behaviour, not cosmetic wording. Finish with one sentence the team can use to make trade-offs.','Partir de l’ébauche ci-dessous. Débattre des mots qui changent les comportements, non des détails cosmétiques. Terminer avec une phrase utilisable pour arbitrer.')}</p><label>${tr('Mission — team draft','Mission — ébauche d’équipe')}</label><textarea id="v21Mission" rows="5">${e(m)}</textarea><label>${tr('North star','Étoile polaire')}</label><textarea id="v21NorthStar" rows="3">${e(north)}</textarea></div>
      <div class="v21-card"><h3>${tr('A good BPO is accountable for…','Un bon BPO est imputable de…')}</h3><ul>${[
        tr('The future end-to-end business process, not the legacy way of working.','Le processus d’affaires futur de bout en bout, non l’ancienne façon de travailler.'),
        tr('Mobilizing the right SMEs and cross-functional owners.','Mobiliser les bons SME et responsables transversaux.'),
        tr('Requirements, data, controls, reports, integrations and test scenarios.','Exigences, données, contrôles, rapports, intégrations et scénarios d’essai.'),
        tr('Making or recommending decisions within the agreed authority.','Prendre ou recommander les décisions dans l’autorité convenue.'),
        tr('Accepting handoffs and signing off only when evidence supports approval.','Accepter les passages de relais et approuver seulement lorsque les preuves le permettent.'),
        tr('Acting for IFASTGROUPE as a whole, not as the advocate of one department.','Agir pour IFASTGROUPE dans son ensemble, non comme porte-parole d’un seul département.')
      ].map(x=>`<li>${e(x)}</li>`).join('')}</ul></div></div>
      <div class="v21-callout"><b>${tr('Role boundary','Limite du rôle')}</b><span>${tr('The Project Manager coordinates the integrated plan; the solution/IT team owns technical feasibility; SMEs supply operational expertise; the BPO retains business-process accountability.','Le chef de projet coordonne le plan intégré; l’équipe solution/TI porte la faisabilité technique; les SME apportent l’expertise opérationnelle; le BPO conserve l’imputabilité du processus d’affaires.')}</span></div>
      <div class="v21-exercise"><b>${tr('Workshop exercise · 25 min','Exercice · 25 min')}</b><p>${tr('In pairs, answer: “What would we do differently if we truly owned the value stream rather than our home department?” Capture 3 behaviours to keep and 3 behaviours to stop.','En dyades, répondre : « Que ferions-nous différemment si nous étions réellement propriétaires du flux plutôt que de notre département d’origine? » Capturer 3 comportements à garder et 3 à arrêter.')}</p></div>
    </section>`;
  }

  function dashboard(){
    const m=liveMetrics();
    const areas=[
      ['businessowner',tr('Business Owner','Propriétaire d’affaires'),tr('Program confidence, gate readiness, exceptions and decisions requiring management attention.','Confiance programme, préparation des jalons, exceptions et décisions exigeant l’attention de la direction.')],
      ['streams',tr('Value Streams','Chaînes de valeur'),tr('Your L1 → L2 → L3 workspace: current state, findings, requirements, BPO/SMEs and work.','Votre espace L1 → L2 → L3 : état actuel, constats, exigences, BPO/SME et travail.')],
      ['d365guide','D365 Guide',tr('How D365 supports each L2, what to design, what data to prepare and the minimum test.','Comment D365 soutient chaque L2, quoi concevoir, quelles données préparer et l’essai minimum.')],
      ['execution',tr('Execution','Exécution'),tr('The measurable work list. Tasks roll up to milestones and must carry owner, dates, progress and evidence.','La liste de travail mesurable. Les tâches remontent aux jalons et doivent avoir responsable, dates, avancement et preuves.')],
      ['governance',tr('Governance','Gouvernance'),tr('RAID, decisions, requirements and automatic Steering escalation rules.','RAID, décisions, exigences et règles d’escalade automatique au comité directeur.')],
      ['architecture',tr('Data & Solution','Données et solution'),tr('Master data, integrations, reports and controls that support design, migration, testing and cutover.','Données maîtres, intégrations, rapports et contrôles soutenant conception, migration, essais et bascule.')],
      ['people',tr('People','Équipe'),tr('Capacity, roles and near-term workload. A BPO can delegate activity, not accountability.','Capacité, rôles et charge à court terme. Un BPO peut déléguer l’activité, non l’imputabilité.')],
      ['roadmap',tr('Roadmap','Feuille de route'),tr('Milestones, stage gates and the integrated work breakdown.','Jalons, portes de phase et découpage intégré du travail.')]
    ];
    return `<section class="v21-block" id="v21-dashboard"><div class="v21-eyebrow">MODULE 3 · 10:15</div><div class="v21-heading-row"><div><h2>${tr('The Control Tower is the operating system','La tour de contrôle est le système de gestion')}</h2><p>${tr('Do not maintain a second shadow tracker for the same information. The dashboard is designed so detail rolls upward instead of being re-entered for management reporting.','Ne maintenez pas un deuxième registre parallèle pour la même information. Le tableau de bord est conçu pour que le détail remonte automatiquement plutôt que d’être ressaisi pour la direction.')}</p></div></div>
      <div class="v21-live-strip"><div><strong>${m.tasks}</strong><span>${tr('open execution tasks','tâches d’exécution ouvertes')}</span></div><div><strong>${m.raid}</strong><span>RAID ${tr('open','ouverts')}</span></div><div><strong>${m.dec}</strong><span>${tr('open decisions','décisions ouvertes')}</span></div><div><strong>${m.workshops}</strong><span>${tr('L2 workshop records','fiches d’ateliers L2')}</span></div><div><strong>${m.tests}</strong><span>${tr('test scenarios','scénarios d’essai')}</span></div></div>
      <div class="v21-area-grid">${areas.map(x=>`<button class="v21-area" data-academy-go="${x[0]}"><b>${e(x[1])}</b><p>${e(x[2])}</p><span>${tr('Open →','Ouvrir →')}</span></button>`).join('')}</div>
      <h3>${tr('The traceability chain you should protect','La chaîne de traçabilité à protéger')}</h3><div class="v21-trace">${['L1 Value Stream','L2 Capability','L3 Process','Finding','Requirement','Fit / Gap','Decision','Execution Task','Test','Readiness','Stage Gate'].map((x,i)=>`<span>${e(tr(x,{'L1 Value Stream':'L1 Chaîne de valeur','L2 Capability':'L2 Capacité','L3 Process':'L3 Processus','Finding':'Constat','Requirement':'Exigence','Decision':'Décision','Execution Task':'Tâche','Test':'Essai','Readiness':'Préparation','Stage Gate':'Porte de phase'}[x]||x))}${i<10?'<i>›</i>':''}</span>`).join('')}</div>
      <div class="v21-exercise"><b>${tr('Hands-on lab · 35 min','Laboratoire pratique · 35 min')}</b><p>${tr('Each BPO opens one L2 in D365 Guide, reviews the design/data/test prompts, starts the workshop, verifies the generated Execution actions, and identifies what evidence would be required to sign the L2 off.','Chaque BPO ouvre un L2 dans le Guide D365, révise les questions conception/données/essai, démarre l’atelier, vérifie les actions générées dans Exécution et identifie les preuves nécessaires pour approuver le L2.')}</p></div>
    </section>`;
  }

  function handoffs(){
    const pairs=[['M2O → O2C',tr('Validated customer, offer, price, commercial/credit terms; accepted order.','Client, offre, prix, conditions commerciales/crédit validés; commande acceptée.')],['O2C → W2D',tr('Execution release, allocation, delivery priorities and instructions.','Libération d’exécution, allocation, priorités et instructions de livraison.')],['F2P → P2P / S2P',tr('Approved demand, supply and production plan; capacity and priorities confirmed.','Plan de demande, d’approvisionnement et de production approuvé; capacité et priorités confirmées.')],['P2P → W2D',tr('Finished goods accepted; quality status, quantity and lot availability clear.','Produits finis acceptés; statut qualité, quantités et lots disponibles clairement définis.')],['S2P ↔ W2D / R2R',tr('PO, physical receipt, supplier invoice match and payable obligation remain synchronized.','Commande fournisseur, réception physique, rapprochement facture et obligation fournisseur synchronisés.')],['W2D → O2C / R2R',tr('Shipment, proof of delivery, returns and events that enable invoicing and accounting.','Expédition, preuve de livraison, retours et événements permettant facturation et comptabilisation.')]];
    return `<section class="v21-block" id="v21-handoffs"><div class="v21-eyebrow">MODULE 4 · 11:15</div><h2>${tr('Own the process—and the handoff','Être propriétaire du processus — et du passage de relais')}</h2><p>${tr('A value stream is not complete just because its internal steps work. The receiving stream must know what it receives, under what acceptance criteria, in what data state, with what controls and how exceptions are handled.','Une chaîne de valeur n’est pas terminée simplement parce que ses étapes internes fonctionnent. Le flux receveur doit savoir ce qu’il reçoit, selon quels critères d’acceptation, dans quel état de données, avec quels contrôles et comment les exceptions sont traitées.')}</p>
      <div class="v21-handoff-grid">${pairs.map(x=>`<div class="v21-card"><b>${e(x[0])}</b><p>${e(x[1])}</p></div>`).join('')}</div>
      <div class="v21-grid-2"><div class="v21-card"><h3>${tr('Workshop Ready','Atelier Ready')}</h3><ul>${[tr('Objective, scope, expected decision and accountable BPO are clear.','Objectif, périmètre, décision attendue et BPO imputable sont clairs.'),tr('Required SMEs, interface owners and cross-functional experts are present.','SME, responsables d’interface et experts transversaux requis sont présents.'),tr('Current process, pain points, exceptions, volumes and constraints are available.','Processus actuel, irritants, exceptions, volumes et contraintes sont disponibles.'),tr('Data, transactions, reports, controls and policies are identified.','Données, transactions, rapports, contrôles et politiques sont identifiés.'),tr('Dependencies and open questions are communicated before the meeting.','Dépendances et questions ouvertes sont communiquées avant la rencontre.')].map(x=>`<li>${e(x)}</li>`).join('')}</ul></div>
      <div class="v21-card"><h3>${tr('Workshop lifecycle in the dashboard','Cycle d’atelier dans le tableau de bord')}</h3><div class="v21-lifecycle">${[tr('Not discussed','Non discuté'),tr('Discussed','Discuté'),tr('Decision required','Décision requise'),tr('Designed','Conçu'),tr('Configured','Configuré'),tr('Tested','Testé'),tr('Signed off','Approuvé')].map((x,i)=>`<span>${e(x)}${i<6?'<i>›</i>':''}</span>`).join('')}</div><p>${tr('Status is a controlled statement of readiness. The system can suggest the next status from decisions, tasks and tests, but the BPO remains accountable for the controlled status and sign-off.','Le statut est une déclaration contrôlée de préparation. Le système peut suggérer le prochain statut selon décisions, tâches et essais, mais le BPO demeure imputable du statut contrôlé et de l’approbation.')}</p></div></div>
      <div class="v21-exercise"><b>${tr('Handoff contract · 30 min','Contrat de passage de relais · 30 min')}</b><p>${tr('Pair each stream with its upstream/downstream neighbour. Pick one high-value handoff. Write: input, acceptance criteria, data, control, exception path, receiver and evidence. If the receiver would not accept it today, create an action, RAID or decision.','Jumeler chaque flux avec son voisin amont/aval. Choisir un passage de relais critique. Écrire : intrant, critères d’acceptation, données, contrôle, traitement des exceptions, receveur et preuve. Si le receveur ne l’accepterait pas aujourd’hui, créer une action, un RAID ou une décision.')}</p></div>
    </section>`;
  }

  function fit(){
    const classifier=[
      [tr('“We found 18% duplicate vendors.”','« Nous avons trouvé 18 % de fournisseurs en double. »'),tr('Finding','Constat')],
      [tr('“The future solution must prevent duplicate active vendors.”','« La solution future doit empêcher les fournisseurs actifs en double. »'),tr('Requirement','Exigence')],
      [tr('“Vendor duplication may prevent migration cycle 1.”','« Les doublons fournisseurs pourraient empêcher le cycle de migration 1. »'),'RAID — Risk'],
      [tr('“Choose standard duplicate detection vs an extension.”','« Choisir la détection standard des doublons ou une extension. »'),tr('Decision','Décision')],
      [tr('“Clean the duplicate vendor population before mock load 1.”','« Nettoyer les fournisseurs en double avant le mock load 1. »'),tr('Execution task','Tâche d’exécution')]
    ];
    return `<section class="v21-block" id="v21-fit"><div class="v21-eyebrow">MODULE 5 · 13:00</div><h2>${tr('Fit-to-standard: translate facts into controlled design','Fit-to-standard : transformer les faits en conception contrôlée')}</h2>
      <div class="v21-grid-3">${[
        [tr('1 · Understand the business outcome','1 · Comprendre le résultat d’affaires'),tr('Start with the outcome, volume, exception, policy, control and user impact—not a requested screen or customization.','Commencer par le résultat, volume, exception, politique, contrôle et impact utilisateur — non par un écran ou une personnalisation demandée.')],
        [tr('2 · Test D365 standard','2 · Tester le standard D365'),tr('Ask how the standard process works, what configuration is available and what business process change it implies.','Demander comment fonctionne le processus standard, quelles configurations existent et quel changement de processus il implique.')],
        [tr('3 · Document the gap only if real','3 · Documenter l’écart seulement s’il est réel'),tr('A gap needs a requirement, evidence, options, impacts and an accountable decision—not preference.','Un écart exige une exigence, des preuves, des options, des impacts et une décision imputable — non une préférence.')]
      ].map(x=>`<div class="v21-card"><h3>${e(x[0])}</h3><p>${e(x[1])}</p></div>`).join('')}</div>
      <h3>${tr('Classify the work correctly','Classer correctement le travail')}</h3><div class="v21-classifier">${classifier.map(x=>`<div><span>${e(x[0])}</span><b>${e(x[1])}</b></div>`).join('')}</div>
      <div class="v21-callout"><b>${tr('Customization discipline','Discipline de personnalisation')}</b><span>${tr('“We do it this way today” is not a requirement. The BPO must separate non-negotiable business need from habit, then compare alternatives using value, controls, risk, user impact, effort and maintainability.','« Nous le faisons comme ça aujourd’hui » n’est pas une exigence. Le BPO doit séparer le besoin d’affaires non négociable de l’habitude, puis comparer les options selon valeur, contrôles, risque, impact utilisateur, effort et maintenabilité.')}</span></div>
      <div class="v21-exercise"><b>${tr('Decision clinic · 35 min','Clinique de décision · 35 min')}</b><p>${tr('Bring one real design question from your stream. Build: problem statement → requirement → standard option → alternative → impacts → recommendation → decision authority → due date. Enter the decision in Governance if it is real.','Apporter une vraie question de conception de votre flux. Construire : problème → exigence → option standard → alternative → impacts → recommandation → autorité de décision → échéance. Saisir la décision dans Gouvernance si elle est réelle.')}</p><button class="btn" data-academy-go="governance">${tr('Open Governance','Ouvrir Gouvernance')}</button></div>
    </section>`;
  }

  function raid(){
    return `<section class="v21-block" id="v21-raid"><div class="v21-eyebrow">MODULE 6 · 14:00</div><h2>${tr('RAID, decisions & escalation','RAID, décisions et escalade')}</h2>
      <div class="v21-raid-grid">${[
        ['Risk',tr('Something may happen. Manage probability and impact before it becomes an issue.','Quelque chose pourrait arriver. Gérer probabilité et impact avant que cela devienne un enjeu.')],
        ['Assumption',tr('Something is being treated as true but must be validated.','Quelque chose est tenu pour vrai mais doit être validé.')],
        ['Issue',tr('The problem exists now and requires containment/resolution.','Le problème existe maintenant et exige confinement/résolution.')],
        ['Dependency',tr('Your outcome depends on another deliverable, decision, team or date.','Votre résultat dépend d’un autre livrable, d’une décision, d’une équipe ou d’une date.')]
      ].map(x=>`<div class="v21-card"><b>${e(x[0])}</b><p>${e(x[1])}</p></div>`).join('')}</div>
      <div class="v21-warning"><b>${tr('Terminology to ratify during the offsite','Terminologie à ratifier pendant l’hors-site')}</b><p>${tr('The current dashboard uses RAID = Risks / Assumptions / Issues / Dependencies. The draft BPO charter glossary currently says “Risques, actions, enjeux et décisions.” These are not the same convention. Select one program definition and update the charter/dashboard wording so the team uses a single vocabulary.','Le tableau de bord actuel utilise RAID = Risks / Assumptions / Issues / Dependencies. Le glossaire de la charte BPO provisoire indique actuellement « Risques, actions, enjeux et décisions ». Ce ne sont pas les mêmes conventions. Choisir une définition programme et aligner la charte/le tableau de bord afin d’utiliser un seul vocabulaire.')}</p></div>
      <div class="v21-grid-2"><div class="v21-card"><h3>${tr('A strong RAID statement','Un bon énoncé RAID')}</h3><p>${tr('Write cause → uncertain/event condition → consequence. Quantify where possible. Name an owner, due date, response and evidence of closure.','Écrire cause → condition/événement → conséquence. Quantifier lorsque possible. Nommer responsable, échéance, réponse et preuve de fermeture.')}</p><blockquote>${tr('“30% of active items are missing a validated UOM conversion; if unresolved by M-04, production migration cannot pass reconciliation.”','« 30 % des articles actifs n’ont pas de conversion UOM validée; si non résolu avant M-04, la migration production ne pourra pas passer la réconciliation. »')}</blockquote></div>
      <div class="v21-card"><h3>${tr('Automatic Steering escalation','Escalade automatique au comité directeur')}</h3><p>${tr('Decisions are evaluated against the Governance thresholds. Current starting thresholds include financial impact, schedule days, number of streams, risk rating, overdue days, enterprise impact, major design deviation, go-live criticality and regulatory/compliance impact. Governance owns the final ratified thresholds.','Les décisions sont évaluées selon les seuils de Gouvernance. Les seuils de départ couvrent notamment impact financier, jours d’échéancier, nombre de flux, niveau de risque, retard, impact entreprise, écart de conception majeur, criticité de mise en service et impact réglementaire/conformité. La Gouvernance doit ratifier les seuils finaux.')}</p><button class="btn" data-academy-go="governance">${tr('Review live thresholds','Voir les seuils en vigueur')}</button></div></div>
      <div class="v21-exercise"><b>${tr('RAID calibration · 25 min','Calibration RAID · 25 min')}</b><p>${tr('Take three current concerns. Decide whether each is a finding, task, RAID or decision. For true RAID, agree type, severity, owner, due date and response. Escalate only when authority/thresholds require it.','Prendre trois préoccupations actuelles. Déterminer si chacune est un constat, une tâche, un RAID ou une décision. Pour les vrais RAID, convenir du type, sévérité, responsable, échéance et réponse. Escalader seulement lorsque l’autorité/les seuils l’exigent.')}</p></div>
    </section>`;
  }

  function evidence(){
    const done=[
      [tr('Future process','Processus futur'),tr('Appropriate-level map, variants, roles, responsibilities and handoffs approved.','Carte au bon niveau, variantes, rôles, responsabilités et passages de relais approuvés.')],
      ['Fit-to-standard',tr('Requirements, decisions, gaps and justification for exceptions documented.','Exigences, décisions, écarts et justification des exceptions documentés.')],
      [tr('Data','Données'),tr('Objects, owners, rules, migration, quality and reconciliation defined.','Objets, propriétaires, règles, migration, qualité et réconciliation définis.')],
      [tr('Controls & access','Contrôles et accès'),tr('Controls, approvals, SoD, compliance and audit trail validated.','Contrôles, approbations, SoD, conformité et piste d’audit validés.')],
      [tr('Solution & information','Solution et information'),tr('Integrations, reports, KPIs, alerts and analytics traced.','Intégrations, rapports, KPI, alertes et besoins analytiques tracés.')],
      [tr('Testing','Essais'),tr('Acceptance criteria, end-to-end scenarios, negative cases and test data prepared.','Critères d’acceptation, scénarios de bout en bout, cas négatifs et données d’essai préparés.')],
      [tr('Change','Changement'),tr('Role, procedure, policy, training, communication and readiness impacts assessed.','Impacts rôles, procédures, politiques, formation, communications et readiness évalués.')],
      [tr('Approval','Approbation'),tr('Decisions closed, residual risks accepted, evidence available and approver identified.','Décisions fermées, risques résiduels acceptés, preuves disponibles et approbateur identifié.')]
    ];
    return `<section class="v21-block" id="v21-evidence"><div class="v21-eyebrow">MODULE 7 · 15:00</div><h2>${tr('Evidence, testing & sign-off','Preuves, essais et approbation')}</h2><div class="v21-definition"><b>${tr('Definition of Done','Définition de Done')}</b><p>${tr('The end of a workshop or the presence of configuration is not approval. Approval requires satisfied criteria, evidence and a named authority.','La fin d’un atelier ou la présence d’une configuration ne valent pas approbation. L’approbation exige des critères satisfaits, des preuves et une autorité nommée.')}</p></div>
      <div class="v21-done-grid">${done.map(x=>`<div><b>${e(x[0])}</b><span>${e(x[1])}</span></div>`).join('')}</div>
      <div class="v21-grid-2"><div class="v21-card"><h3>${tr('Testing mindset','Mentalité d’essai')}</h3><ul>${[tr('Test the business outcome, not only whether a screen saves.','Tester le résultat d’affaires, non seulement si un écran sauvegarde.'),tr('Include end-to-end and cross-stream handoffs.','Inclure les scénarios de bout en bout et les passages inter-flux.'),tr('Include negative cases, exceptions, reversals and controls.','Inclure cas négatifs, exceptions, renversements et contrôles.'),tr('Use representative data and reconcile important quantities/values.','Utiliser des données représentatives et réconcilier les quantités/valeurs importantes.'),tr('Failed tests create traceable defects/actions and block sign-off when material.','Les essais échoués créent des défauts/actions traçables et bloquent l’approbation lorsqu’ils sont significatifs.')].map(x=>`<li>${e(x)}</li>`).join('')}</ul></div>
      <div class="v21-card"><h3>${tr('Task sign-off discipline','Discipline d’approbation des tâches')}</h3><p>${tr('Finished work requires a completion person/date. Approved work requires the completion evidence plus an approver/date. Milestone closure is blocked when linked approved/closed tasks are missing the required sign-off evidence.','Le travail terminé exige une personne/date de complétion. Le travail approuvé exige aussi un approbateur/date. La fermeture d’un jalon est bloquée lorsque les tâches liées approuvées/fermées n’ont pas les preuves d’approbation requises.')}</p><button class="btn" data-academy-go="execution">${tr('Open Execution','Ouvrir Exécution')}</button></div></div>
      <div class="v21-exercise"><b>${tr('Approval challenge · 25 min','Défi d’approbation · 25 min')}</b><p>${tr('Review one item that someone would currently call “done.” Ask for the evidence across process, data, controls, solution, testing, change and approval. Identify what is truly complete versus only discussed/configured.','Réviser un élément que quelqu’un appellerait actuellement « terminé ». Demander les preuves pour processus, données, contrôles, solution, essais, changement et approbation. Identifier ce qui est réellement terminé versus seulement discuté/configuré.')}</p></div>
    </section>`;
  }

  function rules(){
    return `<section class="v21-block" id="v21-rules"><div class="v21-eyebrow">MODULE 8 · 15:45</div><h2>${tr('Rules of engagement workshop','Atelier des règles d’engagement')}</h2><div class="v21-grid-2"><div class="v21-card"><h3>${tr('Starting draft','Ébauche de départ')}</h3><p>${tr('The draft below is based on the BPO team charter. Edit it until the team is willing to be held accountable to it.','L’ébauche ci-dessous est basée sur la charte d’équipe BPO. La modifier jusqu’à ce que l’équipe accepte d’être tenue imputable à ces règles.')}</p><textarea id="v21Rules" rows="16">${e(val('rules',rulesDefault()))}</textarea></div><div class="v21-card"><h3>${tr('Meeting standard to ratify','Standard de rencontre à ratifier')}</h3><ol><li><b>${tr('Before.','Avant.')}</b> ${tr('Agenda, decision expected and prerequisites ideally sent 24h ahead.','Ordre du jour, décision attendue et prérequis idéalement transmis 24 h à l’avance.')}</li><li><b>${tr('During.','Pendant.')}</b> ${tr('Decisions and risks first; information only when it serves the objective.','Décisions et risques d’abord; information seulement lorsqu’elle sert l’objectif.')}</li><li><b>${tr('At the end.','À la fin.')}</b> ${tr('Every action has an owner/date; every decision is recorded and impacted people are identified.','Chaque action a un responsable/date; chaque décision est tracée et les personnes touchées sont identifiées.')}</li><li><b>${tr('After.','Après.')}</b> ${tr('Official registers are updated the same day; absent people use the trace instead of recreating the discussion.','Les registres officiels sont mis à jour le jour même; les absents utilisent la trace plutôt que de recréer la discussion.')}</li></ol><h3>${tr('Non-negotiables','Non négociables')}</h3><ul>${[tr('No shadow source of truth.','Aucune source de vérité parallèle.'),tr('No silent disagreement or late surprise.','Aucun désaccord silencieux ou surprise tardive.'),tr('No sign-off for schedule convenience.','Aucune approbation par convenance d’échéancier.'),tr('No customization without a documented business requirement and alternatives.','Aucune personnalisation sans exigence d’affaires documentée et options comparées.'),tr('No local optimization that breaks the end-to-end flow.','Aucune optimisation locale qui brise le flux de bout en bout.')].map(x=>`<li>${e(x)}</li>`).join('')}</ul></div></div>
      <label>${tr('Parking lot / unresolved rules','Stationnement / règles non résolues')}</label><textarea id="v21Parking" rows="4" placeholder="${e(tr('Capture items that require follow-up authority or further discussion.','Capturer les éléments qui exigent une autorité supérieure ou une discussion additionnelle.'))}">${e(val('parkingLot',''))}</textarea>
    </section>`;
  }

  function commitments(){
    return `<section class="v21-block" id="v21-commit"><div class="v21-eyebrow">MODULE 9 · 16:30</div><h2>${tr('Commitments & the first 30 days','Engagements et 30 premiers jours')}</h2>
      <div class="v21-grid-3">${[
        [tr('Within 48 hours','Dans les 48 heures'),tr('Ratify mission/rules, publish decisions, resolve terminology, assign open actions.','Ratifier mission/règles, publier les décisions, régler la terminologie, assigner les actions ouvertes.')],
        [tr('Within 2 weeks','Dans les 2 semaines'),tr('Every BPO reviews L2 coverage, workshop status, SME coverage, open decisions and near-term capacity.','Chaque BPO révise couverture L2, statut ateliers, couverture SME, décisions ouvertes et capacité à court terme.')],
        [tr('Within 30 days','Dans les 30 jours'),tr('Priority L2 workshops have evidence-backed status; top data objects/controls/tests have owners and dates; RAID is current.','Les ateliers L2 prioritaires ont un statut appuyé par preuves; données/contrôles/essais prioritaires ont responsables et dates; RAID est à jour.')]
      ].map(x=>`<div class="v21-card"><h3>${e(x[0])}</h3><p>${e(x[1])}</p></div>`).join('')}</div>
      <label>${tr('Team commitments / owners / dates','Engagements d’équipe / responsables / dates')}</label><textarea id="v21Commitments" rows="8" placeholder="${e(tr('Example: M2O + O2C — agree accepted-order handoff criteria — Diane / Danielle-Dominique — Aug 28','Exemple : M2O + O2C — convenir des critères du passage commande acceptée — Diane / Danielle-Dominique — 28 août'))}">${e(val('commitments',''))}</textarea>
      <label>${tr('Facilitator notes / decisions from the day','Notes facilitateur / décisions de la journée')}</label><textarea id="v21Notes" rows="6">${e(val('notes',''))}</textarea>
      <div class="v21-savebar"><div><b>${tr('Workshop outputs','Sorties de l’atelier')}</b><span>${saved().updatedAt?`${tr('Last saved','Dernière sauvegarde')} ${e(new Date(saved().updatedAt).toLocaleString())}`:tr('Not yet saved','Pas encore sauvegardé')}</span></div><button class="btn" id="v21Print">${tr('Print / PDF','Imprimer / PDF')}</button><button class="btn primary" id="v21Save">${tr('Save workshop outputs','Sauvegarder les sorties')}</button></div>
    </section>`;
  }

  function knowledge(){
    const qs=[
      [tr('Can a BPO delegate a task?','Un BPO peut-il déléguer une tâche?'),tr('Yes. Activity can be delegated; accountability for the business outcome, decision and approval remains with the BPO.','Oui. L’activité peut être déléguée; l’imputabilité du résultat d’affaires, de la décision et de l’approbation demeure au BPO.')],
      [tr('Is a configured L2 ready for sign-off?','Un L2 configuré est-il prêt à être approuvé?'),tr('Not automatically. Configuration is one step. Required process, data, controls, testing, change and approval evidence must support sign-off.','Pas automatiquement. La configuration est une étape. Les preuves processus, données, contrôles, essais, changement et approbation doivent soutenir l’approbation.')],
      [tr('When should a BPO escalate?','Quand un BPO doit-il escalader?'),tr('When the decision exceeds delegated authority/thresholds, affects multiple streams/entities materially, threatens gate/go-live/control/compliance, or cannot be resolved by the target date.','Lorsque la décision dépasse l’autorité/les seuils délégués, touche significativement plusieurs flux/entités, menace un jalon/go-live/contrôle/conformité ou ne peut être résolue à la date cible.')],
      [tr('What is the source of truth after a workshop?','Quelle est la source de vérité après un atelier?'),tr('The updated Control Tower records: process/finding/requirement/decision/RAID/task/test/sign-off as applicable—not personal notes or parallel trackers.','Les registres mis à jour dans la tour de contrôle : processus/constat/exigence/décision/RAID/tâche/essai/approbation selon le cas — non les notes personnelles ou registres parallèles.')]
    ];
    return `<section class="v21-block"><div class="v21-eyebrow">${tr('END-OF-DAY CHECK','VÉRIFICATION DE FIN DE JOURNÉE')}</div><h2>${tr('BPO knowledge check','Validation des acquis BPO')}</h2><div class="v21-quiz">${qs.map((x,i)=>`<details><summary><span>${i+1}</span>${e(x[0])}</summary><p>${e(x[1])}</p></details>`).join('')}</div></section>`;
  }

  function renderAcademy(){
    return `<div class="v21-academy">
      <div class="v21-hero"><div><span>${VERSION} · IFASTGROUPE D365</span><h1>${tr('BPO Academy · Offsite Playbook','Académie BPO · Guide de la journée hors site')}</h1><p>${tr('One day to build the team mission, ratify the rules of engagement, learn the Control Tower and practice the disciplines that make a Business Process Owner effective.','Une journée pour bâtir la mission d’équipe, ratifier les règles d’engagement, maîtriser la tour de contrôle et pratiquer les disciplines qui rendent un Business Process Owner efficace.')}</p></div><div class="v21-hero-actions"><button class="btn" id="v21PrintTop">${tr('Print / save PDF','Imprimer / enregistrer PDF')}</button><button class="btn primary" data-academy-anchor="mission">${tr('Start the offsite','Commencer la journée')}</button></div></div>
      ${sectionNav()}${valueChain()}${agenda()}${mission()}${dashboard()}${handoffs()}${fit()}${raid()}${evidence()}${rules()}${commitments()}${knowledge()}
      <div class="v21-footer">${tr('Source basis: IFAST D365 Introduction (August 2026), BPO Team Charter draft, and the live Control Tower operating model. Where the source materials use inconsistent terminology, the playbook identifies it for ratification rather than silently choosing a convention.','Sources : IFAST D365 Introduction (août 2026), ébauche de la charte d’équipe BPO et modèle opérationnel de la tour de contrôle. Lorsque les sources utilisent une terminologie incohérente, le guide la signale pour ratification plutôt que de choisir silencieusement une convention.')}</div>
    </div>`;
  }

  function go(target){
    view=target;
    document.querySelectorAll('#mainNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===target));
    render();
  }

  function saveOutputs(){
    state.registers=state.registers||{};
    state.registers[REGISTER_KEY]={
      ...(state.registers[REGISTER_KEY]||{}),
      mission:document.querySelector('#v21Mission')?.value.trim()||'',
      northStar:document.querySelector('#v21NorthStar')?.value.trim()||'',
      rules:document.querySelector('#v21Rules')?.value.trim()||'',
      parkingLot:document.querySelector('#v21Parking')?.value.trim()||'',
      commitments:document.querySelector('#v21Commitments')?.value.trim()||'',
      notes:document.querySelector('#v21Notes')?.value.trim()||'',
      updatedAt:new Date().toISOString(),
      updatedBy:'BPO offsite'
    };
    if(typeof mark==='function')mark('registers');else if(typeof saveLocal==='function')saveLocal();
    const btn=document.querySelector('#v21Save');if(btn){const old=btn.textContent;btn.textContent=tr('Saved ✓','Sauvegardé ✓');setTimeout(()=>btn.textContent=old,1600)}
  }

  function bindAcademy(){
    document.querySelectorAll('[data-academy-anchor]').forEach(b=>b.addEventListener('click',()=>document.querySelector(`#v21-${b.dataset.academyAnchor}`)?.scrollIntoView({behavior:'smooth',block:'start'})));
    document.querySelectorAll('[data-academy-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.academyGo)));
    document.querySelectorAll('[data-academy-stream]').forEach(b=>b.addEventListener('click',()=>{selectedStream=b.dataset.academyStream;streamTab='overview';go('streams')}));
    document.querySelector('#v21Save')?.addEventListener('click',saveOutputs);
    document.querySelector('#v21Print')?.addEventListener('click',()=>window.print());
    document.querySelector('#v21PrintTop')?.addEventListener('click',()=>window.print());
    requestAnimationFrame(()=>window.D365_I18N?.apply?.());
  }

  navButton();
  const previousRender=render;
  render=function(){
    navButton();
    if(view!=='bpoacademy')return previousRender.apply(this,arguments);
    const app=document.querySelector('#app');if(!app)return;
    app.innerHTML=renderAcademy();
    bindAcademy();
    window.scrollTo({top:0,behavior:'instant'});
  };

  window.D365_BPO_ACADEMY={render:renderAcademy,save:saveOutputs,version:VERSION};
})();
