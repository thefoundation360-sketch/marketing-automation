export type SubscriptionTier = 'free' | 'premium' | 'elite' | 'business';

export type GoalCategory =
  | 'travel'
  | 'adventure'
  | 'food'
  | 'creative'
  | 'wellness'
  | 'philanthropy'
  | 'career'
  | 'relationships';

export type NotificationType =
  | 'new_match'
  | 'message'
  | 'goal_completed'
  | 'nearby_goal'
  | 'weekly_nudge'
  | 'goal_liked'
  | 'goal_commented'
  | 'group_invite';

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  age?: number;
  is_verified: boolean;
  is_admin: boolean;
  is_guest: boolean;
  is_blocked?: boolean;
  subscription_tier: SubscriptionTier;
  subscription_expires_at?: string;
  stripe_customer_id?: string;
  onesignal_player_id?: string;
  solo_squad_preference: 'solo' | 'squad' | 'both';
  swipes_today: number;
  messages_today: number;
  last_active_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserInterest {
  id: string;
  user_id: string;
  interest: string;
  created_at: string;
}

export interface BucketListGoal {
  id: string;
  user_id: string;
  title: string;
  category: GoalCategory;
  description?: string;
  is_completed: boolean;
  completed_at?: string;
  completion_photo_url?: string;
  completion_note?: string;
  is_public: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Swipe {
  id: string;
  swiper_id: string;
  swiped_id: string;
  action: 'like' | 'pass';
  created_at: string;
}

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  match_percentage: number;
  shared_goals?: string[];
  shared_goal_ids?: string[];
  created_at: string;
  other_user?: Profile;
  other_user_interests?: string[];
  other_user_goals?: BucketListGoal[];
  last_message?: Partial<Message> & { content: string; created_at: string };
  unread_count?: number;
}

export interface Message {
  id: string;
  match_id?: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  is_request: boolean;
  created_at: string;
  sender?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface FeedActivity {
  id: string;
  user_id: string;
  type: 'goal_completed' | 'new_match' | 'milestone' | 'goal_added';
  goal_id?: string;
  content?: string;
  is_public: boolean;
  created_at: string;
  user?: Profile;
  goal?: BucketListGoal;
  likes?: FeedLike[];
  comments?: FeedComment[];
  likes_count?: number;
  comments_count?: number;
  user_liked?: boolean;
}

export interface FeedLike {
  id: string;
  activity_id: string;
  user_id: string;
  created_at: string;
  user?: Profile;
}

export interface FeedComment {
  id: string;
  activity_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: Profile;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  goal_id?: string;
  creator_id: string;
  avatar_url?: string;
  is_premium_only: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  goal?: BucketListGoal;
  members?: GroupMember[];
  user_role?: 'admin' | 'member' | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user?: Profile;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export interface GroupGoal {
  id: string;
  group_id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  completed_at?: string;
  created_by?: string;
  created_at: string;
}

export interface GroupEvent {
  id: string;
  group_id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  created_by: string;
  created_at: string;
  creator?: Profile;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details?: string;
  is_resolved: boolean;
  created_at: string;
  reporter?: Profile;
  reported?: Profile;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  trial_ends_at?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  is_enabled: boolean;
  description?: string;
}

export interface DiscoverUser extends Profile {
  interests: string[];
  goals: BucketListGoal[];
  match_percentage: number;
  shared_goals: string[];
  distance_km?: number;
}

export const GOAL_CATEGORIES: { value: GoalCategory; label: string; emoji: string; color: string }[] = [
  { value: 'travel', label: 'Travel', emoji: '✈️', color: 'bg-blue-100 text-blue-800' },
  { value: 'adventure', label: 'Adventure', emoji: '🏔️', color: 'bg-green-100 text-green-800' },
  { value: 'food', label: 'Food', emoji: '🍜', color: 'bg-orange-100 text-orange-800' },
  { value: 'creative', label: 'Creative', emoji: '🎨', color: 'bg-purple-100 text-purple-800' },
  { value: 'wellness', label: 'Wellness', emoji: '🧘', color: 'bg-teal-100 text-teal-800' },
  { value: 'philanthropy', label: 'Philanthropy', emoji: '❤️', color: 'bg-red-100 text-red-800' },
  { value: 'career', label: 'Career', emoji: '💼', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'relationships', label: 'Relationships', emoji: '👥', color: 'bg-pink-100 text-pink-800' },
];

export const TIER_LIMITS = {
  free: {
    swipes_per_day: 5,
    active_goals: 3,
    messages_per_day: 10,
    can_see_who_liked: false,
    can_see_full_breakdown: false,
    unlimited_messaging: false,
    priority_placement: false,
  },
  premium: {
    swipes_per_day: Infinity,
    active_goals: Infinity,
    messages_per_day: Infinity,
    can_see_who_liked: true,
    can_see_full_breakdown: true,
    unlimited_messaging: true,
    priority_placement: true,
  },
  elite: {
    swipes_per_day: Infinity,
    active_goals: Infinity,
    messages_per_day: Infinity,
    can_see_who_liked: true,
    can_see_full_breakdown: true,
    unlimited_messaging: true,
    priority_placement: true,
  },
  business: {
    swipes_per_day: Infinity,
    active_goals: Infinity,
    messages_per_day: Infinity,
    can_see_who_liked: true,
    can_see_full_breakdown: true,
    unlimited_messaging: true,
    priority_placement: true,
  },
};
