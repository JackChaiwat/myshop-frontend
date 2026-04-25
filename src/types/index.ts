export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  role: 'customer' | 'admin'
  is_verified: boolean
  avatar_url?: string
  created_at: string
}

export interface Review {
  id: string
  product_id: string
  user_id: string
  reviewer_name: string
  rating: number
  title?: string
  body?: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  compare_price?: number
  sku?: string
  stock: number
  weight?: number
  images: { url: string; alt: string }[]
  attributes: Record<string, string>
  how_to: { step: number; title: string; desc: string }[]
  is_active: boolean
  is_featured: boolean
  category_id?: string
  created_at: string
  // detail page extras
  avg_rating?: number
  review_count?: number
  sold_count?: number
  reviews?: Review[]
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image_url?: string
  is_active: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Address {
  id: string
  full_name: string
  phone: string
  address_line1: string
  address_line2?: string
  city: string
  province: string
  postal_code: string
  country: string
  is_default: boolean
}

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  product_image?: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface Order {
  id: string
  order_number: string
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  subtotal: number
  shipping_fee: number
  discount: number
  total: number
  shipping_address: Omit<Address, 'id' | 'is_default'>
  payment_url?: string
  qr_code?: string
  tracking_number?: string
  notes?: string
  items: OrderItem[]
  created_at: string
}

export interface PaginatedProducts {
  items: Product[]
  total: number
  page: number
  per_page: number
  total_pages: number
}
