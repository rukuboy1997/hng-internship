import { useState } from 'react'
import { useInvoices } from '../context/InvoiceContext'
import InvoiceCard from '../components/InvoiceCard'
import FilterDropdown from '../components/FilterDropdown'
import InvoiceForm from '../components/InvoiceForm'

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <svg width="242" height="200" viewBox="0 0 242 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="mb-10">
        <ellipse cx="121" cy="193.5" rx="121" ry="6.5" fill="#DFE3FA" className="dark:opacity-20"/>
        <path d="M31.538 38.462h178.924L178.077 168.462H63.923L31.538 38.462Z" fill="#252945" className="dark:fill-[#252945] fill-[#F8F8FB]"/>
        <rect x="68.385" y="38.462" width="105.231" height="6.461" rx="3.231" fill="#DFE3FA" className="dark:fill-[#1E2139]"/>
        <rect x="68.385" y="55.385" width="105.231" height="6.461" rx="3.231" fill="#DFE3FA" className="dark:fill-[#1E2139]"/>
        <rect x="68.385" y="72.308" width="67.692" height="6.461" rx="3.231" fill="#DFE3FA" className="dark:fill-[#1E2139]"/>
        <circle cx="121" cy="121" r="56" fill="#1E2139" className="dark:fill-[#252945]"/>
        <path d="M115.154 94.154h11.692v44.307h-11.692V94.154Zm0 55.999h11.692v11.693h-11.692v-11.693Z" fill="#EC5757"/>
      </svg>
      <h2 className="text-[20px] font-bold text-[#0C0E16] dark:text-white mb-4">There is nothing here</h2>
      <p className="text-[13px] text-[#888EB0] dark:text-[#DFE3FA] leading-5 max-w-[220px]">
        Create an invoice by clicking the <strong>New Invoice</strong> button and get started
      </p>
    </div>
  )
}

export default function InvoiceListPage() {
  const { filteredInvoices, filter } = useInvoices()
  const [showForm, setShowForm] = useState(false)

  return (
    <main className="min-h-screen py-16 px-6 sm:px-12 lg:py-[72px] max-w-[730px] mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 sm:mb-14">
        <div>
          <h1 className="text-[20px] sm:text-[32px] font-bold text-[#0C0E16] dark:text-white leading-none mb-1">
            Invoices
          </h1>
          <p className="text-[12px] text-[#888EB0] dark:text-[#DFE3FA]">
            <span className="sm:hidden">
              {filteredInvoices.length === 0
                ? 'No invoices'
                : `${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? 's' : ''}`}
            </span>
            <span className="hidden sm:inline">
              {filteredInvoices.length === 0
                ? 'No invoices'
                : `There ${filteredInvoices.length === 1 ? 'is' : 'are'} ${filteredInvoices.length} total invoice${filteredInvoices.length !== 1 ? 's' : ''}`}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-5 sm:gap-10">
          <FilterDropdown />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 sm:gap-4 bg-[#7C5DFA] hover:bg-[#9277FF] transition-colors rounded-full pl-2 pr-4 sm:pr-6 py-2 text-white font-bold text-[12px]"
            aria-label="Create new invoice"
          >
            <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.313 10.023v-4.21h4.21V4.187h-4.21V-.001H4.687v4.188H.476v1.625h4.211v4.211h1.626Z" fill="#7C5DFA"/>
              </svg>
            </span>
            <span className="hidden sm:inline">New Invoice</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <EmptyState />
      ) : (
        <section aria-label="Invoice list" className="flex flex-col gap-4">
          {filteredInvoices.map(invoice => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </section>
      )}

      {/* New Invoice Form */}
      {showForm && (
        <InvoiceForm onClose={() => setShowForm(false)} />
      )}
    </main>
  )
}
