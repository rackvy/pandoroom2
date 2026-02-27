import api from '../lib/axios';

// ==================== NEWS ====================

export interface News {
  id: string;
  title: string;
  date: string;
  imageId: string | null;
  content: string;
  image?: {
    id: string;
    url: string;
  } | null;
}

export interface CreateNewsData {
  title: string;
  date: string;
  imageId?: string | null;
  content: string;
}

export type UpdateNewsData = Partial<CreateNewsData>;

export async function getNews(): Promise<News[]> {
  const response = await api.get('/api/admin/content/news');
  return response.data;
}

export async function getNewsItem(id: string): Promise<News> {
  const response = await api.get(`/api/admin/content/news/${id}`);
  return response.data;
}

export async function createNews(data: CreateNewsData): Promise<News> {
  const response = await api.post('/api/admin/content/news', data);
  return response.data;
}

export async function updateNews(id: string, data: UpdateNewsData): Promise<News> {
  const response = await api.patch(`/api/admin/content/news/${id}`, data);
  return response.data;
}

export async function deleteNews(id: string): Promise<void> {
  await api.delete(`/api/admin/content/news/${id}`);
}

// ==================== REVIEWS ====================

export interface ReviewSource {
  id: string;
  name: string;
  iconId: string | null;
  icon?: {
    id: string;
    url: string;
  } | null;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  sourceId: string;
  text: string;
  source?: ReviewSource;
}

export interface CreateReviewData {
  name: string;
  rating: number;
  sourceId: string;
  text: string;
}

export type UpdateReviewData = Partial<CreateReviewData>;

export async function getReviewSources(): Promise<ReviewSource[]> {
  const response = await api.get('/api/admin/content/review-sources');
  return response.data;
}

export async function getReviews(): Promise<Review[]> {
  const response = await api.get('/api/admin/content/reviews');
  return response.data;
}

export async function getReview(id: string): Promise<Review> {
  const response = await api.get(`/api/admin/content/reviews/${id}`);
  return response.data;
}

export async function createReview(data: CreateReviewData): Promise<Review> {
  const response = await api.post('/api/admin/content/reviews', data);
  return response.data;
}

export async function updateReview(id: string, data: UpdateReviewData): Promise<Review> {
  const response = await api.patch(`/api/admin/content/reviews/${id}`, data);
  return response.data;
}

export async function deleteReview(id: string): Promise<void> {
  await api.delete(`/api/admin/content/reviews/${id}`);
}

// ==================== ABOUT FACTS ====================

export interface AboutFact {
  id: string;
  iconId: string | null;
  text: string;
  sortOrder: number;
  icon?: {
    id: string;
    url: string;
  } | null;
}

export interface CreateAboutFactData {
  iconId?: string | null;
  text: string;
  sortOrder?: number;
}

export type UpdateAboutFactData = Partial<CreateAboutFactData>;

export async function getAboutFacts(): Promise<AboutFact[]> {
  const response = await api.get('/api/admin/content/about-facts');
  return response.data;
}

export async function createAboutFact(data: CreateAboutFactData): Promise<AboutFact> {
  const response = await api.post('/api/admin/content/about-facts', data);
  return response.data;
}

export async function updateAboutFact(id: string, data: UpdateAboutFactData): Promise<AboutFact> {
  const response = await api.patch(`/api/admin/content/about-facts/${id}`, data);
  return response.data;
}

export async function deleteAboutFact(id: string): Promise<void> {
  await api.delete(`/api/admin/content/about-facts/${id}`);
}

// ==================== SUPPLIERS ====================

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  whatsapp: string | null;
  telegram: string | null;
  email: string | null;
  requisites: string | null;
}

export interface CreateSupplierData {
  name: string;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  email?: string;
  requisites?: string;
}

export type UpdateSupplierData = Partial<CreateSupplierData>;

export async function getSuppliers(): Promise<Supplier[]> {
  const response = await api.get('/api/admin/catalog/suppliers');
  return response.data;
}

export async function getSupplier(id: string): Promise<Supplier> {
  const response = await api.get(`/api/admin/catalog/suppliers/${id}`);
  return response.data;
}

export async function createSupplier(data: CreateSupplierData): Promise<Supplier> {
  const response = await api.post('/api/admin/catalog/suppliers', data);
  return response.data;
}

export async function updateSupplier(id: string, data: UpdateSupplierData): Promise<Supplier> {
  const response = await api.patch(`/api/admin/catalog/suppliers/${id}`, data);
  return response.data;
}

export async function deleteSupplier(id: string): Promise<void> {
  await api.delete(`/api/admin/catalog/suppliers/${id}`);
}

// ==================== CAKES ====================

export interface Cake {
  id: string;
  imageId: string | null;
  name: string;
  priceRub: number;
  weightGrams: number;
  supplierId: string | null;
  image?: {
    id: string;
    url: string;
  } | null;
  supplier?: Supplier | null;
}

export interface CreateCakeData {
  imageId?: string | null;
  name: string;
  priceRub: number;
  weightGrams: number;
  supplierId?: string | null;
}

export type UpdateCakeData = Partial<CreateCakeData>;

