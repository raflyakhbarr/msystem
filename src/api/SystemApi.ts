import apiClient from './axiosConfig';

const SYSTEM_ENDPOINT = import.meta.env.VITE_API_SISTEM_ENDPOINT
const SYSTEM_CB = import.meta.env.VITE_API_SISTEM_ENDPOINT_CB
const SAVE_DATA_ENDPOINT = import.meta.env.VITE_API_SISTEM_SAVE_DATA_ENDPOINT

export type SystemItem = {
  id?: number;
  nama: string;
  url: string;
  destination: string;
  typeApi: string;
  status: boolean;
  createdAt?: string;
  updatedAt?: string;
  headers: string;
  token: string | null;
};

interface ApiResponse<T> {
  data?: T;
  message?: string;
  status?: string;
  [key: string]: any;
}

export const fetchAllSystems = async (): Promise<SystemItem[]> => {
  try {
    const response = await apiClient.get(SYSTEM_ENDPOINT);
    const apiResponse: ApiResponse<SystemItem[]> = response.data;

    // Validasi: Pastikan data ada dan berupa array
    if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
      return [];
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in fetchAllSystems:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const saveSystemData = async (systemData: Partial<SystemItem>): Promise<SystemItem> => {
  try {
    const dataToSave = {
      ...(systemData.id && { id: systemData.id }),
      nama: systemData.nama,
      url: systemData.url,
      destination: systemData.destination,
      typeApi: systemData.typeApi,
      status: systemData.status,
      headers: systemData.headers,
      token: systemData.token
    };
    
    const response = await apiClient.post(SAVE_DATA_ENDPOINT, dataToSave);
    const apiResponse: ApiResponse<SystemItem> = response.data;

    // Validasi response
    if (!apiResponse.data) {
      throw new Error('Failed to save system data');
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in saveSystemData:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const fetchSystemsForComboBox = async (): Promise<SystemItem[]> => {
  try {
    const response = await apiClient.get(SYSTEM_CB);
    const apiResponse: ApiResponse<SystemItem[]> = response.data;

    // Validasi: Pastikan data ada dan berupa array
    if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
      return [];
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in fetchSystemsForComboBox:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};
