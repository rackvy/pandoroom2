import api from '../lib/axios';

export interface Client {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    bookings: number;
    questReservations: number;
  };
}

export interface ClientWithHistory extends Client {
  bookings: {
    id: string;
    eventDate: string;
    status: string;
    branch: { name: string };
    tableReservations: {
      id: string;
      table: { title: string; zone: { name: string } };
      startTime: string;
      endTime: string;
    }[];
    questReservations: {
      id: string;
      quest: { name: string };
      startTime: string;
      endTime: string;
    }[];
  }[];
  questReservations: {
    id: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    status: string;
    quest: { name: string };
    branch: { name: string };
  }[];
}

export interface CreateClientData {
  phone: string;
  name: string;
  email?: string;
  birthday?: string;
  notes?: string;
}

export interface UpdateClientData {
  phone?: string;
  name?: string;
  email?: string;
  birthday?: string;
  notes?: string;
}

export const getClients = async (search?: string): Promise<Client[]> => {
  const params = search ? { search } : {};
  const response = await api.get('/api/admin/clients', { params });
  return response.data;
};

export const getClient = async (id: string): Promise<ClientWithHistory> => {
  const response = await api.get(`/api/admin/clients/${id}`);
  return response.data;
};

export const getClientByPhone = async (phone: string): Promise<Client | null> => {
  const response = await api.get(`/api/admin/clients/by-phone/${phone}`);
  return response.data;
};

export const createClient = async (data: CreateClientData): Promise<Client> => {
  const response = await api.post('/api/admin/clients', data);
  return response.data;
};

export const updateClient = async (id: string, data: UpdateClientData): Promise<Client> => {
  const response = await api.patch(`/api/admin/clients/${id}`, data);
  return response.data;
};

export const deleteClient = async (id: string): Promise<void> => {
  await api.delete(`/api/admin/clients/${id}`);
};
