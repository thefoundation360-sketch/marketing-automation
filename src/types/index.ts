export type SubscriptionTier = 'free' | 'premium' | 'elite' | 'business'

export interface Profile {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  bio: string | null
  age: number | null
  location: string | null
  latitude: number | null
  longitude: number | null
  interests: string[]
  preference: 'solo' | 'squad' | 'both'
  subscription_tier: SubscriptionTier
  is_verified: boolean
  is_admin: boolean
  is_guest: boolean
  swipes_today: number
  last_swipe_date: string | null
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export interface BucketGoal {
  id: string
  user_id: string
  title: string
  description: string | null
  category: GoalCategory
  status: 'active' | 'completed' | 'paused'
  is_public: boolean
  completed_at: string | null
  proof_photo_url: string | null
  created_at: string
  updated_at: string
}

export type GoalCategory =
  | 'Travel'
  | 'Adventure'
  | 'Food'
  | 'Creative'
  | 'Wellness'
  | 'Philanthropy'
  | 'Career'
  | 'Relationships'

export interface Match {
  id: string
  user_a_id: string
  user_b_id: string
  match_percentage: number
  shared_goals: string[]
  status: 'pending' | 'matched' | 'blocked'
  matched_at: string | null
  created_at: string
}

export interface Swipe {
  id: string
  swiper_id: string
  swiped_id: string
  direction: 'like' | 'pass'
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read_at: string | null
  created_at: string
}

export interface Conversation {
  id: string
  participant_ids: string[]
  last_message: string | null
  last_message_at: string | null
  is_match_gated: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export type NotificationType =
  | 'new_match'
  | 'new_message'
  | 'goal_completed_friend'
  | 'goal_nearby'
  | 'weekly_nudge'
  | 'milestone'

export interface Group {
  id: string
  name: string
  description: string | null
  creator_id: string
  goal_id: string | null
  avatar_url: string | null
  is_public: boolean
  member_count: number
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface FeedItem {
  id: string
  user_id: string
  type: 'goal_completed' | 'new_match' | 'joined_group' | 'milestone'
  goal_id: string | null
  match_id: string | null
  group_id: string | null
  content: string
  likes_count: number
  comments_count: number
  created_at: string
  profile?: Profile
  goal?: BucketGoal
}

export interface Comment {
  id: string
  feed_item_id: string
  user_id: string
  content: string
  created_at: string
  profile?: Profile
}

export interface AdminStats {
  total_users: number
  dau: number
  mau: number
  mrr: number
  arr: number
  total_matches: number
  active_goals: number
  completed_goals: number
  reported_users: number
}

export interface DiscoverProfile extends Profile {
  match_percentage: number
  shared_goals: BucketGoal[]
  bucket_goals: BucketGoal[]
}

export interface PricingPlan {
  id: SubscriptionTier
  name: string
  price_monthly: number
  price_annual: number
  stripe_price_id_monthly: string
  stripe_price_id_annual: string
  features: string[]
  highlighted?: boolean
}
