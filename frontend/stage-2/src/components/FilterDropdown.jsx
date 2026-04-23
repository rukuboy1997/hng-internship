import { useState, useRef, useEffect } from 'react'
import { useInvoices } from '../context/InvoiceContext'

const STATUSES = ['draft', 'pending', 'paid']

export default function FilterDropdown() {
  const { filter, setFilter } = useInvoices()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function toggleStatus(status) {
    setFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-3 font-bold text-[12px] sm:text-[15px] text-[#0C0E16] dark:text-white hover:text-[#7C5DFA] transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by status"
      >
        <span className="hidden sm:inline">Filter by status</span>
        <span className="sm:hidden">Filter</span>
        <svg
          width="11"
          height="7"
          viewBox="0 0 11 7"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M1 1L5.5 5.5L10 1" stroke="#7C5DFA" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+20px)] left-1/2 -translate-x-1/2 w-[192px] bg-white dark:bg-[#252945] rounded-lg shadow-[0px_10px_20px_rgba(0,0,0,0.25)] p-6 z-50 animate-scale-in"
          role="listbox"
          aria-label="Status filter options"
          aria-multiselectable="true"
        >
          {STATUSES.map(status => (
            <label
              key={status}
              className="flex items-center gap-3 cursor-pointer py-1 group"
              role="option"
              aria-selected={filter.includes(status)}
            >
              <div
                className={`w-4 h-4 rounded-sm flex items-center justify-center border-2 transition-colors ${
                  filter.includes(status)
                    ? 'bg-[#7C5DFA] border-[#7C5DFA]'
                    : 'border-[#DFE3FA] dark:border-[#494E6E] bg-transparent hover:border-[#7C5DFA]'
                }`}
                aria-hidden="true"
              >
                {filter.includes(status) && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M1 4.5L3.5 7L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                checked={filter.includes(status)}
                onChange={() => toggleStatus(status)}
                className="sr-only"
                aria-label={`Filter by ${status}`}
              />
              <span className="font-bold text-[12px] text-[#0C0E16] dark:text-white capitalize group-hover:text-[#7C5DFA] transition-colors">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
