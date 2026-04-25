import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY = { name: '', slug: '', description: '', is_active: true }

export default function AdminCategoriesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ ...EMPTY })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => { const { data } = await api.get('/admin/categories'); return data },
  })

  const save = useMutation({
    mutationFn: async (body: any) => editing ? api.put(`/admin/categories/${editing.id}`, body) : api.post('/admin/categories', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); toast.success(editing ? 'อัปเดตแล้ว' : 'เพิ่มแล้ว'); closeForm() },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); toast.success('ลบแล้ว') },
  })

  const openEdit = (c: any) => { setEditing(c); setForm({ name: c.name, slug: c.slug, description: c.description || '', is_active: c.is_active }); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm({ ...EMPTY }) }

  const autoSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">หมวดหมู่สินค้า</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700">
          <Plus size={16} /> เพิ่มหมวดหมู่
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">กำลังโหลด...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['หมวดหมู่', 'Slug', 'สินค้า', 'สถานะ', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data ?? []).map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.image_url ? <img src={c.image_url} className="w-8 h-8 rounded-lg object-cover" alt="" /> : <div className="w-8 h-8 bg-gray-100 rounded-lg" />}
                      <p className="font-medium text-gray-900">{c.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.slug}</td>
                  <td className="px-4 py-3">{c.product_count ?? 0} รายการ</td>
                  <td className="px-4 py-3">
                    <span className={"text-xs px-2 py-1 rounded-full " + (c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {c.is_active ? 'เปิด' : 'ปิด'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-primary-600"><Pencil size={15} /></button>
                      <button onClick={() => { if (confirm('ลบหมวดหมู่นี้?')) remove.mutate(c.id) }} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">ยังไม่มีหมวดหมู่</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold">{editing ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</h2>
              <button onClick={closeForm}><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); save.mutate(form) }} className="p-5 space-y-3">
              <input placeholder="ชื่อหมวดหมู่ *" required value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
              <input placeholder="Slug (a-z, 0-9, -)" required value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary-500" />
              <textarea placeholder="คำอธิบาย" rows={2} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 resize-none" />
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
