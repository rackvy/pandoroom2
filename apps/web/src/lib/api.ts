export const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/public'

export async function fetchApi(endpoint: string) {
  const res = await fetch(`${BASE_API_URL}${endpoint}`, {
    cache: 'no-store',
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
  difficulty?: string | null
  difficultyIcon?: string | null
  hasActors: boolean
  ageRestriction?: string | null
  durationMinutes: number
  minPlayers: number
  maxPlayers: number
  maxExtraPlayers: number
  address?: string | null
  extraPlayerPrice: number
  allowAnimator: boolean
  animatorPrice: number
  previewImage?: { id: string; url: string; altText?: string | null } | null
  backgroundImage?: { id: string; url: string; altText?: string | null } | null
}

export interface QuestGalleryPhoto {
  id: string
  sortOrder: number
  image: { id: string; url: string; altText?: string | null }
}

export interface ContentSection {
  title: string
  text: string
}

export interface QuestDetail extends Quest {
  description?: string | null
  rules?: string | null
  safety?: string | null
  extraServices?: string | null
  contentSections?: ContentSection[] | null
  galleryPhotos: QuestGalleryPhoto[]
  branch: { id: string; name: string; address?: string | null; geoLat?: number | null; geoLng?: number | null }
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
  schemaJson?: string | null
}

export interface VRGame {
  id: string
  name: string
  subtitle?: string | null
  genre?: string | null
  difficulty?: string | null
  difficultyIcon?: string | null
  ageRestriction?: string | null
  durationMinutes?: number | null
  minPlayers: number
  maxPlayers: number
  previewImage?: { id: string; url: string; altText?: string | null } | null
  backgroundImage?: { id: string; url: string; altText?: string | null } | null
  video?: { id: string; url: string; mimeType?: string | null } | null
  branch?: { id: string; name: string; address?: string | null; geoLat?: number | null; geoLng?: number | null } | null
}

export interface VRGameDetail extends VRGame {
  description?: string | null
  contentSections?: ContentSection[] | null
  galleryPhotos: QuestGalleryPhoto[]
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
  schemaJson?: string | null
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
  image?: { id: string; url: string; altText?: string | null } | null
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
  schemaJson?: string | null
}

export interface BlogItem {
  id: string
  title: string
  date: string
  content: string
  excerpt?: string | null
  cardBg?: string | null
  image?: { id: string; url: string; altText?: string | null } | null
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
  schemaJson?: string | null
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
  image?: { id: string; url: string; altText?: string | null } | null
  extraJson?: any
  sortOrder: number
}

export interface Branch {
  id: string
  name: string
  address: string
  phone?: string | null
  email?: string | null
  whatsapp?: string | null
  telegram?: string | null
  max?: string | null
  workingHours?: string | null
  geoLat?: number | null
  geoLng?: number | null
}

export interface AboutFact {
  id: string
  icon?: string | null
  text: string
  sortOrder: number
}

export interface TablePublic {
  id: string
  title: string
  capacity?: number | null
}

export interface TableZonePublic {
  id: string
  branchId: string
  key: 'CAFE' | 'LOUNGE' | 'KIDS'
  name: string
  tables: TablePublic[]
}

export interface IikoMenuItemPublic {
  id: string
  name: string
  description?: string | null
  category: string
  price: number | null
  imageUrl?: string | null
  weight?: string | null
}
