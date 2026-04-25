// ─── LoginPage.tsx ────────────────────────────────────────
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLogin } from '@/hooks/useApi'
import toast from 'react-hot-toast'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { mutateAsync, isPending } = useLogin()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await mutateAsync({ email, password })
      toast.success('เข้าสู่ระบบสำเร็จ')
      navigate('/')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">เข้าสู่ระบบ</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="อีเมล" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary-500" />
          <input type="password" placeholder="รหัสผ่าน" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary-500" />
          <button type="submit" disabled={isPending}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-40">
            {isPending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-4 text-center">
          ยังไม่มีบัญชี? <Link to="/register" className="text-primary-600 hover:underline">สมัครสมาชิก</Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage

// ─── RegisterPage.tsx ─────────────────────────────────────
import { useRegister } from '@/hooks/useApi'

export function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '' })
  const { mutateAsync, isPending } = useRegister()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await mutateAsync(form)
      toast.success('สมัครสมาชิกสำเร็จ')
      navigate('/')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'เกิดข้อผิดพลาด')
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">สมัครสมาชิก</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(['full_name', 'email', 'phone', 'password'] as const).map((f) => (
            <input key={f} type={f === 'password' ? 'password' : f === 'email' ? 'email' : 'text'}
              placeholder={{ full_name: 'ชื่อ-นามสกุล', email: 'อีเมล', phone: 'เบอร์โทร', password: 'รหัสผ่าน (อย่างน้อย 8 ตัว)' }[f]}
              required={f !== 'phone'} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary-500" />
          ))}
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
