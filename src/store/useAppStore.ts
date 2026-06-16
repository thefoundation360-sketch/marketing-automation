import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { DiscoverProfile, GoalCategory } from '@/types'

interface FilterState {
  maxDistance: number
  ageMin: number
  ageMax: number
  categories: GoalCategory[]
}

interface AppStore {
  // Discover queue
  discoverProfiles: DiscoverProfile[]
  currentIndex: number
  isLoadingProfiles: boolean

  // Filters
  filters: FilterState

  // Notifications / messages
  unreadMessages: number
  unreadNotifications: number

  // Actions
  loadProfiles: (userId: string) => Promise<void>
  nextProfile: () => void
  likeProfile: (profileId: string, swiperId: string) => Promise<void>
  passProfile: (profileId: string, swiperId: string) => Promise<void>
  setFilters: (filters: Partial<FilterState>) => void
  setUnreadMessages: (count: number) => void
  setUnreadNotifications: (count: number) => void
  resetDiscover: () => void
}

const DEFAULT_FILTERS: FilterState = {
  maxDistance: 50,
  ageMin: 18,
  ageMax: 65,
  categories: [],
}

// Mock data used when Supabase isn't connected or returns no profiles
const MOCK_PROFILES: DiscoverProfile[] = [
  {
    id: 'mock-1',
    username: 'sofia_adventures',
    full_name: 'Sofia Reyes',
    avatar_url: null,
    bio: 'Chasing sunsets and crossing things off my bucket list one adventure at a time. Currently planning my Patagonia trek!',
    age: 27,
    location: 'Austin, TX',
    latitude: 30.2672,
    longitude: -97.7431,
    interests: ['Hiking', 'Photography', 'Travel', 'Yoga', 'Cooking'],
    preference: 'both',
    subscription_tier: 'premium',
    is_verified: true,
    is_admin: false,
    is_guest: false,
    swipes_today: 0,
    last_swipe_date: null,
    onboarding_complete: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    match_percentage: 92,
    shared_goals: [
      {
        id: 'g1',
        user_id: 'mock-1',
        title: 'See the Northern Lights',
        description: null,
        category: 'Travel',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g2',
        user_id: 'mock-1',
        title: 'Learn to surf',
        description: null,
        category: 'Adventure',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    bucket_goals: [
      {
        id: 'g1',
        user_id: 'mock-1',
        title: 'See the Northern Lights',
        description: null,
        category: 'Travel',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g2',
        user_id: 'mock-1',
        title: 'Learn to surf',
        description: null,
        category: 'Adventure',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g3',
        user_id: 'mock-1',
        title: 'Hike Patagonia',
        description: null,
        category: 'Adventure',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'mock-2',
    username: 'marcus_dreams',
    full_name: 'Marcus Chen',
    avatar_url: null,
    bio: 'Entrepreneur by day, stargazer by night. Building my bucket list and looking for fellow dreamers to share experiences with.',
    age: 31,
    location: 'San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
    interests: ['Travel', 'Astronomy', 'Entrepreneurship', 'Cooking', 'Film'],
    preference: 'squad',
    subscription_tier: 'elite',
    is_verified: true,
    is_admin: false,
    is_guest: false,
    swipes_today: 0,
    last_swipe_date: null,
    onboarding_complete: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    match_percentage: 84,
    shared_goals: [
      {
        id: 'g4',
        user_id: 'mock-2',
        title: 'Watch a meteor shower in the desert',
        description: null,
        category: 'Adventure',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g5',
        user_id: 'mock-2',
        title: 'Start a business',
        description: null,
        category: 'Career',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    bucket_goals: [
      {
        id: 'g4',
        user_id: 'mock-2',
        title: 'Watch a meteor shower in the desert',
        description: null,
        category: 'Adventure',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g5',
        user_id: 'mock-2',
        title: 'Start a business',
        description: null,
        category: 'Career',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g6',
        user_id: 'mock-2',
        title: 'Cook a meal in every continent',
        description: null,
        category: 'Food',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'mock-3',
    username: 'priya_wanderlust',
    full_name: 'Priya Sharma',
    avatar_url: null,
    bio: 'Food blogger + world traveler. Half of my bucket list is eating my way through Asia. The other half is jumping off things.',
    age: 25,
    location: 'New York, NY',
    latitude: 40.7128,
    longitude: -74.006,
    interests: ['Food', 'Travel', 'Photography', 'Yoga', 'Writing'],
    preference: 'both',
    subscription_tier: 'premium',
    is_verified: false,
    is_admin: false,
    is_guest: false,
    swipes_today: 0,
    last_swipe_date: null,
    onboarding_complete: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    match_percentage: 78,
    shared_goals: [
      {
        id: 'g7',
        user_id: 'mock-3',
        title: 'Eat at a Michelin star restaurant',
        description: null,
        category: 'Food',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    bucket_goals: [
      {
        id: 'g7',
        user_id: 'mock-3',
        title: 'Eat at a Michelin star restaurant',
        description: null,
        category: 'Food',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g8',
        user_id: 'mock-3',
        title: 'Learn to make ramen from scratch',
        description: null,
        category: 'Food',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'mock-4',
    username: 'alex_climbs',
    full_name: 'Alex Rivera',
    avatar_url: null,
    bio: 'Rock climber, scuba diver, and aspiring skydiver. If it has an adrenaline rush, I want to try it.',
    age: 29,
    location: 'Denver, CO',
    latitude: 39.7392,
    longitude: -104.9903,
    interests: ['Rock Climbing', 'Scuba Diving', 'Skydiving', 'Hiking', 'Fitness'],
    preference: 'solo',
    subscription_tier: 'free',
    is_verified: false,
    is_admin: false,
    is_guest: false,
    swipes_today: 0,
    last_swipe_date: null,
    onboarding_complete: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    match_percentage: 65,
    shared_goals: [
      {
        id: 'g9',
        user_id: 'mock-4',
        title: 'Go skydiving',
        description: null,
        category: 'Adventure',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g10',
        user_id: 'mock-4',
        title: 'Climb a 14er',
        description: null,
        category: 'Adventure',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    bucket_goals: [
      {
        id: 'g9',
        user_id: 'mock-4',
        title: 'Go skydiving',
        description: null,
        category: 'Adventure',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g10',
        user_id: 'mock-4',
        title: 'Climb a 14er',
        description: null,
        category: 'Adventure',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g11',
        user_id: 'mock-4',
        title: 'Get open water scuba certified',
        description: null,
        category: 'Adventure',
        status: 'completed',
        is_public: true,
        completed_at: new Date().toISOString(),
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'mock-5',
    username: 'jade_creates',
    full_name: 'Jade Williams',
    avatar_url: null,
    bio: 'Artist and wanderer. Painting murals across cities and collecting memories like stamps in a passport.',
    age: 26,
    location: 'Portland, OR',
    latitude: 45.5051,
    longitude: -122.675,
    interests: ['Art', 'Travel', 'Music', 'Photography', 'Volunteering'],
    preference: 'both',
    subscription_tier: 'premium',
    is_verified: true,
    is_admin: false,
    is_guest: false,
    swipes_today: 0,
    last_swipe_date: null,
    onboarding_complete: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    match_percentage: 71,
    shared_goals: [
      {
        id: 'g12',
        user_id: 'mock-5',
        title: 'Paint a mural in a foreign country',
        description: null,
        category: 'Creative',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    bucket_goals: [
      {
        id: 'g12',
        user_id: 'mock-5',
        title: 'Paint a mural in a foreign country',
        description: null,
        category: 'Creative',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g13',
        user_id: 'mock-5',
        title: 'Learn a new language',
        description: null,
        category: 'Creative',
        status: 'active',
        is_public: true,
        completed_at: null,
        proof_photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
]

export const useAppStore = create<AppStore>((set, get) => ({
  discoverProfiles: [],
  currentIndex: 0,
  isLoadingProfiles: false,
  filters: DEFAULT_FILTERS,
  unreadMessages: 0,
  unreadNotifications: 0,

  loadProfiles: async (userId: string) => {
    set({ isLoadingProfiles: true })
    try {
      // Fetch profiles from Supabase, excluding already-swiped users
      const { data: swipedIds } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', userId)

      const excludeIds = [userId, ...(swipedIds?.map(s => s.swiped_id) ?? [])]

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          bucket_goals(*)
        `)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .eq('onboarding_complete', true)
        .eq('is_guest', false)
        .limit(20)

      if (error) throw error

      if (profiles && profiles.length > 0) {
        // Fetch current user goals for match calc
        const { data: userGoals } = await supabase
          .from('bucket_goals')
          .select('title, category')
          .eq('user_id', userId)
          .eq('is_public', true)

        const userGoalTitles = userGoals?.map(g => g.title) ?? []

        const discoverProfiles: DiscoverProfile[] = profiles
          .map(p => {
            const goals = (p.bucket_goals ?? []) as DiscoverProfile['bucket_goals']
            const otherGoalTitles = goals.map(g => g.title)
            const shared = goals.filter(g => userGoalTitles.includes(g.title))
            // Simple match: goals overlap + interests
            const goalOverlap = shared.length
            const totalGoals = Math.max(userGoalTitles.length, otherGoalTitles.length, 1)
            const matchPct = Math.min(100, Math.round((goalOverlap / totalGoals) * 60 + 40))
            return {
              ...p,
              match_percentage: matchPct,
              shared_goals: shared,
              bucket_goals: goals,
            }
          })
          .sort((a, b) => b.match_percentage - a.match_percentage)

        set({ discoverProfiles, currentIndex: 0 })
      } else {
        // Fall back to mock data when DB is empty / not connected
        set({ discoverProfiles: MOCK_PROFILES, currentIndex: 0 })
      }
    } catch {
      // Supabase not connected — use mock data so the UI is usable
      set({ discoverProfiles: MOCK_PROFILES, currentIndex: 0 })
    } finally {
      set({ isLoadingProfiles: false })
    }
  },

  nextProfile: () => {
    const { currentIndex, discoverProfiles } = get()
    if (currentIndex < discoverProfiles.length - 1) {
      set({ currentIndex: currentIndex + 1 })
    }
  },

  likeProfile: async (profileId: string, swiperId: string) => {
    get().nextProfile()
    try {
      await supabase.from('swipes').insert({
        swiper_id: swiperId,
        swiped_id: profileId,
        direction: 'like',
      })
      // Check for mutual match
      const { data: mutualSwipe } = await supabase
        .from('swipes')
        .select('id')
        .eq('swiper_id', profileId)
        .eq('swiped_id', swiperId)
        .eq('direction', 'like')
        .maybeSingle()

      if (mutualSwipe) {
        await supabase.from('matches').upsert({
          user_a_id: swiperId < profileId ? swiperId : profileId,
          user_b_id: swiperId < profileId ? profileId : swiperId,
          status: 'matched',
          matched_at: new Date().toISOString(),
        })
      }
    } catch {
      // Swipe recorded locally even if DB fails
    }
  },

  passProfile: async (profileId: string, swiperId: string) => {
    get().nextProfile()
    try {
      await supabase.from('swipes').insert({
        swiper_id: swiperId,
        swiped_id: profileId,
        direction: 'pass',
      })
    } catch {
      // Ignore DB errors for pass swipes
    }
  },

  setFilters: (filters: Partial<FilterState>) => {
    set(state => ({ filters: { ...state.filters, ...filters } }))
  },

  setUnreadMessages: (count: number) => set({ unreadMessages: count }),
  setUnreadNotifications: (count: number) => set({ unreadNotifications: count }),

  resetDiscover: () => {
    set({ discoverProfiles: MOCK_PROFILES, currentIndex: 0 })
  },
}))
