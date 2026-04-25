import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Search, Eye, Ban, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminCustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search],
    queryFn: async () => {
      const { data } = await api.get('/admin/customers', { params: { page, per_page: 20, search: search || undefined } })
      return data
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.put(`/admin/customers/${id}`, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-customers'] }); toast.success('อัปเดตแล้ว') },
  })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ลูกค้า</h1>
        <p className="text-sm text-gray-500 mt-1">ทั้งหมด {data?.total ?? 0} คน</p>
      </div>

      <div className="relative max-w-xs mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input placeholder="ค้นหาชื่อ อีเมล..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['ลูกค้า', 'เบอร์โทร', 'คำสั่งซื้อ', 'ยอดรวม', 'สถานะ', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">กำลังโหลด...</td></tr>}
            {data?.items?.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-semibold">
                      {c.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{c.full_name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.phone || '-'}</td>
                <td className="px-4 py-3">{c.order_count} ออเดอร์</td>
                <td className="px-4 py-3 font-medium">฿{(c.total_spent ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={"text-xs px-2 py-1 rounded-full " + (c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                    {c.is_active ? 'ปกติ' : 'ระงับ'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelected(c)} className="text-gray-400 hover:text-primary-600"><Eye size={15} /></button>
                    <button onClick={() => toggleActive.mutate({ id: c.id, is_active: !c.is_active })}
                      className={"text-gray-400 " + (c.is_active ? 'hover:text-red-500' : 'hover:text-green-600')}>
                      {c.is_active ? <Ban size={15} /> : <CheckCircle size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold">ข้อมูลลูกค้า</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                  {selected.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selected.full_name}</p>
                  <p className="text-sm text-gray-500">{selected.email}</p>
                </div>
              </div>
              {[
                ['เบอร์โทร', selected.phone || '-'],
                ['จำนวนออเดอร์', `${selected.order_count} ออเดอร์`],
                ['ยอดซื้อรวม', `฿${(selected.total_spent ?? 0).toLocaleString()}`],
                ['สมัครเมื่อ', new Date(selected.created_at).toLocaleDateString('th-TH')],
                ['สถานะ', selected.is_active ? 'ปกติ' : 'ระงับ'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
