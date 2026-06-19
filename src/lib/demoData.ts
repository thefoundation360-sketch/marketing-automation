import { Profile, BucketGoal, Match, Message, Conversation, FeedItem, Group, Notification } from '@/types'

export const DEMO_USER: Profile = {
  id: 'demo-user-1',
  username: 'you_dreamer',
  full_name: 'You (Demo)',
  avatar_url: null,
  bio: 'Explorer at heart. Always planning the next adventure.',
  age: 28,
  location: 'San Francisco, CA',
  latitude: 37.7749,
  longitude: -122.4194,
  interests: ['Hiking', 'Photography', 'Travel', 'Cooking', 'Yoga'],
  preference: 'both',
  subscription_tier: 'free',
  is_verified: false,
  is_admin: false,
  is_guest: false,
  swipes_today: 0,
  last_swipe_date: null,
  onboarding_complete: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const DEMO_PROFILES: Profile[] = [
  {
    id: 'demo-2', username: 'maya_adventures', full_name: 'Maya Chen', avatar_url: null,
    bio: 'Photographer. Hiker. Always planning the next adventure. 🌍', age: 28,
    location: 'San Francisco, CA', latitude: 37.7849, longitude: -122.4094,
    interests: ['Photography', 'Hiking', 'Travel', 'Yoga', 'Cooking'],
    preference: 'both', subscription_tier: 'premium', is_verified: true, is_admin: false,
    is_guest: false, swipes_today: 0, last_swipe_date: null, onboarding_complete: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-3', username: 'james_traveler', full_name: 'James Torres', avatar_url: null,
    bio: 'Software engineer by day, adventurer by night. Route 66 calling my name.', age: 31,
    location: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298,
    interests: ['Travel', 'Cycling', 'Music', 'Cooking', 'Running'],
    preference: 'squad', subscription_tier: 'free', is_verified: false, is_admin: false,
    is_guest: false, swipes_today: 0, last_swipe_date: null, onboarding_complete: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-4', username: 'priya_dreams', full_name: 'Priya Kapoor', avatar_url: null,
    bio: 'Learning Spanish one word at a time. Coffee enthusiast. Book lover.', age: 26,
    location: 'Austin, TX', latitude: 30.2672, longitude: -97.7431,
    interests: ['Languages', 'Reading', 'Coffee Culture', 'Yoga', 'Writing'],
    preference: 'solo', subscription_tier: 'elite', is_verified: true, is_admin: false,
    is_guest: false, swipes_today: 0, last_swipe_date: null, onboarding_complete: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-5', username: 'alex_peaks', full_name: 'Alex Rivera', avatar_url: null,
    bio: 'Chasing summits and sunsets. 14ers done, Kilimanjaro next!', age: 34,
    location: 'Denver, CO', latitude: 39.7392, longitude: -104.9903,
    interests: ['Rock Climbing', 'Hiking', 'Camping', 'Photography', 'Running'],
    preference: 'both', subscription_tier: 'premium', is_verified: true, is_admin: false,
    is_guest: false, swipes_today: 0, last_swipe_date: null, onboarding_complete: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-6', username: 'luna_creates', full_name: 'Luna Park', avatar_url: null,
    bio: 'Artist, dancer, dreamer. Building a life full of color and movement.', age: 29,
    location: 'New York, NY', latitude: 40.7128, longitude: -74.0060,
    interests: ['Art', 'Dancing', 'Theater', 'Film', 'Creative'],
    preference: 'both', subscription_tier: 'free', is_verified: false, is_admin: false,
    is_guest: false, swipes_today: 0, last_swipe_date: null, onboarding_complete: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-7', username: 'sam_wanderer', full_name: 'Sam Okafor', avatar_url: null,
    bio: 'Nurse by profession, explorer by passion. 30 countries and counting.', age: 32,
    location: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321,
    interests: ['Travel', 'Hiking', 'Cooking', 'Volunteering', 'Swimming'],
    preference: 'squad', subscription_tier: 'premium', is_verified: false, is_admin: false,
    is_guest: false, swipes_today: 0, last_swipe_date: null, onboarding_complete: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
]

export const DEMO_GOALS: BucketGoal[] = [
  {
    id: 'goal-1', user_id: 'demo-user-1',
    title: 'See the Northern Lights in Iceland', description: 'Dance under the aurora borealis.',
    category: 'Travel', status: 'active', is_public: true,
    completed_at: null, proof_photo_url: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'goal-2', user_id: 'demo-user-1',
    title: 'Learn to surf in Bali', description: null,
    category: 'Adventure', status: 'active', is_public: true,
    completed_at: null, proof_photo_url: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'goal-3', user_id: 'demo-user-1',
    title: 'Run a marathon', description: '26.2 miles. One goal. I can do this.',
    category: 'Wellness', status: 'completed', is_public: true,
    completed_at: '2025-11-15T10:00:00Z', proof_photo_url: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
]

export const DEMO_MATCHES: (Match & { profile: Profile; shared_goal_titles: string[] })[] = [
  {
    id: 'match-1', user_a_id: 'demo-user-1', user_b_id: 'demo-2',
    match_percentage: 87, shared_goals: ['See the Northern Lights', 'Hike Patagonia'],
    shared_goal_titles: ['See the Northern Lights in Iceland', 'Hike Patagonia'],
    status: 'matched', matched_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date().toISOString(), profile: DEMO_PROFILES[0],
  },
  {
    id: 'match-2', user_a_id: 'demo-user-1', user_b_id: 'demo-4',
    match_percentage: 72, shared_goals: ['Northern Lights'],
    shared_goal_titles: ['See the Northern Lights in Iceland'],
    status: 'matched', matched_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date().toISOString(), profile: DEMO_PROFILES[2],
  },
  {
    id: 'match-3', user_a_id: 'demo-user-1', user_b_id: 'demo-5',
    match_percentage: 91, shared_goals: ['Northern Lights', 'Photography', 'Hiking'],
    shared_goal_titles: ['See the Northern Lights in Iceland', 'Photography road trip'],
    status: 'matched', matched_at: new Date(Date.now() - 7200000).toISOString(),
    created_at: new Date().toISOString(), profile: DEMO_PROFILES[3],
  },
]

export const DEMO_CONVERSATIONS: (Conversation & { other_profile: Profile; unread: number })[] = [
  {
    id: 'conv-1', participant_ids: ['demo-user-1', 'demo-2'],
    last_message: 'We should plan a trip to Iceland! 🧊', last_message_at: new Date(Date.now() - 1200000).toISOString(),
    is_match_gated: false, created_at: new Date().toISOString(),
    other_profile: DEMO_PROFILES[0], unread: 2,
  },
  {
    id: 'conv-2', participant_ids: ['demo-user-1', 'demo-5'],
    last_message: 'What camera do you use for hiking shots?', last_message_at: new Date(Date.now() - 7200000).toISOString(),
    is_match_gated: false, created_at: new Date().toISOString(),
    other_profile: DEMO_PROFILES[3], unread: 0,
  },
]

export const DEMO_MESSAGES: Record<string, Message[]> = {
  'conv-1': [
    { id: 'msg-1', conversation_id: 'conv-1', sender_id: 'demo-2', content: 'Hey! I saw we both want to see the Northern Lights 🌌', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'msg-2', conversation_id: 'conv-1', sender_id: 'demo-user-1', content: 'Yes! Been dreaming about it for years. Are you planning to go soon?', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 3500000).toISOString() },
    { id: 'msg-3', conversation_id: 'conv-1', sender_id: 'demo-2', content: 'I was thinking next January — best time for the lights!', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 3400000).toISOString() },
    { id: 'msg-4', conversation_id: 'conv-1', sender_id: 'demo-user-1', content: 'That sounds perfect. I\'ve heard Tromsø is the best spot 🇳🇴', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 1800000).toISOString() },
    { id: 'msg-5', conversation_id: 'conv-1', sender_id: 'demo-2', content: 'We should plan a trip to Iceland! 🧊', read_at: null, created_at: new Date(Date.now() - 1200000).toISOString() },
    { id: 'msg-6', conversation_id: 'conv-1', sender_id: 'demo-2', content: 'Or maybe both?? 😍', read_at: null, created_at: new Date(Date.now() - 1100000).toISOString() },
  ],
  'conv-2': [
    { id: 'msg-10', conversation_id: 'conv-2', sender_id: 'demo-5', content: 'Love your photography goals! We should do a shoot together.', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'msg-11', conversation_id: 'conv-2', sender_id: 'demo-user-1', content: 'That would be amazing! What gear do you use?', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 82800000).toISOString() },
    { id: 'msg-12', conversation_id: 'conv-2', sender_id: 'demo-5', content: 'What camera do you use for hiking shots?', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 7200000).toISOString() },
  ],
}

