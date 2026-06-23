import api from '../lib/axios';

export interface FoodReportItem {
  name: string;
  totalQuantity: number;
}

export interface FoodReportDepartment {
  key: string;
  name: string;
  items: FoodReportItem[];
  totalItems: number;
}

export interface FoodReport {
  date: string;
  branchId: string | null;
  departments: FoodReportDepartment[];
  totalItems: number;
  totalBookings: number;
}

export const getFoodReport = async (
  date: string,
  branchId?: string,
): Promise<FoodReport> => {
  const params: Record<string, string> = { date };
  if (branchId) params.branchId = branchId;
  const response = await api.get('/api/admin/reports/food', { params });
  return response.data;
};
