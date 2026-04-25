import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, X, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY = { code: '', discount_type: 'percent', discount_value: '', min_purchase: '', max_uses: '', expires_at: '', is_active: true, description: '' }

export default function AdminCouponsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ ...EMPTY })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => { const { data } = await api.get('/admin/coupons'); return data },
  })

  const save = useMutation({
    mutationFn: async (body: any) => {
      const payload = { ...body, discount_value: Number(body.discount_value), min_purchase: body.min_purchase ? Number(body.min_purchase) : null, max_uses: body.max_uses ? Number(body.max_uses) : null, expires_at: body.expires_at || null }
      return editing ? api.put(`/admin/coupons/${editing.id}`, payload) : api.post('/admin/coupons', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); toast.success(editing ? 'อัปเดตแล้ว' : 'เพิ่มแล้ว'); closeForm() },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/coupons/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); toast.success('ลบแล้ว') },
  })

  const openEdit = (c: any) => {
    setEditing(c)
    setForm({ code: c.code, discount_type: c.discount_type, discount_value: String(c.discount_value), min_purchase: c.min_purchase ? String(c.min_purchase) : '', max_uses: c.max_uses ? String(c.max_uses) : '', expires_at: c.expires_at ? c.expires_at.split('T')[0] : '', is_active: c.is_active, description: c.description || '' })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm({ ...EMPTY }) }

  const genCode = () => {
    const code = 'SHOP' + Math.random().toString(36).toUpperCase().slice(2, 8)
    setForm(f => ({ ...f, code }))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">คูปอง & ส่วนลด</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700">
          <Plus size={16} /> สร้างคูปอง
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">กำลังโหลด...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['รหัสคูปอง', 'ส่วนลด', 'เงื่อนไข', 'ใช้แล้ว', 'หมดอายุ', 'สถานะ', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data ?? []).map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-primary-600">{c.code}</span>
                      <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success('คัดลอกแล้ว') }}
                        className="text-gray-400 hover:text-gray-600"><Copy size={13} /></button>
                    </div>
                    {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {c.discount_type === 'percent' ? `${c.discount_value}%` : `฿${c.discount_value.toLocaleString()}`}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.min_purchase ? `ขั้นต่ำ ฿${c.min_purchase.toLocaleString()}` : 'ไม่มีขั้นต่ำ'}
                  </td>
                  <td className="px-4 py-3">{c.used_count}/{c.max_uses ?? '∞'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString('th-TH') : 'ไม่หมดอายุ'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={"text-xs px-2 py-1 rounded-full " + (c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {c.is_active ? 'ใช้งานได้' : 'ปิดใช้'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-primary-600"><Pencil size={15} /></button>
                      <button onClick={() => { if (confirm('ลบคูปองนี้?')) remove.mutate(c.id) }} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data?.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">ยังไม่มีคูปอง</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold">{editing ? 'แก้ไขคูปอง' : 'สร้างคูปอง'}</h2>
              <button onClick={closeForm}><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); save.mutate(form) }} className="p-5 space-y-3">
              <div className="flex gap-2">
                <input placeholder="รหัสคูปอง *" required value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-primary-500" />
                <button type="button" onClick={genCode}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">สุ่ม</button>
              </div>
              <input placeholder="คำอธิบาย" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="percent">% ส่วนลด</option>
                  <option value="fixed">฿ ส่วนลดคงที่</option>
                </select>
                <input placeholder={form.discount_type === 'percent' ? 'เช่น 10 (%)' : 'เช่น 50 (฿)'} type="number" required value={form.discount_value}
                  onChange={e => setForm({ ...form, discount_value: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                <input placeholder="ซื้อขั้นต่ำ (฿)" type="number" value={form.min_purchase}
                  onChange={e => setForm({ ...form, min_purchase: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                <input placeholder="จำกัดจำนวนครั้ง" type="number" value={form.max_uses}
                  onChange={e => setForm({ ...form, max_uses: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">วันหมดอายุ</label>
                <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                เปิดใช้งาน
              </label>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={save.isPending}
                  className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-40">
                  {save.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button type="button" onClick={closeForm} className="px-5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
