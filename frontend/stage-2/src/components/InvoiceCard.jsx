import { useNavigate } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { formatDate, formatCurrency } from '../utils/helpers'

export default function InvoiceCard({ invoice }) {
  const navigate = useNavigate()

  return (
    <article
      className="bg-white dark:bg-[#1E2139] rounded-lg p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer hover:border hover:border-[#7C5DFA] border border-transparent transition-all duration-200 shadow-sm group"
      onClick={() => navigate(`/invoices/${invoice.id}`)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/invoices/${invoice.id}`)
        }
      }}
      tabIndex={0}
      role="link"
      aria-label={`View invoice ${invoice.id} for ${invoice.clientName}`}
    >
      {/* Mobile layout */}
      <div className="flex flex-col gap-6 sm:hidden">
        <div className="flex justify-between items-start">
          <span className="font-bold text-[12px] text-[#0C0E16] dark:text-white">
            <span className="text-[#7E88C3]">#</span>
            {invoice.id}
          </span>
          <span className="text-[12px] text-[#858BB2] dark:text-[#DFE3FA]">{invoice.clientName}</span>
        </div>
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-2">
            <span className="text-[12px] text-[#7E88C3] dark:text-[#DFE3FA]">
              Due {formatDate(invoice.paymentDue)}
            </span>
            <span className="font-bold text-[16px] text-[#0C0E16] dark:text-white">
              {formatCurrency(invoice.total)}
            </span>
          </div>
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:flex items-center gap-10 flex-1">
        <span className="font-bold text-[12px] text-[#0C0E16] dark:text-white w-[80px]">
          <span className="text-[#7E88C3]">#</span>
          {invoice.id}
        </span>
        <span className="text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] w-[120px]">
          Due {formatDate(invoice.paymentDue)}
        </span>
        <span className="text-[12px] text-[#858BB2] dark:text-[#DFE3FA] flex-1">
          {invoice.clientName}
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-10">
        <span className="font-bold text-[16px] text-[#0C0E16] dark:text-white w-[120px] text-right">
          {formatCurrency(invoice.total)}
        </span>
        <div className="w-[104px]">
          <StatusBadge status={invoice.status} />
        </div>
        <svg width="7" height="10" viewBox="0 0 7 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#7C5DFA]" aria-hidden="true">
          <path d="M1 1L5 5L1 9" stroke="#7C5DFA" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
    </article>
  )
}
