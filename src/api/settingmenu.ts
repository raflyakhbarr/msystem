import apiClient from './axiosConfig';

const SETTING_MENU = import.meta.env.VITE_API_SETTING_MENU;

export const fetchAccGroup = async (idGroup: string = '') => {
  try {
    const response = await apiClient.post(SETTING_MENU, { idGroup });
    const apiResponse = response.data;

    // Check if response has the expected structure
    if (apiResponse.data && apiResponse.data.all_menu) {
      return apiResponse.data;
    } else if (Array.isArray(apiResponse)) {
      // Handle case where response is directly an array
      return { all_menu: apiResponse };
    } else {
      console.warn('Unexpected API response structure:', apiResponse);
      return { all_menu: [] }; // Return empty structure as fallback
    }

  } catch (error) {
    console.error("Error in fetchMenu:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const saveAccGroupMenus = async (idGroup: string, checkedMenus: any) => {
  try {
    const response = await apiClient.post(SETTING_MENU, {
      idGroup,
      checked: checkedMenus
    });
    const apiResponse = response.data;
    
    console.log('Save response:', apiResponse);
    return apiResponse;
  } catch (error) {
    console.error("Error in fetchMenu:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};
