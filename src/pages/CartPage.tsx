// ─── CartPage.tsx ─────────────────────────────────────────
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '@/store'
import { Trash2, Minus, Plus } from 'lucide-react'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCartStore()
  const navigate = useNavigate()
  const subtotal = total()
  const shippingFee = subtotal >= 1000 ? 0 : 50

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-6xl mb-4">🛒</p>
        <p className="text-xl font-semibold text-gray-700 mb-2">ตะกร้าว่างเปล่า</p>
        <Link to="/shop" className="text-primary-600 hover:underline">เลือกซื้อสินค้า</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">ตะกร้าสินค้า</h1>
      <div className="grid md:grid-cols-3 gap-8">
        {/* Items */}
        <div className="md:col-span-2 space-y-4">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4">
              <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                {product.images[0] ? (
                  <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                ) : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm line-clamp-2">{product.name}</p>
                <p className="text-primary-600 font-bold mt-1">฿{product.price.toLocaleString()}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQuantity(product.id, quantity - 1)} className="border border-gray-200 rounded p-1 hover:bg-gray-50"><Minus size={12} /></button>
                  <span className="text-sm w-6 text-center">{quantity}</span>
                  <button onClick={() => updateQuantity(product.id, quantity + 1)} className="border border-gray-200 rounded p-1 hover:bg-gray-50"><Plus size={12} /></button>
                  <button onClick={() => removeItem(product.id)} className="ml-auto text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit sticky top-20">
          <h2 className="font-semibold text-gray-900 mb-4">สรุปคำสั่งซื้อ</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">ยอดสินค้า</span><span>฿{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between">
              <span className="text-gray-600">ค่าจัดส่ง</span>
              <span>{shippingFee === 0 ? <span className="text-green-600">ฟรี</span> : `฿${shippingFee}`}</span>
            </div>
            {subtotal < 1000 && <p className="text-xs text-gray-400">ซื้อเพิ่ม ฿{(1000 - subtotal).toLocaleString()} เพื่อรับส่งฟรี</p>}
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base">
              <span>รวมทั้งหมด</span>
              <span className="text-primary-600">฿{(subtotal + shippingFee).toLocaleString()}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            className="w-full mt-4 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition"
          >
            ดำเนินการชำระเงิน
          </button>
        </div>
      </div>
    </div>
  )
}
