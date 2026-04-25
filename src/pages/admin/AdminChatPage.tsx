import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send, Circle } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store'

type Room = {
  room_id: string
  status: string
  unread_admin: number
  last_message: string | null
  last_message_at: string | null
  user: { id: string; name: string; email: string }
}

type Msg = {
  id: string
  room_id: string
  sender_role: 'admin' | 'customer'
  message: string
  created_at: string
  is_read: boolean
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  return isToday
    ? d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) +
        ' ' +
        d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

const getToken = () =>
  (api.defaults.headers.common['Authorization'] as string)?.replace('Bearer ', '') ?? ''

function getWebSocketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws'
  return apiUrl.replace(/^https?:\/\//, `${wsProtocol}://`)
}

export default function AdminChatPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [sending, setSending] = useState(false)

  const wsRoomRef = useRef<WebSocket | null>(null)
  const wsGlobalRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ✅ Use a ref so the global WS handler always sees the latest selectedRoom
  // without needing to be re-created on every room change
  const selectedRoomRef = useRef<Room | null>(null)
  selectedRoomRef.current = selectedRoom

  const MAX_RECONNECT = 5

  // ── Fetch rooms ───────────────────────────────────────────────────────────
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['admin-chat-rooms'],
    queryFn: async () => {
      const { data } = await api.get('/chat/admin/rooms')
      return data
    },
    refetchInterval: 10_000,
  })

  const totalUnread = useMemo(
    () => rooms.reduce((s, r) => s + (r.unread_admin || 0), 0),
    [rooms]
  )

  // ── Global WS — notification for all rooms ────────────────────────────────
  // ✅ No longer depends on selectedRoom — uses the ref instead
  useEffect(() => {
    const token = getToken()
    if (!token) return

    const ws = new WebSocket(`${getWebSocketUrl()}/chat/ws/admin`)
    wsGlobalRef.current = ws

    ws.onopen = () => {
      // ส่ง token ใน first message แทนการใส่ใน URL เพื่อไม่ให้ถูกบันทึกใน server log
      ws.send(JSON.stringify({ type: 'auth', token }))
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'new_message') {
          qc.invalidateQueries({ queryKey: ['admin-chat-rooms'] })
          // Append to current room messages if it matches
          if (selectedRoomRef.current?.room_id === data.room_id) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === data.id)) return prev
              return [...prev, data]
            })
          }
        }
      } catch (err) {
        console.error('Failed to parse global WS message:', err)
      }
    }

    ws.onerror = (err) => console.error('Global WebSocket error:', err)

    return () => ws.close()
  }, [qc]) // ✅ stable dependency — only runs once

  // ── Open room ─────────────────────────────────────────────────────────────
  const openRoom = async (room: Room) => {
    // Close existing room WS
    if (wsRoomRef.current) {
      wsRoomRef.current.close()
      wsRoomRef.current = null
    }
    // Cancel any pending reconnect
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    setConnected(false)
    reconnectAttemptsRef.current = 0
    setSelectedRoom(room)
    setMessages([])

    // Load history
    try {
      const { data: msgs } = await api.get(`/chat/admin/rooms/${room.room_id}/messages`)
      setMessages(msgs)
    } catch (err) {
      console.error('Failed to load messages:', err)
    }

    // ✅ Mark as read once here — removed the duplicate useEffect below
    try {
      await api.post(`/chat/admin/rooms/${room.room_id}/read`)
      qc.invalidateQueries({ queryKey: ['admin-chat-rooms'] })
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }

    connectRoomWs(room)
  }

  const connectRoomWs = (room: Room) => {
    const token = getToken()
    if (!token) return

    const ws = new WebSocket(
      `${getWebSocketUrl()}/chat/ws/admin/room/${room.room_id}`
    )
    wsRoomRef.current = ws

    ws.onopen = () => {
      // ส่ง token ใน first message แทนการใส่ใน URL เพื่อไม่ให้ถูกบันทึกใน server log
      ws.send(JSON.stringify({ type: 'auth', token }))
      setConnected(true)
      reconnectAttemptsRef.current = 0
    }

    ws.onclose = () => {
      setConnected(false)
      // ✅ Guard: only reconnect if this WS is still the active one
      if (wsRoomRef.current !== ws) return
      if (reconnectAttemptsRef.current >= MAX_RECONNECT) return

      reconnectAttemptsRef.current++
      const delay = 3000 * Math.pow(1.5, reconnectAttemptsRef.current - 1)
      reconnectTimerRef.current = setTimeout(() => {
        // Double-check room is still selected and ws is still current
        if (wsRoomRef.current === ws && selectedRoomRef.current?.room_id === room.room_id) {
          connectRoomWs(room)
        }
      }, delay)
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'message') {
          setMessages((prev) => {
            if (prev.find((m) => m.id === data.id)) return prev
            return [...prev, data]
          })
        }
      } catch (err) {
        console.error('Failed to parse room WS message:', err)
      }
    }

    ws.onerror = (err) => console.error('Room WebSocket error:', err)
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)

    if (wsRoomRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRoomRef.current.send(JSON.stringify({ message: text }))
        setInput('')
      } catch (err) {
        console.error('WebSocket send failed, falling back to REST:', err)
        await sendViaRest(text)
      }
    } else {
      await sendViaRest(text)
    }

    setSending(false)
  }

  const sendViaRest = async (text: string) => {
    if (!selectedRoom) return
    try {
      const { data } = await api.post(`/chat/admin/rooms/${selectedRoom.room_id}/messages`, {
        message: text,
      })
      const newMsg: Msg = {
        id: data.id || Date.now().toString(),
        room_id: selectedRoom.room_id,
        sender_role: 'admin',
        message: text,
        created_at: new Date().toISOString(),
        is_read: true,
      }
      setMessages((prev) => [...prev, newMsg])
      setInput('')
      qc.invalidateQueries({ queryKey: ['admin-chat-rooms'] })
    } catch (err) {
      console.error('Failed to send via REST:', err)
      alert('ไม่สามารถส่งข้อความได้ กรุณาลองอีกครั้ง')
    }
  }

  // ── Auto scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      wsRoomRef.current?.close()
      wsGlobalRef.current?.close()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-primary-600" />
            <h1 className="font-bold text-gray-900">แชทลูกค้า</h1>
            {totalUnread > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                {totalUnread}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-12">
              <MessageCircle size={32} className="mx-auto mb-2 text-gray-200" />
              ยังไม่มีแชท
            </div>
          )}
          {rooms.map((room) => (
            <button
              key={room.room_id}
              onClick={() => openRoom(room)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition ${
                selectedRoom?.room_id === room.room_id
                  ? 'bg-primary-50 border-l-2 border-l-primary-500'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-medium text-sm text-gray-900 truncate">{room.user.name}</span>
                {room.last_message_at && (
                  <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                    {formatTime(room.last_message_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 truncate">
                  {room.last_message || 'ยังไม่มีข้อความ'}
                </p>
                {room.unread_admin > 0 && (
                  <span className="shrink-0 ml-2 bg-primary-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {room.unread_admin > 9 ? '9+' : room.unread_admin}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {selectedRoom ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
              {selectedRoom.user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">{selectedRoom.user.name}</p>
              <p className="text-xs text-gray-400">{selectedRoom.user.email}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
              <Circle
                size={8}
                className={connected ? 'text-green-500 fill-green-500' : 'text-gray-300 fill-gray-300'}
              />
              <span>{connected ? 'เชื่อมต่อแล้ว' : 'ใช้ REST แทน'}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-12">
                <MessageCircle size={32} className="mx-auto mb-2 text-gray-200" />
                ยังไม่มีข้อความ พิมพ์ข้อความเพื่อเริ่มแชท
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender_role === 'customer' && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs mr-2 shrink-0 self-end">
                    {selectedRoom.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  className={`max-w-[65%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.sender_role === 'admin'
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                  }`}
                >
                  <p className="leading-snug whitespace-pre-wrap">{msg.message}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      msg.sender_role === 'admin' ? 'text-primary-200' : 'text-gray-400'
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="bg-white border-t border-gray-200 p-4 flex gap-3 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={connected ? 'พิมพ์ข้อความ...' : 'กำลังเชื่อมต่อ... (ข้อความจะส่งผ่าน REST)'}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="bg-primary-600 text-white rounded-xl px-4 py-2.5 hover:bg-primary-700 transition disabled:opacity-40 flex items-center gap-2 text-sm font-medium disabled:cursor-not-allowed"
            >
              <Send size={15} />
              {sending ? 'กำลังส่ง...' : 'ส่ง'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-300 flex-col gap-3">
          <MessageCircle size={48} />
          <p className="text-sm">เลือกห้องแชทจากรายการด้านซ้าย</p>
        </div>
      )}
    </div>
  )
}