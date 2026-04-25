import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { Download } from 'lucide-react'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

type ViewMode = 'daily' | 'monthly' | 'yearly'

const now = new Date()

function yearList(back = 5) {
  const y = now.getFullYear()
  return Array.from({ length: back + 1 }, (_, i) => y - back + i + 1)
}

// ฟังก์ชันแปลงวันที่สำหรับ Export (รองรับทุกกรณี)
function formatDateForExport(dateStr: string, mode: ViewMode): string {
  if (!dateStr || dateStr === '') return ''
  
  if (mode === 'daily') {
    // กรณีที่ 1: รูปแบบ "3-May" หรือ "3-May-2025"
    let match = dateStr.match(/^(\d+)-([A-Za-z]+)(?:-(\d+))?$/)
    if (match) {
      const day = match[1].padStart(2, '0')
      const monthAbbr = match[2]
      let year = match[3] || now.getFullYear().toString()
      
      const monthMap: Record<string, string> = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      }
      const month = monthMap[monthAbbr] || '01'
      return `${day}/${month}/${year}`
    }
    
    // กรณีที่ 2: รูปแบบ "13/03" หรือ "13/03/2025"
    match = dateStr.match(/^(\d+)\/(\d+)(?:\/(\d+))?$/)
    if (match) {
      const day = match[1].padStart(2, '0')
      const month = match[2].padStart(2, '0')
      const year = match[3] || now.getFullYear().toString()
      return `${day}/${month}/${year}`
    }
    
    // กรณีที่ 3: รูปแบบ "2025-05-03"
    const parts = dateStr.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    
    // กรณีที่ 4: รูปแบบ "03/05/2025"
    const slashParts = dateStr.split('/')
    if (slashParts.length === 3 && slashParts[2].length === 4) {
      return dateStr
    }
    
    return dateStr
  }
  
  if (mode === 'monthly') {
    // กรณีที่ 1: รูปแบบ "May" หรือ "May 2025"
    let match = dateStr.match(/([A-Za-z]+)(?:\s+(\d{4}))?/i)
    if (match) {
      const monthMap: Record<string, number> = {
        'Jan': 1, 'January': 1, 'Feb': 2, 'February': 2,
        'Mar': 3, 'March': 3, 'Apr': 4, 'April': 4,
        'May': 5, 'Jun': 6, 'June': 6, 'Jul': 7, 'July': 7,
        'Aug': 8, 'August': 8, 'Sep': 9, 'September': 9,
        'Oct': 10, 'October': 10, 'Nov': 11, 'November': 11,
        'Dec': 12, 'December': 12
      }
      const monthNum = monthMap[match[1]]
      const year = match[2] || now.getFullYear().toString()
      if (monthNum) {
        return `${THAI_MONTHS[monthNum - 1]} ${year}`
      }
    }
    
    // กรณีที่ 2: รูปแบบ "2025-05"
    const parts = dateStr.split('-')
    if (parts.length === 2 && parts[0].length === 4) {
      const year = parts[0]
      const month = parseInt(parts[1], 10)
      if (month >= 1 && month <= 12) {
        return `${THAI_MONTHS[month - 1]} ${year}`
      }
    }
    
    // กรณีที่ 3: รูปแบบ "05/2025"
    const slashParts = dateStr.split('/')
    if (slashParts.length === 2) {
      const month = parseInt(slashParts[0], 10)
      const year = slashParts[1]
      if (month >= 1 && month <= 12) {
        return `${THAI_MONTHS[month - 1]} ${year}`
      }
    }
    
    // กรณีที่ 4: เป็นเลขเดือนอย่างเดียว
    const monthNum = parseInt(dateStr, 10)
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      return `${THAI_MONTHS[monthNum - 1]} ${now.getFullYear()}`
    }
    
    return dateStr
  }
  
  // yearly
  const yearMatch = dateStr.match(/\d{4}/)
  return yearMatch ? yearMatch[0] : dateStr
}

