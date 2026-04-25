import { useState, useRef } from 'react'
import { useAuthStore } from '@/store'
import {
  useAddresses, useCreateAddress,
  useSendEmailOTP, useConfirmEmailOTP,
  useSendEmailChangeOTP, useConfirmEmailChange,
  useChangePassword, useUpdatePhone,
} from '@/hooks/useApi'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
  Plus, MapPin, User, Lock, Mail, Phone,
  CheckCircle, Camera, Edit2, Eye, EyeOff
} from 'lucide-react'

type Tab = 'profile' | 'security' | 'address'

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore()
  const { data: addresses } = useAddresses()
  const { mutateAsync: createAddr } = useCreateAddress()

  const [tab, setTab] = useState<Tab>('profile')

  // Profile
  const [nameForm, setNameForm] = useState({ full_name: user?.full_name || '' })
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)

  // Email verification
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const { mutateAsync: sendEmailOTP, isPending: sendingOTP } = useSendEmailOTP()
  const { mutateAsync: confirmEmailOTP, isPending: confirmingOTP } = useConfirmEmailOTP()

  // Email change
  const [showEmailChange, setShowEmailChange] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailChangeOTPSent, setEmailChangeOTPSent] = useState(false)
  const [emailChangeCode, setEmailChangeCode] = useState('')
  const { mutateAsync: sendEmailChangeOTP, isPending: sendingEmailChange } = useSendEmailChangeOTP()
  const { mutateAsync: confirmEmailChange, isPending: confirmingEmailChange } = useConfirmEmailChange()

  // Phone
  const [editPhone, setEditPhone] = useState(false)
  const [phoneVal, setPhoneVal] = useState(user?.phone || '')
  const { mutateAsync: updatePhone, isPending: updatingPhone } = useUpdatePhone()

  // Password
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const { mutateAsync: changePassword, isPending: changingPw } = useChangePassword()

  // Address
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [addrForm, setAddrForm] = useState({
    full_name: '', phone: '', address_line1: '', address_line2: '',
    city: '', province: '', postal_code: '', country: 'Thailand', is_default: false
  })

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const { data } = await api.put('/users/me', { full_name: nameForm.full_name })
      setUser(data)
      toast.success('บันทึกชื่อแล้ว')
    } catch { toast.error('เกิดข้อผิดพลาด') }
    finally { setSaving(false) }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setUser(data)
      toast.success('เปลี่ยนรูปโปรไฟล์แล้ว')
    } catch { toast.error('อัปโหลดไม่สำเร็จ') }
    finally { setAvatarLoading(false) }
  }

  const handleSendOTP = async () => {
    try {
      await sendEmailOTP()
      setOtpSent(true)
      toast.success('ส่ง OTP แล้ว กรุณาตรวจสอบอีเมล')
    } catch (e: any) { toast.error(e.response?.data?.detail || 'เกิดข้อผิดพลาด') }
  }

  const handleConfirmOTP = async () => {
    if (otpCode.length !== 6) { toast.error('กรุณากรอกรหัส 6 หลัก'); return }
    try {
      await confirmEmailOTP(otpCode)
      setOtpSent(false); setOtpCode('')
      toast.success('ยืนยันอีเมลสำเร็จ!')
    } catch (e: any) { toast.error(e.response?.data?.detail || 'รหัสไม่ถูกต้อง') }
  }

  const handleSendEmailChange = async () => {
    if (!newEmail) { toast.error('กรุณากรอกอีเมลใหม่'); return }
    try {
      await sendEmailChangeOTP(newEmail)
      setEmailChangeOTPSent(true)
      toast.success(`ส่ง OTP ไปที่ ${newEmail} แล้ว`)
    } catch (e: any) { toast.error(e.response?.data?.detail || 'เกิดข้อผิดพลาด') }
  }

  const handleConfirmEmailChange = async () => {
    if (emailChangeCode.length !== 6) { toast.error('กรุณากรอกรหัส 6 หลัก'); return }
    try {
      await confirmEmailChange({ new_email: newEmail, code: emailChangeCode })
      setShowEmailChange(false); setEmailChangeOTPSent(false); setNewEmail(''); setEmailChangeCode('')
      toast.success('เปลี่ยนอีเมลสำเร็จ!')
    } catch (e: any) { toast.error(e.response?.data?.detail || 'รหัสไม่ถูกต้อง') }
  }

  const handleUpdatePhone = async () => {
    if (phoneVal.length < 10 || phoneVal.length > 10) { toast.error('กรุณากรอกเบอร์โทรให้ครบ 9-10 หลัก'); return }
    try {
      await updatePhone(phoneVal)
      setEditPhone(false)
      toast.success('อัปเดตเบอร์โทรแล้ว')
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  const handleChangePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm_password) { toast.error('รหัสผ่านใหม่ไม่ตรงกัน'); return }
    if (pwForm.new_password.length < 8) { toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return }
    try {
      await changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password })
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
      toast.success('เปลี่ยนรหัสผ่านแล้ว')
    } catch (e: any) { toast.error(e.response?.data?.detail || 'รหัสผ่านปัจจุบันไม่ถูกต้อง') }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createAddr(addrForm)
      toast.success('เพิ่มที่อยู่แล้ว')
      setShowAddrForm(false)
      setAddrForm({ full_name: '', phone: '', address_line1: '', address_line2: '', city: '', province: '', postal_code: '', country: 'Thailand', is_default: false })
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'
  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'ข้อมูลส่วนตัว', icon: <User size={16} /> },
    { key: 'security', label: 'ความปลอดภัย', icon: <Lock size={16} /> },
    { key: 'address', label: 'ที่อยู่จัดส่ง', icon: <MapPin size={16} /> },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Avatar */}
      <div className="flex items-center gap-5 mb-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
            {user?.avatar_url
              ? <img src={`${import.meta.env.VITE_STATIC_URL}${user.avatar_url}`} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-2xl font-bold text-primary-600">{initials}</span>}
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={avatarLoading}
            className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow hover:bg-gray-50 transition">
            <Camera size={13} className="text-gray-500" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{user?.full_name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          {user?.is_verified
            ? <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1"><CheckCircle size={12} />ยืนยันอีเมลแล้ว</span>
            : <span className="text-xs text-amber-500 mt-1 inline-block">⚠ ยังไม่ยืนยันอีเมล</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ─── Profile Tab ─── */}
      {tab === 'profile' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">ชื่อ-นามสกุล</h3>
            <div className="space-y-3">
              <input type="text" value={nameForm.full_name}
                onChange={e => setNameForm({ full_name: e.target.value })}
                placeholder="ชื่อ-นามสกุล"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500" />
              <button onClick={handleSaveProfile} disabled={saving}
                className="bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-40">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>

          {/* อีเมล */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Mail size={16} />อีเมล</h3>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-700">{user?.email}</span>
              {user?.is_verified
                ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} />ยืนยันแล้ว</span>
                : <span className="text-xs text-amber-500">ยังไม่ยืนยัน</span>}
            </div>
            {!user?.is_verified && (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 mb-3">
                <p className="text-xs text-amber-700 mb-2">กรุณายืนยันอีเมลเพื่อรับข้อมูลคำสั่งซื้อ</p>
                {!otpSent ? (
                  <button onClick={handleSendOTP} disabled={sendingOTP}
                    className="text-xs bg-amber-500 text-white px-4 py-1.5 rounded-lg hover:bg-amber-600 transition disabled:opacity-40">
                    {sendingOTP ? 'กำลังส่ง...' : 'ส่งรหัสยืนยัน OTP'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" placeholder="รหัส 6 หลัก" maxLength={6} value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:border-primary-500" />
                    <button onClick={handleConfirmOTP} disabled={confirmingOTP}
                      className="text-xs bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 transition disabled:opacity-40">
                      {confirmingOTP ? '...' : 'ยืนยัน'}
                    </button>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setShowEmailChange(!showEmailChange)}
              className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              <Edit2 size={12} />เปลี่ยนอีเมล
            </button>
            {showEmailChange && (
              <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                {!emailChangeOTPSent ? (
                  <>
                    <input type="email" placeholder="อีเมลใหม่" value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                    <button onClick={handleSendEmailChange} disabled={sendingEmailChange}
                      className="text-xs bg-primary-600 text-white px-4 py-1.5 rounded-lg hover:bg-primary-700 transition disabled:opacity-40">
                      {sendingEmailChange ? 'กำลังส่ง...' : 'ส่ง OTP ไปยังอีเมลใหม่'}
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">ส่ง OTP ไปที่ <strong>{newEmail}</strong> แล้ว</p>
                    <div className="flex gap-2">
                      <input type="text" placeholder="รหัส 6 หลัก" maxLength={6} value={emailChangeCode}
                        onChange={e => setEmailChangeCode(e.target.value.replace(/\D/g, ''))}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:border-primary-500" />
                      <button onClick={handleConfirmEmailChange} disabled={confirmingEmailChange}
                        className="text-xs bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 transition disabled:opacity-40">
                        {confirmingEmailChange ? '...' : 'ยืนยัน'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* เบอร์โทร */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Phone size={16} />เบอร์โทรศัพท์</h3>
            {!editPhone ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{user?.phone || 'ยังไม่มีเบอร์โทร'}</span>
                <button onClick={() => { setEditPhone(true); setPhoneVal(user?.phone || '') }}
                  className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                  <Edit2 size={12} />แก้ไข
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneVal}
                  onChange={e => setPhoneVal(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0812345678"
                  maxLength={10}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                />
                <button onClick={handleUpdatePhone} disabled={updatingPhone}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 transition disabled:opacity-40">
                  {updatingPhone ? '...' : 'บันทึก'}
                </button>
                <button onClick={() => setEditPhone(false)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">ยกเลิก</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Security Tab ─── */}
      {tab === 'security' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2"><Lock size={16} />เปลี่ยนรหัสผ่าน</h3>
          <div className="space-y-3">
            {([
              { key: 'current_password', label: 'รหัสผ่านปัจจุบัน', showKey: 'current' as const },
              { key: 'new_password', label: 'รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)', showKey: 'new' as const },
              { key: 'confirm_password', label: 'ยืนยันรหัสผ่านใหม่', showKey: 'confirm' as const },
            ] as const).map(({ key, label, showKey }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <div className="relative">
                  <input type={showPw[showKey] ? 'text' : 'password'} value={(pwForm as any)[key]}
                    onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-primary-500" />
                  <button type="button" onClick={() => setShowPw(p => ({ ...p, [showKey]: !p[showKey] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
            <button onClick={handleChangePassword} disabled={changingPw || !pwForm.current_password || !pwForm.new_password}
              className="bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-40 w-full">
              {changingPw ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Address Tab ─── */}
      {tab === 'address' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">ที่อยู่ทั้งหมด</h3>
            <button onClick={() => setShowAddrForm(!showAddrForm)}
              className="flex items-center gap-1 text-sm text-primary-600 hover:underline">
              <Plus size={14} />เพิ่มที่อยู่
            </button>
          </div>
          {addresses?.length === 0 && !showAddrForm && (
            <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">ยังไม่มีที่อยู่</p>
            </div>
          )}
          {addresses?.map((a) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 text-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{a.full_name} — {a.phone}</p>
                  <p className="text-gray-500 mt-0.5">{a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ''}</p>
                  <p className="text-gray-500">{a.city}, {a.province} {a.postal_code}</p>
                </div>
                {a.is_default && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full whitespace-nowrap">ค่าเริ่มต้น</span>}
              </div>
            </div>
          ))}
          {showAddrForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-medium text-gray-900 mb-4">เพิ่มที่อยู่ใหม่</h4>
              <form onSubmit={handleAddAddress} className="grid grid-cols-2 gap-3">
                {[
                  { key: 'full_name', label: 'ชื่อ-นามสกุล', col: 2 },
                  { key: 'phone', label: 'เบอร์โทร', col: 1 },
                  { key: 'address_line1', label: 'ที่อยู่', col: 2 },
                  { key: 'address_line2', label: 'ที่อยู่บรรทัด 2 (ไม่บังคับ)', col: 2 },
                  { key: 'city', label: 'เขต/อำเภอ', col: 1 },
                  { key: 'province', label: 'จังหวัด', col: 1 },
                  { key: 'postal_code', label: 'รหัสไปรษณีย์', col: 1 },
                ].map(({ key, label, col }) => (
                  <input key={key} placeholder={label} value={(addrForm as any)[key]}
                    onChange={e => setAddrForm({ ...addrForm, [key]: e.target.value })}
                    required={key !== 'address_line2'}
                    className={`border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 col-span-${col}`} />
                ))}
                <label className="col-span-2 flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={addrForm.is_default} onChange={e => setAddrForm({ ...addrForm, is_default: e.target.checked })} />
                  ตั้งเป็นที่อยู่ค่าเริ่มต้น
                </label>
                <div className="col-span-2 flex gap-2">
                  <button type="submit" className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">บันทึก</button>
                  <button type="button" onClick={() => setShowAddrForm(false)} className="border border-gray-200 px-5 py-2 rounded-lg text-sm hover:bg-gray-50">ยกเลิก</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      <button onClick={logout} className="w-full border border-red-200 text-red-600 py-3 rounded-xl text-sm font-medium hover:bg-red-50 transition mt-6">
        ออกจากระบบ
      </button>
    </div>
  )
}
