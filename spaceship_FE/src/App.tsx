import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/AuthProvider'
import AdminLayout from './pages/admin/AdminLayout'
import CampaignsPage from './pages/admin/CampaignsPage'
import CustomersPage from './pages/admin/CustomersPage'
import LoginPage from './pages/admin/LoginPage'
import PricesPage from './pages/admin/PricesPage'
import SeatedPage from './pages/admin/SeatedPage'
import SettingsPage from './pages/admin/SettingsPage'
import CustomerPage from './pages/customer/CustomerPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Customer surface: read-only, reached through a magic link. */}
          <Route path="/s/:token" element={<CustomerPage />} />

          {/* Admin surface: the owner, behind the login screen. */}
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AdminLayout />}>
            <Route index element={<SeatedPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="prices" element={<PricesPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
