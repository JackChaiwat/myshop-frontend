import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useOrder } from '@/hooks/useApi'
import api from '@/lib/api'
import { CheckCircle, Clock } from 'lucide-react'

export default function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, refetch } = useOrder(id!)
  const [paid, setPaid] = useState(false)
  const [polling, setPolling] = useState(true)

  useEffect(() => {
    if (!id || !polling) return
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/orders/check-payment/${id}`)
        if (data.status === 'successful') {
          setPaid(true)
          setPolling(false)
          refetch()
        } else if (data.status === 'failed' || data.status === 'expired') {
          setPolling(false)
        }
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [id, polling])

  if (paid || order?.payment_status === 'paid') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ชำระเงินสำเร็จ!</h1>
        <p className="text-gray-500 mb-8">ขอบคุณที่สั่งซื้อครับ เราจะดำเนินการจัดส่งให้เร็วที่สุด</p>
        <div className="flex flex-col gap-3">
          <Link to={`/orders/${id}`}
            className="bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition text-center">
            ดูรายละเอียดคำสั่งซื้อ
          </Link>
          <Link to="/shop" className="text-primary-600 hover:underline text-sm">ช้อปต่อ</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="flex items-center justify-center gap-2 text-gray-500 mb-4">
        <Clock size={20} className="animate-pulse text-primary-500" />
        <span>รอการยืนยันการชำระเงิน...</span>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        คำสั่งซื้อ #{order?.order_number} — ฿{order?.total.toLocaleString()}
      </p>
      <Link to="/orders" className="text-primary-600 hover:underline text-sm">
        ดูคำสั่งซื้อทั้งหมด
      </Link>
    </div>
  )
}
