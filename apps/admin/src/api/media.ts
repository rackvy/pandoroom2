import api from '../lib/axios';

export interface Media {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export async function uploadMedia(file: File): Promise<Media> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/api/admin/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function getMediaList(): Promise<Media[]> {
  const response = await api.get('/api/admin/media');
  return response.data;
}

export async function deleteMedia(id: string): Promise<void> {
  await api.delete(`/api/admin/media/${id}`);
}
