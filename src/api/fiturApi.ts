import apiClient from './axiosConfig';

const ENDPOINT_FITUR = import.meta.env.VITE_API_FITUR;
const ENDPOINT_FITUR_SAVE = import.meta.env.VITE_API_FITUR_SAVE;

interface FiturItem {
  id?: number;
  nama?: string;
  code?: string;
  [key: string]: any;
}

interface ApiResponse<T> {
  data?: T;
  message?: string;
  status?: string;
  [key: string]: any;
}

export const fetchFitur = async (): Promise<FiturItem[]> => {
  try {
    const response = await apiClient.get(ENDPOINT_FITUR);
    const apiResponse: ApiResponse<FiturItem[]> = response.data;

    if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
      return [];
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in fetchFitur:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const saveFitur = async (fiturData: FiturItem): Promise<FiturItem> => {
  try {
    const response = await apiClient.post(ENDPOINT_FITUR_SAVE, fiturData);
    const apiResponse: ApiResponse<FiturItem> = response.data;

    if (!apiResponse.data) {
      throw new Error('Failed to save fitur');
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in saveFitur:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};