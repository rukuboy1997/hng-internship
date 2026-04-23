import { createContext, useContext, useEffect, useState } from 'react'
import seedData from '../data/invoices.json'

const InvoiceContext = createContext()

const STORAGE_KEY = 'invoice-app-data'

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return null
}

export function InvoiceProvider({ children }) {
  const [invoices, setInvoices] = useState(() => {
    const stored = loadFromStorage()
    return stored || seedData
  })
  const [filter, setFilter] = useState([])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices))
  }, [invoices])

  const filteredInvoices = filter.length === 0
    ? invoices
    : invoices.filter(inv => filter.includes(inv.status))

  function addInvoice(invoice) {
    setInvoices(prev => [invoice, ...prev])
  }

  function updateInvoice(id, updates) {
    setInvoices(prev =>
      prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv)
    )
  }

  function deleteInvoice(id) {
    setInvoices(prev => prev.filter(inv => inv.id !== id))
  }

  function markAsPaid(id) {
    setInvoices(prev =>
      prev.map(inv => inv.id === id ? { ...inv, status: 'paid' } : inv)
    )
  }

  return (
    <InvoiceContext.Provider value={{
      invoices,
      filteredInvoices,
      filter,
      setFilter,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      markAsPaid,
    }}>
      {children}
    </InvoiceContext.Provider>
  )
}

export function useInvoices() {
  return useContext(InvoiceContext)
}
