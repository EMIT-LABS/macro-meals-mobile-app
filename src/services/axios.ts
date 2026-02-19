import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import useStore from '../store/useStore';

import Config from 'react-native-config';
import { clearSession } from './sessionService';

// Define non-authenticated endpoints (no Bearer token attached)
// /auth/reset-password is NOT here — we send access_token for it (v2). /auth/change-password is here — we do not.
const nonAuthEndpoints = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/change-password',
  '/auth/verify-code',
  '/auth/verify-email',
  '/auth/refresh',
  '/auth/google',
  '/auth/apple',
  '/auth/facebook',
];

// 401 on these endpoints means "bad input" (e.g. wrong old password), not expired token — do not refresh/retry
const skipRefreshOn401Endpoints = [
  '/auth/reset-password',
  '/auth/change-password',
];

console.log(`\n\n\n\n\n\nAPI_BASE_URL: ${Config.API_BASE_URL}\n\n\n\n\n\n`);

const axiosInstance = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem('my_token');

      // Only add token if endpoint requires auth and we have a token
      if (
        token &&
        !nonAuthEndpoints.some(endpoint => config.url?.includes(endpoint))
      ) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      } else if (
        !token &&
        !nonAuthEndpoints.some(endpoint => config.url?.includes(endpoint))
      ) {
        console.log(
          'No auth token available for protected endpoint:',
          config.url
        );
      }

      // Log full request details for debugging
      // const fullUrl = config.baseURL + config.url;
      // const params = config.params;
      // console.log('📤 Request:', {
      //   method: config.method?.toUpperCase(),
      //   url: fullUrl,
      //   params: params ? JSON.stringify(params, null, 2) : 'none',
      //   hasAuth: !!config.headers?.Authorization,
      // });
    } catch (error) {
      console.error('Error getting token from storage:', error);
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      // Create a user-friendly network error
      const networkError = new Error(
        'Oops! Something went wrong. Please check your internet connection and try again.'
      );
      return Promise.reject(networkError);
    }

    // Log error response details for debugging
    if (error.response) {
      console.error('📥 Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        method: error.config?.method,
        params: error.config?.params
          ? JSON.stringify(error.config.params, null, 2)
          : 'none',
        data: error.response.data,
      });
    }

    // Handle 502 Bad Gateway errors
    if (error.response?.status === 502) {
      console.error('502 Bad Gateway error:', error.message);
      const badGatewayError = new Error(
        'Unable to connect to server. Please try again later.'
      );
      return Promise.reject(badGatewayError);
    }

    // Handle other 5xx server errors
    if (error.response?.status >= 500 && error.response?.status < 600) {
      console.error(`${error.response.status} Server error:`, error.message);
      const serverError = new Error(
        'Server is temporarily unavailable. Please try again later.'
      );
      return Promise.reject(serverError);
    }

    // Handle 401/403 errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Don't handle auth errors for login/register endpoints
      if (
        nonAuthEndpoints.some(endpoint =>
          originalRequest?.url?.includes(endpoint)
        )
      ) {
        return Promise.reject(error);
      }

      // 401 on reset/change-password means wrong old password — do not refresh/retry (would loop)
      if (
        skipRefreshOn401Endpoints.some(endpoint =>
          originalRequest?.url?.includes(endpoint)
        )
      ) {
        return Promise.reject(error);
      }

      // Special handling for email verification required error
      const errorDetail = (error.response?.data as any)?.detail;
      if (
        errorDetail &&
        typeof errorDetail === 'string' &&
        errorDetail.toLowerCase().includes('email verification required')
      ) {
        console.log(
          'Email verification required - letting component handle routing'
        );
        return Promise.reject(error);
      }

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');

        // If we have a refresh token, try to refresh
        if (refreshToken) {
          try {
            console.log(
              'Attempting token refresh with token:',
              refreshToken.substring(0, 10) + '...'
            );
            const response = await axiosInstance.post('/auth/refresh', {
              refresh_token: refreshToken,
            });

            const {
              access_token,
              refresh_token: newRefreshToken,
              user,
            } = response.data;

            console.log('Token refresh successful:', {
              hasAccessToken: !!access_token,
              hasNewRefreshToken: !!newRefreshToken,
              userId: user?.id,
            });

            // Update tokens in storage
            await AsyncStorage.setItem('my_token', access_token);
            if (newRefreshToken) {
              await AsyncStorage.setItem('refresh_token', newRefreshToken);
            }

            // Update store with new authentication state
            const store = useStore.getState();
            store.setAuthenticated(
              true,
              access_token,
              user?.id || store.userId || ''
            );

            // Retry original request
            if (originalRequest) {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Clear tokens and logout
            await handleLogout();
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token, logout
          console.log('No refresh token available, logging out');
          try {
            const keys = await AsyncStorage.getAllKeys();
            console.log('Available storage keys:', keys);
          } catch (keysError) {
            console.log('Could not get storage keys:', keysError);
          }
          await handleLogout();
          return Promise.reject(error);
        }
      } catch (storageError) {
        console.error(
          'Error accessing storage during token refresh:',
          storageError
        );
        await handleLogout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to handle logout
const handleLogout = async () => {
  try {
    // Clear session using the session service
    await clearSession();

    // Update store state
    const store = useStore.getState();
    store.logout();

    console.log('User logged out due to token expiration');
  } catch (error) {
    console.error('Error during logout:', error);
  }
};

// Helper function to set auth tokens
export const setAuthTokens = async (
  accessToken: string,
  refreshToken?: string,
  userId?: string
) => {
  try {
    await AsyncStorage.setItem('my_token', accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem('refresh_token', refreshToken);
    }
    if (userId) {
      await AsyncStorage.setItem('user_id', userId);
    }
  } catch (error) {
    console.error('Error setting auth tokens:', error);
  }
};

// Helper function to clear auth tokens
export const clearAuthTokens = async () => {
  try {
    await clearSession();
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
  }
};

export default axiosInstance;
