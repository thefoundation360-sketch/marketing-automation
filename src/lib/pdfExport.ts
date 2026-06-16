import { BucketGoal, Profile } from '@/types'
import { GOAL_CATEGORY_ICONS } from './utils'

export function exportBucketListPDF(profile: Profile, goals: BucketGoal[]) {
  const completed = goals.filter(g => g.status === 'completed')
  const active = goals.filter(g => g.status === 'active')

  const completedPercent = goals.length > 0 ? Math.round((completed.length / goals.length) * 100) : 0

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${profile.full_name}'s Bucket List</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #292524; background: #FFFBF7; padding: 40px; max-width: 700px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #fed7aa; }
    .logo { font-size: 24px; font-weight: 800; color: #f97316; margin-bottom: 8px; }
    h1 { font-size: 28px; font-weight: 700; color: #1c1917; margin-bottom: 4px; }
    .subtitle { color: #78716c; font-size: 14px; }
    .stats { display: flex; gap: 24px; justify-content: center; margin: 24px 0; }
    .stat { text-align: center; }
    .stat-number { font-size: 32px; font-weight: 800; color: #f97316; }
    .stat-label { font-size: 12px; color: #78716c; text-transform: uppercase; letter-spacing: 0.05em; }
    .progress-bar { background: #fed7aa; border-radius: 99px; height: 8px; margin: 16px 0; }
    .progress-fill { background: #f97316; border-radius: 99px; height: 8px; width: ${completedPercent}%; }
    .section-title { font-size: 18px; font-weight: 700; color: #1c1917; margin: 32px 0 16px; display: flex; align-items: center; gap: 8px; }
    .goal { background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px; margin-bottom: 10px; display: flex; gap: 12px; align-items: flex-start; }
    .goal.completed { opacity: 0.7; }
    .goal-icon { font-size: 20px; flex-shrink: 0; }
    .goal-title { font-weight: 600; color: #1c1917; font-size: 15px; line-height: 1.4; }
    .goal-title.done { text-decoration: line-through; color: #78716c; }
    .goal-meta { font-size: 12px; color: #a8a29e; margin-top: 4px; }
    .goal-category { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; background: #fff7ed; color: #c2410c; }
    .checkmark { color: #22c55e; font-size: 18px; margin-left: auto; flex-shrink: 0; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e7e5e4; text-align: center; color: #a8a29e; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🔥 DreamMatch</div>
    <h1>${profile.full_name}'s Bucket List</h1>
    <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    <div class="stats">
      <div class="stat"><div class="stat-number">${goals.length}</div><div class="stat-label">Total Dreams</div></div>
      <div class="stat"><div class="stat-number">${completed.length}</div><div class="stat-label">Completed</div></div>
      <div class="stat"><div class="stat-number">${completedPercent}%</div><div class="stat-label">Progress</div></div>
    </div>
    <div class="progress-bar"><div class="progress-fill"></div></div>
  </div>

  ${active.length > 0 ? `
  <div class="section-title">🎯 Active Dreams (${active.length})</div>
  ${active.map(g => `
    <div class="goal">
      <div class="goal-icon">${GOAL_CATEGORY_ICONS[g.category]}</div>
      <div style="flex:1">
        <div class="goal-title">${g.title}</div>
        ${g.description ? `<div class="goal-meta">${g.description}</div>` : ''}
        <div style="margin-top:6px"><span class="goal-category">${g.category}</span></div>
      </div>
    </div>
  `).join('')}
  ` : ''}

  ${completed.length > 0 ? `
  <div class="section-title">✅ Completed Dreams (${completed.length})</div>
  ${completed.map(g => `
    <div class="goal completed">
      <div class="goal-icon">${GOAL_CATEGORY_ICONS[g.category]}</div>
      <div style="flex:1">
        <div class="goal-title done">${g.title}</div>
        ${g.completed_at ? `<div class="goal-meta">Completed ${new Date(g.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>` : ''}
        <div style="margin-top:6px"><span class="goal-category">${g.category}</span></div>
      </div>
      <div class="checkmark">✓</div>
    </div>
  `).join('')}
  ` : ''}

  <div class="footer">
    Created with DreamMatch · Find your people. Chase your dreams.<br>
    dreammatch.app
  </div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) {
    // Fallback: download as HTML file
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${profile.full_name.replace(/\s+/g, '-')}-bucket-list.html`
    a.click()
    URL.revokeObjectURL(url)
    return
  }
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 500)
}
