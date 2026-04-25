import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, CartItem, Product } from '@/types'
import { setAccessToken, getAccessToken } from '@/lib/api'

// ─── Auth Store ───────────────────────────────────────────
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User) => void
  setAuth: (user: User, accessToken: string, refreshToken?: string) => void
  restoreToken: () => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      setUser: (user) => set({ user, isAuthenticated: true }),
      
      setAuth: (user, accessToken, refreshToken) => {
        setAccessToken(accessToken)
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken)
        }
        set({ user, isAuthenticated: true, isLoading: false })
      },
      
      restoreToken: async () => {
        // token restore start
        
        // ✅ ดึง token จาก localStorage
        const accessToken = localStorage.getItem('access_token')
        const refreshToken = localStorage.getItem('refresh_token')
        
        if (!accessToken && !refreshToken) {
          // no tokens found
          set({ isLoading: false, isAuthenticated: false })
          return false
        }
        
        // ✅ ถ้ามี access token ให้ลองใช้
        if (accessToken) {
          setAccessToken(accessToken)
          set({ isLoading: false, isAuthenticated: true })
          // token restored
          return true
        }
        
        // ✅ ถ้ามีแต่ refresh token ให้ลอง refresh
        if (refreshToken) {
          // attempting refresh
          try {
            const { default: api } = await import('@/lib/api')
            const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken })
            
            setAccessToken(data.access_token)
            if (data.refresh_token) {
              localStorage.setItem('refresh_token', data.refresh_token)
            }
            
            set({ isLoading: false, isAuthenticated: true })
            // token refreshed
            return true
          } catch (error) {
            console.error('❌ Refresh failed:', error)
            localStorage.removeItem('refresh_token')
            setAccessToken(null)
            set({ isLoading: false, isAuthenticated: false })
            return false
          }
        }
        
        set({ isLoading: false, isAuthenticated: false })
        return false
      },
      
      logout: () => {
        setAccessToken(null)
        localStorage.removeItem('refresh_token')
        set({ user: null, isAuthenticated: false, isLoading: false })
        window.location.href = '/login'
      },
    }),
    { 
      name: 'auth-store', 
      partialize: (s) => ({ 
        user: s.user, 
        isAuthenticated: s.isAuthenticated 
      }) 
    }
  )
)

// ─── Cart Store ───────────────────────────────────────────
// (ส่วนนี้ไม่เปลี่ยนแปลง)
interface CartState {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) }
                  : i
              ),
            }
          }
          return { items: [...state.items, { product, quantity }] }
        })
      },
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) })),
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        }))
      },
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'cart-store' }
  )
)