export async function getCakes(): Promise<Cake[]> {
  const response = await api.get('/api/admin/catalog/cakes');
  return response.data;
}

export async function getCake(id: string): Promise<Cake> {
  const response = await api.get(`/api/admin/catalog/cakes/${id}`);
  return response.data;
}

export async function createCake(data: CreateCakeData): Promise<Cake> {
  const response = await api.post('/api/admin/catalog/cakes', data);
  return response.data;
}

export async function updateCake(id: string, data: UpdateCakeData): Promise<Cake> {
  const response = await api.patch(`/api/admin/catalog/cakes/${id}`, data);
  return response.data;
}

export async function deleteCake(id: string): Promise<void> {
  await api.delete(`/api/admin/catalog/cakes/${id}`);
}

// ==================== SHOW PROGRAMS ====================

export interface ShowProgram {
  id: string;
  imageId: string | null;
  name: string;
  priceRub: number;
  supplierId: string | null;
  image?: {
    id: string;
    url: string;
  } | null;
  supplier?: Supplier | null;
}

export interface CreateShowProgramData {
  imageId?: string | null;
  name: string;
  priceRub: number;
  supplierId?: string | null;
}

export type UpdateShowProgramData = Partial<CreateShowProgramData>;

export async function getShowPrograms(): Promise<ShowProgram[]> {
  const response = await api.get('/api/admin/catalog/show-programs');
  return response.data;
}

export async function getShowProgram(id: string): Promise<ShowProgram> {
  const response = await api.get(`/api/admin/catalog/show-programs/${id}`);
  return response.data;
}

export async function createShowProgram(data: CreateShowProgramData): Promise<ShowProgram> {
  const response = await api.post('/api/admin/catalog/show-programs', data);
  return response.data;
}

export async function updateShowProgram(id: string, data: UpdateShowProgramData): Promise<ShowProgram> {
  const response = await api.patch(`/api/admin/catalog/show-programs/${id}`, data);
  return response.data;
}

export async function deleteShowProgram(id: string): Promise<void> {
  await api.delete(`/api/admin/catalog/show-programs/${id}`);
}

// ==================== DECORATIONS ====================

export interface Decoration {
  id: string;
  imageId: string | null;
  name: string;
  priceRub: number;
  image?: {
    id: string;
    url: string;
  } | null;
}

export interface CreateDecorationData {
  imageId?: string | null;
  name: string;
  priceRub: number;
}

export type UpdateDecorationData = Partial<CreateDecorationData>;

export async function getDecorations(): Promise<Decoration[]> {
  const response = await api.get('/api/admin/catalog/decorations');
  return response.data;
}

export async function getDecoration(id: string): Promise<Decoration> {
  const response = await api.get(`/api/admin/catalog/decorations/${id}`);
  return response.data;
}

export async function createDecoration(data: CreateDecorationData): Promise<Decoration> {
  const response = await api.post('/api/admin/catalog/decorations', data);
  return response.data;
}

export async function updateDecoration(id: string, data: UpdateDecorationData): Promise<Decoration> {
  const response = await api.patch(`/api/admin/catalog/decorations/${id}`, data);
  return response.data;
}

export async function deleteDecoration(id: string): Promise<void> {
  await api.delete(`/api/admin/catalog/decorations/${id}`);
}

// ==================== PAGE BLOCKS ====================

export type PageKey = 'HOME' | 'PARTY_GUIDE' | 'PARTY_GUIDE_KIDS' | 'PARTY_GUIDE_6_10' | 'PARTY_GUIDE_10_15' | 'CAFE' | 'CAFE_KAFE' | 'CAFE_LOUNGE' | 'CAFE_KIDS';

export interface PageBlock {
  id: string;
  pageKey: PageKey;
  blockKey: string;
  title: string | null;
  text: string | null;
  linkUrl: string | null;
  fileId: string | null;
  imageId: string | null;
  extraJson: any;
  sortOrder: number;
  file?: {
    id: string;
    url: string;
  } | null;
  image?: {
    id: string;
    url: string;
  } | null;
}

export interface CreatePageBlockData {
  pageKey: PageKey;
  blockKey: string;
  title?: string;
  text?: string;
  linkUrl?: string;
  fileId?: string | null;
  imageId?: string | null;
  extraJson?: any;
  sortOrder?: number;
}

export type UpdatePageBlockData = Partial<CreatePageBlockData>;

export async function getPageBlocks(pageKey: PageKey): Promise<PageBlock[]> {
  const response = await api.get(`/api/admin/content/page-blocks?pageKey=${pageKey}`);
  return response.data;
}

export async function getPageBlock(id: string): Promise<PageBlock> {
  const response = await api.get(`/api/admin/content/page-blocks/${id}`);
  return response.data;
}

export async function createPageBlock(data: CreatePageBlockData): Promise<PageBlock> {
  const response = await api.post('/api/admin/content/page-blocks', data);
  return response.data;
}

export async function updatePageBlock(id: string, data: UpdatePageBlockData): Promise<PageBlock> {
  const response = await api.patch(`/api/admin/content/page-blocks/${id}`, data);
  return response.data;
}

export async function deletePageBlock(id: string): Promise<void> {
  await api.delete(`/api/admin/content/page-blocks/${id}`);
}
