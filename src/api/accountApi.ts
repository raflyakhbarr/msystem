import apiClient from './axiosConfig';

const ENDPOINT_ACC = import.meta.env.VITE_API_ACC_ENDPOINT;
const ENDPOINT_ACC_SAVE = import.meta.env.VITE_API_ACC_SAVE;

export type AccountItem = {
  id?: number;
  nipp?: string;
  username?: string;
  email?: string;
  [key: string]: any;
};

interface ApiResponse<T> {
  data?: T;
  message?: string;
  status?: string;
  [key: string]: any;
}

export const fetchAccounts = async (): Promise<AccountItem[]> => {
  try {
    const response = await apiClient.get(ENDPOINT_ACC);
    const apiResponse: ApiResponse<AccountItem[]> = response.data;

    if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
      return [];
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in fetchAccounts:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const saveAccount = async (accountData: AccountItem): Promise<AccountItem> => {
  try {
    const response = await apiClient.post(ENDPOINT_ACC_SAVE, accountData);
    const apiResponse: ApiResponse<AccountItem> = response.data;

    if (!apiResponse.data) {
      throw new Error('Failed to save account');
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in saveAccount:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};