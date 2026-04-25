import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '@/store'
import { useCheckout, useAddresses, useCreateAddress } from '@/hooks/useApi'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const { data: addresses } = useAddresses()
  const { mutateAsync: checkout, isPending } = useCheckout()
  const { mutateAsync: createAddr } = useCreateAddress()
  const navigate = useNavigate()
  const [selectedAddr, setSelectedAddr] = useState<string>('')
  const [showNewAddr, setShowNewAddr] = useState(false)
  const [form, setForm] = useState({
    full_name: '', phone: '', address_line1: '', city: '',
    province: '', postal_code: '', country: 'Thailand'
  })
  const [qrCode, setQrCode] = useState<string>('')
  const [currentOrder, setCurrentOrder] = useState<any>(null)

  const handleSubmit = async () => {
    let addrId = selectedAddr
    if (showNewAddr || !addrId) {
      try {
        const addr = await createAddr({ ...form, is_default: false })
        addrId = addr.id
      } catch {
        toast.error('กรุณากรอกที่อยู่ให้ครบ')
        return
      }
    }
    if (!addrId) {
      toast.error('กรุณาเลือกที่อยู่จัดส่ง')
      return
    }
    try {
      const order = await checkout({
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        address_id: addrId,
      })
      clearCart()

      if (order.qr_code) {
        setQrCode(order.qr_code)
        setCurrentOrder(order)
      } else {
        navigate(`/orders/${order.id}/success`)
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'เกิดข้อผิดพลาด')
    }
  }

  const sanitizeSvg = (svg: string) =>
    svg
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\bon\w+\s*=/gi, 'data-removed=')
      .replace(/javascript:/gi, '')

  const renderQr = () => {
    if (!qrCode) return null
    if (qrCode.trimStart().startsWith('<svg') || qrCode.trimStart().startsWith('<SVG')) {
      return (
        <div
          className="w-64 h-64 flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(qrCode) }}
        />
      )
    }
    if (qrCode.startsWith('data:image')) {
      return <img src={qrCode} alt="QR Code" className="w-64 h-64" />
    }
    return <img src={qrCode} alt="QR Code" className="w-64 h-64" />
  }

  if (qrCode && currentOrder) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 text-center">
        <h1 className="text-2xl font-bold mb-1">สแกนชำระเงิน</h1>
        <p className="text-gray-500 mb-6 text-sm">
          สั่งซื้อ #{currentOrder.order_number} — ฿{currentOrder.total.toLocaleString()}
        </p>
        <div className="border border-gray-200 rounded-2xl p-6 inline-block mb-4 bg-white">
          {renderQr()}
          <p className="text-xs text-gray-400 mt-10">สแกนด้วย Mobile Banking ทุกธนาคาร</p>
          <p className="text-xl font-bold text-primary-600 mt-1">฿{currentOrder.total.toLocaleString()}</p>
        </div>
        <p className="text-xs text-gray-400 mb-10">รอการชำระเงิน... ระบบจะอัปเดตอัตโนมัติ</p>
        <button onClick={() => navigate('/orders')} className="text-sm text-primary-600 hover:underline">
          ดูคำสั่งซื้อทั้งหมด
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">ชำระเงิน</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold mb-4">ที่อยู่จัดส่ง</h2>
        {addresses?.map((a) => (
          <label key={a.id} className="flex items-start gap-3 mb-3 cursor-pointer">
            <input type="radio" name="addr" value={a.id}
              onChange={() => { setSelectedAddr(a.id); setShowNewAddr(false) }}
              className="mt-1" />
            <div className="text-sm">
              <p className="font-medium">{a.full_name} — {a.phone}</p>
              <p className="text-gray-500">{a.address_line1}, {a.city}, {a.province} {a.postal_code}</p>
            </div>
          </label>
        ))}
        <button onClick={() => setShowNewAddr(!showNewAddr)}
          className="text-sm text-primary-600 hover:underline mt-2">
          + เพิ่มที่อยู่ใหม่
        </button>
        {showNewAddr && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { key: 'full_name', label: 'ชื่อ-นามสกุล', col: 2 },
              { key: 'phone', label: 'เบอร์โทร', col: 1 },
              { key: 'address_line1', label: 'ที่อยู่', col: 2 },
              { key: 'city', label: 'เขต/อำเภอ', col: 1 },
              { key: 'province', label: 'จังหวัด', col: 1 },
              { key: 'postal_code', label: 'รหัสไปรษณีย์', col: 1 },
            ].map(({ key, label, col }) => (
              <input key={key} placeholder={label}
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className={`border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-${col} focus:outline-none focus:border-primary-500`} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold mb-3">รายการสินค้า</h2>
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
            <span className="text-gray-700">{product.name} × {quantity}</span>
            <span className="font-medium">฿{(product.price * quantity).toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm py-1.5 text-gray-500">
          <span>ค่าจัดส่ง</span>
          <span>{total() >= 1000 ? 'ฟรี' : '฿50'}</span>
        </div>
        <div className="flex justify-between font-bold mt-2 pt-2 border-t border-gray-200 text-primary-600">
          <span>รวม</span>
          <span>฿{(total() + (total() >= 1000 ? 0 : 50)).toLocaleString()}</span>
        </div>
      </div>

      <button onClick={handleSubmit}
        disabled={isPending || (!selectedAddr && !showNewAddr)}
        className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-40">
        {isPending ? 'กำลังดำเนินการ...' : 'ยืนยันและชำระเงิน'}
      </button>
    </div>
  )
}
