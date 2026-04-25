import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWishlist, useToggleWishlist } from '@/hooks/useApi'
import { useCartStore } from '@/store'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

function WishlistCard({ product }: { product: Product }) {
  const { mutateAsync: toggle, isPending } = useToggleWishlist(product.id)
  const addItem = useCartStore(s => s.addItem)

  const handleRemove = async () => {
    try {
      await toggle(true)
      toast.success('ลบออกจาก Wishlist แล้ว')
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  const handleAddToCart = () => {
    addItem(product)
    toast.success('เพิ่มลงตะกร้าแล้ว')
  }

  const img = product.images?.[0]?.url
  const hasDiscount = product.compare_price && product.compare_price > product.price
  const discountPct = hasDiscount ? Math.round((1 - product.price / product.compare_price!) * 100) : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      <Link to={`/shop/${product.slug}`} className="relative block aspect-square overflow-hidden bg-gray-50">
        {img
          ? <img src={img} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🛍️</div>}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            -{discountPct}%
          </span>
        )}
      </Link>
      <div className="p-3 flex flex-col flex-1">
        <Link to={`/shop/${product.slug}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 line-clamp-2 mb-1">
          {product.name}
        </Link>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-bold text-primary-600">฿{product.price.toLocaleString()}</span>
          {hasDiscount && <span className="text-xs text-gray-400 line-through">฿{product.compare_price!.toLocaleString()}</span>}
        </div>
        <div className="flex gap-2 mt-auto">
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-primary-700 transition disabled:opacity-40"
          >
            <ShoppingCart size={13} />{product.stock === 0 ? 'สินค้าหมด' : 'ใส่ตะกร้า'}
          </button>
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="p-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WishlistPage() {
  const { data: products, isLoading } = useWishlist()

  if (isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl aspect-square animate-pulse" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-8">
        <Heart size={22} className="text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">รายการโปรด</h1>
        {products && products.length > 0 && (
          <span className="ml-1 text-sm text-gray-500">({products.length} รายการ)</span>
        )}
      </div>

      {!products || products.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={56} className="mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400 text-lg mb-2">ยังไม่มีสินค้าในรายการโปรด</p>
          <p className="text-gray-300 text-sm mb-6">กดหัวใจบนสินค้าเพื่อบันทึกไว้ที่นี่</p>
          <Link to="/shop" className="inline-block bg-primary-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-700 transition">
            เลือกชมสินค้า
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products.map(p => <WishlistCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
