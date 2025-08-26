import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { config } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.api.baseURL,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const { accessToken } = useAuthStore.getState();
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const { refreshToken } = useAuthStore.getState();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await this.client.post('/auth/refresh', {
              refreshToken,
            });

            const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = response.data;
            
            // Update tokens in store
            useAuthStore.getState().setAuth({
              user,
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            });

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            useAuthStore.getState().logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }

  // GET request
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  // POST request
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  // PUT request
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  // PATCH request
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  // DELETE request
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // Subscription-specific methods
  async getSubscriptionStatus(): Promise<any> {
    return this.get('/subscriptions/status');
  }

  async createSubscription(subscriptionData: any): Promise<any> {
    return this.post('/subscriptions', subscriptionData);
  }

  async cancelSubscription(): Promise<any> {
    return this.delete('/subscriptions/cancel');
  }

  async checkSubscriptionGate(feature: string): Promise<boolean> {
    return this.get(`/subscriptions/gate/${feature}`);
  }

  async getSubscriptionUsage(): Promise<any> {
    return this.get('/subscriptions/usage');
  }

  async getSubscriptionLimits(): Promise<any> {
    return this.get('/subscriptions/limits');
  }

  async getSubscriptionPlans(): Promise<any> {
    return this.get('/subscriptions/plans');
  }

  async restoreSubscription(restoreData: any): Promise<any> {
    return this.post('/subscriptions/restore', restoreData);
  }
}

export const apiService = new ApiService();