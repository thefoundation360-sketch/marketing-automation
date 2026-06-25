import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/lib/utils'
import { Download, ShoppingCart, ArrowLeft, Tag, User, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import type { Content, LicenseType } from '@/types'

const LICENSE_DESCRIPTIONS: Record<LicenseType, string> = {
  free: 'Free to use for personal and commercial projects',
  standard: 'Personal & commercial use. Cannot resell or redistribute.',
  extended: 'Unlimited commercial use including resale in your products.',
  exclusive: 'You become the sole owner. File removed from marketplace after purchase.',
}

export default async function MarketplaceItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ purchase?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params
  const { purchase } = await searchParams

  const { data: item } = await supabase
    .from('content')
    .select(`
      *,
      creator:creator_id (id, full_name, avatar_url, bio, stripe_account_id, payout_enabled)
    `)
    .eq('id', id)
    .eq('status', 'published')
    .single() as {
      data: (Content & {
        creator: {
          id: string
          full_name: string
          avatar_url?: string
          bio?: string
          stripe_account_id?: string
          payout_enabled: boolean
        }
      }) | null
    }

  if (!item) notFound()

  const isOwner = user?.id === item.creator_id
  const canPurchase = !isOwner && item.creator.payout_enabled

  const { data: relatedItems } = await supabase
    .from('content')
    .select('id, title, type, thumbnail_url, price_cents')
    .eq('creator_id', item.creator_id)
    .eq('status', 'published')
    .neq('id', id)
    .limit(4)

  return (
    <div className="space-y-6 max-w-4xl">
      {purchase === 'success' && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Purchase complete! Your download link has been sent to your email.
        </div>
      )}

      <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-200 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video rounded-xl overflow-hidden bg-zinc-800">
            {item.thumbnail_url ? (
              <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 capitalize text-lg">
                {item.type}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-zinc-100">{item.title}</h1>
                <p className="text-sm text-zinc-500 mt-1 capitalize">{item.type}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 capitalize">{item.license_type}</Badge>
            </div>

            {item.description && (
              <p className="text-sm text-zinc-300 leading-relaxed">{item.description}</p>
            )}

            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {item.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="font-medium text-zinc-100 mb-2">License</h2>
            <p className="text-sm text-zinc-400">{LICENSE_DESCRIPTIONS[item.license_type]}</p>
          </div>

          {relatedItems && relatedItems.length > 0 && (
            <div>
              <h2 className="font-semibold text-zinc-100 mb-3">More from this creator</h2>
              <div className="grid grid-cols-2 gap-3">
                {relatedItems.map(r => (
                  <Link
                    key={r.id}
                    href={`/marketplace/${r.id}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-violet-500/50 transition-all"
                  >
                    <div className="aspect-video bg-zinc-800">
                      {r.thumbnail_url ? (
                        <img src={r.thumbnail_url} alt={r.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs capitalize">{r.type}</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-zinc-200 truncate">{r.title}</p>
                      <p className="text-xs font-medium text-violet-400 mt-0.5">
                        {r.price_cents === 0 ? 'Free' : formatCents(r.price_cents)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4 sticky top-6">
            <div>
              <p className="text-3xl font-bold text-zinc-100">
                {item.price_cents === 0 ? 'Free' : formatCents(item.price_cents)}
              </p>
              {item.price_cents > 0 && (
                <p className="text-xs text-zinc-600 mt-0.5">One-time purchase · Instant download</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Download className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-500">{item.download_count} downloads</span>
            </div>

            {isOwner ? (
              <Link href={`/content/${item.id}`}>
                <Button variant="outline" className="w-full">Manage Content</Button>
              </Link>
            ) : item.price_cents === 0 ? (
              item.file_url ? (
                <a href={item.file_url} download>
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Free
                  </Button>
                </a>
              ) : (
                <Button disabled className="w-full">Unavailable</Button>
              )
            ) : canPurchase ? (
              <form action={async () => {
                'use server'
                const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payments/checkout`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contentId: id }),
                })
                const { url } = await res.json()
                if (url) redirect(url)
              }}>
                <Button type="submit" className="w-full">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Purchase · {formatCents(item.price_cents)}
                </Button>
              </form>
            ) : !user ? (
              <Link href={`/login?redirect=/marketplace/${id}`}>
                <Button className="w-full">Sign in to Purchase</Button>
              </Link>
            ) : (
              <Button disabled className="w-full">Creator payout not configured</Button>
            )}

            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                  {item.creator.full_name?.[0] ?? 'C'}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{item.creator.full_name}</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <User className="h-3 w-3" /> Creator
                  </p>
                </div>
              </div>
              {item.creator.bio && (
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{item.creator.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
