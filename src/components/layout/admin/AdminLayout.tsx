import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, Users, Tag, Ticket, BarChart2, Settings, LogOut, Menu, X, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store'
import api from '@/lib/api'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'คำสั่งซื้อ', icon: ShoppingBag },
  { to: '/admin/products', label: 'สินค้า', icon: Package },
  { to: '/admin/categories', label: 'หมวดหมู่', icon: Tag },
  { to: '/admin/customers', label: 'ลูกค้า', icon: Users },
  { to: '/admin/coupons', label: 'คูปอง', icon: Ticket },
  { to: '/admin/reports', label: 'รายงาน', icon: BarChart2 },
  { to: '/admin/chat', label: 'แชท', icon: MessageCircle },
  { to: '/admin/settings', label: 'ตั้งค่า', icon: Settings },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { data: rooms = [] } = useQuery({
    queryKey: ['admin-chat-rooms'],
    queryFn: async () => { const { data } = await api.get('/chat/admin/rooms'); return data },
    refetchInterval: 15000,
  })
  const totalUnread = (rooms as any[]).reduce((s: number, r: any) => s + (r.unread_admin || 0), 0)

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className={"transition-all duration-200 " + (sidebarOpen ? 'w-56' : 'w-16') + " bg-white border-r border-gray-200 flex flex-col shrink-0"}>
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <p className="font-bold text-primary-600">MyShop</p>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition relative " +
                (isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50')
              }>
              <Icon size={17} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
              {/* Badge unread แชท */}
              {to === '/admin/chat' && totalUnread > 0 && (
                <span className={`bg-red-500 text-white text-[10px] rounded-full font-bold flex items-center justify-center ${sidebarOpen ? 'ml-auto w-5 h-5' : 'absolute -top-0.5 -right-0.5 w-4 h-4'}`}>
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-2 py-4 border-t border-gray-100">
          {sidebarOpen && user && (
            <div className="px-3 py-2 mb-2">
              <p className="text-xs font-medium text-gray-700 truncate">{user.full_name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          )}
          <button onClick={() => { logout(); navigate('/login') }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 w-full">
            <LogOut size={17} className="shrink-0" />
            {sidebarOpen && <span>ออกจากระบบ</span>}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  )
}