(()=>{
  // Prevent the intelligence enhancement observer from watching every descendant
  // mutation inside #app. The v3 cycle renderer rewrites an inner panel; observing
  // the full subtree caused a self-triggering render loop in some browsers.
  const NativeMutationObserver = window.MutationObserver;
  if (NativeMutationObserver) {
    window.MutationObserver = class FastenerSafeMutationObserver extends NativeMutationObserver {
      observe(target, options={}) {
        if (target && target.id === 'app' && options.subtree === true) {
          options = {...options, subtree:false};
        }
        return super.observe(target, options);
      }
    };
  }

  // Ensure all generated Trend Lab series are chronological. Some upstream
  // workbooks expose newest-year sheets first, while the charting layer expects
  // oldest -> newest for latest(), YoY and range calculations.
  const series = window.FI_TREND_DATA?.series || {};
  Object.values(series).forEach(s => {
    if (Array.isArray(s?.data)) {
      s.data.sort((a,b) => String(a?.[0]||'').localeCompare(String(b?.[0]||'')));
    }
  });

  // Replace the retired StatCan Québec industrial price pointer with the
  // operational Énergir source used by the live Trend Lab build.
  const D = window.FI_DATA;
  if (D?.sources) {
    D.sources.ENERGIR_GAS = {
      title:'Énergir natural gas price evolution',
      publisher:'Énergir',
      date:'Monthly',
      period:'Monthly history',
      class:'fact',
      kind:'Utility pricing / market data',
      url:'https://energir.com/en/business/customer-centre/billing-and-pricing/pricing',
      usedFor:'Québec natural gas supply-price and market-price history',
      notes:'Official Énergir five-year workbook. Trend Lab tracks regulated supply price, one-year market price and monthly market price separately.'
    };
  }
})();
