import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/utils'
import { StatCard } from '@/components/layout/stat-card'
import { DollarSign, Download, TrendingUp, Users, BarChart3, ArrowUpRight } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: content },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from('content')
      .select('id, title, type, download_count, revenue_total_cents, created_at')
      .eq('creator_id', user!.id)
      .eq('status', 'published')
      .order('revenue_total_cents', { ascending: false }),
    supabase
      .from('transactions')
      .select('amount_cents, creator_earnings_cents, created_at, status')
      .eq('creator_id', user!.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const totalRevenue = transactions?.reduce((s, t) => s + t.creator_earnings_cents, 0) ?? 0
  const totalDownloads = content?.reduce((s, c) => s + c.download_count, 0) ?? 0
  const avgOrderValue = transactions?.length
    ? Math.round(transactions.reduce((s, t) => s + t.amount_cents, 0) / transactions.length)
    : 0

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisMonthRevenue = transactions
    ?.filter(t => t.created_at >= thisMonthStart)
    .reduce((s, t) => s + t.creator_earnings_cents, 0) ?? 0

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().split('T')[0]
  })

  const revenueByDay = last30Days.map(date => {
    const dayTotal = transactions
      ?.filter(t => t.created_at.startsWith(date))
      .reduce((s, t) => s + t.creator_earnings_cents, 0) ?? 0
    return { date, value: dayTotal }
  })

  const maxRevenue = Math.max(...revenueByDay.map(d => d.value), 1)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-400 mt-1">Track your content performance and earnings</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="All-time Revenue"
          value={formatCents(totalRevenue)}
          icon={DollarSign}
          iconColor="text-emerald-400"
        />
        <StatCard
          label="This Month"
          value={formatCents(thisMonthRevenue)}
          icon={TrendingUp}
          iconColor="text-violet-400"
        />
        <StatCard
          label="Total Downloads"
          value={totalDownloads.toLocaleString()}
          icon={Download}
          iconColor="text-blue-400"
        />
        <StatCard
          label="Avg. Order Value"
          value={formatCents(avgOrderValue)}
          icon={Users}
          iconColor="text-amber-400"
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-400" />
            Revenue — Last 30 Days
          </h2>
          <span className="text-xs text-zinc-500">{formatCents(totalRevenue)} total (your 80%)</span>
        </div>

        <div className="flex items-end gap-1 h-32">
          {revenueByDay.map(day => (
            <div
              key={day.date}
              className="flex-1 group relative"
              title={`${day.date}: ${formatCents(day.value)}`}
            >
              <div
                className="w-full rounded-t bg-violet-600/60 hover:bg-violet-500 transition-colors"
                style={{ height: `${(day.value / maxRevenue) * 100}%`, minHeight: day.value > 0 ? '3px' : '2px' }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-zinc-800 text-zinc-100 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {day.date.slice(5)}: {formatCents(day.value)}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-2 text-xs text-zinc-600">
          <span>{last30Days[0]?.slice(5)}</span>
          <span>{last30Days[14]?.slice(5)}</span>
          <span>{last30Days[29]?.slice(5)}</span>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="font-semibold text-zinc-100 mb-4">Top Performing Content</h2>
        {content?.length ? (
          <div className="space-y-3">
            {content.slice(0, 10).map((item, i) => (
              <div key={item.id} className="flex items-center gap-4">
                <span className="w-5 text-xs text-zinc-600 font-mono">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{item.title}</p>
                  <p className="text-xs text-zinc-500 capitalize">{item.type}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-emerald-400">{formatCents(item.revenue_total_cents)}</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 justify-end">
                    <Download className="h-3 w-3" />
                    {item.download_count}
                  </p>
                </div>
                <a href={`/content/${item.id}`} className="text-zinc-600 hover:text-violet-400 transition-colors">
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-6">
            Publish content to see performance data
          </p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="font-semibold text-zinc-100 mb-4">Recent Transactions</h2>
        {transactions?.length ? (
          <div className="space-y-2">
            {transactions.slice(0, 15).map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <div>
                  <p className="text-xs text-zinc-500">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-400">+{formatCents(t.creator_earnings_cents)}</p>
                  <p className="text-xs text-zinc-600">of {formatCents(t.amount_cents)} sale</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-6">No sales yet</p>
        )}
      </div>
    </div>
  )
}
