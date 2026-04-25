// ─── ProductCard.tsx ──────────────────────────────────────
import { Link } from 'react-router-dom'
import { ShoppingCart, Heart } from 'lucide-react'
import { useCartStore, useAuthStore } from '@/store'
import { useWishlistCheck, useToggleWishlist } from '@/hooks/useApi'
import type { Product } from '@/types'
import toast from 'react-hot-toast'

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { data: wishlistData } = useWishlistCheck(product.id)
  const { mutateAsync: toggleWishlist, isPending } = useToggleWishlist(product.id)
  const img = product.images?.[0]?.url
  const inWishlist = wishlistData?.in_wishlist ?? false

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem(product, 1)
    toast.success('เพิ่มลงตะกร้าแล้ว')
  }

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated) { toast.error('กรุณาเข้าสู่ระบบก่อน'); return }
    try {
      await toggleWishlist(inWishlist)
      toast.success(inWishlist ? 'ลบออกจากรายการโปรด' : 'เพิ่มในรายการโปรดแล้ว')
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  const hasDiscount = product.compare_price && product.compare_price > product.price
  const discountPct = hasDiscount ? Math.round((1 - product.price / product.compare_price!) * 100) : 0

  return (
    <Link to={`/shop/${product.slug}`} className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {img ? (
          <img src={img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📦</div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{discountPct}%
          </span>
        )}
        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          disabled={isPending}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition
            ${inWishlist
              ? 'bg-white text-red-500'
              : 'bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100'}
          `}
        >
          <Heart size={13} className={inWishlist ? 'fill-red-500' : ''} />
        </button>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{product.name}</p>
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-primary-600 font-bold">฿{product.price.toLocaleString()}</span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through ml-2">฿{product.compare_price!.toLocaleString()}</span>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={product.stock === 0}
            className="bg-primary-600 text-white p-1.5 rounded-lg hover:bg-primary-700 transition disabled:opacity-40"
          >
            <ShoppingCart size={14} />
          </button>
        </div>
        {product.stock === 0 && <p className="text-xs text-red-500 mt-1">สินค้าหมด</p>}
        {product.stock > 0 && product.stock <= 5 && (
          <p className="text-xs text-orange-500 mt-1">เหลือ {product.stock} ชิ้น</p>
        )}
      </div>
    </Link>
  )
}
