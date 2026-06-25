import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import { Upload, Download, DollarSign, MoreVertical } from 'lucide-react'
import type { Content, ContentStatus } from '@/types'

const STATUS_VARIANT: Record<ContentStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  draft: 'outline',
  processing: 'warning',
  published: 'success',
  scheduled: 'secondary',
  archived: 'outline',
}

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('creator_id', user!.id)
    .order('created_at', { ascending: false }) as { data: Content[] | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Content Library</h1>
          <p className="text-sm text-zinc-400 mt-1">Upload, organize, and manage all your digital assets</p>
        </div>
        <Link href="/content/upload">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Content
          </Button>
        </Link>
      </div>

      {content?.length ? (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Price</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Downloads</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Revenue</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {content.map(item => (
                <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="" className="h-10 w-16 rounded object-cover bg-zinc-800" />
                      ) : (
                        <div className="h-10 w-16 rounded bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
                          {item.type}
                        </div>
                      )}
                      <span className="text-sm font-medium text-zinc-200">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-zinc-400 capitalize">{item.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[item.status]}>{item.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-zinc-200">
                      {item.price_cents === 0 ? 'Free' : formatCents(item.price_cents)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-zinc-400 flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {item.download_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-emerald-400 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCents(item.revenue_total_cents).replace('$', '')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/content/${item.id}`} className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 inline-flex">
                      <MoreVertical className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 py-20 text-center">
          <Upload className="h-10 w-10 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-zinc-200 mb-1">No content yet</h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-sm">
            Upload your first piece of content — audio, video, templates, presets, or ebooks.
          </p>
          <Link href="/content/upload">
            <Button>Upload your first file</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
