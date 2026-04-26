import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { setAccessToken } from '@/lib/api'
import { useAuthStore } from '@/store'
import type { PaginatedProducts, Product, Order, Address } from '@/types'

// ─── Auth ─────────────────────────────────────────────────
export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const { data } = await api.post('/auth/login', body)
      // ✅ เก็บ access token ใน memory แทน localStorage
      setAccessToken(data.access_token)
      return data
    },
    onSuccess: async () => {
      const { data } = await api.get('/auth/me')
      setUser(data)
    },
  })
}

export function useRegister() {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: async (body: { email: string; password: string; full_name: string; phone?: string }) => {
      const { data } = await api.post('/auth/register', body)
      // ✅ เก็บ access token ใน memory แทน localStorage
      setAccessToken(data.access_token)
      return data
    },
    onSuccess: async () => {
      const { data } = await api.get('/auth/me')
      setUser(data)
    },
  })
}

export function useMe() {
  const setUser = useAuthStore((s) => s.setUser)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me')
      setUser(data)
      return data
    },
    // ✅ ใช้ isAuthenticated จาก store แทน localStorage
    enabled: isAuthenticated,
    retry: false,
  })
}

// ─── Products ─────────────────────────────────────────────
export function useProducts(params?: {
  page?: number
  per_page?: number
  category?: string
  min_price?: number
  max_price?: number
  featured?: boolean
  q?: string    
}) {
  return useQuery<PaginatedProducts>({
    queryKey: ['products', params],
    queryFn: async () => {
      const { data } = await api.get('/products', { params })
      return data
    },
  })
}

export function useFeaturedProducts() {
  return useQuery<Product[]>({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data } = await api.get('/products/featured')
      return data
    },
  })
}

export function useProduct(slug: string) {
  return useQuery<Product>({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data } = await api.get(`/products/${slug}`)
      return data
    },
    enabled: !!slug,
  })
}

export function useSearch(q: string) {
  return useQuery<PaginatedProducts>({
    queryKey: ['search', q],
    queryFn: async () => {
      const { data } = await api.get('/products', { params: { q, per_page: 20 } })
      return data
    },
    enabled: q.length >= 2,
  })
}

// ─── Orders ───────────────────────────────────────────────
export function useMyOrders() {
  return useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await api.get('/orders')
      return data
    },
  })
}

export function useOrder(orderId: string) {
  return useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${orderId}`)
      return data
    },
    enabled: !!orderId,
  })
}

export function useCheckout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { items: { product_id: string; quantity: number }[]; address_id: string; notes?: string }) => {
      const { data } = await api.post('/orders/checkout', body)
      return data as Order
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}

// ─── Addresses ────────────────────────────────────────────
export function useAddresses() {
  return useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get('/users/addresses')
      return data
    },
  })
}

export function useCreateAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Omit<Address, 'id'>) => {
      const { data } = await api.post('/users/addresses', body)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  })
}

export function useAddReview(productId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { rating: number; title?: string; body?: string }) => {
      const { data } = await api.post(`/products/${productId}/reviews`, body)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product'] }),
  })
}

// ─── Wishlist ──────────────────────────────────────────────
export function useWishlist() {
  return useQuery<Product[]>({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const { data } = await api.get('/wishlist')
      return data
    },
  })
}

export function useWishlistCheck(productId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<{ in_wishlist: boolean }>({
    queryKey: ['wishlist-check', productId],
    queryFn: async () => {
      const { data } = await api.get(`/wishlist/check/${productId}`)
      return data
    },
    enabled: !!productId && isAuthenticated,
  })
}

export function useToggleWishlist(productId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (inWishlist: boolean) => {
      if (inWishlist) {
        await api.delete(`/wishlist/${productId}`)
      } else {
        await api.post(`/wishlist/${productId}`)
      }
      return !inWishlist
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] })
      qc.invalidateQueries({ queryKey: ['wishlist-check', productId] })
    },
  })
}

// ─── Verification ──────────────────────────────────────────
export function useSendEmailOTP() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/verify/email/send')
      return data
    },
  })
}

export function useConfirmEmailOTP() {
  const { setUser } = useAuthStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post('/verify/email/confirm', { code })
      return data
    },
    onSuccess: async () => {
      const { data } = await api.get('/auth/me')
      setUser(data)
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useSendEmailChangeOTP() {
  return useMutation({
    mutationFn: async (new_email: string) => {
      const { data } = await api.post('/verify/email/change/send', { new_email })
      return data
    },
  })
}

export function useConfirmEmailChange() {
  const { setUser } = useAuthStore()
  return useMutation({
    mutationFn: async (body: { new_email: string; code: string }) => {
      const { data } = await api.post('/verify/email/change/confirm', body)
      return data
    },
    onSuccess: async () => {
      const { data } = await api.get('/auth/me')
      setUser(data)
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (body: { current_password: string; new_password: string }) => {
      const { data } = await api.post('/users/me/change-password', body)
      return data
    },
  })
}

export function useUpdatePhone() {
  const { setUser } = useAuthStore()
  return useMutation({
    mutationFn: async (phone: string) => {
      const { data } = await api.put('/verify/phone', { phone })
      return data
    },
    onSuccess: async () => {
      const { data } = await api.get('/auth/me')
      setUser(data)
    },
  })
}

export function useCategories() {
  return useQuery<{ id: string; name: string; slug: string }[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/products/categories')
      return data
    },
    staleTime: 1000 * 60 * 5,
  })
}