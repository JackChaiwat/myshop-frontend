import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react'
import { useAuthStore } from '@/store'
import api from '@/lib/api'

type Msg = {
  id: string
  sender_role: 'admin' | 'customer'
  message: string
  created_at: string
  is_read: boolean
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatWidget() {
  const { isAuthenticated, user } = useAuthStore()

  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [roomId, setRoomId] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const getToken = () =>
    (api.defaults.headers.common['Authorization'] as string)?.replace('Bearer ', '') ?? ''

  const connectWS = (rid: string) => {
    const token = getToken()
    if (!token) return
    const base = import.meta.env.VITE_API_URL?.replace('https', 'wss').replace('http', 'ws')
    const ws = new WebSocket(`${base}/chat/ws/user`)
    wsRef.current = ws
    ws.onopen = () => {
      // ส่ง token ใน first message แทนการใส่ใน URL เพื่อไม่ให้ถูกบันทึกใน server log
      ws.send(JSON.stringify({ type: 'auth', token }))
      setConnected(true)
    }
    ws.onclose = () => {
      setConnected(false)
      setTimeout(() => { if (wsRef.current === ws) connectWS(rid) }, 3000)
    }
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'message') {
        setMessages(prev => {
          if (prev.find(m => m.id === data.id)) return prev
          return [...prev, data]
        })
        if (data.sender_role === 'admin') setUnread(u => u + 1)
      }
    }
  }

  useEffect(() => {
    if (!open || !isAuthenticated || user?.role === 'admin') return
    let cancelled = false
    const init = async () => {
      try {
        const { data: room } = await api.get('/chat/room')
        const { data: msgs } = await api.get('/chat/room/messages')
        if (cancelled) return
        setRoomId(room.room_id)
        roomIdRef.current = room.room_id
        setUnread(room.unread_user)
        setMessages(msgs)
        connectWS(room.room_id)
      } catch {}
    }
    init()
    return () => {
      cancelled = true
      wsRef.current?.close()
      wsRef.current = null
      setConnected(false)
    }
  }, [open])

  useEffect(() => {
    if (open && !minimized) {
      setUnread(0)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open, minimized])

  if (!isAuthenticated || user?.role === 'admin') return null

  const sendMessage = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')

    // ส่งผ่าน WebSocket ถ้าต่ออยู่
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message: text }))
      return
    }

    // fallback: ส่งผ่าน REST แทน แล้ว optimistic update
    const rid = roomIdRef.current
    if (!rid) return
    try {
      await api.post(`/chat/room/messages`, { room_id: rid, message: text })
      const { data: msgs } = await api.get('/chat/room/messages')
      setMessages(msgs)
    } catch {}
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 flex flex-col transition-all ${minimized ? 'h-14' : 'h-[480px]'}`}>
          <div className="flex items-center justify-between px-4 py-3 bg-primary-600 rounded-t-2xl text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
              <span className="font-semibold text-sm">แชทกับเรา</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setMinimized(m => !m)} className="hover:bg-primary-500 rounded p-0.5">
                <Minimize2 size={14} />
              </button>
              <button onClick={() => setOpen(false)} className="hover:bg-primary-500 rounded p-0.5">
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm pt-8">
                    <MessageCircle size={32} className="mx-auto mb-2 text-gray-300" />
                    <p>สวัสดีครับ! มีอะไรให้ช่วยไหม?</p>
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_role === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      msg.sender_role === 'customer'
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      <p className="leading-snug">{msg.message}</p>
                      <p className={`text-[10px] mt-0.5 ${msg.sender_role === 'customer' ? 'text-primary-200' : 'text-gray-400'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-gray-100 flex gap-2 shrink-0">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={connected ? 'พิมพ์ข้อความ...' : 'กำลังเชื่อมต่อ...'}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
                />
                {/* ปุ่ม disable เฉพาะตอนไม่มี input เท่านั้น */}
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="bg-primary-600 text-white rounded-xl px-3 py-2 hover:bg-primary-700 transition disabled:opacity-40"
                >
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => { setOpen(o => !o); setUnread(0); setMinimized(false) }}
        className="w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition flex items-center justify-center relative"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  )
}