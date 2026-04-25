import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Product } from '@/types'
import { Plus, Pencil, Trash2, X, ImagePlus, GripVertical, Search } from 'lucide-react'
import toast from 'react-hot-toast'

type HowToStep = { step: number; title: string; desc: string }
type Category = { id: string; name: string; slug: string }

const EMPTY_FORM = {
  name: '', description: '', price: '', compare_price: '', sku: '',
  stock: '', weight: '', is_active: true, is_featured: false,
  category_id: '',
  images: [] as { url: string; alt: string }[],
  attributes: {} as Record<string, string>,
  how_to: [] as HowToStep[],
}

export default function AdminProductsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchName, setSearchName] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // ── Fetch products ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data } = await api.get('/products?per_page=100')
      return data
    },
  })

  // ── Fetch categories ────────────────────────────────────────────────────────
  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories')
      return data as Category[]
    },
  })
  const categories: Category[] = categoriesData ?? []

  // ── Filtered product list ───────────────────────────────────────────────────
  const filteredProducts = (data?.items ?? []).filter((p: Product) => {
    const matchName = !searchName || p.name.toLowerCase().includes(searchName.toLowerCase())
    const matchCat = !filterCategory || p.category_id === filterCategory
    return matchName && matchCat
  })

  // ── Upload helpers ──────────────────────────────────────────────────────────
  const uploadFiles = async (productId: string, files: File[]) => {
    const uploaded: { url: string; alt: string }[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const { data } = await api.post(`/products/${productId}/images`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        uploaded.push({ url: data.url, alt: file.name })
      } catch {
        toast.error(`อัปโหลด ${file.name} ไม่สำเร็จ`)
      }
    }
    return uploaded
  }

  const buildBody = (images: { url: string; alt: string }[]) => ({
    name: form.name,
    description: form.description || null,
    price: Number(form.price),
    compare_price: form.compare_price ? Number(form.compare_price) : null,
    cost_price: null,
    sku: form.sku || null,
    stock: Number(form.stock),
    weight: form.weight ? Number(form.weight) : null,
    images,
    attributes: form.attributes || {},
    how_to: form.how_to,
    is_active: form.is_active,
    is_featured: form.is_featured,
    category_id: form.category_id || null,
  })

  // ── Save mutation ───────────────────────────────────────────────────────────
  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        setUploadingImage(true)
        let newImages = [...form.images]
        if (pendingFiles.length > 0) {
          const uploaded = await uploadFiles(editing.id, pendingFiles)
          newImages = [...newImages, ...uploaded]
        }
        setUploadingImage(false)
        const { data } = await api.put(`/products/${editing.id}`, buildBody(newImages))
        return data
      } else {
        const { data: created } = await api.post('/products', buildBody(form.images))
        if (pendingFiles.length > 0) {
          setUploadingImage(true)
          const uploaded = await uploadFiles(created.id, pendingFiles)
          setUploadingImage(false)
          if (uploaded.length > 0) {
            const { data: updated } = await api.put(`/products/${created.id}`, buildBody(uploaded))
            return updated
          }
        }
        return created
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success(editing ? 'อัปเดตแล้ว' : 'เพิ่มสินค้าแล้ว')
      closeForm()
    },
    onError: (e: any) => {
      setUploadingImage(false)
      toast.error(e.response?.data?.detail || 'เกิดข้อผิดพลาด')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('ลบแล้ว')
    },
  })

  // ── Form helpers ────────────────────────────────────────────────────────────
  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      ...EMPTY_FORM, ...p,
      price: String(p.price),
      compare_price: String(p.compare_price ?? ''),
      stock: String(p.stock),
      weight: String(p.weight ?? ''),
      how_to: (p.how_to ?? []) as HowToStep[],
      category_id: p.category_id ?? '',
    })
    setPendingFiles([])
    setPendingPreviews([])
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setPendingFiles([])
    setPendingPreviews([])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setPendingFiles((prev) => [...prev, ...files])
    setPendingPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePending = (idx: number) => {
    URL.revokeObjectURL(pendingPreviews[idx])
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
    setPendingPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── How-to helpers ──────────────────────────────────────────────────────────
  const addStep = () => {
    const nextStep = form.how_to.length + 1
    setForm((f) => ({
      ...f,
      how_to: [...f.how_to, { step: nextStep, title: '', desc: '' }],
    }))
  }

  const updateStep = (idx: number, field: 'title' | 'desc', value: string) => {
    setForm((f) => ({
      ...f,
      how_to: f.how_to.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }))
  }

  const removeStep = (idx: number) => {
    setForm((f) => ({
      ...f,
      how_to: f.how_to
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, step: i + 1 })),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    save.mutate()
  }

  const isBusy = save.isPending || uploadingImage
  const totalImages = form.images.length + pendingPreviews.length

  // ── Category name lookup ────────────────────────────────────────────────────
  const getCategoryName = (id?: string | null) =>
    categories.find((c) => c.id === id)?.name ?? null

  return (
    <div className="p-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">สินค้า</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
        >
          <Plus size={16} /> เพิ่มสินค้า
        </button>
      </div>

      {/* ── Search & Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search by name */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
          />
          {searchName && (
            <button
              onClick={() => setSearchName('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter by category */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 bg-white text-gray-700 min-w-[180px]"
        >
          <option value="">หมวดหมู่ทั้งหมด</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Active filter chips */}
        {(searchName || filterCategory) && (
          <button
            onClick={() => { setSearchName(''); setFilterCategory('') }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg px-3 py-2 transition whitespace-nowrap"
          >
            <X size={12} /> ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Result count */}
      {(searchName || filterCategory) && !isLoading && (
        <p className="text-xs text-gray-400 mb-3">
          พบ {filteredProducts.length} รายการ
          {filterCategory && ` ในหมวด "${getCategoryName(filterCategory)}"`}
          {searchName && ` ที่มีคำว่า "${searchName}"`}
        </p>
      )}

      {/* ── Product table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">กำลังโหลด...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm">ไม่พบสินค้าที่ตรงกับเงื่อนไข</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['สินค้า', 'หมวดหมู่', 'ราคา', 'สต็อก', 'สถานะ', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((p: Product) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images[0]
                        ? <img src={p.images[0].url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                        : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">📦</div>
                      }
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">SKU: {p.sku || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getCategoryName(p.category_id)
                      ? <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{getCategoryName(p.category_id)}</span>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 font-medium">฿{p.price.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      p.stock === 0 ? 'bg-red-100 text-red-700' :
                      p.stock <= 5 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'}`}>
                      {p.stock} ชิ้น
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'เปิดขาย' : 'ปิด'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-primary-600"><Pencil size={15} /></button>
                      <button onClick={() => { if (confirm('ลบสินค้านี้?')) remove.mutate(p.id) }}
                        className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Form modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-lg">{editing ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}</h2>
              <button onClick={closeForm}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">

              {/* ── Basic info ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ข้อมูลทั่วไป</p>
                <input
                  placeholder="ชื่อสินค้า *"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                />
                <textarea
                  placeholder="คำอธิบายสินค้า"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 resize-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="ราคา *"
                    type="number"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                  <input
                    placeholder="ราคาเดิม (ก่อนลด)"
                    type="number"
                    value={form.compare_price}
                    onChange={(e) => setForm({ ...form, compare_price: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                  <input
                    placeholder="สต็อก *"
                    type="number"
                    required
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                  <input
                    placeholder="SKU"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                  <input
                    placeholder="น้ำหนัก (กรัม)"
                    type="number"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {/* ── Category ── */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">หมวดหมู่</p>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 bg-white text-gray-700"
                >
                  <option value="">— ไม่ระบุหมวดหมู่ —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* ── Images ── */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  รูปสินค้า {totalImages > 0 && <span className="normal-case font-normal">({totalImages} รูป)</span>}
                </p>
                {totalImages > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {form.images.map((img, i) => (
                      <div key={`e-${i}`} className="relative group">
                        <img src={img.url} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs items-center justify-center hidden group-hover:flex"
                        >×</button>
                      </div>
                    ))}
                    {pendingPreviews.map((src, i) => (
                      <div key={`p-${i}`} className="relative group">
                        <img src={src} className="w-16 h-16 object-cover rounded-lg border-2 border-dashed border-primary-400" />
                        <div className="absolute inset-0 rounded-lg flex items-end justify-center pb-1">
                          <span className="text-[9px] text-primary-700 font-medium bg-white/80 px-1 rounded">รอ</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePending(i)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs items-center justify-center hidden group-hover:flex"
                        >×</button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                )}
                {totalImages === 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 flex flex-col items-center gap-2 text-gray-400 hover:border-primary-400 hover:text-primary-500 transition"
                  >
                    <ImagePlus size={24} />
                    <span className="text-sm">คลิกเพื่อเลือกรูป</span>
                    <span className="text-xs">JPG, PNG, WEBP</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                {uploadingImage && (
                  <p className="text-xs text-primary-500 flex items-center gap-1">
                    <span className="inline-block w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                    กำลังอัปโหลดรูป...
                  </p>
                )}
              </div>

              {/* ── How-to editor ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">วิธีใช้งาน</p>
                  <button
                    type="button"
                    onClick={addStep}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <Plus size={13} /> เพิ่มขั้นตอน
                  </button>
                </div>

                {form.how_to.length === 0 && (
                  <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                    ยังไม่มีวิธีใช้งาน — กด "เพิ่มขั้นตอน" เพื่อเพิ่ม
                  </p>
                )}

                <div className="space-y-2">
                  {form.how_to.map((step, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-gray-50 rounded-xl p-3">
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <GripVertical size={14} className="text-gray-300" />
                        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {step.step}
                        </span>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input
                          placeholder={`หัวข้อขั้นตอน ${step.step} *`}
                          value={step.title}
                          onChange={(e) => updateStep(idx, 'title', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-400 bg-white"
                        />
                        <textarea
                          placeholder="รายละเอียด..."
                          rows={2}
                          value={step.desc}
                          onChange={(e) => updateStep(idx, 'desc', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-400 bg-white resize-none"
                        />
                      </div>
                      <button type="button" onClick={() => removeStep(idx)}
                        className="text-gray-300 hover:text-red-400 transition pt-1">
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Visibility ── */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">การแสดงผล</p>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                    เปิดขาย
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.is_featured}
                      onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
                    สินค้าแนะนำ
                  </label>
                </div>
              </div>

              {/* ── Submit ── */}
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-40"
                >
                  {isBusy ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button type="button" onClick={closeForm}
                  className="px-5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}