import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { ShoppingBag, Users, TrendingUp, Package, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, Truck, XCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const STATUS_TH: Record<string,string> = {pending:'รอชำระ',paid:'ชำระแล้ว',processing:'กำลังเตรียม',shipped:'จัดส่งแล้ว',delivered:'ส่งถึงแล้ว',cancelled:'ยกเลิก',refunded:'คืนเงิน'}
const STATUS_COLOR: Record<string,string> = {paid:'bg-blue-100 text-blue-700',shipped:'bg-indigo-100 text-indigo-700',delivered:'bg-green-100 text-green-700',cancelled:'bg-red-100 text-red-700',pending:'bg-yellow-100 text-yellow-700',processing:'bg-purple-100 text-purple-700'}

export default function AdminDashboard() {
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: async () => { const { data } = await api.get('/admin/stats'); return data }, refetchInterval: 30000 })
  const { data: chart } = useQuery({ queryKey: ['admin-chart'], queryFn: async () => { const { data } = await api.get('/admin/sales-chart'); return data } })

  const cards = [
    { label: 'รายได้รวม', value: `฿${(stats?.total_revenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: 'text-green-600 bg-green-50', change: stats?.revenue_change ?? 0 },
    { label: 'คำสั่งซื้อ', value: stats?.total_orders ?? 0, icon: ShoppingBag, color: 'text-blue-600 bg-blue-50', change: stats?.orders_change ?? 0 },
    { label: 'ลูกค้า', value: stats?.total_customers ?? 0, icon: Users, color: 'text-purple-600 bg-purple-50', change: stats?.customers_change ?? 0 },
    { label: 'สินค้า', value: stats?.total_products ?? 0, icon: Package, color: 'text-orange-600 bg-orange-50', change: 0 },
  ]

  const statusCards = [
    { label: 'รอชำระ', count: stats?.pending_orders ?? 0, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'ชำระแล้ว', count: stats?.paid_orders ?? 0, icon: CheckCircle, color: 'text-blue-600 bg-blue-50' },
    { label: 'จัดส่งแล้ว', count: stats?.shipped_orders ?? 0, icon: Truck, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'ยกเลิก', count: stats?.cancelled_orders ?? 0, icon: XCircle, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">ภาพรวมร้านค้า</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, change }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={"w-10 h-10 rounded-lg " + color + " flex items-center justify-center mb-3"}><Icon size={18} /></div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            {change !== 0 && (
              <div className={"flex items-center gap-1 mt-2 text-xs " + (change > 0 ? 'text-green-600' : 'text-red-500')}>
                {change > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(change)}% จากเดือนที่แล้ว
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={"w-9 h-9 rounded-lg " + color + " flex items-center justify-center"}><Icon size={16} /></div>
            <div><p className="text-lg font-bold text-gray-900">{count}</p><p className="text-xs text-gray-500">{label}</p></div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">ยอดขาย 30 วัน</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chart?.daily ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => ["฿" + Number(v).toLocaleString(), 'ยอดขาย']} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#eff6ff" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">คำสั่งซื้อรายวัน</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chart?.daily ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [v, 'คำสั่งซื้อ']} />
              <Bar dataKey="orders" fill="#8b5cf6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">คำสั่งซื้อล่าสุด</h2>
            <Link to="/admin/orders" className="text-sm text-primary-600 hover:underline">ดูทั้งหมด</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(stats?.recent_orders ?? []).map((o: any) => (
              <div key={o.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">#{o.order_number}</p>
                  <p className="text-xs text-gray-400">{o.customer_name} · {new Date(o.created_at).toLocaleDateString('th-TH')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">฿{o.total.toLocaleString()}</span>
                  <span className={"text-xs px-2 py-0.5 rounded-full " + (STATUS_COLOR[o.status] ?? 'bg-gray-100 text-gray-600')}>{STATUS_TH[o.status] ?? o.status}</span>
                </div>
              </div>
            ))}
            {!stats?.recent_orders?.length && <p className="px-6 py-6 text-sm text-gray-400 text-center">ยังไม่มีคำสั่งซื้อ</p>}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">สินค้าขายดี</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {(stats?.top_products ?? []).map((p: any, i: number) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-sm font-bold text-gray-400 w-4">{i+1}</span>
                {p.image ? <img src={p.image} className="w-9 h-9 rounded-lg object-cover" alt="" /> : <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-sm">📦</div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.sold} ชิ้น</p>
                </div>
                <p className="text-sm font-semibold">฿{p.revenue.toLocaleString()}</p>
              </div>
            ))}
            {!stats?.top_products?.length && <p className="px-6 py-6 text-sm text-gray-400 text-center">ยังไม่มีข้อมูล</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
