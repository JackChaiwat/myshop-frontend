import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useProduct, useProducts, useAddReview } from '@/hooks/useApi'
import { useCartStore, useAuthStore } from '@/store'
import {
  ShoppingCart, Minus, Plus, Shield, Truck, RotateCcw,
  Star, ChevronRight, Share2, Heart, Package, CheckCircle2,
  ZoomIn, ChevronLeft, SendHorizontal,
} from 'lucide-react'
import toast from 'react-hot-toast'
import ProductCard from '@/components/shop/ProductCard'

const TABS = ['รายละเอียดสินค้า', 'วิธีใช้งาน', 'นโยบายการคืนสินค้า', 'รีวิว'] as const
type Tab = typeof TABS[number]

function Stars({ rating, size = 14, interactive = false, onChange }: {
  rating: number; size?: number; interactive?: boolean; onChange?: (r: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={`transition ${interactive ? 'cursor-pointer' : ''} ${
            s <= (interactive ? hover || rating : rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-200 fill-gray-200'
          }`}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(s)}
        />
      ))}
    </div>
  )
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: product, isLoading } = useProduct(slug!)
  const { data: related } = useProducts({ per_page: 6 })
  const addItem = useCartStore((s) => s.addItem)
  const user = useAuthStore((s) => s.user)
  const addReview = useAddReview(product?.id ?? '')

  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('รายละเอียดสินค้า')
  const [zoomed, setZoomed] = useState(false)
  const [liked, setLiked] = useState(false)

  // Review form state
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewBody, setReviewBody] = useState('')

  if (isLoading) return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-pulse">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-square bg-gray-100 rounded-2xl" />
        <div className="space-y-4">
          <div className="h-6 bg-gray-100 rounded w-3/4" />
          <div className="h-10 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
        </div>
      </div>
    </div>
  )
  if (!product) return <div className="text-center py-20 text-gray-400">ไม่พบสินค้า</div>

  const discount = product.compare_price
    ? Math.round((1 - product.price / product.compare_price) * 100) : 0
  const avgRating = product.avg_rating ?? 0
  const reviewCount = product.review_count ?? 0
  const soldCount = product.sold_count ?? 0
  const reviews = product.reviews ?? []
  const howTo = product.how_to ?? []
  const relatedItems = related?.items?.filter((p) => p.id !== product.id).slice(0, 5) ?? []

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { toast.error('กรุณาเข้าสู่ระบบก่อนรีวิว'); return }
    try {
      await addReview.mutateAsync({ rating: reviewRating, title: reviewTitle || undefined, body: reviewBody || undefined })
      toast.success('ขอบคุณสำหรับรีวิว!')
      setReviewTitle(''); setReviewBody(''); setReviewRating(5)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'เกิดข้อผิดพลาด')
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-1">
        <nav className="flex items-center gap-1 text-xs text-gray-400">
          <Link to="/" className="hover:text-primary-600">หน้าแรก</Link>
          <ChevronRight size={12} />
          <Link to="/shop" className="hover:text-primary-600">สินค้า</Link>
          <ChevronRight size={12} />
          <span className="text-gray-600 truncate max-w-[180px]">{product.name}</span>
        </nav>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">

            {/* Images */}
            <div className="p-6 border-r border-gray-100">
              <div
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3 cursor-zoom-in group"
                onClick={() => setZoomed(true)}
              >
                {product.images[activeImg] ? (
                  <img src={product.images[activeImg].url} alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl text-gray-200">📦</div>
                )}
                {discount > 0 && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                    -{discount}%
                  </span>
                )}
                <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition">
                  <ZoomIn size={16} className="text-gray-600" />
                </div>
                {product.images.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setActiveImg((i) => (i - 1 + product.images.length) % product.images.length) }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveImg((i) => (i + 1) % product.images.length) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition">
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition ${i === activeImg ? 'border-primary-500 shadow-md' : 'border-gray-100 hover:border-gray-300'}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl font-semibold text-gray-900 leading-snug">{product.name}</h1>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setLiked(!liked)}
                    className={`p-2 rounded-full border transition ${liked ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                    <Heart size={16} className={liked ? 'fill-red-500' : ''} />
                  </button>
                  <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('คัดลอกลิงก์แล้ว') }}
                    className="p-2 rounded-full border border-gray-200 text-gray-400 hover:border-gray-300 transition">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>

              {/* Rating + sold — ข้อมูลจริงจาก backend */}
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <Stars rating={Math.round(avgRating)} />
                <span className="text-yellow-500 font-medium">{avgRating > 0 ? avgRating.toFixed(1) : '-'}</span>
                <span className="text-gray-300">|</span>
                <button onClick={() => setActiveTab('รีวิว')} className="text-gray-500 hover:text-primary-600 underline-offset-2 hover:underline">
                  {reviewCount} รีวิว
                </button>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">ขายแล้ว {soldCount.toLocaleString()} ชิ้น</span>
              </div>

              {/* Price */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-red-500">฿{product.price.toLocaleString()}</span>
                {product.compare_price && (
                  <>
                    <span className="text-base text-gray-400 line-through">฿{product.compare_price.toLocaleString()}</span>
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded">ลด {discount}%</span>
                  </>
                )}
              </div>

              {/* Attributes */}
              {Object.keys(product.attributes).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(product.attributes).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-20 shrink-0">{k}</span>
                      <span className="bg-white border border-primary-200 text-primary-700 px-3 py-1 rounded-lg font-medium">{v as string}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Stock */}
              <div className="flex items-center gap-2 text-sm">
                {product.stock > 5 ? (
                  <><CheckCircle2 size={15} className="text-green-500" /><span className="text-green-600 font-medium">มีสินค้า</span><span className="text-gray-400">· คงเหลือ {product.stock} ชิ้น</span></>
                ) : product.stock > 0 ? (
                  <><Package size={15} className="text-orange-500" /><span className="text-orange-600 font-medium">เหลือน้อย</span><span className="text-gray-400">· คงเหลือเพียง {product.stock} ชิ้น</span></>
                ) : (
                  <><Package size={15} className="text-red-400" /><span className="text-red-500 font-medium">สินค้าหมด</span></>
                )}
              </div>

              {/* Qty */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-14">จำนวน</span>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-500 transition">
                    <Minus size={14} />
                  </button>
                  <span className="w-12 text-center text-sm font-semibold">{qty}</span>
                  <button onClick={() => setQty(Math.min(product.stock, qty + 1))} disabled={product.stock === 0}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-500 transition">
                    <Plus size={14} />
                  </button>
                </div>
                <span className="text-xs text-gray-400">(สูงสุด {product.stock} ชิ้น)</span>
              </div>

              {/* CTA */}
              <div className="flex gap-3 mt-1">
                <button onClick={() => { addItem(product, qty); toast.success(`เพิ่ม ${qty} ชิ้นลงตะกร้าแล้ว`) }}
                  disabled={product.stock === 0}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-primary-600 text-primary-600 py-3 rounded-xl font-semibold hover:bg-primary-50 transition disabled:opacity-40">
                  <ShoppingCart size={18} /> ใส่ตะกร้า
                </button>
                <button onClick={() => { addItem(product, qty); window.location.href = '/checkout' }}
                  disabled={product.stock === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-40">
                  ซื้อเลย
                </button>
              </div>

              {/* Guarantees */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                {[
                  { icon: <Truck size={16} />, label: 'จัดส่งฟรี', sub: 'ยอดซื้อ ≥ ฿1,000' },
                  { icon: <Shield size={16} />, label: 'ของแท้ 100%', sub: 'รับประกันคุณภาพ' },
                  { icon: <RotateCcw size={16} />, label: 'คืนสินค้าได้', sub: 'ภายใน 7 วัน' },
                ].map((g) => (
                  <div key={g.label} className="flex flex-col items-center text-center gap-1 py-2 rounded-xl bg-gray-50">
                    <span className="text-primary-600">{g.icon}</span>
                    <span className="text-xs font-medium text-gray-700">{g.label}</span>
                    <span className="text-[10px] text-gray-400">{g.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm mt-4 overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium transition border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab}{tab === 'รีวิว' && reviewCount > 0 && <span className="ml-1 text-xs text-gray-400">({reviewCount})</span>}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ── รายละเอียดสินค้า ── */}
            {activeTab === 'รายละเอียดสินค้า' && (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
                  {product.description || 'ยังไม่มีคำอธิบายสินค้า'}
                </p>
                {(product.sku || product.weight || Object.keys(product.attributes).length > 0) && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-gray-800 mb-3">ข้อมูลจำเพาะ</h3>
                    <table className="w-full text-sm border-collapse">
                      <tbody>
                        {product.sku && (
                          <tr className="border-b border-gray-100">
                            <td className="py-2.5 pr-4 text-gray-500 w-36">รหัสสินค้า (SKU)</td>
                            <td className="py-2.5 text-gray-800 font-medium">{product.sku}</td>
                          </tr>
                        )}
                        {product.weight && (
                          <tr className="border-b border-gray-100">
                            <td className="py-2.5 pr-4 text-gray-500">น้ำหนัก</td>
                            <td className="py-2.5 text-gray-800 font-medium">{product.weight} กรัม</td>
                          </tr>
                        )}
                        {Object.entries(product.attributes).map(([k, v]) => (
                          <tr key={k} className="border-b border-gray-100">
                            <td className="py-2.5 pr-4 text-gray-500">{k}</td>
                            <td className="py-2.5 text-gray-800 font-medium">{v as string}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── วิธีใช้งาน — ข้อมูลจาก product.how_to ── */}
            {activeTab === 'วิธีใช้งาน' && (
              <div>
                {howTo.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">ยังไม่มีวิธีใช้งาน (admin สามารถเพิ่มได้ที่ฟอร์มแก้ไขสินค้า)</p>
                ) : (
                  <div className="space-y-4">
                    {howTo.map((s: { step: number; title: string; desc: string }) => (
                      <div key={s.step} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {s.step}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{s.title}</p>
                          <p className="text-gray-500 text-sm mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── นโยบายการคืนสินค้า ── */}
            {activeTab === 'นโยบายการคืนสินค้า' && (
              <div className="space-y-3 text-sm text-gray-700">
                {[
                  ['เงื่อนไขการคืนสินค้า', 'สามารถคืนสินค้าได้ภายใน 7 วันนับจากวันที่ได้รับสินค้า โดยสินค้าต้องอยู่ในสภาพสมบูรณ์ ไม่ผ่านการใช้งาน และมีบรรจุภัณฑ์ครบถ้วน'],
                  ['ขั้นตอนการคืนสินค้า', 'ติดต่อทีมงานผ่านช่องทาง Live Chat หรืออีเมลพร้อมแนบรูปถ่ายสินค้าและหมายเลขคำสั่งซื้อ ทีมงานจะติดต่อกลับภายใน 1-2 วันทำการ'],
                  ['การคืนเงิน', 'หลังได้รับสินค้าคืนและตรวจสอบแล้ว จะดำเนินการคืนเงินผ่านช่องทางเดิมที่ชำระภายใน 5-7 วันทำการ'],
                  ['สินค้าที่ไม่รับคืน', 'สินค้าที่ผ่านการใช้งานแล้ว สินค้าที่ไม่มีบรรจุภัณฑ์ และสินค้าลดราคาพิเศษ'],
                ].map(([title, body]) => (
                  <div key={title} className="p-4 bg-gray-50 rounded-xl">
                    <p className="font-semibold text-gray-800 mb-1">{title}</p>
                    <p className="text-gray-600">{body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── รีวิว — ข้อมูลจาก backend ── */}
            {activeTab === 'รีวิว' && (
              <div className="space-y-6">
                {/* Rating summary */}
                {reviewCount > 0 && (
                  <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900">{avgRating.toFixed(1)}</div>
                      <Stars rating={Math.round(avgRating)} size={16} />
                      <div className="text-xs text-gray-400 mt-1">{reviewCount} รีวิว</div>
                    </div>
                  </div>
                )}

                {/* Review list */}
                {reviews.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีรีวิว เป็นคนแรกที่รีวิวสินค้านี้!</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {r.reviewer_name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-800">{r.reviewer_name}</span>
                            <Stars rating={r.rating} size={12} />
                            <span className="text-xs text-gray-400 ml-auto">
                              {new Date(r.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {r.title && <p className="text-sm font-medium text-gray-700 mt-1">{r.title}</p>}
                          {r.body && <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{r.body}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Write review form */}
                <div className="border-t border-gray-100 pt-5">
                  <h3 className="font-semibold text-gray-800 mb-4">เขียนรีวิว</h3>
                  {!user ? (
                    <p className="text-sm text-gray-400">
                      <Link to="/login" className="text-primary-600 hover:underline">เข้าสู่ระบบ</Link> เพื่อเขียนรีวิว
                    </p>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">คะแนน</span>
                        <Stars rating={reviewRating} size={24} interactive onChange={setReviewRating} />
                      </div>
                      <input
                        placeholder="หัวข้อรีวิว (ไม่บังคับ)"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
                      />
                      <div className="relative">
                        <textarea
                          placeholder="แชร์ประสบการณ์ของคุณ..."
                          rows={3}
                          value={reviewBody}
                          onChange={(e) => setReviewBody(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none pr-12"
                        />
                        <button
                          type="submit"
                          disabled={addReview.isPending}
                          className="absolute right-2 bottom-2 bg-primary-600 text-white p-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-40">
                          <SendHorizontal size={15} />
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {relatedItems.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-base">สินค้าที่คุณอาจสนใจ</h2>
              <Link to="/shop" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                ดูทั้งหมด <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {relatedItems.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {zoomed && product.images[activeImg] && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          <button className="absolute top-4 right-4 text-white bg-white/20 rounded-full p-2 hover:bg-white/30 transition">✕</button>
          <img src={product.images[activeImg].url} alt={product.name}
            className="max-w-full max-h-[90vh] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          {product.images.length > 1 && (
            <div className="absolute bottom-4 flex gap-2">
              {product.images.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setActiveImg(i) }}
                  className={`w-2 h-2 rounded-full transition ${i === activeImg ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
