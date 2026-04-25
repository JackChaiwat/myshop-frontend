import { Outlet, Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, Search, Menu, X, Package, Heart } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore, useCartStore } from '@/store'
import ChatWidget from '@/components/ChatWidget'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const itemCount = useCartStore((s) => s.itemCount())

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQ.trim()) navigate(`/shop?q=${encodeURIComponent(searchQ.trim())}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/" className="text-xl font-bold text-primary-600 shrink-0">MyShop</Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
              />
            </div>
          </form>

          <nav className="hidden md:flex items-center gap-5 text-sm ml-auto">
            <Link to="/shop" className="text-gray-600 hover:text-gray-900">สินค้า</Link>
            {isAuthenticated ? (
              <>
                <Link to="/orders" className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
                  <Package size={16} />คำสั่งซื้อ
                </Link>
                <Link to="/wishlist" className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
                  <Heart size={16} />รายการโปรด
                </Link>
                <Link to="/profile" className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
                  {user?.avatar_url
                    ? <img src={`${import.meta.env.VITE_STATIC_URL}${user.avatar_url}`} className="w-6 h-6 rounded-full object-cover" alt="avatar" />
                    : <User size={16} />}
                  {user?.full_name?.split(' ')[0]}
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="text-primary-600 font-medium">Admin</Link>
                )}
              </>
            ) : (
              <Link to="/login" className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <User size={16} />เข้าสู่ระบบ
              </Link>
            )}
            <Link to="/cart" className="relative">
              <ShoppingCart size={22} className="text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </nav>

          {/* Mobile menu toggle */}
          <button className="md:hidden ml-auto" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-4 text-sm">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none"
              />
            </form>
            <Link to="/shop" onClick={() => setMenuOpen(false)}>สินค้า</Link>
            <Link to="/cart" onClick={() => setMenuOpen(false)}>ตะกร้า ({itemCount})</Link>
            {isAuthenticated ? (
              <>
                <Link to="/orders" onClick={() => setMenuOpen(false)}>คำสั่งซื้อ</Link>
                <Link to="/wishlist" onClick={() => setMenuOpen(false)} className="flex items-center gap-2"><Heart size={15} />รายการโปรด</Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2"><User size={15} />โปรไฟล์</Link>
                <button onClick={() => { logout(); setMenuOpen(false) }}>ออกจากระบบ</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)}>เข้าสู่ระบบ</Link>
            )}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 text-sm text-gray-500 flex flex-col md:flex-row justify-between gap-4">
          <p>© 2024 MyShop. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-900">นโยบายความเป็นส่วนตัว</a>
            <a href="#" className="hover:text-gray-900">เงื่อนไขการใช้งาน</a>
          </div>
        </div>
      </footer>

      {/* ปุ่มแชทลอยอยู่ทุกหน้า */}
      <ChatWidget />
    </div>
  )
}