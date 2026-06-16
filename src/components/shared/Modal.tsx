import { ReactNode, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ModalSize = 'sm' | 'md' | 'lg' | 'full'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: ModalSize
}

const SIZE_HEIGHTS: Record<ModalSize, string> = {
  sm: 'max-h-[40vh]',
  md: 'max-h-[60vh]',
  lg: 'max-h-[85vh]',
  full: 'h-full rounded-none',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number | null>(null)
  const currentYRef = useRef<number>(0)

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // ── Drag-to-dismiss ────────────────────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY
    currentYRef.current = 0
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none'
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startYRef.current === null) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta < 0) return // don't allow dragging up
    currentYRef.current = delta
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`
    }
  }

  function handleTouchEnd() {
    if (sheetRef.current) {
      sheetRef.current.style.transition = ''
      sheetRef.current.style.transform = ''
    }
    if (currentYRef.current > 120) {
      onClose()
    }
    startYRef.current = null
    currentYRef.current = 0
  }

  const isFull = size === 'full'

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] z-50',
          'bg-white flex flex-col',
          isFull ? 'inset-0 translate-x-0 left-0 max-w-none' : 'rounded-t-3xl',
          SIZE_HEIGHTS[size],
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag indicator */}
        {!isFull && (
          <div
            className="flex-shrink-0 flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-10 h-1 rounded-full bg-warm-200" />
          </div>
        )}

        {/* Header */}
        {(title || isFull) && (
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-warm-100">
            {title ? (
              <h2 className="text-base font-semibold text-warm-800 leading-tight">
                {title}
              </h2>
            ) : (
              <div />
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-warm-100 hover:bg-warm-200 active:bg-warm-300 transition-colors"
              aria-label="Close"
            >
              <X size={16} className="text-warm-600" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  )
}
