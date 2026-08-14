(function(){
  const STORAGE_KEY='ifast-d365-language';
  let currentLang=(localStorage.getItem(STORAGE_KEY)||'en').toLowerCase()==='fr'?'fr':'en';
  const originalText=new WeakMap();
  const originalAttrs=new WeakMap();

  const FR={
    // Shell / navigation
    'IFAST D365 Transformation Control Tower':'Tour de contrôle de la transformation D365 IFAST',
    'GitHub shared · loading':'GitHub partagé · chargement',
    'GitHub sync':'Synchroniser GitHub',
    'Export data':'Exporter les données',
    'Import data':'Importer les données',
    'Refresh deployed':'Actualiser la version déployée',
    'Cockpit':'Cockpit',
    'Business Owner':'Propriétaire d’affaires',
    'Value Streams':'Chaînes de valeur',
    'People':'Équipe',
    'Execution':'Exécution',
    'Governance':'Gouvernance',
    'Data & Solution':'Données et solution',
    'Steering Committee':'Comité directeur',
    'Roadmap':'Feuille de route',

    // Value streams / process framework
    'Market to Order':'Marché à la commande',
    'Order to Cash':'Commande à encaissement',
    'Forecast to Plan':'Prévision à planification',
    'Plan to Produce':'Planification à production',
    'Source to Pay':'Approvisionnement à paiement',
    'Warehouse to Delivery':'Entrepôt à livraison',
    'Record to Report':'Comptabilisation à rapports',
    'Master Data':'Données maîtres',
    'Quality':'Qualité',
    'Market & customer management':'Gestion du marché et des clients',
    'Segmentation':'Segmentation',
    'Product offering':'Offre de produits',
    'Pricing strategy':'Stratégie de prix',
    'Price lists / agreements':'Listes de prix / ententes',
    'RFQ / quotation':'Demande de prix / soumission',
    'Customer onboarding':'Intégration client',
    'Commercial / credit validation':'Validation commerciale / crédit',
    'Contracts':'Contrats',
    'Sales order creation':'Création de commande client',
    'Order validation':'Validation de commande',
    'Order confirmation':'Confirmation de commande',
    'ATP/CTP & promise date':'ATP/CTP et date promise',
    'Allocation':'Allocation',
    'Fulfillment release':'Libération pour exécution',
    'Shipment confirmation':'Confirmation d’expédition',
    'Invoicing':'Facturation',
    'Accounts receivable':'Comptes clients',
    'Collections':'Recouvrement',
    'Cash receipt':'Encaissement',
    'Cash application':'Application des encaissements',
    'Deductions / disputes / credits':'Déductions / litiges / crédits',
    'Historical demand':'Demande historique',
    'Demand intelligence':'Intelligence de la demande',
    'Statistical forecast':'Prévision statistique',
    'Commercial adjustments':'Ajustements commerciaux',
    'Consensus demand plan':'Plan de demande consensuel',
    'Inventory policies':'Politiques d’inventaire',
    'Capacity constraints':'Contraintes de capacité',
    'Supply planning / MRP':'Planification de l’approvisionnement / MRP',
    'Planned production / purchases / transfers':'Production / achats / transferts planifiés',
    'Planning review & approval':'Révision et approbation du plan',
    'Production demand':'Demande de production',
    'BOM / formula & route':'Nomenclature / formule et gamme',
    'Finite / capacity scheduling':'Ordonnancement fini / capacité',
    'Material availability':'Disponibilité des matières',
    'Production order creation':'Création des ordres de production',
    'Material staging':'Mise à disposition des matières',
    'Production execution':'Exécution de production',
    'Labor / machine reporting':'Déclaration main-d’œuvre / machine',
    'In-process quality':'Qualité en cours de production',
    'Finished goods reporting':'Déclaration des produits finis',
    'Production costing / variance':'Coût de production / écarts',
    'Production order close':'Clôture des ordres de production',
    'Supplier strategy':'Stratégie fournisseurs',
    'Supplier qualification':'Qualification fournisseur',
    'Supplier onboarding':'Intégration fournisseur',
    'Sourcing / RFQ':'Sourçage / demande de prix',
    'Contracts & purchasing agreements':'Contrats et ententes d’achat',
    'Requisition':'Réquisition',
    'Purchase order':'Bon de commande',
    'Approvals':'Approbations',
    'Supplier confirmation':'Confirmation fournisseur',
    'Receipt acknowledgment':'Réception / accusé de réception',
    'Supplier invoice':'Facture fournisseur',
    'Matching':'Rapprochement',
    'Payment':'Paiement',
    'Supplier performance':'Performance fournisseur',
    'Inbound planning':'Planification des réceptions',
    'Physical receiving':'Réception physique',
    'Inspection / quarantine':'Inspection / quarantaine',
    'Put-away':'Mise en emplacement',
    'Inventory control':'Contrôle des stocks',
    'Replenishment':'Réapprovisionnement',
    'Order / wave / load planning':'Planification commandes / vagues / chargements',
    'Picking':'Prélèvement',
    'Packing':'Emballage',
    'Staging':'Mise en attente',
    'Transportation planning':'Planification du transport',
    'Loading':'Chargement',
    'Shipping documents':'Documents d’expédition',
    'Shipment':'Expédition',
    'Delivery / POD':'Livraison / preuve de livraison',
    'Physical returns':'Retours physiques',
    'Financial master data':'Données maîtres financières',
    'Subledger accounting':'Comptabilité auxiliaire',
    'GL posting':'Comptabilisation au grand livre',
    'Intercompany':'Intercompagnies',
    'Fixed assets':'Immobilisations',
    'Cost accounting':'Comptabilité de coûts',
    'Accruals':'Charges à payer / régularisations',
    'Allocations':'Allocations',
    'Bank reconciliation':'Rapprochement bancaire',
    'Period close':'Clôture de période',
    'Consolidation':'Consolidation',
    'Financial statements':'États financiers',
    'Management reporting':'Rapports de gestion',
    'Tax / compliance':'Fiscalité / conformité',
    'Audit controls':'Contrôles d’audit',
    'Governance & policies':'Gouvernance et politiques',
    'Data ownership':'Responsabilité des données',
    'Data standards':'Normes de données',
    'Data creation':'Création des données',
    'Approval workflows':'Flux d’approbation',
    'Data maintenance':'Maintenance des données',
    'Data quality':'Qualité des données',
    'Reference data':'Données de référence',
    'Hierarchy management':'Gestion des hiérarchies',
    'Change management':'Gestion du changement',
    'Data security':'Sécurité des données',
    'Quality planning':'Planification qualité',
    'Specifications & standards':'Spécifications et normes',
    'Inspection plans':'Plans d’inspection',
    'Sampling & testing':'Échantillonnage et essais',
    'Non-conformance':'Non-conformité',
    'Corrective actions':'Actions correctives',
    'Supplier quality':'Qualité fournisseur',
    'Finished-product quality':'Qualité des produits finis',
    'Customer quality':'Qualité client',
    'Quality analytics':'Analytique qualité',

    // L3 current-state names
    'Sales Quote':'Soumission client',
    'Sales Order Process':'Processus de commande client',
    'Master Planning':'Planification directrice',
    'Process Specs and BOM':'Spécifications de procédé et nomenclature',
    'Production scheduling':'Ordonnancement de production',
    'Raw Material Planning':'Planification des matières premières',
    'Raw Materials Processing':'Transformation des matières premières',
    'Bolt Making (cold forging)':'Fabrication de boulons (forge à froid)',
    'Nut Making (hot forging)':'Fabrication d’écrous (forge à chaud)',
    'Heat Treat':'Traitement thermique',
    'OPS – Secondary operations':'OPS – Opérations secondaires',
    'Assembly':'Assemblage',
    'Packaging':'Emballage',
    'Tooling':'Outillage',
    'Maintenance':'Maintenance',
    'Non Stock Purchasing':'Achats hors inventaire',
    'Raw Materials Purchasing':'Achats de matières premières',
    'Consumables & Supplies Purchasing':'Achats de consommables et fournitures',
    'Imported Products and InfascoNuts Purchasing (Marieville)':'Achats de produits importés et InfascoNuts (Marieville)',
    'Imported Products Purchasing (DC)':'Achats de produits importés (CD)',
    'Reception of Store and Requisition Goods':'Réception des articles de magasin et de réquisition',
    'Reception of Rods':'Réception des tiges',
    'Reception of Imported Goods':'Réception des marchandises importées',
    'Accounts Payables PO':'Comptes fournisseurs – bons de commande',
    'Accounts Payables AP':'Comptes fournisseurs – factures',
    'Shipping':'Expédition',
    'Pack & Ship':'Emballer et expédier',
    'Accounts Receivables':'Comptes clients',

    // Common project management UI
    'Execution Control':'Contrôle de l’exécution',
    'Single source of truth: findings and manual actions flow from L1 → L2 → L3 → execution task.':'Source unique : les constats et actions manuelles passent de L1 → L2 → L3 → tâche d’exécution.',
    '+ Execution task':'+ Tâche d’exécution',
    'Person':'Personne',
    'All people':'Toutes les personnes',
    'All L1':'Tous les L1',
    'All L2':'Tous les L2',
    'All L3':'Tous les L3',
    'All statuses':'Tous les statuts',
    'L3 / Process':'L3 / Processus',
    'Status':'Statut',
    'Search':'Recherche',
    'Clear':'Effacer',
    'Visible tasks':'Tâches visibles',
    'Open':'Ouvertes',
    'Overdue':'En retard',
    'Blocked':'Bloquées',
    'Execution list':'Liste d’exécution',
    'filter by person and L1/L2/L3 process hierarchy':'filtrer par personne et hiérarchie de processus L1/L2/L3',
    'L1 → L2 → L3 drill-down':'Exploration L1 → L2 → L3',
    'the same tasks, grouped by business-process hierarchy':'les mêmes tâches, regroupées par hiérarchie de processus d’affaires',
    'Task':'Tâche',
    'Tasks':'Tâches',
    'Owner':'Responsable',
    'Priority':'Priorité',
    'Progress':'Avancement',
    'Forecast':'Prévision',
    'Source':'Source',
    'Process':'Processus',
    'Milestone':'Jalon',
    'Milestones':'Jalons',
    'Type':'Type',
    'Phase':'Phase',
    'Dependency':'Dépendance',
    'Dependencies':'Dépendances',
    'Approver':'Approbateur',
    'Start':'Début',
    'Baseline due':'Échéance de référence',
    'Forecast due':'Échéance prévue',
    'Finding / source context':'Contexte du constat / de la source',
    'Blocker / notes':'Blocage / notes',
    'Manual':'Manuel',
    'Unassigned':'Non assigné',
    'Not Started':'Non commencé',
    'In Progress':'En cours',
    'Waiting':'En attente',
    'Ready for Review':'Prêt pour révision',
    'BPO Review':'Révision BPO',
    'Approved':'Approuvé',
    'Closed':'Fermé',
    'Complete':'Terminé',
    'Proposed':'Proposé',
    'At Risk':'À risque',
    'Critical':'Critique',
    'High':'Élevée',
    'Medium':'Moyenne',
    'Low':'Faible',
    'Activity':'Activité',
    'Deliverable':'Livrable',
    'Work Package':'Lot de travail',
    'Workshop':'Atelier',
    'Approval':'Approbation',
    'Finding':'Constat',
    'Pain point':'Point de friction',
    'Opportunity':'Opportunité',
    'Requirement':'Exigence',
    'Requirements':'Exigences',
    'Current-state findings':'Constats de l’état actuel',
    '+ Add finding':'+ Ajouter un constat',
    'Requirements traceability':'Traçabilité des exigences',
    '+ Requirement':'+ Exigence',
    'Generate task':'Générer une tâche',
    'Linked':'Liée',
    'L3 findings → execution':'Constats L3 → exécution',
    'add work directly from the process inventory':'ajouter du travail directement depuis l’inventaire des processus',
    'Findings':'Constats',
    'Execution tasks':'Tâches d’exécution',
    'Default L2':'L2 par défaut',
    'Open findings':'Ouvrir les constats',
    'No execution task is linked to this L3 process yet.':'Aucune tâche d’exécution n’est encore liée à ce processus L3.',
    'L2 capability drill-down':'Exploration des capacités L2',
    'click a capability to open the project workspace':'cliquer sur une capacité pour ouvrir l’espace de travail du projet',
    'Detailed design workspace available':'Espace de conception détaillée disponible',
    'Open L2 drill-down':'Ouvrir l’exploration L2',

    // Milestone / roadmap
    'Milestone Outcome Roll-up':'Sommaire des résultats par jalon',
    'Milestone-driven execution':'Exécution pilotée par les jalons',
    'Task work is the measurable decomposition of each milestone outcome.':'Les tâches constituent la décomposition mesurable du résultat attendu de chaque jalon.',
    'Program Roadmap & Work Breakdown':'Feuille de route du programme et structure de découpage du travail',
    'Program milestones are the parent structure for all value-stream, BPO, SME and Business Owner tasks.':'Les jalons du programme structurent l’ensemble des tâches des chaînes de valeur, BPO, SME et du propriétaire d’affaires.',
    'Integrated program Gantt':'Gantt intégré du programme',
    'milestones with linked tasks':'jalons avec tâches liées',
    'Milestone work breakdown':'Découpage du travail par jalon',
    'expand a milestone to drill down':'développer un jalon pour explorer le détail',
    'Milestone register':'Registre des jalons',
    'Tasks drive milestone completion':'Les tâches déterminent l’achèvement du jalon',
    'Exit criteria / definition of done':'Critères de sortie / définition de terminé',
    'Contribution %':'Contribution %',
    'Milestone contribution %':'Contribution au jalon %',
    'Milestone outcome / exit criterion supported':'Résultat du jalon / critère de sortie soutenu',
    'Outcome progress':'Avancement du résultat',
    'Outcome status':'Statut du résultat',
    'Under-defined':'Sous-défini',
    'Over-allocated':'Suralloué',
    'Not decomposed':'Non décomposé',

    // Cost accounting / standard costing
    'Costing & Quality design readiness':'Préparation de la conception Coûts et Qualité',
    'new cross-functional drill-downs':'nouvelles explorations transversales',
    'Cost Accounting':'Comptabilité de coûts',
    'Engineered → Planned → Standard → Actual':'Ingénierie → Planifié → Standard → Réel',
    'Costing versions':'Versions de coûts',
    'WIP':'En-cours',
    'Variances':'Écarts',
    'Absorption':'Absorption',
    'Quality planning → execution → non-conformance → cost of quality':'Planification qualité → exécution → non-conformité → coût de la qualité',
    'Heat treatment':'Traitement thermique',
    'PPAP':'PPAP',
    'Quarantine':'Quarantaine',
    'CONQ':'Coût de non-qualité',
    'Standard Cost & Production Variance':'Coût standard et écarts de production',
    'Cost Accounting Design Hub':'Centre de conception de la comptabilité de coûts',
    'Historical foundation available':'Fondation historique disponible',
    'Revalidate before configuration · prioritize data and governance gaps':'Revalider avant configuration · prioriser les écarts de données et de gouvernance',
    'Cost Triad':'Triade des coûts',
    'Workplan':'Plan de travail',
    'Fit / Gap':'Adéquation / écarts',
    'Data Readiness':'Préparation des données',
    'Accounting Trace':'Traçabilité comptable',
    'Sources':'Sources',
    'Engineered vs Planned vs Standard Cost':'Coût d’ingénierie vs planifié vs standard',
    'three distinct baselines · one controlled bridge':'trois référentiels distincts · un pont contrôlé',
    'Engineered Cost':'Coût d’ingénierie',
    'Planned Cost':'Coût planifié',
    'Standard Cost':'Coût standard',
    'Technical baseline':'Référentiel technique',
    'Forward-looking management view':'Vue de gestion prospective',
    'Approved accounting baseline':'Référentiel comptable approuvé',
    'What the product should cost technically under an approved engineering design.':'Ce que le produit devrait coûter techniquement selon une conception d’ingénierie approuvée.',
    'What management expects the product to cost for a future period or scenario.':'Ce que la direction prévoit comme coût du produit pour une période ou un scénario futur.',
    'What Finance has approved and frozen for posting.':'Ce que Finance a approuvé et gelé pour la comptabilisation.',
    'Engineering BOM / route':'Nomenclature / gamme d’ingénierie',
    'Technical or validated sustainable machine speed':'Vitesse machine technique ou soutenable validée',
    'Setup, crew, yield and scrap assumptions':'Hypothèses de réglage, équipe, rendement et rebut',
    'Technical material consumption':'Consommation technique de matières',
    'Economic process assumptions':'Hypothèses économiques de procédé',
    'Expected steel / purchased-material cost':'Coût prévu de l’acier / matières achetées',
    'Expected labor and machine rates':'Taux prévus de main-d’œuvre et machine',
    'Expected efficiency and capacity':'Efficacité et capacité prévues',
    'Planned subcontract prices':'Prix planifiés de sous-traitance',
    'Budget / forecast overhead assumptions':'Hypothèses de frais généraux budget / prévision',
    'Approved material standard':'Standard matière approuvé',
    'Approved route / cost-category rates':'Gamme / taux de catégories de coût approuvés',
    'Approved costing-sheet overhead':'Frais généraux de feuille de coûts approuvés',
    'Approved accounting lot size':'Taille de lot comptable approuvée',
    'Controlled effective date / activation':'Date d’effet / activation contrôlée',
    'D365 treatment':'Traitement D365',
    'Actual execution & actual GL spend':'Exécution réelle et dépenses réelles au GL',
    'Work packages':'Lots de travail',
    'Cost & Inventory Design Authority work packages':'Lots de travail de l’autorité de conception Coûts et Inventaire',
    'project-management view':'vue de gestion de projet',
    'Fit-to-standard register':'Registre d’adéquation au standard',
    'standard → configuration → integration → extension':'standard → configuration → intégration → extension',
    'Data readiness':'Préparation des données',
    'migration and measurement prerequisites':'prérequis de migration et de mesure',
    'Variance center':'Centre des écarts',
    'purchasing · production · finance':'achats · production · finance',
    'Business event → accounting trace':'Événement d’affaires → traçabilité comptable',
    'subledger / voucher design target':'cible de conception auxiliaire / pièce comptable',
    'Source evidence library':'Bibliothèque des preuves sources',
    'prior work retained as implementation evidence':'travaux antérieurs conservés comme preuves d’implantation',
    'Purchasing':'Achats',
    'Production':'Production',
    'Finance / plant':'Finance / usine',
    'Purchase price variance':'Écart de prix d’achat',
    'Production quantity / usage':'Écart de quantité / consommation de production',
    'Production price / cost-category rate':'Écart de prix / taux de catégorie de coût',
    'Production substitution':'Substitution de production',
    'Production lot size':'Taille de lot de production',
    'Scrap / yield / rework':'Rebut / rendement / reprise',
    'Labor spending':'Écart de dépenses de main-d’œuvre',
    'Energy spending':'Écart de dépenses d’énergie',
    'Maintenance spending':'Écart de dépenses de maintenance',
    'Fixed-OH spending':'Écart de frais généraux fixes',
    'Volume / absorption':'Volume / absorption',
    'Over / under absorption':'Sur / sous-absorption',
    'Product standard layer':'Couche coût standard produit',
    'Actual plant layer':'Couche coûts réels usine',

    // Cost work package titles
    'Validate inventory block / WIP architecture':'Valider l’architecture des blocs d’inventaire / en-cours',
    'Define engineered, planned and standard cost governance':'Définir la gouvernance des coûts d’ingénierie, planifié et standard',
    'Define UOM / weight / piece architecture':'Définir l’architecture UDM / poids / pièces',
    'Validate BOM, route and resource hierarchy':'Valider la hiérarchie nomenclature, gamme et ressources',
    'Establish engineering standards for rates, yields and setup':'Établir les standards d’ingénierie pour les taux, rendements et réglages',
    'Capture actual machine and labor execution':'Capturer l’exécution réelle machine et main-d’œuvre',
    'Define standard overhead and normal-capacity methodology':'Définir la méthode de frais généraux standard et de capacité normale',
    'Design actual cost accounting and allocation bases':'Concevoir la comptabilité de coûts réels et les bases d’allocation',
    'Design subcontract coating and external processing':'Concevoir la sous-traitance de revêtement et les opérations externes',
    'Resolve Galvano legal-entity / site operating model':'Résoudre le modèle opérationnel Galvano – entité juridique / site',
    'Design GL posting, absorption and variance structure':'Concevoir la structure de comptabilisation GL, absorption et écarts',
    'Define cost of non-quality accounting':'Définir la comptabilisation du coût de non-qualité',
    'Design cross-company lot genealogy':'Concevoir la généalogie des lots intercompagnies',
    'Validate standard-cost activation and revaluation governance':'Valider la gouvernance d’activation et de réévaluation du coût standard',
    'Decision required':'Décision requise',
    'Open gap':'Écart ouvert',
    'Revalidate prior design':'Revalider la conception antérieure',
    'Data validation required':'Validation des données requise',
    'Integration candidate':'Candidat à l’intégration',
    'Prior work available':'Travaux antérieurs disponibles',
    'Cross-functional design':'Conception transversale',

    // Quality hub
    'Quality design hub':'Centre de conception Qualité',
    'Fit-to-standard first':'Priorité au standard D365',
    'Quality orders · blocking · nonconformance · controlled integration':'Ordres qualité · blocage · non-conformité · intégration contrôlée',
    'Controls':'Contrôles',
    'Heat Treatment':'Traitement thermique',
    'Cost of Quality':'Coût de la qualité',
    'Quality control requirements':'Exigences de contrôle qualité',
    'Control':'Contrôle',
    'Target rule':'Règle cible',
    'Evidence':'Preuve',
    'Heat-treatment system boundary':'Frontière système du traitement thermique',
    'D365 context · furnace/MES execution':'contexte D365 · exécution four/MES',
    'D365 owns':'D365 gère',
    'Furnace / GSP / MES owns':'Four / GSP / MES gère',
    'Controlled recipe dimensions already documented':'Dimensions de recettes contrôlées déjà documentées',
    'Loading rate':'Taux de chargement',
    'Separation time':'Temps de séparation',
    'Furnace zones / temperature':'Zones du four / température',
    'Carbon %':'Carbone %',
    'Conveyor time':'Temps de convoyeur',
    'Quench oil':'Huile de trempe',
    'Tempering':'Revenu',
    'OF-specific instructions':'Instructions propres à l’OF',
    'PPAP / product requirements':'PPAP / exigences produit',
    'Non-conformance disposition':'Disposition des non-conformités',
    'controlled workflow':'flux contrôlé',
    'Suspect / unidentified product':'Produit suspect / non identifié',
    'Quarantine / block':'Quarantaine / blocage',
    'Authorized Quality review':'Révision par Qualité autorisée',
    'Scrap':'Rebut',
    'Sort':'Tri',
    'Corrective processing / rework':'Traitement correctif / reprise',
    'Accept with deviation':'Accepter avec dérogation',
    'Accept conforming':'Accepter conforme',
    'Cost of non-quality → Cost Accounting':'Coût de non-qualité → Comptabilité de coûts',
    'cross-functional trace':'traçabilité transversale',
    'External corrective work':'Travaux correctifs externes',
    'Quality hold':'Blocage qualité',
    'Customer issue':'Problème client',
    'Open Cost Accounting':'Ouvrir la Comptabilité de coûts',
    'Source evidence':'Preuves sources',
    'historical + controlled quality documentation':'documentation qualité historique + contrôlée',

    // Generic dashboard concepts
    'Overview':'Vue d’ensemble',
    'Inventory':'Inventaire',
    'Current State':'État actuel',
    'Target State':'État cible',
    'Risks':'Risques',
    'Risk':'Risque',
    'Opportunities':'Opportunités',
    'Decisions':'Décisions',
    'Decision':'Décision',
    'Issues':'Problèmes',
    'Issue':'Problème',
    'Controls':'Contrôles',
    'Reports':'Rapports',
    'Interfaces':'Interfaces',
    'Systems':'Systèmes',
    'BPO':'BPO',
    'SME':'SME',
    'Role':'Rôle',
    'Capacity':'Capacité',
    'Due':'Échéance',
    'Description':'Description',
    'Impact':'Impact',
    'Action':'Action',
    'Actions':'Actions',
    'Open tasks':'Tâches ouvertes',
    'current workload':'charge de travail actuelle',
    'forecast date passed':'date prévue dépassée',
    'requires intervention':'intervention requise',
    'tasks without milestone':'tâches sans jalon',
    'No due date':'Aucune échéance',
    'No date':'Aucune date',
    'No tasks match the current filters.':'Aucune tâche ne correspond aux filtres actuels.',
    'No linked tasks yet. Add a task and select this milestone.':'Aucune tâche liée pour l’instant. Ajoutez une tâche et sélectionnez ce jalon.'
  };

  function dynamicFr(s){
    let m;
    if((m=s.match(/^(\d+) tasks?$/i))) return `${m[1]} tâche${m[1]==='1'?'':'s'}`;
    if((m=s.match(/^(\d+) execution tasks?$/i))) return `${m[1]} tâche${m[1]==='1'?'':'s'} d’exécution`;
    if((m=s.match(/^(\d+) findings?$/i))) return `${m[1]} constat${m[1]==='1'?'':'s'}`;
    if((m=s.match(/^(\d+) controls? in this view$/i))) return `${m[1]} contrôle${m[1]==='1'?'':'s'} dans cette vue`;
    if((m=s.match(/^(\d+) total$/i))) return `${m[1]} au total`;
    if((m=s.match(/^(.+) · (\d+) current$/i))) return `${m[1]} · ${m[2]} actuellement`;
    if((m=s.match(/^(\d+) critical design packages · (\d+) red \/ red-amber data prerequisites$/i))) return `${m[1]} lots de conception critiques · ${m[2]} prérequis de données rouge / rouge-ambre`;
    return null;
  }

  function translateString(s){
    if(currentLang!=='fr') return s;
    const key=String(s||'').trim();
    if(!key) return s;
    const exact=FR[key];
    if(exact) return s.replace(key,exact);
    const dyn=dynamicFr(key);
    if(dyn) return s.replace(key,dyn);
    return s;
  }

  function rememberAttr(el,name){
    let map=originalAttrs.get(el);if(!map){map={};originalAttrs.set(el,map)}
    if(!(name in map)) map[name]=el.getAttribute(name);
    return map[name];
  }

  function applyNode(node){
    if(node.nodeType===Node.TEXT_NODE){
      if(!originalText.has(node)) originalText.set(node,node.nodeValue);
      const base=originalText.get(node);
      node.nodeValue=currentLang==='fr'?translateString(base):base;
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE) return;
    const tag=node.tagName;
    if(['SCRIPT','STYLE','TEXTAREA'].includes(tag)) return;
    ['placeholder','title','aria-label'].forEach(a=>{if(node.hasAttribute(a)){const base=rememberAttr(node,a);node.setAttribute(a,currentLang==='fr'?translateString(base):base)}});
    Array.from(node.childNodes).forEach(applyNode);
  }

  function ensureToggle(){
    const actions=document.querySelector('.top-actions');if(!actions)return;
    let wrap=document.getElementById('d365LanguageToggle');
    if(!wrap){
      wrap=document.createElement('div');wrap.id='d365LanguageToggle';wrap.className='lang-toggle';wrap.setAttribute('role','group');wrap.setAttribute('aria-label','Language / Langue');
      wrap.innerHTML='<button type="button" data-lang="en">EN</button><button type="button" data-lang="fr">FR</button>';
      actions.insertBefore(wrap,actions.firstChild);
      wrap.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
    }
    wrap.querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b.dataset.lang===currentLang);b.setAttribute('aria-pressed',b.dataset.lang===currentLang?'true':'false')});
  }

  function applyLanguage(){
    ensureToggle();
    document.documentElement.lang=currentLang==='fr'?'fr':'en';
    document.title=currentLang==='fr'?'Tour de contrôle de la transformation D365 IFAST':'IFAST D365 Transformation Control Tower';
    applyNode(document.querySelector('.topbar'));
    applyNode(document.getElementById('mainNav'));
    applyNode(document.getElementById('app'));
    ensureToggle();
    const mode=document.getElementById('dataMode');
    if(mode&&currentLang==='fr'&&/GitHub shared/i.test(mode.textContent)) mode.textContent=mode.textContent.replace('GitHub shared','GitHub partagé').replace('loading','chargement');
  }

  function setLanguage(lang){
    const next=lang==='fr'?'fr':'en';if(next===currentLang){applyLanguage();return}
    currentLang=next;localStorage.setItem(STORAGE_KEY,currentLang);
    if(typeof render==='function') render(); else applyLanguage();
  }

  window.D365_I18N={get language(){return currentLang},setLanguage,t:(en)=>currentLang==='fr'?(FR[en]||dynamicFr(en)||en):en,apply:applyLanguage};

  const priorRender=window.render;
  if(typeof priorRender==='function'){
    window.render=function(){const out=priorRender.apply(this,arguments);requestAnimationFrame(applyLanguage);return out};
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(applyLanguage));
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',applyLanguage);
  setTimeout(applyLanguage,100);
})();