function MonthYearPicker({ label, month, year, onMonth, onYear, minMonth, minYear, maxMonth, maxYear }: {
  label: string
  month: number; year: number
  onMonth: (m: number) => void; onYear: (y: number) => void
  minMonth?: number; minYear?: number
  maxMonth?: number; maxYear?: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex gap-1.5">
        <select value={month} onChange={e => onMonth(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none bg-white">
          {THAI_MONTHS.map((m, i) => {
            const mo = i + 1
            const tooEarly = minYear !== undefined && year === minYear && minMonth !== undefined && mo < minMonth
            const tooLate  = maxYear !== undefined && year === maxYear && maxMonth !== undefined && mo > maxMonth
            return <option key={mo} value={mo} disabled={tooEarly || tooLate}>{m}</option>
          })}
        </select>
        <select value={year} onChange={e => onYear(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none bg-white">
          {yearList().map(y => (
            <option key={y} value={y}
              disabled={(minYear !== undefined && y < minYear) || (maxYear !== undefined && y > maxYear)}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function YearPicker({ label, year, onYear, minYear, maxYear }: {
  label: string; year: number; onYear: (y: number) => void
  minYear?: number; maxYear?: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <select value={year} onChange={e => onYear(Number(e.target.value))}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none bg-white">
        {yearList().map(y => (
          <option key={y} value={y}
            disabled={(minYear !== undefined && y < minYear) || (maxYear !== undefined && y > maxYear)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function AdminReportsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily')

  // daily
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => now.toISOString().slice(0, 10))

  // monthly — default: 3 เดือนที่แล้ว → เดือนนี้
  const initFromMonth = now.getMonth() - 2 <= 0 ? now.getMonth() + 10 : now.getMonth() - 1
  const initFromYear  = now.getMonth() - 2 <= 0 ? now.getFullYear() - 1 : now.getFullYear()
  const [fromMonth, setFromMonth]         = useState(initFromMonth)
  const [fromMonthYear, setFromMonthYear] = useState(initFromYear)
  const [toMonth, setToMonth]             = useState(now.getMonth() + 1)
  const [toMonthYear, setToMonthYear]     = useState(now.getFullYear())

  // yearly
  const [fromYear, setFromYear] = useState(now.getFullYear() - 2)
  const [toYear, setToYear]     = useState(now.getFullYear())

  const queryParams = () => {
    if (viewMode === 'daily')   return { mode: 'daily',   from: fromDate, to: toDate }
    if (viewMode === 'monthly') return { mode: 'monthly', from_month: fromMonth, from_year: fromMonthYear, to_month: toMonth, to_year: toMonthYear }
    return { mode: 'yearly', from_year: fromYear, to_year: toYear }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', viewMode, queryParams()],
    queryFn: async () => {
      const { data } = await api.get('/admin/reports', { params: queryParams() })
      return data
    },
  })

  const chartData: any[] = data?.chart ?? []

  const dateColLabel = viewMode === 'daily' ? 'วันที่' : viewMode === 'monthly' ? 'เดือน' : 'ปี'

  // ฟังก์ชัน Export CSV ที่แก้ไขแล้ว
  const exportCSV = () => {
    // สร้างหัวตาราง
    const headers = [
      dateColLabel,
      'ยอดขาย (฿)',
      'จำนวนออเดอร์',
      'มูลค่าเฉลี่ยต่อออเดอร์ (฿)'
    ]
    
    // สร้างแถวข้อมูล
    const rows = [headers]
    
    chartData.forEach((d: any) => {
      const avgOrderValue = d.orders > 0 ? Math.round(d.revenue / d.orders) : 0
      const formattedDate = formatDateForExport(d.date, viewMode)
      
      rows.push([
        formattedDate,
        d.revenue.toLocaleString(),
        d.orders,
        avgOrderValue.toLocaleString()
      ])
    })
    
    // แปลงเป็น CSV
    const csv = rows.map(row => row.join(',')).join('\n')
    
    // เพิ่ม BOM สำหรับภาษาไทย
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `report-${viewMode}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const VIEW_TABS: { value: ViewMode; label: string }[] = [
    { value: 'daily',   label: 'รายวัน' },
    { value: 'monthly', label: 'รายเดือน' },
    { value: 'yearly',  label: 'รายปี' },
  ]

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รายงาน & ยอดขาย</h1>
          <p className="text-sm text-gray-500 mt-1">วิเคราะห์ข้อมูลยอดขาย</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 shrink-0">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-4">

        {/* Mode tabs */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">ช่วงเวลา</span>
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {VIEW_TABS.map(tab => (
              <button key={tab.value} onClick={() => setViewMode(tab.value)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${
                  viewMode === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-10 bg-gray-200 self-end mb-0.5" />

        {/* Daily */}
        {viewMode === 'daily' && <>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">จากวันที่</span>
            <input type="date" value={fromDate} max={toDate}
              onChange={e => setFromDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none bg-white" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">ถึงวันที่</span>
            <input type="date" value={toDate} min={fromDate} max={now.toISOString().slice(0, 10)}
              onChange={e => setToDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none bg-white" />
          </div>
        </>}

        {/* Monthly */}
        {viewMode === 'monthly' && <>
          <MonthYearPicker
            label="จากเดือน"
            month={fromMonth} year={fromMonthYear}
            onMonth={setFromMonth} onYear={setFromMonthYear}
            maxMonth={toMonth} maxYear={toMonthYear}
          />
          <MonthYearPicker
            label="ถึงเดือน"
            month={toMonth} year={toMonthYear}
            onMonth={setToMonth} onYear={setToMonthYear}
            minMonth={fromMonth} minYear={fromMonthYear}
            maxMonth={now.getMonth() + 1} maxYear={now.getFullYear()}
          />
        </>}

        {/* Yearly */}
        {viewMode === 'yearly' && <>
          <YearPicker label="จากปี" year={fromYear} onYear={setFromYear} maxYear={toYear} />
          <YearPicker label="ถึงปี"  year={toYear}  onYear={setToYear}  minYear={fromYear} maxYear={now.getFullYear()} />
        </>}

        {/* Range summary */}
        <span className="ml-auto text-xs text-gray-400 self-end pb-2.5">
          {viewMode === 'daily'   && `${fromDate} — ${toDate}`}
          {viewMode === 'monthly' && `${THAI_MONTHS[fromMonth - 1]} ${fromMonthYear} — ${THAI_MONTHS[toMonth - 1]} ${toMonthYear}`}
          {viewMode === 'yearly'  && `${fromYear} — ${toYear}`}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'ยอดขายรวม',     value: `฿${(data?.total_revenue ?? 0).toLocaleString()}` },
          { label: 'คำสั่งซื้อ',      value: data?.total_orders ?? 0 },
          { label: 'เฉลี่ย/ออเดอร์',  value: `฿${(data?.avg_order_value ?? 0).toLocaleString()}` },
          { label: 'ลูกค้าใหม่',     value: data?.new_customers ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Area chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">
          {viewMode === 'daily' ? 'ยอดขายรายวัน' : viewMode === 'monthly' ? 'ยอดขายรายเดือน' : 'ยอดขายรายปี'}
        </h2>
        {isLoading
          ? <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">กำลังโหลด...</div>
          : <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => ['฿' + Number(v).toLocaleString(), 'ยอดขาย']} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#eff6ff" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
        }
      </div>

      {/* Category + Top products */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">ยอดขายตามหมวดหมู่</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie 
                data={data?.by_category ?? []} 
                dataKey="revenue" 
                nameKey="name"
                cx="50%" 
                cy="50%" 
                outerRadius={80}
                label={({ name, percent }) => {
                  const safePercent = percent ?? 0;
                  return `${name} ${(safePercent * 100).toFixed(0)}%`;
                }}
              >
                {(data?.by_category ?? []).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => ['฿' + Number(v).toLocaleString(), 'ยอดขาย']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {viewMode === 'daily' ? 'รายงานรายวัน' : viewMode === 'monthly' ? 'รายงานรายเดือน' : 'รายงานรายปี'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[dateColLabel, 'คำสั่งซื้อ', 'ยอดขาย', 'เฉลี่ย/ออเดอร์'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...chartData].reverse().map((d: any) => (
                <tr key={d.date} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{d.date}</td>
                  <td className="px-4 py-3">{d.orders} ออเดอร์</td>
                  <td className="px-4 py-3 font-medium">฿{Number(d.revenue).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">
                    ฿{d.orders > 0 ? Math.round(d.revenue / d.orders).toLocaleString() : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}