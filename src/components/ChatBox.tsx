import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageCircle, Send, X, ChevronDown } from 'lucide-react'
import { getAccessToken } from '@/lib/api'
import toast from 'react-hot-toast'

interface ChatMsg {
  id: string
  role: 'customer' | 'admin'
  message: string
  sender_name: string
  created_at: string
  is_read: boolean
}

interface Props {
  orderId: string
  orderNumber: string
  myRole: 'customer' | 'admin'
  defaultOpen?: boolean
}

const WS_BASE = (import.meta.env.VITE_API_URL as string)
  .replace(/^http/, 'ws')
  .replace('/api/v1', '')

export default function ChatBox({ orderId, orderNumber, myRole, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [unread, setUnread] = useState(0)
  const [isSending, setIsSending] = useState(false) // ✅ ป้องกันการส่งซ้ำ
  
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null) // ✅ สำหรับ reconnect
  const isConnectingRef = useRef(false) // ✅ ป้องกัน connect ซ้ำ

  const connect = useCallback(() => {
    // ✅ ป้องกันการเชื่อมต่อซ้ำ
    if (isConnectingRef.current) return
    
    const token = getAccessToken()
    if (!token || !orderId) return

    // ✅ ปิด connection เดิมถ้ามี
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    isConnectingRef.current = true
    const url = `${WS_BASE}/api/v1/chat/ws/${orderId}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      // ส่ง token ใน first message แทนการใส่ใน URL เพื่อไม่ให้ถูกบันทึกใน server log
      ws.send(JSON.stringify({ type: 'auth', token }))
      setConnected(true)
      isConnectingRef.current = false
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'history') {
          setMessages(data.messages)
        } else if (data.type === 'message') {
          setMessages(prev => [...prev, data])
          if (!open && data.role !== myRole) {
            setUnread(n => n + 1)
          }
        }
      } catch (error) {
        console.error('Failed to parse message:', error)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      isConnectingRef.current = false
      
      // ✅ clear timeout ก่อนตั้งค่าใหม่
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      // reconnect หลัง 5 วินาที (เพิ่มจาก 3 เป็น 5)
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          connect()
        }
      }, 5000)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      ws.close()
    }
  }, [orderId, myRole, open])

  useEffect(() => {
    connect()
    
    return () => {
      // ✅ cleanup ทั้งหมด
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      isConnectingRef.current = false
    }
  }, [connect])

  useEffect(() => {
    if (open) {
      setUnread(0)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [open, messages])

  // ✅ ฟังก์ชันส่งข้อความพร้อมป้องกันซ้ำ
  const send = useCallback(() => {
    const text = input.trim()
    
    // ✅ ป้องกันการส่งซ้ำ
    if (!text || isSending) {
      if (isSending) {
        toast.error('กำลังส่งข้อความ กรุณารอสักครู่')
      }
      return
    }
    
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('ไม่สามารถส่งข้อความได้ กรุณาลองใหม่')
      return
    }
    
    setIsSending(true)
    
    try {
      wsRef.current.send(JSON.stringify({ message: text }))
      setInput('')
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการส่งข้อความ')
      console.error('Send error:', error)
    } finally {
      // ✅ รอ 1 วินาทีก่อนให้ส่งใหม่ (debounce)
      setTimeout(() => {
        setIsSending(false)
      }, 1000)
    }
  }, [input, isSending])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isSending) {
      e.preventDefault()
      send()
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={myRole === 'customer' ? 'fixed bottom-6 right-6 z-40' : 'relative'}>

      {/* Bubble toggle — customer only */}
      {myRole === 'customer' && !open && (
        <button onClick={() => setOpen(true)}
          className="relative bg-primary-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 transition">
          <MessageCircle size={24} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {(open || myRole === 'admin') && (
        <div className={`
          bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden
          ${myRole === 'customer' ? 'fixed bottom-24 right-6 w-80 h-[420px] z-40' : 'w-full h-[480px]'}
        `}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} />
              <span className="text-sm font-semibold">แชท #{orderNumber}</span>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-300' : 'bg-gray-400'}`} />
            </div>
            {myRole === 'customer' && (
              <button onClick={() => setOpen(false)} className="hover:opacity-75">
                <ChevronDown size={18} />
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                <MessageCircle size={32} className="opacity-30" />
                <p>ยังไม่มีข้อความ</p>
                <p className="text-xs">เริ่มสนทนาได้เลย</p>
              </div>
            )}
            {messages.map((msg, index) => {
              const isMe = msg.role === myRole
              // ✅ เพิ่ม key ที่มั่นใจว่าไม่ซ้ำ
              const uniqueKey = `${msg.id}-${index}`
              return (
                <div key={uniqueKey} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-[10px] text-gray-400 mb-0.5 px-1">{msg.sender_name}</span>
                  )}
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 px-1">{formatTime(msg.created_at)}</span>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="พิมพ์ข้อความ..."
              disabled={isSending || !connected}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary-400 disabled:bg-gray-50"
            />
            <button 
              onClick={send} 
              disabled={!input.trim() || !connected || isSending}
              className="bg-primary-600 text-white w-9 h-9 rounded-xl flex items-center justify-center hover:bg-primary-700 transition disabled:opacity-40 shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}