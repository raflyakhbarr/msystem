import apiClient from './axiosConfig';

const ENDPOINT_LIST = import.meta.env.VITE_API_ACC_GROUP_ENDPOINT;
const ENDPOINT_SAVE = import.meta.env.VITE_API_ACC_GROUP_SAVE;

export type AccGroupItem = {
  id?: number;
  namaGroup?: string;
  codeGroup?: string | { id?: number; nama?: string };
  idSistem?: string | number;
  isAdministrator?: boolean;
  status?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

interface ApiResponse<T> {
  data?: T;
  message?: string;
  status?: string;
  [key: string]: any;
}

export const fetchAccGroup = async (): Promise<AccGroupItem[]> => {
  try {
    const response = await apiClient.get(ENDPOINT_LIST);
    const apiResponse: ApiResponse<AccGroupItem[]> = response.data;

    if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
      return [];
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in fetchAccGroup:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const saveAccGroup = async (accGroupData: AccGroupItem): Promise<AccGroupItem> => {
  try {
    const response = await apiClient.post(ENDPOINT_SAVE, accGroupData);
    const apiResponse: ApiResponse<AccGroupItem> = response.data;

    if (!apiResponse.data) {
      throw new Error('Failed to save account group');
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in saveAccGroup:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};