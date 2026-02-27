import api from '../lib/axios';

export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  sortOrder: number;
  isActive: boolean;
}

export interface TableZone {
  id: string;
  branchId: string;
  key: 'CAFE' | 'LOUNGE' | 'KIDS';
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Table {
  id: string;
  branchId: string;
  zoneId: string;
  title: string;
  capacity: number | null;
  sortOrder: number;
  isActive: boolean;
}

// Branches
export async function getBranches(): Promise<Branch[]> {
  const response = await api.get('/api/public/branches');
  return response.data;
}

export async function createBranch(data: Omit<Branch, 'id'>): Promise<Branch> {
  const response = await api.post('/api/admin/catalog/branches', data);
  return response.data;
}

export async function updateBranch(id: string, data: Partial<Branch>): Promise<Branch> {
  const response = await api.patch(`/api/admin/catalog/branches/${id}`, data);
  return response.data;
}

export async function deleteBranch(id: string): Promise<void> {
  await api.delete(`/api/admin/catalog/branches/${id}`);
}

// Table Zones
export async function getTableZones(branchId: string): Promise<TableZone[]> {
  const response = await api.get(`/api/admin/catalog/branches/${branchId}/zones`);
  return response.data;
}

export async function createTableZone(data: Omit<TableZone, 'id'>): Promise<TableZone> {
  const response = await api.post('/api/admin/catalog/zones', data);
  return response.data;
}

export async function updateTableZone(id: string, data: Partial<TableZone>): Promise<TableZone> {
  const response = await api.patch(`/api/admin/catalog/zones/${id}`, data);
  return response.data;
}

export async function deleteTableZone(id: string): Promise<void> {
  await api.delete(`/api/admin/catalog/zones/${id}`);
}

// Tables
export async function getTables(branchId: string): Promise<Table[]> {
  const response = await api.get(`/api/admin/catalog/branches/${branchId}/tables`);
  return response.data;
}

export async function createTable(data: Omit<Table, 'id'>): Promise<Table> {
  const response = await api.post('/api/admin/catalog/tables', data);
  return response.data;
}

export async function updateTable(id: string, data: Partial<Table>): Promise<Table> {
  const response = await api.patch(`/api/admin/catalog/tables/${id}`, data);
  return response.data;
}

export async function deleteTable(id: string): Promise<void> {
  await api.delete(`/api/admin/catalog/tables/${id}`);
}

// Quests
export interface QuestGalleryPhoto {
  id: string;
  questId: string;
  imageId: string;
  sortOrder: number;
  image: {
    id: string;
    url: string;
    originalName: string;
  };
}

export interface Quest {
  id: string;
  branchId: string;
  name: string;
  genre: string;
  difficulty: 'easy' | 'medium' | 'hard';
  address: string;
  minPlayers: number;
  maxPlayers: number;
  durationMinutes: number;
  previewImageId: string | null;
  backgroundImageId: string | null;
  description: string;
  rules: string;
  safety: string;
  extraServices: string;
  extraPlayerPrice: number;
  branch: Branch;
  previewImage?: {
    id: string;
    url: string;
  } | null;
  backgroundImage?: {
    id: string;
    url: string;
  } | null;
  galleryPhotos: QuestGalleryPhoto[];
}

export type CreateQuestData = Omit<Quest, 'id' | 'branch' | 'previewImage' | 'backgroundImage' | 'galleryPhotos'> & {
  galleryPhotoIds?: string[];
};

export type UpdateQuestData = Partial<CreateQuestData>;

export async function getQuests(): Promise<Quest[]> {
  const response = await api.get('/api/admin/catalog/quests');
  return response.data;
}

export async function getQuest(id: string): Promise<Quest> {
  const response = await api.get(`/api/admin/catalog/quests/${id}`);
  return response.data;
}

export async function createQuest(data: CreateQuestData): Promise<Quest> {
  const response = await api.post('/api/admin/catalog/quests', data);
  return response.data;
}

export async function updateQuest(id: string, data: UpdateQuestData): Promise<Quest> {
  const response = await api.patch(`/api/admin/catalog/quests/${id}`, data);
  return response.data;
}

export async function deleteQuest(id: string): Promise<void> {
  await api.delete(`/api/admin/catalog/quests/${id}`);
}
