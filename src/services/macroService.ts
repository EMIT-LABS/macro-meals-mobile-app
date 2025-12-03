import axiosInstance from './axios';

export type MacroResponse = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export interface MacroSetupRequest {
  activity_level: string;
  age: number;
  dietary_preference: string;
  dob: string;
  goal_type: string;
  height: number;
  progress_rate: string | number;
  sex: string;
  target_weight: number;
  height_unit_preference: string;
  weight_unit_preference: string;
  weight: number;
}

export async function fetchMacros(): Promise<MacroResponse> {
  try {
    const response = await axiosInstance.post('/macros/adjust-macros', {});
    return response.data;
  } catch (error) {
    console.error('Error fetching macros:', error);
    throw error;
  }
}

export async function updateMacros(
  updated: Partial<Omit<MacroResponse, 'calories'>>
): Promise<void> {
  try {
    // Only send the macros to be updated (not calories!)
    await axiosInstance.post('/macros/adjust-macros', updated);
  } catch (error) {
    console.error('Error updating macros:', error);
    throw error;
  }
}

export async function setupMacros(
  requestData: MacroSetupRequest
): Promise<MacroResponse> {
  try {
    console.log(
      '\n\n\n\n\n\n\n\nSETUP MACROS REQUEST DATA:\n\n\n\n\n\n\n\n',
      requestData
    );
    const response = await axiosInstance.post(
      '/macros/macros-setup',
      requestData
    );
    return response.data;
  } catch (error) {
    console.error('Error setting up macros:', error);
    throw error;
  }
}
export async function fetchUserPreferences(): Promise<MacroResponse> {
  // Adjust this endpoint to match your actual preferences fetch endpoint
  const response = await axiosInstance.get('/user/preferences');
  console.log('User preferences response:', response.data);
  // If your preferences object is nested, adjust accordingly:
  // return response.data.macros;
  return {
    calories: response.data.calorie_target ?? 0,
    protein: response.data.protein_target ?? 0,
    fat: response.data.fat_target ?? 0,
    carbs: response.data.carbs_target ?? 0,
  };
}
