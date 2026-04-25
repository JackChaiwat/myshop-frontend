import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useOrder } from '@/hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Package, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ChatBox from '@/components/ChatBox'

const STATUS_TH: Record<string, string> = {
  pending: 'รอชำระ', paid: 'ชำระแล้ว', processing: 'กำลังเตรียม',
  shipped: 'จัดส่งแล้ว', delivered: 'ส่งถึงแล้ว', cancelled: 'ยกเลิก', refunded: 'คืนเงิน',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
}

const CANCEL_REASONS = [
  'เปลี่ยนใจไม่ต้องการสินค้าแล้ว',
  'สั่งซื้อผิดรายการ / ผิดจำนวน',
  'พบสินค้าราคาถูกกว่า',
  'ต้องการเปลี่ยนที่อยู่จัดส่ง',
  'อื่นๆ',
]

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { data: order, isLoading } = useOrder(id!)

  const [qrCode, setQrCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const handleRequestQR = async () => {
    setLoading(true)
    try {
      const { data } = await api.post(`/orders/${id}/request-payment`)
      if (data.qr_code) setQrCode(data.qr_code)
      else toast.error('ไม่สามารถสร้าง QR Code ได้')
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelReason) { toast.error('กรุณาเลือกเหตุผลที่ยกเลิก'); return }
    setCancelling(true)
    try {
      await api.post(`/orders/${id}/cancel`, { reason: cancelReason })
      toast.success('ยกเลิกคำสั่งซื้อแล้ว')
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      setShowCancelModal(false)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'ไม่สามารถยกเลิกได้')
    } finally {
      setCancelling(false)
    }
  }

  // Sanitize SVG: strip script tags and event handlers before rendering
  const sanitizeSvg = (svg: string) => {
    return svg
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\bon\w+\s*=/gi, 'data-removed=')
      .replace(/javascript:/gi, '')
  }

  const renderQr = (qr: string) => {
    if (qr.trimStart().startsWith('<svg') || qr.trimStart().startsWith('<SVG')) {
      return <div className="w-56 h-56 mx-auto flex items-center justify-center" dangerouslySetInnerHTML={{ __html: sanitizeSvg(qr) }} />
    }
    return <img src={qr} alt="QR Code" className="w-56 h-56 mx-auto object-contain" />
  }

  if (isLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-16 animate-pulse">
      <div className="h-96 bg-gray-100 rounded-xl" />
    </div>
  )
  if (!order) return <div className="text-center py-20 text-gray-400">ไม่พบคำสั่งซื้อ</div>

  const addr = order.shipping_address
  const canCancel = order.status === 'pending' && order.payment_status === 'pending'

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">#{order.order_number}</h1>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_TH[order.status]}
        </span>
      </div>

      {/* QR Code */}
      {qrCode && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4 text-center">
          <p className="font-semibold mb-4">สแกน QR Code ชำระเงิน</p>
          {renderQr(qrCode)}
          <p className="text-xs text-gray-400 mt-3">สแกนด้วย Mobile Banking ทุกธนาคาร</p>
          <p className="text-lg font-bold text-primary-600 mt-1">฿{order.total.toLocaleString()}</p>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Package size={16} />รายการสินค้า</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
            {item.product_image && (
              <img src={item.product_image} alt={item.product_name} className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{item.product_name}</p>
              <p className="text-xs text-gray-500">× {item.quantity}</p>
            </div>
            <p className="font-medium text-sm">฿{item.total_price.toLocaleString()}</p>
          </div>
        ))}
        <div className="pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>ค่าสินค้า</span><span>฿{order.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>ค่าจัดส่ง</span>
            <span>{order.shipping_fee === 0 ? 'ฟรี' : `฿${order.shipping_fee}`}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>ส่วนลด</span><span>-฿{order.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-primary-600 pt-1 border-t border-gray-100">
            <span>รวม</span><span>฿{order.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold mb-2">ที่อยู่จัดส่ง</h2>
        <p className="text-sm text-gray-700">{addr.full_name} — {addr.phone}</p>
        <p className="text-sm text-gray-500">
          {addr.address_line1} {addr.address_line2 || ''}, {addr.city}, {addr.province} {addr.postal_code}
        </p>
      </div>

      {order.tracking_number && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Package size={16} className="text-primary-600" />ติดตามพัสดุ
          </h2>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">เลขพัสดุ</p>
              <p className="font-mono font-semibold text-gray-900">{order.tracking_number}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(order.tracking_number!); toast.success('คัดลอกเลขพัสดุแล้ว') }}
              className="text-xs text-primary-600 hover:underline border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition"
            >
              คัดลอก
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a
              href={`https://track.thailandpost.co.th/?trackNumber=${order.tracking_number}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition font-medium"
            >
              ติดตามผ่าน ไปรษณีย์ไทย
            </a>
            <a
              href={`https://www.thaiparcel.net/?tracking=${order.tracking_number}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              ค้นหาทุกขนส่ง
            </a>
            <a
              href={`https://www.kerry.com/th/tracking?trackNumber=${order.tracking_number}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition font-medium"
            >
              Kerry Express
            </a>
          </div>
        </div>
      )}

      {/* ปุ่มชำระเงิน */}
      {order.payment_status === 'pending' && order.status === 'pending' && (
        <button onClick={handleRequestQR} disabled={loading}
          className="block w-full bg-primary-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-40 mb-3">
          {loading ? 'กำลังสร้าง QR Code...' : qrCode ? 'สร้าง QR Code ใหม่' : 'ชำระเงินด้วย PromptPay'}
        </button>
      )}

      {/* ปุ่มยกเลิก */}
      {canCancel && (
        <button onClick={() => setShowCancelModal(true)}
          className="w-full border border-red-200 text-red-500 py-3 rounded-xl font-medium hover:bg-red-50 transition mb-3 flex items-center justify-center gap-2">
          <XCircle size={16} /> ยกเลิกคำสั่งซื้อ
        </button>
      )}

      <Link to="/orders" className="block text-center text-primary-600 hover:underline mt-2 text-sm mb-6">
        ← กลับไปยังคำสั่งซื้อทั้งหมด
      </Link>

      {/* Chat bubble — ลอยอยู่มุมขวาล่าง */}
      <ChatBox
        orderId={order.id}
        orderNumber={order.order_number}
        myRole="customer"
      />

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">ยกเลิกคำสั่งซื้อ</h2>
            <p className="text-sm text-gray-500 mb-5">#{order.order_number} · ฿{order.total.toLocaleString()}</p>

            <p className="text-sm font-medium text-gray-700 mb-3">เหตุผลที่ยกเลิก <span className="text-red-400">*</span></p>
            <div className="space-y-2 mb-6">
              {CANCEL_REASONS.map((r) => (
                <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  cancelReason === r ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input type="radio" name="reason" value={r}
                    checked={cancelReason === r}
                    onChange={() => setCancelReason(r)}
                    className="accent-red-500" />
                  <span className="text-sm text-gray-700">{r}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={handleCancel} disabled={cancelling || !cancelReason}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition disabled:opacity-40">
                {cancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
              </button>
              <button onClick={() => { setShowCancelModal(false); setCancelReason('') }}
                className="px-5 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm">
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}