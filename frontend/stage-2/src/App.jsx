import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import InvoiceListPage from './pages/InvoiceListPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'

export default function App() {
  return (
    <div className="min-h-screen bg-[#F8F8FB] dark:bg-[#141625] transition-colors duration-300">
      <Sidebar />
      <div className="lg:pl-[103px] pt-[72px] lg:pt-0">
        <Routes>
          <Route path="/" element={<InvoiceListPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        </Routes>
      </div>
    </div>
  )
}
