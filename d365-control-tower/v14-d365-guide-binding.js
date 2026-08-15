(function(){
  'use strict';
  document.addEventListener('click',function(e){
    const b=e.target.closest('.v14-guide-detail [data-jump-l2]');
    if(!b)return;
    const key=b.dataset.jumpL2;
    const source=[...document.querySelectorAll('.v13-l2-cloud [data-jump-l2]')].find(x=>x.dataset.jumpL2===key);
    if(!source)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    source.click();
  },true);
})();
