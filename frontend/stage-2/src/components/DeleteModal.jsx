import { useEffect, useRef } from 'react'

export default function DeleteModal({ invoiceId, onConfirm, onCancel }) {
  const cancelRef = useRef(null)
  const confirmRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onCancel()

      if (e.key === 'Tab') {
        const focusableElements = [cancelRef.current, confirmRef.current].filter(Boolean)
        const firstEl = focusableElements[0]
        const lastEl = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault()
            lastEl?.focus()
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault()
            firstEl?.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-desc"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white dark:bg-[#1E2139] rounded-lg p-12 max-w-[480px] w-full animate-scale-in">
        <h2
          id="delete-modal-title"
          className="text-[24px] font-bold text-[#0C0E16] dark:text-white mb-3"
        >
          Confirm Deletion
        </h2>
        <p
          id="delete-modal-desc"
          className="text-[13px] text-[#888EB0] dark:text-[#DFE3FA] leading-[22px] mb-6"
        >
          Are you sure you want to delete invoice <span className="font-bold">#{invoiceId}</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-6 py-4 rounded-full font-bold text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] bg-[#F9FAFE] dark:bg-[#252945] hover:bg-[#DFE3FA] dark:hover:bg-[#DFE3FA] dark:hover:text-[#0C0E16] transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-6 py-4 rounded-full font-bold text-[12px] text-white bg-[#EC5757] hover:bg-[#FF9797] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
