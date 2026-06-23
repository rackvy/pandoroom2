export const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/public'

export async function fetchApi(endpoint: string) {
  const res = await fetch(`${BASE_API_URL}${endpoint}`, {
    next: { revalidate: 60 },
  })
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`)
  }
  
  return res.json()
}

// Types
export interface Quest {
  id: string
  name: string
  subtitle?: string | null
  genre: string
  difficulty: 'easy' | 'medium' | 'hard'
  hasActors: boolean
  ageRestriction?: string | null
  durationMinutes: number
  minPlayers: number
  maxPlayers: number
  address: string
  previewImage?: { id: string; url: string } | null
  backgroundImage?: { id: string; url: string } | null
}

export interface NewsItem {
  id: string
  title: string
  date: string
  content: string
  coverTitle?: string | null
  coverSub?: string | null
  coverVariant?: string | null
  cardBg?: string | null
  image?: { id: string; url: string } | null
}

export interface ReviewItem {
  id: string
  name: string
  rating: number
  text: string
  createdAt: string
  source?: { id: string; name: string; icon?: { id: string; url: string } | null } | null
}

export interface PageBlock {
  id: string
  pageKey: string
  blockKey: string
  title?: string | null
  text?: string | null
  linkUrl?: string | null
  image?: { id: string; url: string } | null
  extraJson?: any
  sortOrder: number
}
