import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** If true, the sheet takes the full screen height. Default is auto (content-driven). */
  fullHeight?: boolean;
  /** Hide the drag handle pill. Defaults to false. */
  noHandle?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  fullHeight = false,
  noHandle = false,
}: ModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            key="modal-sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 32,
              stiffness: 380,
              mass: 0.8,
            }}
            className={`fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md w-full bg-white rounded-t-3xl shadow-2xl flex flex-col ${
              fullHeight ? 'h-[90dvh]' : 'max-h-[90dvh]'
            }`}
          >
            {/* Drag Handle */}
            {!noHandle && (
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>
            )}

            {/* Header */}
            {title && (
              <div
                className={`flex items-center justify-between px-5 shrink-0 ${
                  noHandle ? 'pt-5 pb-3' : 'pt-2 pb-3'
                } border-b border-gray-100`}
              >
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {!title && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500 z-10"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
