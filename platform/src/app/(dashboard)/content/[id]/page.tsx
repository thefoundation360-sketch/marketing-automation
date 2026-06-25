import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCents, formatFileSize } from '@/lib/utils'
import {
  ArrowLeft,
  Download,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Send,
  CheckCircle2,
} from 'lucide-react'
import type { Content, ContentStatus } from '@/types'

const STATUS_VARIANT: Record<ContentStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  draft: 'outline',
  processing: 'warning',
  published: 'success',
  scheduled: 'secondary',
  archived: 'outline',
}

export default async function ContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ uploaded?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params
  const { uploaded } = await searchParams

  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('id', id)
    .eq('creator_id', user!.id)
    .single() as { data: Content | null }

  if (!content) notFound()

  const { data: scheduledPosts } = await supabase
    .from('scheduled_posts')
    .select('id, platforms, scheduled_at, status')
    .eq('content_id', id)
    .order('scheduled_at', { ascending: false })
    .limit(5)

  async function publishContent() {
    'use server'
    const supabase = await createClient()
    await supabase
      .from('content')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', id)
    redirect(`/content/${id}`)
  }

  async function archiveContent() {
    'use server'
    const supabase = await createClient()
    await supabase.from('content').update({ status: 'archived' }).eq('id', id)
    redirect('/content')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {uploaded && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Content published successfully! It&apos;s now live in the marketplace.
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link href="/content" className="text-zinc-500 hover:text-zinc-200 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-zinc-100 flex-1 truncate">{content.title}</h1>
        <Badge variant={STATUS_VARIANT[content.status]}>{content.status}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {content.thumbnail_url && (
            <div className="aspect-video rounded-xl overflow-hidden bg-zinc-800">
              <img src={content.thumbnail_url} alt={content.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {content.description ?? <span className="text-zinc-600 italic">No description added</span>}
              </p>
            </div>

            {content.tags.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {content.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500">Type</p>
                <p className="text-sm text-zinc-200 capitalize">{content.type}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">License</p>
                <p className="text-sm text-zinc-200 capitalize">{content.license_type}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Price</p>
                <p className="text-sm text-zinc-200">
                  {content.price_cents === 0 ? 'Free' : formatCents(content.price_cents)}
                </p>
              </div>
              {typeof content.metadata?.file_size === 'number' && (
                <div>
                  <p className="text-xs text-zinc-500">File size</p>
                  <p className="text-sm text-zinc-200">{formatFileSize(content.metadata.file_size)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-zinc-500">Published</p>
                <p className="text-sm text-zinc-200">
                  {content.published_at
                    ? new Date(content.published_at).toLocaleDateString()
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="font-medium text-zinc-100 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-violet-400" />
              Scheduled Posts
            </h2>
            {scheduledPosts?.length ? (
              <div className="space-y-2">
                {scheduledPosts.map(post => (
                  <div key={post.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">{post.platforms.join(', ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 text-xs">{new Date(post.scheduled_at).toLocaleString()}</span>
                      <Badge variant={post.status === 'posted' ? 'success' : post.status === 'failed' ? 'destructive' : 'outline'} className="text-xs">
                        {post.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Not scheduled.{' '}
                <Link href="/schedule" className="text-violet-400 hover:underline">Schedule a post</Link>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
            <h2 className="font-medium text-zinc-100">Performance</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                  <Download className="h-3 w-3" /> Downloads
                </span>
                <span className="text-sm font-medium text-zinc-200">{content.download_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" /> Revenue earned
                </span>
                <span className="text-sm font-medium text-emerald-400">
                  {formatCents(content.revenue_total_cents)}
                </span>
              </div>
              {content.price_cents > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <Eye className="h-3 w-3" /> Conv. rate
                  </span>
                  <span className="text-sm font-medium text-zinc-200">
                    {content.download_count > 0 ? '—' : '0%'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
            <h2 className="font-medium text-zinc-100 mb-3">Actions</h2>

            {content.status === 'draft' && (
              <form action={publishContent}>
                <Button type="submit" className="w-full" size="sm">
                  <Send className="h-3.5 w-3.5 mr-2" />
                  Publish Now
                </Button>
              </form>
            )}

            {content.file_url && (
              <a href={content.file_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Download File
                </Button>
              </a>
            )}

            {content.status === 'published' && (
              <Link href={`/marketplace/${content.id}`}>
                <Button variant="ghost" size="sm" className="w-full">
                  <Eye className="h-3.5 w-3.5 mr-2" />
                  View in Marketplace
                </Button>
              </Link>
            )}

            <Link href="/schedule">
              <Button variant="ghost" size="sm" className="w-full">
                <Calendar className="h-3.5 w-3.5 mr-2" />
                Schedule Post
              </Button>
            </Link>

            {content.status !== 'archived' && (
              <form action={archiveContent}>
                <Button type="submit" variant="ghost" size="sm" className="w-full text-zinc-500 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Archive
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
