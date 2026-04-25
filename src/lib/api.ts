import axios from 'axios'

// ✅ เก็บ access token ทั้งใน memory และ localStorage
let _accessToken: string | null = null

export const setAccessToken = (token: string | null) => {
  _accessToken = token
  if (token) {
    localStorage.setItem('access_token', token)
  } else {
    localStorage.removeItem('access_token')
  }
}

export const getAccessToken = () => {
  // ถ้าใน memory ไม่มี ให้ลองดึงจาก localStorage
  if (!_accessToken) {
    _accessToken = localStorage.getItem('access_token')
  }
  return _accessToken
}

// ✅ Queue system สำหรับ requests ที่รอ refresh token
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Attach access token จาก memory หรือ localStorage
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh เมื่อ 401 (พร้อม queue)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // ✅ ถ้ากำลัง refresh อยู่ ให้ queue request นี้
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        
        // ✅ ใช้ refresh token จาก localStorage หรือ cookie
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          refreshToken ? { refresh_token: refreshToken } : {},
          { withCredentials: true }
        )
        
        const newAccessToken = data.access_token
        setAccessToken(newAccessToken)
        
        // ✅ ถ้ามี refresh token ใหม่ให้เก็บด้วย
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token)
        }
        
        // ✅ Process queue ทั้งหมด
        processQueue(null, newAccessToken)
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as Error, null)
        setAccessToken(null)
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api