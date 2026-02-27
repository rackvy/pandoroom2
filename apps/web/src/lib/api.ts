export const BASE_API_URL = 'http://localhost:3001/api/public'

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
  description: string
  shortDescription: string
  duration: number
  minPlayers: number
  maxPlayers: number
  minAge: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  isActive: boolean
  branchId: string
  previewImage?: {
    id: string
    url: string
    alt?: string
  }
  branch?: {
    id: string
    name: string
    city: string
  }
}

export interface News {
  id: string
  title: string
  content: string
  excerpt?: string
  isPublished: boolean
  publishedAt?: string
  createdAt: string
  coverImage?: {
    id: string
    url: string
    alt?: string
  }
}

export interface Review {
  id: string
  authorName: string
  content: string
  rating: number
  isPublished: boolean
  createdAt: string
  source?: {
    id: string
    name: string
    icon?: string
  }
}

export interface PageBlock {
  id: string
  pageKey: string
  blockKey: string
  title?: string
  content?: string
  sortOrder: number
  isActive: boolean
  media?: Array<{
    id: string
    url: string
    alt?: string
    sortOrder: number
  }>
}
