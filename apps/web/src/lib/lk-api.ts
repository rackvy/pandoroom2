const API_ROOT = process.env.NEXT_PUBLIC_API_URL?.replace('/api/public', '') || 'http://localhost:3001'

export const LK_API_BASE = `${API_ROOT}/api/lk`

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('lk_token')
}

export async function lkFetch(endpoint: string, options?: RequestInit) {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${LK_API_BASE}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `API Error: ${res.status}`)
  }

  return res.json()
}

// Chat types
export interface ChatMessage {
  id: string
  clientId: string
  bookingId: string | null
  sender: 'client' | 'admin' | 'system'
  text: string
  isRead: boolean
  createdAt: string
  booking?: {
    id: string
    eventDate: string
    clientName: string
    status: string
  } | null
}

export interface ClientBooking {
  id: string
  eventDate: string
  clientName: string
  clientPhone: string
  status: string
  depositRub: number
  commentClient: string | null
  branch: { name: string }
  questReservations: {
    id: string
    quest: { name: string; previewImage?: { url: string } | null }
    startTime: string
    endTime: string
  }[]
}

export interface ClientQuestReservation {
  id: string
  eventDate: string
  startTime: string
  endTime: string
  status: string
  quest: {
    name: string
    previewImage?: { url: string } | null
  }
  branch: { name: string }
}

export interface ClientProfile {
  id: string
  phone: string
  name: string
  email: string | null
  birthday: string | null
  bookings: ClientBooking[]
  questReservations: ClientQuestReservation[]
}
