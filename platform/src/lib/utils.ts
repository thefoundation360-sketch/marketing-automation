import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const ACCEPTED_FILE_TYPES: Record<string, string[]> = {
  audio: ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac'],
  video: ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  template: ['application/zip', 'application/x-zip-compressed'],
  ebook: ['application/pdf', 'application/epub+zip'],
  preset: ['application/zip', 'application/octet-stream'],
}

export const MAX_FILE_SIZE_MB: Record<string, number> = {
  audio: 500,
  video: 2048,
  image: 50,
  template: 200,
  ebook: 100,
  preset: 200,
}
