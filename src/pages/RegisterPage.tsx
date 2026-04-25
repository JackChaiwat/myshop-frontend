import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRegister } from '@/hooks/useApi'
import { useAuthStore } from '@/store'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail } from 'lucide-react'

type Step = 'register' | 'verify'

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('register')
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', full_name: '', phone: '' })
  const [showPw, setShowPw] = useState(false)
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const { mutateAsync, isPending } = useRegister()
  const { setUser, setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return }
    if (form.password !== form.confirmPassword) { toast.error('รหัสผ่านไม่ตรงกัน'); return }
    try {
      const res = await mutateAsync({ email: form.email, password: form.password, full_name: form.full_name, phone: form.phone })
      // set token ทันทีหลังสมัคร เพื่อให้ resend OTP ได้
      if (res?.access_token) {
        const { data: me } = await api.get('/auth/me', { headers: { Authorization: `Bearer ${res.access_token}` } })
        setAuth(me, res.access_token, res.refresh_token)
      }
      toast.success(`ส่ง OTP ไปที่ ${form.email} แล้ว กรุณาตรวจสอบอีเมล`)
      setStep('verify')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'เกิดข้อผิดพลาด')
    }
  }

  const handleVerify = async () => {
    if (otp.length !== 6) { toast.error('กรุณากรอกรหัส 6 หลัก'); return }
    setVerifying(true)
    try {
      await api.post('/verify/email/confirm', { code: otp })
      const { data } = await api.get('/auth/me')
      setUser(data)
      toast.success('ยืนยันอีเมลสำเร็จ! ยินดีต้อนรับ 🎉')
      navigate('/')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'รหัส OTP ไม่ถูกต้อง')
    } finally { setVerifying(false) }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await api.post('/verify/email/send')
      toast.success('ส่ง OTP ใหม่แล้ว กรุณาตรวจสอบอีเมล')
    } catch { toast.error('เกิดข้อผิดพลาด') }
    finally { setResending(false) }
  }

  const handleSkip = () => {
    toast('ยืนยันอีเมลภายหลังได้ที่หน้าโปรไฟล์', { icon: 'ℹ️' })
    navigate('/')
  }

  if (step === 'verify') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ยืนยันอีเมล</h1>
          <p className="text-sm text-gray-500 mb-6">
            ส่งรหัส OTP ไปที่ <strong>{form.email}</strong> แล้ว<br />
            กรุณาตรวจสอบอีเมลและกรอกรหัส 6 หลัก
          </p>

          <div className="flex justify-center gap-2 mb-6">
            {[0,1,2,3,4,5].map(i => (
              <input
                key={i}
                type="text"
                maxLength={1}
                value={otp[i] || ''}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '')
                  const arr = otp.split('')
                  arr[i] = val
                  const next = arr.join('').slice(0, 6)
                  setOtp(next)
                  if (val && i < 5) {
                    const inputs = document.querySelectorAll<HTMLInputElement>('.otp-input')
                    inputs[i + 1]?.focus()
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Backspace' && !otp[i] && i > 0) {
                    const inputs = document.querySelectorAll<HTMLInputElement>('.otp-input')
                    inputs[i - 1]?.focus()
                  }
                }}
                className="otp-input w-11 h-12 border-2 border-gray-200 rounded-xl text-center text-lg font-bold focus:outline-none focus:border-primary-500 transition"
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying || otp.length !== 6}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-40 mb-3"
          >
            {verifying ? 'กำลังตรวจสอบ...' : 'ยืนยันอีเมล'}
          </button>

          <div className="flex items-center justify-center gap-4 text-sm">
            <button onClick={handleResend} disabled={resending}
              className="text-primary-600 hover:underline disabled:opacity-40">
              {resending ? 'กำลังส่ง...' : 'ส่งรหัสใหม่'}
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600">
              ข้ามไปก่อน
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">สมัครสมาชิก</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="ชื่อ-นามสกุล" required value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary-500" />
          <input type="email" placeholder="อีเมล" required value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary-500" />
          <input type="tel" placeholder="เบอร์โทร (ไม่บังคับ)" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary-500" />
          <div className="relative">
            <input type={showPw ? 'text' : 'password'}
              placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)" required value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:border-primary-500" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <input type="password" placeholder="ยืนยันรหัสผ่าน" required value={form.confirmPassword}
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary-500" />

          {form.password && (
            <div className="flex items-center gap-2 text-xs">
              <div className={`h-1 flex-1 rounded-full ${form.password.length >= 8 ? 'bg-green-400' : 'bg-gray-200'}`} />
              <div className={`h-1 flex-1 rounded-full ${form.password.length >= 12 ? 'bg-green-400' : 'bg-gray-200'}`} />
              <div className={`h-1 flex-1 rounded-full ${/[^a-zA-Z0-9]/.test(form.password) ? 'bg-green-400' : 'bg-gray-200'}`} />
              <span className="text-gray-400 w-16">
                {form.password.length < 8 ? 'สั้นเกินไป' : form.password.length < 12 ? 'พอใช้' : 'แข็งแรง'}
              </span>
            </div>
          )}

          <button type="submit" disabled={isPending}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-40">
            {isPending ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-4 text-center">
          มีบัญชีแล้ว? <Link to="/login" className="text-primary-600 hover:underline">เข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  )
}