import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  MilitaryBranch,
} from '@asvab-prep/shared';
import { apiService } from './api';

export interface OAuthCompleteRequest {
  email: string;
  selectedBranch: MilitaryBranch;
  firstName?: string;
  lastName?: string;
}

class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/register', data);
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/login', data);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/refresh', { refreshToken });
  }

  async requestMagicLink(email: string): Promise<{ message: string }> {
    return apiService.post<{ message: string }>('/auth/magic-link', { email });
  }

  async completeOAuthRegistration(data: OAuthCompleteRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/oauth/complete', data);
  }

  async getCurrentUser() {
    return apiService.get<{ user: any }>('/auth/me');
  }

  async logout(): Promise<{ message: string }> {
    return apiService.post<{ message: string }>('/auth/logout');
  }
}

export const authService = new AuthService();