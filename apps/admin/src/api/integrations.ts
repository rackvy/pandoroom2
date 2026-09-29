import api from '../lib/axios';

export type IntegrationProvider =
  | 'tbank'
  | 'zvonok'
  | 'whatsapp'
  | 'yandex_disk'
  | 'google_calendar';

export interface IntegrationField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'bool';
  hint?: string;
  isSecret: boolean;
  source: 'db' | 'env' | 'none';
  value: string;
  secretLength: number | null;
}

export interface IntegrationGroup {
  provider: IntegrationProvider;
  label: string;
  note?: string;
  fields: IntegrationField[];
}

export interface ZvonokCampaign {
  id: string;
  name: string;
  type: string | null;
  isActive: boolean | null;
}

export interface ZvonokStatus {
  configured: boolean;
  publicKeySet: boolean;
  callCampaignId: string | null;
  smsCampaignId: string | null;
  balance: string | null;
  campaigns: ZvonokCampaign[];
  error: string | null;
}

export const getIntegrations = async (): Promise<IntegrationGroup[]> => {
  const response = await api.get('/api/admin/integrations');
  return response.data.integrations;
};

export const patchIntegration = async (
  provider: IntegrationProvider,
  fields: Record<string, string>,
): Promise<IntegrationGroup> => {
  const response = await api.patch(`/api/admin/integrations/${provider}`, { fields });
  return response.data;
};

export const getZvonokStatus = async (): Promise<ZvonokStatus> => {
  const response = await api.get('/api/admin/zvonok/status');
  return response.data;
};
