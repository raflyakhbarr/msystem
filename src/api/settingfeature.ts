import apiClient from './axiosConfig';

const SETTING_FEATURE = import.meta.env.VITE_API_SETTING_FEATURE;

interface SettingFeatureItem {
  id?: number;
  idGroup?: string;
  featureId?: string;
  isEnabled?: boolean;
  [key: string]: any;
}

interface ApiResponse<T> {
  data?: T;
  message?: string;
  status?: string;
  [key: string]: any;
}

export const fetchSettingFeature = async (idGroup: string = '') => {
  try {
    const fullUrl = `${SETTING_FEATURE}${idGroup}`;
    const response = await apiClient.get(fullUrl);
    const apiResponse = response.data;

    // Check if response has the expected structure
    if (apiResponse.data && Array.isArray(apiResponse.data)) {
      // Handle case where response is directly an array in data property
      return { data: apiResponse.data };
    } else if (apiResponse.data && apiResponse.data.all_menu) {
      return apiResponse.data;
    } else if (Array.isArray(apiResponse.data)) {
      // Handle case where response is directly an array
      return { data: apiResponse.data };
    } else {
      console.warn('Unexpected API response structure:', apiResponse);
      return { data: [] }; // Return empty structure as fallback
    }

  } catch (error: unknown) {
    console.error("Error in fetchSettingFeature:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const saveAccGroupFeatures = async (idGroup: string, selectedFeatures: object) => {
  try {
    const fullUrl = `${SETTING_FEATURE}${idGroup}`;
    console.log('Saving setting feature to URL:', fullUrl);
    console.log('Selected features:', selectedFeatures);
    
    const response = await apiClient.post(fullUrl, selectedFeatures);
    return response.data;
  } catch (error: unknown) {
    console.error("Error in saveAccGroupFeatures:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};