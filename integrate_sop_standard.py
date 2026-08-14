from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
marker = '<script src="./auto-sync.js"></script>'
if 'fct-sop-standard-inline' in s:
    raise SystemExit(0)
addon = '''<script id="fct-sop-standard-inline">
(function(){
  "use strict";
  const sections = [
    ["1. Document control and approval", "Process / sub-process; Process owner; SOP owner / preparer; Reviewer; Approver; Backup owner; Frequency; Effective date; Next review date; Related policy / control; Approval record; Version history."],
    ["2. Purpose and expected outcome", "Purpose; Expected outcome; financial-statement assertion / control objective; measurable success criteria."],
    ["3. Scope and process boundaries", "In scope; Out of scope; Start point / trigger; End point; Materiality / threshold; Applicable framework."],
    ["4. Governance and segregation of duties", "Process owner, preparer, reviewer, approver and backup responsibilities; required access; independence requirements."],
    ["5. Definitions, systems, and access", "Definitions and abbreviations; source of truth; systems, reports, workbooks, workflow/archive locations; access controls."],
    ["6. Frequency, timing, and dependencies", "Frequency; deadline; trigger; upstream dependencies; downstream consumers; blackout / cut-off."],
    ["7. Inputs and prerequisites", "Input; source / owner; due / cut-off; validation before use; missing-input action."],
    ["8. Detailed procedure", "For each step: timing, owner, action and completion criteria, system/report, evidence, and control reference. Screenshots supplement written instructions."],
    ["9. Accounting treatment and journal entries", "Recognition and measurement; cut-off; classification; currency; tax; intercompany; estimates; reversals; JE template; balancing and required support. Mark N/A where the process does not create or review entries."],
    ["10. Reconciliation and close integration", "Population; source-to-ledger agreement; reconciling items; tolerance; reviewer procedures; certification; post-close follow-up."],
    ["11. Risks, controls, evidence, and sign-off", "Risk/control matrix; evidence standards; reviewer scope, precision, evidence and deadline."],
    ["12. Exceptions and escalation", "Exception/trigger; immediate action; owner; escalation point; deadline; required evidence."],
    ["13. Outputs, KPIs, retention, and continuity", "Outputs/downstream communication; performance measures; record retention; legal hold/privacy; business continuity and backup."],
    ["14. Testing, training, and appendices", "Periodic testing and review; training; change triggers; RACI; execution/sign-off checklist; period sign-off; process-specific references."]
  ];
  window.openFinanceSOPTemplate = function(){
    const cards = sections.map(function(x){ return '<div class="card" style="padding:11px"><b>'+x[0]+'</b><div class="small" style="margin-top:4px">'+x[1]+'</div></div>'; }).join('');
    const body = '<div class="help"><b>Finance SOP standard</b><br>This structure is based on the approved Finance SOP template. Create the controlled Word SOP in the approved repository, then paste its SharePoint/OneDrive link into the task or deliverable SOP field.</div>' +
      '<div style="display:grid;gap:10px;margin-top:12px">'+cards+'</div>' +
      '<div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">Close</button></div>';
    openModal('Finance SOP template', body, async function(){});
  };
  if (typeof sopButton === 'function') {
    sopButton = function(u){
      const href = safeSOPUrl(u);
      const open = href ? '<a class="btn ghost" href="'+esc(href)+'" target="_blank" rel="noopener">Open SOP</a>' : '';
      return '<span style="display:flex;gap:5px;flex-wrap:wrap">'+open+'<button type="button" class="btn ghost" onclick="openFinanceSOPTemplate()">Template</button></span>';
    };
  }
  function addSopSettingsCard(){
    const settings = document.getElementById('settings');
    if (!settings || document.getElementById('sopStandardCard')) return;
    settings.insertAdjacentHTML('beforeend','<div class="section"><h2>SOP standard</h2></div><div id="sopStandardCard" class="card"><div class="kpi-label">Finance SOP template</div><div style="margin:7px 0 10px">All task and deliverable SOPs should follow the controlled Finance SOP structure: governance, procedure, controls, evidence, exceptions, KPIs, retention and continuity.</div><button type="button" class="btn secondary" onclick="openFinanceSOPTemplate()">Open SOP template structure</button></div>');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(addSopSettingsCard,500); });
  else setTimeout(addSopSettingsCard,500);
})();
</script>
'''
if marker not in s:
    raise SystemExit('auto-sync marker not found')
s = s.replace(marker, addon + marker, 1)
p.write_text(s, encoding='utf-8')
