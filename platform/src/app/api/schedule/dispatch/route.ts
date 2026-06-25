import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Called by a cron job every 5 minutes (Vercel Cron / external scheduler)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

  const { data: duePosts } = await supabase
    .from('scheduled_posts')
    .select(`
      *,
      content:content_id (title, file_url, thumbnail_url, description, tags),
      creator:creator_id (
        platform_tokens:social_connections (platform, access_token, account_id)
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', now.toISOString())
    .gte('scheduled_at', fiveMinutesAgo.toISOString())

  if (!duePosts?.length) {
    return NextResponse.json({ dispatched: 0 })
  }

  const results = await Promise.allSettled(
    duePosts.map(async (post) => {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'posting' })
        .eq('id', post.id)

      const platformPostIds: Record<string, string> = {}
      const errors: string[] = []

      for (const platform of post.platforms) {
        try {
          const result = await postToPlatform(platform, post)
          if (result.postId) platformPostIds[platform] = result.postId
        } catch (err) {
          errors.push(`${platform}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      const allFailed = errors.length === post.platforms.length
      await supabase
        .from('scheduled_posts')
        .update({
          status: allFailed ? 'failed' : 'posted',
          posted_at: new Date().toISOString(),
          platform_post_ids: platformPostIds,
          error_message: errors.length ? errors.join('; ') : null,
        })
        .eq('id', post.id)

      return { id: post.id, platformPostIds, errors }
    })
  )

  return NextResponse.json({
    dispatched: duePosts.length,
    results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason }),
  })
}

async function postToPlatform(
  platform: string,
  post: Record<string, unknown>
): Promise<{ postId?: string }> {
  // Stub — real implementations connect to each platform's API
  // Instagram: Meta Graph API → POST /me/media + /me/media_publish
  // TikTok: TikTok Content Posting API → POST /v2/post/publish/video/init
  // YouTube: YouTube Data API → PUT /upload/youtube/v3/videos
  // Twitter: Twitter API v2 → POST /2/tweets
  switch (platform) {
    case 'instagram':
      return postToInstagram(post)
    case 'tiktok':
      return postToTikTok(post)
    case 'youtube':
      return postToYouTube(post)
    case 'twitter':
      return postToTwitter(post)
    default:
      return {}
  }
}

async function postToInstagram(post: Record<string, unknown>): Promise<{ postId?: string }> {
  // Implement: Meta Graph API
  // 1. POST /me/media with image_url or video_url + caption
  // 2. POST /me/media_publish with creation_id
  console.log('Instagram post stub', (post as { id: string }).id)
  return { postId: `ig_${Date.now()}` }
}

async function postToTikTok(post: Record<string, unknown>): Promise<{ postId?: string }> {
  console.log('TikTok post stub', (post as { id: string }).id)
  return { postId: `tt_${Date.now()}` }
}

async function postToYouTube(post: Record<string, unknown>): Promise<{ postId?: string }> {
  console.log('YouTube post stub', (post as { id: string }).id)
  return { postId: `yt_${Date.now()}` }
}

async function postToTwitter(post: Record<string, unknown>): Promise<{ postId?: string }> {
  console.log('Twitter post stub', (post as { id: string }).id)
  return { postId: `tw_${Date.now()}` }
}
