'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_MB, formatFileSize } from '@/lib/utils'
import { Upload, X, CheckCircle2, Loader2, Wand2 } from 'lucide-react'
import type { ContentType, LicenseType } from '@/types'

const CONTENT_TYPES: { value: ContentType; label: string; desc: string }[] = [
  { value: 'audio', label: 'Audio', desc: 'Music, samples, SFX, podcasts' },
  { value: 'video', label: 'Video', desc: 'Clips, tutorials, reels' },
  { value: 'image', label: 'Image', desc: 'Photos, art, graphics' },
  { value: 'template', label: 'Template', desc: 'Social media, design, doc templates' },
  { value: 'preset', label: 'Preset', desc: 'LUTs, filters, plugin presets' },
  { value: 'ebook', label: 'eBook/PDF', desc: 'Guides, courses, workbooks' },
]

const LICENSE_TYPES: { value: LicenseType; label: string; desc: string }[] = [
  { value: 'free', label: 'Free', desc: 'Anyone can download for free' },
  { value: 'standard', label: 'Standard License', desc: 'Personal & commercial use, no resale' },
  { value: 'extended', label: 'Extended License', desc: 'Unlimited commercial use' },
  { value: 'exclusive', label: 'Exclusive', desc: 'Buyer gets sole ownership' },
]

