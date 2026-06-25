import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/layout/stat-card'
import { formatCents } from '@/lib/utils'
import {
  DollarSign,
  Download,
  FileVideo,
  TrendingUp,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const { data: contentStats } = await supabase
    .from('content')
    .select('id, download_count, revenue_total_cents, status')
    .eq('creator_id', user!.id)

  const totalRevenue = contentStats?.reduce((s, c) => s + (c.revenue_total_cents ?? 0), 0) ?? 0
  const totalDownloads = contentStats?.reduce((s, c) => s + (c.download_count ?? 0), 0) ?? 0
  const publishedCount = contentStats?.filter(c => c.status === 'published').length ?? 0

  const { data: recentContent } = await supabase
    .from('content')
    .select('id, title, type, status, download_count, revenue_total_cents, created_at')
    .eq('creator_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: upcomingPosts } = await supabase
    .from('scheduled_posts')
    .select('id, content_id, platforms, scheduled_at, status')
    .eq('creator_id', user!.id)
    .eq('status', 'pending')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(3)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Creator'}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Here&apos;s what&apos;s happening with your content</p>
        </div>
        <Link href="/content/upload">
          <Button>Upload Content</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCents(totalRevenue)}
          change="12%"
          positive
          icon={DollarSign}
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Total Downloads"
          value={totalDownloads.toLocaleString()}
          change="8%"
          positive
          icon={Download}
          iconColor="text-blue-400"
        />
        <StatCard
          label="Published Content"
          value={publishedCount.toString()}
          icon={FileVideo}
          iconColor="text-violet-400"
        />
        <StatCard
          label="Pending Payout"
          value={formatCents(profile?.payout_pending_cents ?? 0)}
          icon={TrendingUp}
          iconColor="text-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-zinc-100">Recent Content</h2>
            <Link href="/content" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentContent?.length ? recentContent.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{c.title}</p>
                  <p className="text-xs text-zinc-500 capitalize">{c.type} · {c.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-400">{formatCents(c.revenue_total_cents)}</p>
                  <p className="text-xs text-zinc-500">{c.download_count} downloads</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-zinc-500 text-center py-4">
                No content yet.{' '}
                <Link href="/content/upload" className="text-violet-400 hover:underline">Upload your first piece</Link>
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-zinc-100">Upcoming Scheduled Posts</h2>
            <Link href="/schedule" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingPosts?.length ? upcomingPosts.map(post => (
              <div key={post.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                <Calendar className="h-4 w-4 text-violet-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{post.platforms.join(', ')}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(post.scheduled_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-zinc-500 text-center py-4">
                No scheduled posts.{' '}
                <Link href="/schedule" className="text-violet-400 hover:underline">Schedule now</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
