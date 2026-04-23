import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useInvoices } from '../context/InvoiceContext'
import StatusBadge from '../components/StatusBadge'
import DeleteModal from '../components/DeleteModal'
import InvoiceForm from '../components/InvoiceForm'
import { formatDate, formatCurrency } from '../utils/helpers'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { invoices, deleteInvoice, markAsPaid } = useInvoices()
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const invoice = invoices.find(inv => inv.id === id)

  if (!invoice) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#0C0E16] dark:text-white mb-4">Invoice not found</h1>
          <button
            onClick={() => navigate('/')}
            className="text-[#7C5DFA] hover:text-[#9277FF] font-bold"
          >
            Go back to invoices
          </button>
        </div>
      </main>
    )
  }

  function handleDelete() {
    deleteInvoice(id)
    navigate('/')
  }

  return (
    <main className="min-h-screen py-8 sm:py-14 px-6 sm:px-12 max-w-[730px] mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-4 font-bold text-[12px] text-[#0C0E16] dark:text-white hover:text-[#888EB0] transition-colors mb-8"
        aria-label="Go back to invoice list"
      >
        <svg width="7" height="10" viewBox="0 0 7 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M6 1L2 5L6 9" stroke="#7C5DFA" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Go back
      </button>

      {/* Status bar */}
      <div className="flex items-center justify-between bg-white dark:bg-[#1E2139] rounded-lg px-6 sm:px-8 py-6 mb-4 sm:mb-6 shadow-sm">
        <div className="flex items-center gap-4 sm:gap-5 flex-1">
          <span className="text-[13px] text-[#858BB2] dark:text-[#DFE3FA]">Status</span>
          <StatusBadge status={invoice.status} />
        </div>

        {/* Action buttons - desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="px-6 py-4 rounded-full font-bold text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] bg-[#F9FAFE] dark:bg-[#252945] hover:bg-[#DFE3FA] dark:hover:bg-[#DFE3FA] dark:hover:text-[#0C0E16] transition-colors"
            disabled={invoice.status === 'paid'}
            aria-label="Edit invoice"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="px-6 py-4 rounded-full font-bold text-[12px] text-white bg-[#EC5757] hover:bg-[#FF9797] transition-colors"
            aria-label="Delete invoice"
          >
            Delete
          </button>
          {invoice.status === 'pending' && (
            <button
              onClick={() => markAsPaid(id)}
              className="px-6 py-4 rounded-full font-bold text-[12px] text-white bg-[#7C5DFA] hover:bg-[#9277FF] transition-colors"
              aria-label="Mark invoice as paid"
            >
              Mark as Paid
            </button>
          )}
        </div>
      </div>

      {/* Invoice Details */}
      <article className="bg-white dark:bg-[#1E2139] rounded-lg p-6 sm:p-12 shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-8 mb-8">
          <div>
            <h1 className="font-bold text-[16px] text-[#0C0E16] dark:text-white mb-1">
              <span className="text-[#7E88C3]">#</span>{invoice.id}
            </h1>
            <p className="text-[13px] text-[#7E88C3] dark:text-[#DFE3FA]">{invoice.description}</p>
          </div>
          <address className="not-italic text-[11px] text-[#7E88C3] dark:text-[#DFE3FA] leading-[18px] sm:text-right">
            <p>{invoice.senderAddress?.street}</p>
            <p>{invoice.senderAddress?.city}</p>
            <p>{invoice.senderAddress?.postCode}</p>
            <p>{invoice.senderAddress?.country}</p>
          </address>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mb-10">
          <div>
            <p className="text-[13px] text-[#7E88C3] dark:text-[#DFE3FA] mb-3">Invoice Date</p>
            <p className="font-bold text-[15px] text-[#0C0E16] dark:text-white">{formatDate(invoice.createdAt)}</p>
          </div>
          <div className="sm:col-start-2">
            <p className="text-[13px] text-[#7E88C3] dark:text-[#DFE3FA] mb-3">Bill To</p>
            <p className="font-bold text-[15px] text-[#0C0E16] dark:text-white mb-2">{invoice.clientName}</p>
            <address className="not-italic text-[11px] text-[#7E88C3] dark:text-[#DFE3FA] leading-[18px]">
              <p>{invoice.clientAddress?.street}</p>
              <p>{invoice.clientAddress?.city}</p>
              <p>{invoice.clientAddress?.postCode}</p>
              <p>{invoice.clientAddress?.country}</p>
            </address>
          </div>
          <div>
            <p className="text-[13px] text-[#7E88C3] dark:text-[#DFE3FA] mb-3">Payment Due</p>
            <p className="font-bold text-[15px] text-[#0C0E16] dark:text-white mb-8">{formatDate(invoice.paymentDue)}</p>
            <p className="text-[13px] text-[#7E88C3] dark:text-[#DFE3FA] mb-3">Sent to</p>
            <p className="font-bold text-[15px] text-[#0C0E16] dark:text-white break-all">{invoice.clientEmail}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-[#F9FAFE] dark:bg-[#252945] rounded-lg rounded-b-none overflow-hidden">
          {/* Table Header - desktop */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_80px_120px_120px] gap-4 px-8 py-5">
            <span className="text-[11px] text-[#7E88C3] dark:text-[#DFE3FA] font-medium">Item Name</span>
            <span className="text-[11px] text-[#7E88C3] dark:text-[#DFE3FA] font-medium text-right">QTY.</span>
            <span className="text-[11px] text-[#7E88C3] dark:text-[#DFE3FA] font-medium text-right">Price</span>
            <span className="text-[11px] text-[#7E88C3] dark:text-[#DFE3FA] font-medium text-right">Total</span>
          </div>

          {/* Items */}
          <div className="px-6 sm:px-8 py-6 flex flex-col gap-6">
            {invoice.items?.map((item, index) => (
              <div key={index} className="flex items-center justify-between sm:grid sm:grid-cols-[1fr_80px_120px_120px] sm:gap-4">
                <div className="sm:contents">
                  <div>
                    <p className="font-bold text-[12px] text-[#0C0E16] dark:text-white">{item.name}</p>
                    <p className="font-bold text-[12px] text-[#7E88C3] dark:text-[#888EB0] sm:hidden">
                      {item.quantity} x {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="font-bold text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] text-right hidden sm:block">{item.quantity}</p>
                  <p className="font-bold text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] text-right hidden sm:block">{formatCurrency(item.price)}</p>
                </div>
                <p className="font-bold text-[12px] text-[#0C0E16] dark:text-white text-right">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-[#373B53] dark:bg-[#0C0E16] rounded-b-lg px-6 sm:px-8 py-8 flex items-center justify-between">
          <span className="text-[11px] text-white">Amount Due</span>
          <span className="font-bold text-[20px] sm:text-[24px] text-white">{formatCurrency(invoice.total)}</span>
        </div>
      </article>

      {/* Mobile action bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1E2139] px-6 py-5 flex justify-end gap-2 shadow-top">
        <button
          onClick={() => setShowEdit(true)}
          className="px-6 py-4 rounded-full font-bold text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] bg-[#F9FAFE] dark:bg-[#252945] hover:bg-[#DFE3FA] transition-colors"
          disabled={invoice.status === 'paid'}
          aria-label="Edit invoice"
        >
          Edit
        </button>
        <button
          onClick={() => setShowDelete(true)}
          className="px-6 py-4 rounded-full font-bold text-[12px] text-white bg-[#EC5757] hover:bg-[#FF9797] transition-colors"
          aria-label="Delete invoice"
        >
          Delete
        </button>
        {invoice.status === 'pending' && (
          <button
            onClick={() => markAsPaid(id)}
            className="px-6 py-4 rounded-full font-bold text-[12px] text-white bg-[#7C5DFA] hover:bg-[#9277FF] transition-colors"
            aria-label="Mark invoice as paid"
          >
            Mark as Paid
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <DeleteModal
          invoiceId={invoice.id}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {/* Edit Form */}
      {showEdit && (
        <InvoiceForm
          invoice={invoice}
          onClose={() => setShowEdit(false)}
        />
      )}
    </main>
  )
}
