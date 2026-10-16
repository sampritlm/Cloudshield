import {
  AuthResponse,
  DashboardSummary,
  TimeSeriesPoint,
  DistributionItem,
  SecurityEvent,
  Incident,
  IncidentStatus,
  ThreatSimulatorRequest,
  ThreatSimulatorResponse,
  SystemHealthResponse,
  ReportSummary,
  UserProfile
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('cloudshield_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, clear token if session expired
    localStorage.removeItem('cloudshield_token');
    localStorage.removeItem('cloudshield_user');
  }

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      }
    } catch {
      // response wasn't JSON
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe: async (): Promise<UserProfile> => {
    return request<UserProfile>('/auth/me');
  },

  // Dashboard
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    return request<DashboardSummary>('/dashboard/summary');
  },

  getActivityTimeseries: async (): Promise<TimeSeriesPoint[]> => {
    return request<TimeSeriesPoint[]>('/dashboard/activity-timeseries');
  },

  getRiskDistribution: async (): Promise<DistributionItem[]> => {
    return request<DistributionItem[]>('/dashboard/risk-distribution');
  },

  getThreatDistribution: async (): Promise<DistributionItem[]> => {
    return request<DistributionItem[]>('/dashboard/threat-distribution');
  },

  getRecentEvents: async (): Promise<SecurityEvent[]> => {
    return request<SecurityEvent[]>('/dashboard/recent-events');
  },

  getRecentIncidents: async (): Promise<Incident[]> => {
    return request<Incident[]>('/dashboard/recent-incidents');
  },

  // Security Events
  getEvents: async (params: {
    page?: number;
    limit?: number;
    severity?: string;
    event_type?: string;
    search?: string;
  }): Promise<{ items: SecurityEvent[]; total: number; page: number; limit: number; total_pages: number }> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.severity && params.severity !== 'ALL') query.set('severity', params.severity);
    if (params.event_type && params.event_type !== 'ALL') query.set('event_type', params.event_type);
    if (params.search) query.set('search', params.search);

    return request(`/events?${query.toString()}`);
  },

  getEventDetail: async (eventId: string): Promise<SecurityEvent> => {
    return request<SecurityEvent>(`/events/${eventId}`);
  },

  // Incidents
  getIncidents: async (params: {
    page?: number;
    limit?: number;
    severity?: string;
    status?: string;
    search?: string;
  }): Promise<{ items: Incident[]; total: number; page: number; limit: number; total_pages: number }> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.severity && params.severity !== 'ALL') query.set('severity', params.severity);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.search) query.set('search', params.search);

    return request(`/incidents?${query.toString()}`);
  },

  getIncidentDetail: async (incidentId: string): Promise<Incident> => {
    return request<Incident>(`/incidents/${incidentId}`);
  },

  updateIncidentStatus: async (
    incidentId: string,
    status: IncidentStatus,
    note?: string
  ): Promise<Incident> => {
    return request<Incident>(`/incidents/${incidentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  },

  // Threat Simulator
  generateSimulatorEvent: async (
    payload: ThreatSimulatorRequest
  ): Promise<ThreatSimulatorResponse> => {
    return request<ThreatSimulatorResponse>('/simulator/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getSimulatorScenarios: async (): Promise<any[]> => {
    return request('/simulator/scenarios');
  },

  // Reports
  generateReport: async (title?: string): Promise<ReportSummary> => {
    return request<ReportSummary>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  getExportCsvUrl: (): string => {
    return `${API_BASE}/reports/export-csv`;
  },

  getCloudTrailLogs: async (): Promise<any[]> => {
    return request('/reports/cloudtrail');
  },

  // System
  getSystemHealth: async (): Promise<SystemHealthResponse> => {
    return request<SystemHealthResponse>('/system/health');
  },

  pollSqsQueue: async (): Promise<any> => {
    return request('/system/poll-sqs', { method: 'POST' });
  },

  resetDemoData: async (): Promise<any> => {
    return request('/system/reset-demo', { method: 'POST' });
  },

  // Admin Alerts
  getAlerts: async (): Promise<any[]> => {
    return request('/alerts');
  },

  triggerTestSnsAlert: async (subject?: string, message?: string): Promise<any> => {
    return request('/alerts/test-sns', {
      method: 'POST',
      body: JSON.stringify({ subject, message }),
    });
  },

  // Admin CanIPhish Integration
  getCanIPhishStatus: async (): Promise<any> => {
    return request('/caniphish/status');
  },

  testCanIPhishConnection: async (): Promise<any> => {
    return request('/caniphish/test-connection', { method: 'POST' });
  },

  getCanIPhishCampaigns: async (): Promise<any[]> => {
    return request('/caniphish/campaigns');
  },

  syncCanIPhishCampaigns: async (): Promise<any> => {
    return request('/caniphish/sync-campaigns', { method: 'POST' });
  },

  simulateCanIPhishEvent: async (payload: {
    event_type: string;
    target_user?: string;
    campaign_name?: string;
    campaign_id?: string;
    source_ip?: string;
  }): Promise<any> => {
    return request('/caniphish/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getCanIPhishSimulationResults: async (): Promise<any[]> => {
    return request('/caniphish/simulation-results');
  },

  // Admin User Management
  getUsers: async (): Promise<any[]> => {
    return request('/users');
  },

  updateUserStatus: async (userId: string, status: string, reason?: string): Promise<any> => {
    return request(`/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  },

  updateUserRole: async (userId: string, role: string): Promise<any> => {
    return request(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  createUser: async (payload: { name: string; email: string; role: string; password?: string }): Promise<any> => {
    return request('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Admin Settings
  getSettings: async (): Promise<any> => {
    return request('/settings');
  },

  updateNotificationSettings: async (payload: { sns_topic_arn?: string; email_alerts_enabled?: boolean }): Promise<any> => {
    return request('/settings/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Normal User Portal
  getUserDashboard: async (): Promise<any> => {
    return request('/user/portal/dashboard');
  },

  getUserSimulations: async (): Promise<any[]> => {
    return request('/user/portal/simulations');
  },

  getUserSecurityInsights: async (): Promise<any> => {
    return request('/user/portal/insights');
  },

  getUserLearning: async (): Promise<any> => {
    return request('/user/portal/learning');
  },

  toggleLessonCompletion: async (lessonId: string): Promise<any> => {
    return request(`/user/portal/learning/${lessonId}/complete`, { method: 'POST' });
  },

  getUserNotifications: async (): Promise<any[]> => {
    return request('/user/portal/notifications');
  },

  changeUserPassword: async (current_password: string, new_password: string): Promise<any> => {
    return request('/user/portal/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    });
  },

  updateUserPreferences: async (preferences: any): Promise<any> => {
    return request('/user/portal/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  },
};

