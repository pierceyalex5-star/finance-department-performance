from pathlib import Path
p=Path('cloudflare-worker/src/index.js')
s=p.read_text()
old="""  const message = `Finance close handoff: ${itemName}. ${action.stage} completed by ${completedBy}. Your next step is ${nextStage} for period ${action.period}. Open dashboard: https://pierceyalex5-star.github.io/finance-department-performance/`;
  return { event: 'finance_handoff', recipientEmail, recipientName: owner, itemType, itemName, completedStage: action.stage, nextStage, completedBy, period: action.period, message, dashboardUrl: 'https://pierceyalex5-star.github.io/finance-department-performance/' };
"""
new="""  const message = `Finance close handoff: ${itemName}. ${action.stage} completed by ${completedBy}. Your next step is ${nextStage} for period ${action.period}.`;
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      contentUrl: null,
      content: {
        '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.2',
        body: [
          { type: 'TextBlock', text: recipientEmail, wrap: True },
          { type: 'TextBlock', text: message, wrap: True },
          { type: 'TextBlock', text: owner, wrap: True },
          { type: 'TextBlock', text: itemName, wrap: True },
          { type: 'TextBlock', text: nextStage, wrap: True }
        ],
        actions: [{ type: 'Action.OpenUrl', title: 'Open Finance Dashboard', url: 'https://pierceyalex5-star.github.io/finance-department-performance/' }]
      }
    }]
  };
""".replace('True','true')
if old not in s:
    raise SystemExit('handoff payload block not found')
s=s.replace(old,new,1)
p.write_text(s)
print('patched Teams payload to Adaptive Card schema')
