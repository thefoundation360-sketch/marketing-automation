export type UserRole = 'creator' | 'consumer' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  bio?: string
  role: UserRole
  stripe_account_id?: string
  stripe_customer_id?: string
  payout_enabled: boolean
  payout_pending_cents: number
  revenue_share_percent: number // platform keeps (100 - this)%
  created_at: string
}

export type ContentType = 'audio' | 'video' | 'image' | 'template' | 'ebook' | 'preset'
export type ContentStatus = 'draft' | 'processing' | 'published' | 'scheduled' | 'archived'
export type LicenseType = 'free' | 'standard' | 'extended' | 'exclusive'

export interface Content {
  id: string
  creator_id: string
  title: string
  description?: string
  type: ContentType
  status: ContentStatus
  license_type: LicenseType
  price_cents: number // 0 = free
  preview_url?: string
  file_url?: string
  thumbnail_url?: string
  tags: string[]
  metadata: Record<string, unknown>
  download_count: number
  revenue_total_cents: number
  created_at: string
  updated_at: string
  published_at?: string
  scheduled_at?: string
}

export type SchedulePlatform = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook' | 'linkedin'
export type ScheduleStatus = 'pending' | 'posting' | 'posted' | 'failed' | 'cancelled'

export interface ScheduledPost {
  id: string
  content_id: string
  creator_id: string
  platforms: SchedulePlatform[]
  caption?: string
  hashtags: string[]
  scheduled_at: string
  posted_at?: string
  status: ScheduleStatus
  error_message?: string
  platform_post_ids: Partial<Record<SchedulePlatform, string>>
  created_at: string
}

export type TransactionType = 'download_purchase' | 'subscription' | 'payout' | 'refund'

export interface Transaction {
  id: string
  content_id?: string
  buyer_id?: string
  creator_id: string
  stripe_payment_intent_id?: string
  type: TransactionType
  amount_cents: number
  creator_earnings_cents: number
  platform_fee_cents: number
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  created_at: string
}

export interface Analytics {
  content_id: string
  date: string
  views: number
  downloads: number
  revenue_cents: number
  platform_breakdown: Partial<Record<SchedulePlatform, { views: number; clicks: number }>>
}

export interface CreatorStats {
  total_content: number
  total_downloads: number
  total_revenue_cents: number
  pending_payout_cents: number
  this_month_revenue_cents: number
  top_content: Content[]
}
