import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ChevronDown, Search, Truck, Trash2, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ChatBox from '@/components/ChatBox'

const STATUS_OPTIONS = ['pending','paid','processing','shipped','delivered','cancelled','refunded']
const STATUS_TH: Record<string,string> = {pending:'รอชำระ',paid:'ชำระแล้ว',processing:'กำลังเตรียม',shipped:'จัดส่งแล้ว',delivered:'ส่งถึงแล้ว',cancelled:'ยกเลิก',refunded:'คืนเงิน'}
const STATUS_COLOR: Record<string,string> = {pending:'bg-yellow-100 text-yellow-700',paid:'bg-blue-100 text-blue-700',processing:'bg-purple-100 text-purple-700',shipped:'bg-indigo-100 text-indigo-700',delivered:'bg-green-100 text-green-700',cancelled:'bg-red-100 text-red-700',refunded:'bg-gray-100 text-gray-600'}

export default function AdminOrdersPage() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string|null>(null)
  const [chatOrder, setChatOrder] = useState<{ id: string; number: string } | null>(null)
  const [tracking, setTracking] = useState<Record<string,string>>({})
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, filterStatus, search],
    queryFn: async () => {
      const params: any = { page, per_page: 20 }
      if (filterStatus) params.status = filterStatus
      if (search) params.search = search
      const { data } = await api.get('/admin/orders', { params })
      return data
    },
  })

  // ดึง unread summary เพื่อแสดง badge
  const { data: unreadData } = useQuery({
    queryKey: ['chat-unread'],
    queryFn: async () => {
      const { data } = await api.get('/chat/unread-summary')
      return data as { order_id: string; order_number: string; customer_name: string }[]
    },
    refetchInterval: 10000, // refresh ทุก 10 วินาที
  })
  const unreadOrderIds = new Set((unreadData ?? []).map((u: any) => u.order_id))

  const updateStatus = useMutation({
    mutationFn: ({ id, status, tracking_number }: { id: string; status: string; tracking_number?: string }) =>
      api.put(`/orders/${id}/status`, null, { params: { status, tracking_number } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('อัปเดตแล้ว') },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteOrder = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('ลบแล้ว') },
    onError: () => toast.error('ลบไม่สำเร็จ'),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">คำสั่งซื้อ</h1>
          <p className="text-sm text-gray-500 mt-1">ทั้งหมด {data?.total ?? 0} รายการ</p>
        </div>
        {/* Unread chat badge */}
        {unreadData && unreadData.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
            <MessageCircle size={15} />
            มีข้อความใหม่ {unreadData.length} ออเดอร์
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="ค้นหาเลขออเดอร์..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500" />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">ทุกสถานะ</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_TH[s]}</option>)}
        </select>
      </div>

      {/* Layout: table + chat panel */}
      <div className={`flex gap-5 ${chatOrder ? 'items-start' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">กำลังโหลด...</div>
            ) : !data?.items?.length ? (
              <div className="p-8 text-center text-gray-400">ไม่พบคำสั่งซื้อ</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.items.map((o: any) => (
                  <div key={o.id}>
                    <div className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                      <ChevronDown size={15} className={"text-gray-400 transition-transform " + (expanded === o.id ? 'rotate-180' : '')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">#{o.order_number}</p>
                        <p className="text-xs text-gray-400">{o.customer_name} · {new Date(o.created_at).toLocaleString('th-TH')}</p>
                      </div>
                      <span className="text-sm font-semibold">฿{o.total.toLocaleString()}</span>
                      <span className={"text-xs px-2 py-1 rounded-full " + (STATUS_COLOR[o.status] ?? 'bg-gray-100 text-gray-600')}>
                        {STATUS_TH[o.status] ?? o.status}
                      </span>
                      <select value={o.status} onClick={e => e.stopPropagation()}
                        onChange={e => updateStatus.mutate({ id: o.id, status: e.target.value })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_TH[s]}</option>)}
                      </select>

                      {/* ปุ่มแชท + badge unread */}


                      <button onClick={e => { e.stopPropagation(); if (confirm('ลบคำสั่งซื้อนี้?')) deleteOrder.mutate(o.id) }}
                        className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={15} /></button>
                    </div>

                    {expanded === o.id && (
                      <div className="bg-gray-50 px-8 py-5 border-t border-gray-100 grid md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">รายการสินค้า</p>
                          {o.items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                              <span className="text-gray-700">{item.product_name} × {item.quantity}</span>
                              <span>฿{item.total_price.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-gray-200 text-primary-600">
                            <span>รวม</span><span>฿{o.total.toLocaleString()}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">ที่อยู่จัดส่ง</p>
                          <p className="text-sm text-gray-700">{o.shipping_address?.full_name} — {o.shipping_address?.phone}</p>
                          <p className="text-sm text-gray-500">{o.shipping_address?.address_line1}, {o.shipping_address?.city}, {o.shipping_address?.province} {o.shipping_address?.postal_code}</p>
                          <div className="mt-4">
                            <p className="text-xs font-medium text-gray-500 mb-1">เลขพัสดุ</p>
                            <div className="flex gap-2">
                              <input placeholder="กรอกเลขพัสดุ..."
                                value={tracking[o.id] ?? o.tracking_number ?? ''}
                                onChange={e => setTracking({ ...tracking, [o.id]: e.target.value })}
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500" />
                              <button onClick={() => updateStatus.mutate({ id: o.id, status: 'shipped', tracking_number: tracking[o.id] })}
                                className="flex items-center gap-1 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-primary-700">
                                <Truck size={14} /> บันทึก
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {data?.total_pages > 1 && (
            <div className="flex justify-center gap-2 mt-5">
              {Array.from({ length: data.total_pages }).map((_,i) => (
                <button key={i} onClick={() => setPage(i+1)}
                  className={"w-9 h-9 rounded-lg text-sm border " + (page === i+1 ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}>
                  {i+1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat panel — sticky sidebar */}
        {chatOrder && (
          <div className="w-80 shrink-0 sticky top-6">
            <ChatBox
              orderId={chatOrder.id}
              orderNumber={chatOrder.number}
              myRole="admin"
              defaultOpen={true}
            />
          </div>
        )}
      </div>
    </div>
  )
}