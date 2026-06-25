import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/lib/utils'
import { Download, Search, Filter } from 'lucide-react'
import type { Content, ContentType } from '@/types'

const TYPE_FILTERS: { value: ContentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Images' },
  { value: 'template', label: 'Templates' },
  { value: 'preset', label: 'Presets' },
  { value: 'ebook', label: 'eBooks' },
]

interface SearchParams {
  type?: ContentType
  q?: string
  sort?: 'popular' | 'newest' | 'price_asc' | 'price_desc'
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams

  let query = supabase
    .from('content')
    .select(`
      *,
      profiles:creator_id (full_name, avatar_url)
    `)
    .eq('status', 'published')
    .neq('creator_id', user?.id ?? '')

  if (params.type && params.type !== ('all' as ContentType)) {
    query = query.eq('type', params.type)
  }

  if (params.q) {
    query = query.or(`title.ilike.%${params.q}%,description.ilike.%${params.q}%`)
  }

  const sortMap = {
    popular: { column: 'download_count', ascending: false },
    newest: { column: 'created_at', ascending: false },
    price_asc: { column: 'price_cents', ascending: true },
    price_desc: { column: 'price_cents', ascending: false },
  }
  const sort = sortMap[params.sort ?? 'newest']
  query = query.order(sort.column, { ascending: sort.ascending })

  const { data: items } = await query.limit(48) as { data: (Content & { profiles: { full_name: string; avatar_url?: string } })[] | null }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Marketplace</h1>
        <p className="text-sm text-zinc-400 mt-1">Discover and download premium content from creators</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex items-center gap-2 flex-1 min-w-64">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Search content..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            />
          </div>
        </form>

        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-zinc-500" />
          {TYPE_FILTERS.map(f => (
            <a
              key={f.value}
              href={`/marketplace?type=${f.value === 'all' ? '' : f.value}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                (params.type ?? 'all') === f.value
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>
      </div>

      {items?.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(item => (
            <a
              key={item.id}
              href={`/marketplace/${item.id}`}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-violet-500/50 transition-all"
            >
              <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm capitalize">
                    {item.type}
                  </div>
                )}
                <Badge
                  variant="secondary"
                  className="absolute top-2 left-2 text-[10px]"
                >
                  {item.type}
                </Badge>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-zinc-200 truncate">{item.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">by {item.profiles?.full_name ?? 'Creator'}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-violet-400">
                    {item.price_cents === 0 ? 'Free' : formatCents(item.price_cents)}
                  </span>
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {item.download_count}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 py-20 text-center">
          <p className="text-zinc-400">No content found</p>
          <p className="text-sm text-zinc-600 mt-1">Be the first to publish in this category</p>
        </div>
      )}
    </div>
  )
}