export default function UploadPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<'type' | 'file' | 'details' | 'publishing'>('type')
  const [contentType, setContentType] = useState<ContentType | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [generatingMeta, setGeneratingMeta] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    tags: '',
    price: '',
    license: 'standard' as LicenseType,
  })

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped && contentType) {
      const accepted = ACCEPTED_FILE_TYPES[contentType]
      if (accepted.includes(dropped.type)) {
        setFile(dropped)
        if (!form.title) setForm(f => ({ ...f, title: dropped.name.replace(/\.[^.]+$/, '') }))
      }
    }
  }, [contentType, form.title])

  async function generateMetadata() {
    if (!file || !contentType) return
    setGeneratingMeta(true)
    try {
      const res = await fetch('/api/content/generate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType, title: form.title }),
      })
      const { description, tags, suggestedPrice } = await res.json()
      setForm(f => ({
        ...f,
        description: description || f.description,
        tags: tags?.join(', ') || f.tags,
        price: suggestedPrice ? String(suggestedPrice) : f.price,
      }))
    } finally {
      setGeneratingMeta(false)
    }
  }

  async function handlePublish() {
    if (!file || !contentType) return
    setUploading(true)
    setStep('publishing')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const ext = file.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${ext}`

      // Upload without progress for now; Supabase JS v2 uses fetch under the hood
      // For resumable uploads with progress, use the TUS endpoint directly
      setUploadProgress(10)
      const { error: uploadError } = await supabase.storage
        .from('content-files')
        .upload(filePath, file)
      setUploadProgress(80)

      if (uploadError) throw uploadError

      const { data: { publicUrl: fileUrl } } = supabase.storage
        .from('content-files')
        .getPublicUrl(filePath)

      let thumbnailUrl: string | undefined
      if (thumbnail) {
        const thumbPath = `${user.id}/thumb_${Date.now()}.${thumbnail.name.split('.').pop()}`
        await supabase.storage.from('thumbnails').upload(thumbPath, thumbnail)
        const { data: { publicUrl } } = supabase.storage.from('thumbnails').getPublicUrl(thumbPath)
        thumbnailUrl = publicUrl
      }

      const priceCents = form.license === 'free' ? 0 : Math.round(parseFloat(form.price || '0') * 100)

      const { data: content, error } = await supabase.from('content').insert({
        creator_id: user.id,
        title: form.title,
        description: form.description,
        type: contentType,
        status: 'published',
        license_type: form.license,
        price_cents: priceCents,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        metadata: { original_filename: file.name, file_size: file.size },
        download_count: 0,
        revenue_total_cents: 0,
      }).select().single()

      if (error) throw error
      router.push(`/content/${content.id}?uploaded=true`)
    } catch (err) {
      console.error(err)
      setStep('details')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Upload Content</h1>
        <p className="text-sm text-zinc-400 mt-1">Share your work with the world and start earning</p>
      </div>

      <div className="flex gap-2 mb-8">
        {(['type', 'file', 'details'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold
              ${step === s || (step === 'publishing' && i === 2) ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              {i + 1}
            </div>
            <span className={`text-xs ${step === s ? 'text-zinc-200' : 'text-zinc-500'}`}>
              {s === 'type' ? 'Type' : s === 'file' ? 'File' : 'Details'}
            </span>
            {i < 2 && <div className="w-8 h-px bg-zinc-700" />}
          </div>
        ))}
      </div>

      {step === 'type' && (
        <div className="grid grid-cols-2 gap-3">
          {CONTENT_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => { setContentType(ct.value); setStep('file') }}
              className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-left hover:border-violet-500 hover:bg-violet-950/20 transition-all"
            >
              <p className="font-medium text-zinc-100">{ct.label}</p>
              <p className="text-xs text-zinc-500 mt-1">{ct.desc}</p>
            </button>
          ))}
        </div>
      )}

      {step === 'file' && contentType && (
        <div className="space-y-4">
          <div
            onDrop={handleFileDrop}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-zinc-700 rounded-xl p-12 text-center hover:border-violet-500 transition-colors cursor-pointer"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              className="hidden"
              accept={ACCEPTED_FILE_TYPES[contentType].join(',')}
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) {
                  setFile(f)
                  if (!form.title) setForm(prev => ({ ...prev, title: f.name.replace(/\.[^.]+$/, '') }))
                }
              }}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-zinc-200">{file.name}</p>
                  <p className="text-xs text-zinc-500">{formatFileSize(file.size)}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setFile(null) }} className="ml-2 text-zinc-500 hover:text-zinc-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-300 font-medium">Drop your {contentType} file here</p>
                <p className="text-xs text-zinc-500 mt-1">Max {MAX_FILE_SIZE_MB[contentType]}MB</p>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('type')}>Back</Button>
            <Button disabled={!file} onClick={() => setStep('details')} className="flex-1">
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-5">
          <div className="flex justify-between items-start">
            <div className="flex-1 space-y-5">
              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-1.5">Title</label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Give your content a great title"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what buyers get and how they can use it..."
                  rows={4}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-1.5">Tags (comma-separated)</label>
                <Input
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="e.g. lofi, beats, chill, music"
                />
              </div>

              <button
                onClick={generateMetadata}
                disabled={generatingMeta}
                className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50"
              >
                {generatingMeta ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                {generatingMeta ? 'Generating...' : 'Auto-generate description & tags with AI'}
              </button>

              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">License Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {LICENSE_TYPES.map(lt => (
                    <button
                      key={lt.value}
                      onClick={() => setForm(f => ({ ...f, license: lt.value }))}
                      className={`rounded-lg border p-3 text-left text-xs transition-all ${
                        form.license === lt.value
                          ? 'border-violet-500 bg-violet-950/30 text-violet-300'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <p className="font-medium">{lt.label}</p>
                      <p className="text-zinc-500 mt-0.5">{lt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {form.license !== 'free' && (
                <div>
                  <label className="text-sm font-medium text-zinc-300 block mb-1.5">Price (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">$</span>
                    <Input
                      type="number"
                      min="0.99"
                      step="0.01"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="9.99"
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">You keep 80% · Platform fee: 20%</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep('file')}>Back</Button>
            <Button
              onClick={handlePublish}
              disabled={uploading || !form.title || (form.license !== 'free' && !form.price)}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : 'Publish Content'}
            </Button>
          </div>
        </div>
      )}

      {step === 'publishing' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-10 w-10 text-violet-400 animate-spin mb-4" />
          <h2 className="text-lg font-semibold text-zinc-100">Publishing your content...</h2>
          <p className="text-sm text-zinc-500 mt-2">{uploadProgress}% uploaded</p>
          <div className="w-48 h-1.5 rounded-full bg-zinc-800 mt-4 overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
