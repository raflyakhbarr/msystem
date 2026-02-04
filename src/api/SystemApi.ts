import apiClient from './axiosConfig';

import type { SystemItem , ApiResponse } from '@/types';

const SYSTEM_ENDPOINT = import.meta.env.VITE_API_SISTEM_ENDPOINT
const SYSTEM_CB = import.meta.env.VITE_API_SISTEM_ENDPOINT_CB
const SAVE_DATA_ENDPOINT = import.meta.env.VITE_API_SISTEM_SAVE_DATA_ENDPOINT

export const fetchAllSystems = async (): Promise<SystemItem[]> => {
  try {
    const response = await apiClient.get(SYSTEM_ENDPOINT);
    const apiResponse: ApiResponse<SystemItem[]> = response.data;

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
      token: systemData.token,
      ip_whitelist: systemData.ip_whitelist
    };
    
    const response = await apiClient.post(SAVE_DATA_ENDPOINT, dataToSave);
    const apiResponse: ApiResponse<SystemItem> = response.data;

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

    if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
      return [];
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in fetchSystemsForComboBox:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};
