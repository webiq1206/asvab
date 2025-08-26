import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Platform metrics and analytics
export const platformApi = {
  getMetrics: () => api.get('/admin/metrics'),
  getSystemHealth: () => api.get('/admin/system/health'),
  getContentStats: () => api.get('/admin/content/stats'),
  getRevenueAnalytics: (period = '30d') => api.get(`/admin/analytics/revenue?period=${period}`),
  getEngagementAnalytics: (period = '30d') => api.get(`/admin/analytics/engagement?period=${period}`),
};

// User management
export const usersApi = {
  getUsers: (params: {
    limit?: number;
    offset?: number;
    search?: string;
    branch?: string;
    subscriptionTier?: string;
  }) => api.get('/admin/users', { params }),
  
  getUserDetails: (userId: string) => api.get(`/admin/users/${userId}/detailed`),
  
  suspendUser: (userId: string) => api.post(`/admin/users/${userId}/suspend`),
  
  activateUser: (userId: string) => api.post(`/admin/users/${userId}/activate`),
  
  updateUserSubscription: (userId: string, data: {
    subscriptionTier: string;
    trialEndsAt?: Date;
    notes?: string;
  }) => api.put(`/admin/users/${userId}/subscription`, data),
};

// Content management
export const contentApi = {
  bulkUploadQuestions: (data: {
    format: 'csv' | 'json';
    data: string;
    category?: string;
    difficulty?: string;
  }) => api.post('/admin/content/questions/bulk-upload', data),
  
  updateQuestion: (questionId: string, data: {
    content?: string;
    options?: string[];
    correctAnswer?: number;
    explanation?: string;
    difficulty?: string;
    isActive?: boolean;
  }) => api.put(`/admin/content/questions/${questionId}`, data),
  
  deleteQuestion: (questionId: string) => api.delete(`/admin/content/questions/${questionId}`),
};

// Support and communication
export const supportApi = {
  getSupportTickets: (params: {
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/admin/support/tickets', { params }),
  
  updateSupportTicket: (ticketId: string, data: {
    status?: string;
    priority?: string;
    response?: string;
    assignedTo?: string;
  }) => api.put(`/admin/support/tickets/${ticketId}`, data),
  
  createAnnouncement: (data: {
    title: string;
    content: string;
    type: 'info' | 'warning' | 'update' | 'maintenance';
    targetAudience?: 'all' | 'premium' | 'trial';
    branch?: string;
    expiresAt?: Date;
  }) => api.post('/admin/announcements', data),
};

// Audit logs
export const auditApi = {
  getAuditLogs: (params: {
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/admin/logs/audit', { params }),
};