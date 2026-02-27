export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  duration: number;
  maxPlayers: number;
  minPlayers: number;
  difficulty: DifficultyLevel;
  price: number;
  isActive: boolean;
}

export interface Booking {
  id: string;
  userId: string;
  questId?: string;
  type: BookingType;
  date: Date;
  time: string;
  guestsCount: number;
  status: BookingStatus;
  totalPrice: number;
  comment?: string;
  createdAt: Date;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  location: string;
  isActive: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  publishedAt: Date;
  isPublished: boolean;
}

export interface Review {
  id: string;
  userName: string;
  rating: number;
  text: string;
  questId?: string;
  isApproved: boolean;
  createdAt: Date;
}

export type UserRole = 'admin' | 'manager' | 'staff';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';
export type BookingType = 'quest' | 'cafe';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
