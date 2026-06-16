import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export type Database = {
  public: {
    Tables: {
      profiles: { Row: import('@/types').Profile }
      bucket_goals: { Row: import('@/types').BucketGoal }
      matches: { Row: import('@/types').Match }
      swipes: { Row: import('@/types').Swipe }
      messages: { Row: import('@/types').Message }
      conversations: { Row: import('@/types').Conversation }
      notifications: { Row: import('@/types').Notification }
      groups: { Row: import('@/types').Group }
      group_members: { Row: import('@/types').GroupMember }
      feed_items: { Row: import('@/types').FeedItem }
      comments: { Row: import('@/types').Comment }
    }
  }
}
