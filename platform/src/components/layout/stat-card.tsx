import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  change?: string
  positive?: boolean
  icon: LucideIcon
  iconColor?: string
}

export function StatCard({ label, value, change, positive, icon: Icon, iconColor = 'text-violet-400' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-400">{label}</span>
        <div className="rounded-lg bg-zinc-800 p-2">
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
      </div>
      <div className="text-2xl font-bold text-zinc-100">{value}</div>
      {change && (
        <div className={cn('mt-1 text-xs', positive ? 'text-emerald-400' : 'text-red-400')}>
          {positive ? '↑' : '↓'} {change} vs last month
        </div>
      )}
    </div>
  )
}
