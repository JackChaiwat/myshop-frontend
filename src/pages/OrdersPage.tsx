// ─── OrdersPage.tsx ───────────────────────────────────────
import { Link } from 'react-router-dom'
import { useMyOrders } from '@/hooks/useApi'

const STATUS_TH: Record<string, string> = {
  pending: 'รอชำระ', paid: 'ชำระแล้ว', processing: 'กำลังเตรียม',
  shipped: 'จัดส่งแล้ว', delivered: 'ส่งถึงแล้ว', cancelled: 'ยกเลิก', refunded: 'คืนเงิน'
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800', paid: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', refunded: 'bg-gray-100 text-gray-700'
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useMyOrders()

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">คำสั่งซื้อของฉัน</h1>
      {isLoading ? <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
      : orders?.length === 0 ? <p className="text-gray-400 text-center py-16">ยังไม่มีคำสั่งซื้อ</p>
      : <div className="space-y-3">
        {orders?.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:shadow-sm transition">
            <div>
              <p className="font-medium text-gray-900">#{o.order_number}</p>
              <p className="text-sm text-gray-500 mt-0.5">{new Date(o.created_at).toLocaleDateString('th-TH')} · {o.items.length} รายการ</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary-600">฿{o.total.toLocaleString()}</p>
              <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${STATUS_COLOR[o.status]}`}>{STATUS_TH[o.status]}</span>
            </div>
          </Link>
        ))}
      </div>}
    </div>
  )
}
