import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminSettingsPage() {
  const [tab, setTab] = useState('general')

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => { const { data } = await api.get('/admin/settings'); return data },
  })

  const save = useMutation({
    mutationFn: (body: any) => api.put('/admin/settings', body),
    onSuccess: () => toast.success('บันทึกแล้ว'),
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const [general, setGeneral] = useState({ shop_name: '', shop_description: '', shop_email: '', shop_phone: '', shop_address: '', currency: 'THB', tax_rate: '' })
  const [shipping, setShipping] = useState({ free_shipping_threshold: '', standard_shipping_fee: '', express_shipping_fee: '' })

  useEffect(() => {
    if (settings?.general) setGeneral(settings.general)
    if (settings?.shipping) setShipping(settings.shipping)
  }, [settings])

  const tabs = [
    { id: 'general', label: 'ทั่วไป' },
    { id: 'shipping', label: 'การจัดส่ง' },
    { id: 'payment', label: 'การชำระเงิน' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ตั้งค่าร้านค้า</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"px-4 py-2 text-sm rounded-md transition " + (tab === t.id ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-4">
          <h2 className="font-semibold text-gray-900 mb-2">ข้อมูลร้านค้า</h2>
          {[
            { label: 'ชื่อร้านค้า', key: 'shop_name', placeholder: 'MyShop' },
            { label: 'อีเมลร้านค้า', key: 'shop_email', placeholder: 'shop@example.com' },
            { label: 'เบอร์โทร', key: 'shop_phone', placeholder: '02-xxx-xxxx' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input value={(general as any)[key]} placeholder={placeholder}
                onChange={e => setGeneral({ ...general, [key]: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบายร้านค้า</label>
            <textarea value={general.shop_description} rows={3}
              onChange={e => setGeneral({ ...general, shop_description: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่ร้านค้า</label>
            <textarea value={general.shop_address} rows={2}
              onChange={e => setGeneral({ ...general, shop_address: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">สกุลเงิน</label>
              <select value={general.currency} onChange={e => setGeneral({ ...general, currency: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="THB">THB (บาท)</option>
                <option value="USD">USD (ดอลลาร์)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อัตราภาษี (%)</label>
              <input type="number" value={general.tax_rate} onChange={e => setGeneral({ ...general, tax_rate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
            </div>
          </div>
          <button onClick={() => save.mutate({ type: 'general', data: general })} disabled={save.isPending}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40">
            <Save size={15} /> {save.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      )}

      {tab === 'shipping' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-4">
          <h2 className="font-semibold text-gray-900 mb-2">ค่าจัดส่ง</h2>
          {[
            { label: 'ส่งฟรีเมื่อซื้อครบ (฿)', key: 'free_shipping_threshold', placeholder: '1000' },
            { label: 'ค่าจัดส่งปกติ (฿)', key: 'standard_shipping_fee', placeholder: '50' },
            { label: 'ค่าจัดส่งด่วน (฿)', key: 'express_shipping_fee', placeholder: '100' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type="number" value={(shipping as any)[key]} placeholder={placeholder}
                onChange={e => setShipping({ ...shipping, [key]: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
            </div>
          ))}
          <button onClick={() => save.mutate({ type: 'shipping', data: shipping })} disabled={save.isPending}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40">
            <Save size={15} /> {save.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      )}

      {tab === 'payment' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
          <h2 className="font-semibold text-gray-900 mb-4">การชำระเงิน</h2>
          <div className="space-y-3">
            {[
              { label: 'Omise PromptPay', desc: 'รับชำระผ่าน QR Code PromptPay', enabled: true },
              { label: 'Lemon Squeezy', desc: 'รับชำระบัตรเครดิต/เดบิต', enabled: false },
              { label: 'โอนเงินธนาคาร', desc: 'โอนผ่านแอปธนาคาร', enabled: false },
            ].map(({ label, desc, enabled }) => (
              <div key={label} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
                <span className={"text-xs px-2 py-1 rounded-full " + (enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
