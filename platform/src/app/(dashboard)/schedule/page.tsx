'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Plus, Trash2, Send } from 'lucide-react'
import type { Content, ScheduledPost, SchedulePlatform } from '@/types'

const PLATFORM_ICONS: Record<SchedulePlatform, React.ReactNode> = {
  instagram: <span className="text-xs font-bold">IG</span>,
  tiktok: <span className="text-xs font-bold">TT</span>,
  youtube: <span className="text-xs font-bold">YT</span>,
  twitter: <span className="text-xs font-bold">X</span>,
  facebook: <span className="text-xs font-bold">FB</span>,
  linkedin: <span className="text-xs font-bold">LI</span>,
}

const ALL_PLATFORMS: SchedulePlatform[] = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin']

export default function SchedulerPage() {
  const supabase = createClient()
  const [content, setContent] = useState<Content[]>([])
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [selectedContent, setSelectedContent] = useState<string>('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<SchedulePlatform[]>([])
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('content').select('id, title, type, thumbnail_url').eq('creator_id', user.id).eq('status', 'published'),
        supabase.from('scheduled_posts').select('*').eq('creator_id', user.id).order('scheduled_at', { ascending: true }),
      ])
      setContent((c ?? []) as Content[])
      setPosts((p ?? []) as ScheduledPost[])
    }
    load()
  }, [])

  function togglePlatform(p: SchedulePlatform) {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  async function handleSchedule() {
    if (!selectedContent || !selectedPlatforms.length || !scheduledAt) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: post } = await supabase.from('scheduled_posts').insert({
      content_id: selectedContent,
      creator_id: user.id,
      platforms: selectedPlatforms,
      caption,
      hashtags: hashtags.split(' ').filter(Boolean),
      scheduled_at: new Date(scheduledAt).toISOString(),
      status: 'pending',
      platform_post_ids: {},
    }).select().single()

    if (post) {
      setPosts(prev => [...prev, post as ScheduledPost].sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      ))
      setSelectedContent('')
      setSelectedPlatforms([])
      setCaption('')
      setHashtags('')
      setScheduledAt('')
    }
    setSubmitting(false)
  }

  async function deletePost(id: string) {
    await supabase.from('scheduled_posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  const statusColor: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'outline'> = {
    pending: 'outline',
    posting: 'warning',
    posted: 'success',
    failed: 'destructive',
    cancelled: 'outline',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Content Scheduler</h1>
        <p className="text-sm text-zinc-400 mt-1">Schedule your content to post automatically across platforms</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4 h-fit">
          <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
            <Plus className="h-4 w-4 text-violet-400" />
            Schedule a Post
          </h2>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">Select Content</label>
            <select
              value={selectedContent}
              onChange={e => setSelectedContent(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <option value="">Choose published content...</option>
              {content.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
                    selectedPlatforms.includes(p)
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {PLATFORM_ICONS[p]}
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">Caption</label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Write your post caption..."
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">Hashtags</label>
            <Input
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
              placeholder="#lofi #beats #music"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">Schedule Date & Time</label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <Button
            onClick={handleSchedule}
            disabled={submitting || !selectedContent || !selectedPlatforms.length || !scheduledAt}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Scheduling...' : 'Schedule Post'}
          </Button>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-violet-400" />
            Scheduled & Recent Posts
          </h2>

          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 py-16 text-center">
              <Clock className="h-8 w-8 text-zinc-600 mb-3" />
              <p className="text-sm font-medium text-zinc-300">No posts scheduled</p>
              <p className="text-xs text-zinc-500 mt-1">Schedule your first post using the form</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <div key={post.id} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusColor[post.status]} className="text-xs">{post.status}</Badge>
                      <div className="flex gap-1">
                        {post.platforms.map(p => (
                          <span key={p} className="text-zinc-500 text-xs capitalize">{p}</span>
                        ))}
                      </div>
                    </div>
                    {post.caption && (
                      <p className="text-sm text-zinc-300 truncate">{post.caption}</p>
                    )}
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(post.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                  {post.status === 'pending' && (
                    <button
                      onClick={() => deletePost(post.id)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
