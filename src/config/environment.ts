import Constants from 'expo-constants';

// Environment detection
const getEnvironment = (): 'development' | 'staging' | 'production' => {
  // Check if we're in development mode
  if (__DEV__) {
    return 'development';
  }
  
  // Check EAS environment variable
  const easEnv = Constants.expoConfig?.extra?.ENV;
  if (easEnv) {
    return easEnv as 'development' | 'staging' | 'production';
  }
  
  // Default to production for release builds
  return 'production';
};

// Environment-specific configurations
const environments = {
  development: {
    API_BASE_URL: 'https://api-dev.macromealsapp.com/api/v1',
    APP_NAME: 'Macro Meals (Dev)',
    ENVIRONMENT: 'development',
    DEBUG_MODE: true,
  },
  staging: {
    API_BASE_URL: 'https://api-staging.macromealsapp.com/api/v1',
    APP_NAME: 'Macro Meals (Staging)',
    ENVIRONMENT: 'staging',
    DEBUG_MODE: false,
  },
  production: {
    API_BASE_URL: 'https://api.macromealsapp.com/api/v1',
    APP_NAME: 'Macro Meals',
    ENVIRONMENT: 'production',
    DEBUG_MODE: false,
  },
};

// Get current environment
const currentEnv = getEnvironment();

// Export environment configuration
export const ENV_CONFIG = environments[currentEnv];

// Export individual values for convenience
export const API_BASE_URL = ENV_CONFIG.API_BASE_URL;
/** Base URL for v2-only endpoints: /auth/reset-password, /auth/change-password */
export const API_BASE_URL_V2 = API_BASE_URL.replace(/\/v1\/?$/, '/v2');
export const APP_NAME = ENV_CONFIG.APP_NAME;
export const ENVIRONMENT = ENV_CONFIG.ENVIRONMENT;
export const DEBUG_MODE = ENV_CONFIG.DEBUG_MODE;

// Export environment detection function
export { getEnvironment };

// Log current environment (only in development)
if (__DEV__) {
  console.log(`🌍 Current Environment: ${currentEnv}`);
} 