import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProducts, useCategories } from '@/hooks/useApi'
import ProductCard from '@/components/shop/ProductCard'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'

export default function ShopPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || undefined
  const [page, setPage] = useState(1)
  const [minPrice, setMinPrice] = useState<number | undefined>()
  const [maxPrice, setMaxPrice] = useState<number | undefined>()
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  const { data, isLoading } = useProducts({
    page, per_page: 20,
    min_price: minPrice,
    max_price: maxPrice,
    category: selectedCategory,
    q,
  })
  const { data: categories } = useCategories()

  const handleCategorySelect = (slug?: string) => {
    setSelectedCategory(slug)
    setPage(1)
  }

  const FilterPanel = () => (
    <div className="space-y-5">
      {/* หมวดหมู่ */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">หมวดหมู่</p>
        <div className="space-y-1">
          <button
            onClick={() => handleCategorySelect(undefined)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
              !selectedCategory ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            ทั้งหมด
          </button>
          {categories?.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.slug)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                selectedCategory === cat.slug ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* กรองราคา */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ราคา</p>
        <div className="space-y-2">
          <input
            type="number"
            placeholder="ราคาต่ำสุด"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
            onChange={e => { setMinPrice(e.target.value ? Number(e.target.value) : undefined); setPage(1) }}
          />
          <input
            type="number"
            placeholder="ราคาสูงสุด"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
            onChange={e => { setMaxPrice(e.target.value ? Number(e.target.value) : undefined); setPage(1) }}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Category bar — แถบบนสุด (mobile + desktop) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
        <button
          onClick={() => handleCategorySelect(undefined)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition ${
            !selectedCategory
              ? 'bg-primary-600 text-white border-primary-600'
              : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
          }`}
        >
          ทั้งหมด
        </button>
        {categories?.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategorySelect(cat.slug)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              selectedCategory === cat.slug
                ? 'bg-primary-600 text-white border-primary-600'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          {selectedCategory
            ? categories?.find(c => c.slug === selectedCategory)?.name ?? 'สินค้า'
            : q ? `ผลการค้นหา: "${q}"` : 'สินค้าทั้งหมด'}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{data?.total ?? 0} รายการ</span>
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowMobileFilter(true)}
            className="md:hidden flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <SlidersHorizontal size={14} />กรอง
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar — desktop only */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-20">
            <div className="flex items-center gap-2 mb-4 font-medium text-gray-700 text-sm">
              <SlidersHorizontal size={15} />กรองสินค้า
            </div>
            <FilterPanel />
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse" />
              ))}
            </div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-20 text-gray-400">ไม่พบสินค้า</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data?.items.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
              {data && data.total_pages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  {Array.from({ length: data.total_pages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`w-9 h-9 rounded-lg text-sm border ${
                        page === i + 1
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileFilter(false)} />
          <div className="relative ml-auto w-72 h-full bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <span className="font-semibold text-gray-900">กรองสินค้า</span>
              <button onClick={() => setShowMobileFilter(false)}>
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FilterPanel />
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setShowMobileFilter(false)}
                className="w-full bg-primary-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 transition"
              >
                ดูสินค้า {data?.total ?? 0} รายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}