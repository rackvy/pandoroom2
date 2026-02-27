const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function getMediaUrl(url: string | null | undefined): string {
  if (!url) return '/placeholder.png';
  
  // If URL is already absolute, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If URL starts with /, prepend API base URL
  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`;
  }
  
  // Otherwise, add / prefix and prepend API base URL
  return `${API_BASE_URL}/${url}`;
}
