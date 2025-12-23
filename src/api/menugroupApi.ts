import apiClient from './axiosConfig';

const ENDPOINT_LIST = import.meta.env.VITE_API_MENU_GROUP;

const ENDPOINT_SELECT = import.meta.env.VITE_API_MENU_GROUP_CB;

const ENDPOINT_SAVE = import.meta.env.VITE_API_MENU_GROUP_SAVE;

export type MenuGroupItem = {
  id?: number;
  nama: string;
  idSistem?: string;
  status?: boolean;
  isAdministrator?: boolean;
  sistem?: {
    nama: string;
  };
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
};

interface ApiResponse<T> {
  data?: T;
  message?: string;
  status?: string;
  [key: string]: any;
}

export const fetchMenuGroup = async (): Promise<MenuGroupItem[]> => {
  try {
    const response = await apiClient.get(ENDPOINT_LIST);
    const apiResponse: ApiResponse<MenuGroupItem[]> = response.data;

    if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
      return [];
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in fetchMenuGroup:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * Fetch lightweight data for Dropdown/Select Input
 */
export const fetchMenuGroupSelect = async (): Promise<MenuGroupItem[]> => {
  try {
    const response = await apiClient.get(ENDPOINT_SELECT);
    const apiResponse: ApiResponse<MenuGroupItem[]> = response.data;

    if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
      return [];
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in fetchMenuGroupSelect:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const saveMenuGroup = async (menuData: MenuGroupItem): Promise<MenuGroupItem> => {
  try {
    const response = await apiClient.post(ENDPOINT_SAVE, menuData);
    const apiResponse: ApiResponse<MenuGroupItem> = response.data;

    // Validasi response
    if (!apiResponse.data) {
      throw new Error('Failed to save menu group');
    }

    return apiResponse.data;

  } catch (error: unknown) {
    console.error("Error in saveMenuGroup:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};