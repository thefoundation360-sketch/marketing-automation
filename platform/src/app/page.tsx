import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Zap, Upload, Calendar, DollarSign, ShoppingBag, TrendingUp, Check } from 'lucide-react'

const FEATURES = [
  {
    icon: Upload,
    title: 'Multi-format Content Library',
    desc: 'Audio, video, images, presets, templates, and ebooks — not just clips. Own your entire catalog.',
  },
  {
    icon: Calendar,
    title: 'Cross-platform Scheduler',
    desc: 'Schedule posts to Instagram, TikTok, YouTube, Twitter and more from one dashboard.',
  },
  {
    icon: DollarSign,
    title: 'Direct Sales, Not Ad Share',
    desc: 'Set your own price. You earn 80% of every sale — no waiting for platform ad revenue.',
  },
  {
    icon: ShoppingBag,
    title: 'Built-in Marketplace',
    desc: 'Your content is discoverable by fans, agencies, and other creators the moment you publish.',
  },
  {
    icon: TrendingUp,
    title: 'Real Analytics',
    desc: 'Track downloads, revenue, and social reach per piece of content.',
  },
  {
    icon: Zap,
    title: 'AI Metadata Generation',
    desc: 'Auto-generate titles, descriptions, and tags from your file. Stop writing copy from scratch.',
  },
]

const GAPS = [
  {
    platform: 'goVyro / Vyro',
    problem: 'View-based ad revenue — you earn only what the platform sells ads against',
    solution: 'Direct download sales at prices you set. 80% to you, paid via Stripe.',
  },
  {
    platform: 'Content type lock-in',
    problem: 'Clipping only — works for video highlights, nothing else',
    solution: 'Audio, video, images, presets, templates, ebooks — any digital asset.',
  },
  {
    platform: 'Creator dependency',
    problem: 'You need MrBeast (or similar) to supply content before you can earn',
    solution: 'You own and sell your own original work. No gatekeeper.',
  },
  {
    platform: 'No scheduling',
    problem: 'No tools to distribute clips across social platforms automatically',
    solution: 'Schedule to 6 platforms from one UI. Cron-dispatched every 5 min.',
  },
  {
    platform: 'No catalog ownership',
    problem: "Clips live on Vyro. You can't migrate your audience or earnings",
    solution: 'Your files in Supabase Storage. Export anytime. You own everything.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold">Vyral</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Start for free</Button>
          </Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/30 px-3 py-1 text-xs text-violet-400 mb-6">
          <Zap className="h-3 w-3" /> The creator platform goVyro should have been
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Publish. Schedule. Earn.<br />On your terms.
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10">
          Vyral is a creator platform where you upload any digital asset, schedule it across every social platform, and sell it directly — keeping 80% of every dollar.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg">Launch your store — free</Button>
          </Link>
          <Link href="/marketplace">
            <Button size="lg" variant="outline">Browse marketplace</Button>
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Why not goVyro?</h2>
        <p className="text-zinc-400 text-center mb-10 text-sm">We studied the gaps. Here&apos;s what we built instead.</p>
        <div className="space-y-3">
          {GAPS.map(g => (
            <div key={g.platform} className="grid grid-cols-3 gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 items-start">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">{g.platform}</p>
                <p className="text-sm text-red-400">{g.problem}</p>
              </div>
              <div className="text-zinc-600 text-center mt-1">→</div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-300">{g.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">Everything you need to monetize your work</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="mb-3 inline-flex rounded-lg bg-violet-950/50 p-2">
                <f.icon className="h-5 w-5 text-violet-400" />
              </div>
              <h3 className="font-semibold text-zinc-100 mb-1">{f.title}</h3>
              <p className="text-sm text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-10">
          <h2 className="text-2xl font-bold mb-3">Ready to own your content income?</h2>
          <p className="text-zinc-400 text-sm mb-6">Free to start. No monthly fees. 80/20 split on every sale.</p>
          <Link href="/signup">
            <Button size="lg">Create your free account</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-6 py-8 text-center text-xs text-zinc-600">
        Vyral · Built for independent creators · 2025
      </footer>
    </div>
  )
}
