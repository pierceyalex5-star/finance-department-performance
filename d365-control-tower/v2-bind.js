const _bindPageV1=bindPage;
bindPage=function(){
  _bindPageV1();
  $('#editProcessGate')?.addEventListener('click',editProcess);
  $$('[data-edit-raid]').forEach(x=>x.onclick=()=>editRaid(x.dataset.editRaid));$('#addRaid')?.addEventListener('click',()=>editRaid());
  $$('[data-edit-escalation]').forEach(x=>x.onclick=()=>editEscalation(x.dataset.editEscalation));$('#addEscalation')?.addEventListener('click',()=>editEscalation());
  $$('[data-edit-data]').forEach(x=>x.onclick=()=>editDataObject(x.dataset.editData));$('#addDataObject')?.addEventListener('click',()=>editDataObject());
  $$('[data-edit-integration]').forEach(x=>x.onclick=()=>editIntegration(x.dataset.editIntegration));$('#addIntegration')?.addEventListener('click',()=>editIntegration());
  $$('[data-edit-report]').forEach(x=>x.onclick=()=>editReport(x.dataset.editReport));$('#addReport')?.addEventListener('click',()=>editReport());
  $$('[data-edit-control]').forEach(x=>x.onclick=()=>editControl(x.dataset.editControl));$('#addControl')?.addEventListener('click',()=>editControl());
};
