// ─── HomePage.tsx ─────────────────────────────────────────
import { Link } from 'react-router-dom'
import { useFeaturedProducts } from '@/hooks/useApi'
import ProductCard from '@/components/shop/ProductCard'
import { ArrowRight } from 'lucide-react'

export default function HomePage() {
  const { data: featured, isLoading } = useFeaturedProducts()

  return (
    <div>
      {/* Hero */}
      <section className="bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-6">
          <h1 className="text-4xl md:text-5xl font-bold">ยินดีต้อนรับสู่ MyShop</h1>
          <p className="text-lg text-primary-100 max-w-xl">สินค้าคุณภาพดี ส่งตรงถึงบ้าน ราคาย่อมเยา</p>
          <Link
            to="/shop"
            className="bg-white text-primary-600 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition flex items-center gap-2"
          >
            เลือกซื้อสินค้า <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">สินค้าแนะนำ</h2>
          <Link to="/shop" className="text-primary-600 hover:underline text-sm flex items-center gap-1">
            ดูทั้งหมด <ArrowRight size={14} />
          </Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured?.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Promo banners */}
      <section className="max-w-7xl mx-auto px-4 pb-16 grid md:grid-cols-3 gap-4">
        {[
          { icon: '🚚', title: 'ส่งฟรี', desc: 'เมื่อซื้อครบ 1,000 บาท' },
          { icon: '↩️', title: 'คืนสินค้าได้', desc: 'ภายใน 30 วัน' },
          { icon: '🔒', title: 'ชำระเงินปลอดภัย', desc: 'ผ่าน Lemon Squeezy' },
        ].map((b) => (
          <div key={b.title} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
            <span className="text-3xl">{b.icon}</span>
            <div>
              <p className="font-semibold text-gray-900">{b.title}</p>
              <p className="text-sm text-gray-500">{b.desc}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
