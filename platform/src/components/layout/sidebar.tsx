'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Library,
  Calendar,
  BarChart3,
  ShoppingBag,
  Settings,
  Zap,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/content', label: 'Content Library', icon: Library },
  { href: '/schedule', label: 'Scheduler', icon: Calendar },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-zinc-800 bg-zinc-950 px-3 py-4">
      <div className="mb-8 px-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-zinc-100">Vyral</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-violet-600/20 text-violet-400'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </aside>
  )
}
