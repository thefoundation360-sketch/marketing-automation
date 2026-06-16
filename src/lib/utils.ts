import { GoalCategory, SubscriptionTier } from '@/types'

type ClassValue = string | undefined | null | false | 0

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export const GOAL_CATEGORIES: GoalCategory[] = [
  'Travel',
  'Adventure',
  'Food',
  'Creative',
  'Wellness',
  'Philanthropy',
  'Career',
  'Relationships',
]

export const GOAL_CATEGORY_ICONS: Record<GoalCategory, string> = {
  Travel: '✈️',
  Adventure: '🧗',
  Food: '🍜',
  Creative: '🎨',
  Wellness: '🧘',
  Philanthropy: '❤️',
  Career: '🚀',
  Relationships: '👥',
}

export const GOAL_CATEGORY_COLORS: Record<GoalCategory, string> = {
  Travel: 'bg-blue-100 text-blue-700',
  Adventure: 'bg-orange-100 text-orange-700',
  Food: 'bg-yellow-100 text-yellow-700',
  Creative: 'bg-purple-100 text-purple-700',
  Wellness: 'bg-green-100 text-green-700',
  Philanthropy: 'bg-red-100 text-red-700',
  Career: 'bg-indigo-100 text-indigo-700',
  Relationships: 'bg-pink-100 text-pink-700',
}

export const INTERESTS = [
  'Hiking', 'Photography', 'Cooking', 'Travel', 'Music', 'Art',
  'Fitness', 'Reading', 'Gaming', 'Dancing', 'Yoga', 'Surfing',
  'Rock Climbing', 'Skydiving', 'Scuba Diving', 'Camping',
  'Cycling', 'Running', 'Swimming', 'Volunteering', 'Languages',
  'Film', 'Theater', 'Writing', 'Entrepreneurship', 'Technology',
  'Meditation', 'Wine Tasting', 'Coffee Culture', 'Fashion',
  'Architecture', 'History', 'Science', 'Astronomy', 'Gardening',
]

export const TIER_LIMITS: Record<SubscriptionTier, {
  swipes: number
  goals: number
  messages: number
}> = {
  free: { swipes: 5, goals: 3, messages: 10 },
  premium: { swipes: Infinity, goals: Infinity, messages: Infinity },
  elite: { swipes: Infinity, goals: Infinity, messages: Infinity },
  business: { swipes: Infinity, goals: Infinity, messages: Infinity },
}

export function canSwipe(tier: SubscriptionTier, swipesToday: number): boolean {
  const limit = TIER_LIMITS[tier].swipes
  return swipesToday < limit
}

export function canAddGoal(tier: SubscriptionTier, goalCount: number): boolean {
  const limit = TIER_LIMITS[tier].goals
  return goalCount < limit
}

export function canSendMessage(tier: SubscriptionTier, messagesToday: number): boolean {
  const limit = TIER_LIMITS[tier].messages
  return messagesToday < limit
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function generateUsername(fullName: string): string {
  const base = fullName.toLowerCase().replace(/\s+/g, '').slice(0, 15)
  const random = Math.floor(Math.random() * 9999)
  return `${base}${random}`
}

export function calculateMatchPercentage(
  userInterests: string[],
  otherInterests: string[],
  userGoals: string[],
  otherGoals: string[]
): number {
  const interestOverlap = userInterests.filter(i => otherInterests.includes(i)).length
  const goalOverlap = userGoals.filter(g => otherGoals.includes(g)).length
  const interestScore = userInterests.length > 0
    ? (interestOverlap / Math.max(userInterests.length, otherInterests.length)) * 50
    : 0
  const goalScore = userGoals.length > 0
    ? (goalOverlap / Math.max(userGoals.length, otherGoals.length)) * 50
    : 0
  return Math.round(interestScore + goalScore)
}

export function getAvatarUrl(userId: string, avatarPath: string | null): string {
  if (!avatarPath) return ''
  if (avatarPath.startsWith('http')) return avatarPath
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${avatarPath}`
}