export const DEMO_FEED: FeedItem[] = [
  {
    id: 'feed-1', user_id: 'demo-5', type: 'goal_completed', goal_id: 'ext-goal-1',
    match_id: null, group_id: null,
    content: 'Just completed "Climb a 14er in Colorado"! The view from the summit was worth every step 🏔️',
    likes_count: 24, comments_count: 8, created_at: new Date(Date.now() - 7200000).toISOString(),
    profile: DEMO_PROFILES[3],
    goal: { id: 'ext-goal-1', user_id: 'demo-5', title: 'Climb a 14er in Colorado', description: null, category: 'Adventure', status: 'completed', is_public: true, completed_at: new Date(Date.now() - 7200000).toISOString(), proof_photo_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  },
  {
    id: 'feed-2', user_id: 'demo-2', type: 'new_match', goal_id: null,
    match_id: 'match-1', group_id: null,
    content: 'Just matched with 3 people who want to see the Northern Lights! ❤️ The dream squad is forming.',
    likes_count: 17, comments_count: 3, created_at: new Date(Date.now() - 14400000).toISOString(),
    profile: DEMO_PROFILES[0], goal: undefined,
  },
  {
    id: 'feed-3', user_id: 'demo-3', type: 'goal_completed', goal_id: 'ext-goal-2',
    match_id: null, group_id: null,
    content: 'Crossed "Learn to cook sushi" off the list! Took a 3-day course in Tokyo 🍣',
    likes_count: 41, comments_count: 12, created_at: new Date(Date.now() - 86400000).toISOString(),
    profile: DEMO_PROFILES[1],
    goal: { id: 'ext-goal-2', user_id: 'demo-3', title: 'Learn to cook sushi in Japan', description: null, category: 'Food', status: 'completed', is_public: true, completed_at: new Date(Date.now() - 86400000).toISOString(), proof_photo_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  },
  {
    id: 'feed-4', user_id: 'demo-4', type: 'milestone', goal_id: null,
    match_id: null, group_id: null,
    content: '🎉 Just hit 10 bucket list goals completed! What a journey it\'s been. Grateful for everyone who joined me.',
    likes_count: 89, comments_count: 22, created_at: new Date(Date.now() - 172800000).toISOString(),
    profile: DEMO_PROFILES[2], goal: undefined,
  },
]

export const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1', user_id: 'demo-user-1', type: 'new_match',
    title: 'New Match! 🎉', body: 'You and Alex Rivera both want to see the Northern Lights!',
    data: { match_id: 'match-3' }, read_at: null, created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'notif-2', user_id: 'demo-user-1', type: 'new_message',
    title: 'Maya Chen', body: 'We should plan a trip to Iceland! 🧊',
    data: { conversation_id: 'conv-1' }, read_at: null, created_at: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: 'notif-3', user_id: 'demo-user-1', type: 'goal_completed_friend',
    title: 'Alex completed a goal!', body: 'Alex Rivera just crossed "Climb a 14er" off their bucket list 🏔️',
    data: { feed_item_id: 'feed-1' }, read_at: new Date().toISOString(), created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'notif-4', user_id: 'demo-user-1', type: 'goal_nearby',
    title: '8 people near you want this!', body: '8 people in San Francisco want to "Learn to surf in Bali"',
    data: { goal_title: 'Learn to surf in Bali' }, read_at: new Date().toISOString(), created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'notif-5', user_id: 'demo-user-1', type: 'weekly_nudge',
    title: 'Keep it up! 🌟', body: 'You have 2 active goals this week. Small steps = big dreams.',
    data: {}, read_at: new Date().toISOString(), created_at: new Date(Date.now() - 172800000).toISOString(),
  },
]

export const DEMO_GROUPS: Group[] = [
  {
    id: 'group-1', name: 'Iceland Northern Lights Crew', description: 'Planning our January Iceland trip to see the aurora together!',
    creator_id: 'demo-2', goal_id: 'goal-1', avatar_url: null, is_public: true,
    member_count: 5, created_at: new Date().toISOString(),
  },
]

const GRADIENT_COLORS = [
  'from-orange-400 to-rose-400',
  'from-blue-400 to-cyan-400',
  'from-violet-400 to-purple-400',
  'from-green-400 to-teal-400',
  'from-pink-400 to-rose-400',
  'from-amber-400 to-orange-400',
  'from-indigo-400 to-blue-400',
]

export function getDemoGradient(userId: string): string {
  const idx = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENT_COLORS.length
  return GRADIENT_COLORS[idx]
}

export function isDemoMode(): boolean {
  return !import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL.includes('placeholder') ||
    import.meta.env.VITE_SUPABASE_URL.includes('your-project')
}
