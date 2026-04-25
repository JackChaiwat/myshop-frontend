import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'

import Layout from '@/components/layout/admin/Layout'
import AdminLayout from '@/components/layout/admin/AdminLayout'

import HomePage from '@/pages/HomePage'
import ShopPage from '@/pages/ShopPage'
import ProductPage from '@/pages/ProductPage'
import CartPage from '@/pages/CartPage'
import CheckoutPage from '@/pages/CheckoutPage'
import OrderSuccessPage from '@/pages/OrderSuccessPage'
import OrdersPage from '@/pages/OrdersPage'
import OrderDetailPage from '@/pages/OrderDetailPage'
import ProfilePage from '@/pages/ProfilePage'
import WishlistPage from '@/pages/WishlistPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import AdminDashboard from '@/pages/admin/DashboardPage'
import AdminProducts from '@/pages/admin/ProductsPage'
import AdminOrders from '@/pages/admin/OrdersPage'
import AdminCustomers from '@/pages/admin/CustomersPage'
import AdminCategories from '@/pages/admin/CategoriesPage'
import AdminCoupons from '@/pages/admin/CouponsPage'
import AdminReports from '@/pages/admin/ReportsPage'
import AdminSettings from '@/pages/admin/SettingsPage'

import { useAuthStore } from '@/store'
import AdminChat from '@/pages/admin/AdminChatPage'


const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { 
      staleTime: 1000 * 60 * 5, 
      retry: 1,
      refetchOnWindowFocus: false,
    } 
  },
})

// ✅ Protected Route Components
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }
  
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { restoreToken, isLoading } = useAuthStore()
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    // ✅ restore token on mount
    restoreToken().finally(() => {
      setRestored(true)
    })
  }, [restoreToken])

  // ✅ 3rd party scripts (PostHog, Tawk)
  useEffect(() => {
    const posthogKey = import.meta.env.VITE_POSTHOG_KEY
    if (posthogKey && posthogKey !== '' && !posthogKey.includes('xxxx')) {
      import('posthog-js').then(({ default: posthog }) => {
        posthog.init(posthogKey, {
          api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
          capture_pageview: true,
        })
      })
    }
    
    const tawkId = import.meta.env.VITE_TAWK_PROPERTY_ID
    const tawkWidget = import.meta.env.VITE_TAWK_WIDGET_ID
    if (tawkId && tawkWidget) {
      const s = document.createElement('script')
      s.src = `https://embed.tawk.to/${tawkId}/${tawkWidget}`
      s.async = true
      document.body.appendChild(s)
    }
  }, [])

  // ✅ แสดง loading จนกว่า token จะ restore เสร็จ
  if (!restored || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Toaster position="top-right" />
        <Routes>
          {/* Public routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Customer routes (ต้อง login) */}
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/orders/:id/success" element={<OrderSuccessPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route path="chat" element={<AdminChat />} />
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* 404 redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}