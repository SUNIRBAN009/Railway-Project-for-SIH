import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { User } from '../types';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Silent Token Refresh (Anti-Replay Queue)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Ignore refresh or login requests from 401 loop
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login/') &&
      !originalRequest.url?.includes('/auth/refresh/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().logout();
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post<{
          success: boolean;
          data: { access_token: string; refresh_token?: string };
        }>('/api/v1/auth/refresh/', { refresh_token: refreshToken });

        const newAccessToken = refreshResponse.data.data.access_token;
        const newRefreshToken = refreshResponse.data.data.refresh_token;
        useAuthStore.getState().setAccessToken(newAccessToken);
        if (newRefreshToken) {
          useAuthStore.setState({ refreshToken: newRefreshToken });
        }

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr as Error, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth Service API Wrappers
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    user: User;
  };
}

export const authService = {
  login: async (username: string, password: string):Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login/', {
      username,
      password,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<{ success: boolean; data: User }>('/auth/me/');
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout/');
    } finally {
      useAuthStore.getState().logout();
    }
  },
};

// Block Service API Wrappers
export interface CreateBlockPayload {
  corridor?: string;
  corridor_code?: string;
  department?: string;
  department_code?: string;
  line_type?: string;
  work_type?: string;
  start_km: number;
  end_km: number;
  scheduled_start_time: string;
  scheduled_end_time?: string;
  duration_minutes?: number;
  traction_power_cutoff_required?: boolean;
  gang_id?: string;
  equipment_required?: string;
  equipment_id?: string;
  work_description?: string;
}

export interface SanctionBlockPayload {
  action: 'SANCTION' | 'CONDITIONAL_SANCTION' | 'REJECT';
  version: number;
  remarks?: string;
  caution_speed?: number;
}

export const blockService = {
  createBlock: async (payload: CreateBlockPayload): Promise<any> => {
    const response = await apiClient.post<{ success: boolean; data: any }>('/blocks/', payload);
    return response.data.data;
  },
  getBlocks: async (params?: Record<string, string>): Promise<any[]> => {
    const response = await apiClient.get<{ success: boolean; data: any[] }>('/blocks/', { params });
    return response.data.data;
  },
  getBlockDetail: async (id: string): Promise<any> => {
    const response = await apiClient.get<{ success: boolean; data: any }>(`/blocks/${id}/`);
    return response.data.data;
  },
  getCombinedRecommendation: async (id: string): Promise<any> => {
    const response = await apiClient.get<{ success: boolean; data: any }>(`/blocks/${id}/combined-recommendation/`);
    return response.data.data;
  },
  getCorridorRecommendations: async (corridor?: string): Promise<any[]> => {
    const response = await apiClient.get<{ success: boolean; data: any[] }>('/blocks/recommendations/', {
      params: corridor ? { corridor } : undefined,
    });
    return response.data.data;
  },
  sanctionBlock: async (id: string, payload: SanctionBlockPayload): Promise<any> => {
    const response = await apiClient.post<{ success: boolean; data: any; message?: string }>(
      `/blocks/${id}/sanction/`,
      payload
    );
    return response.data.data;
  },
};

// Train Service API Wrappers (SVC-TRN)
export interface LiveTrainRecord {
  train_number: string;
  train_name: string;
  train_type: string;
  direction: 'UP' | 'DOWN';
  current_km: number;
  latitude: number;
  longitude: number;
  heading: number;
  speed_kmh: number;
  delay_minutes: number;
  status: 'ON_TIME' | 'RUNNING' | 'DELAYED' | 'REGULATED';
  current_section: string;
  current_station_code: string;
  pax_capacity?: number;
  last_reported_at?: string;
}

export const trainService = {
  getLiveTrains: async (params?: {
    direction?: string;
    status?: string;
    delay_greater_than?: number;
  }): Promise<LiveTrainRecord[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: { count: number; active_live_trains: LiveTrainRecord[] };
    }>('/trains/live/', { params });
    return response.data.data?.active_live_trains || [];
  },

  advanceSimulation: async (
    deltaSeconds: number = 30
  ): Promise<{ simulated_trains: number; delta_seconds: number }> => {
    const response = await apiClient.post<{
      success: boolean;
      data: { simulated_trains: number; delta_seconds: number };
    }>('/trains/live/', { delta_seconds: deltaSeconds });
    return response.data.data;
  },

  getCatalog: async (params?: Record<string, string>): Promise<any[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: { count: number; trains: any[] };
    }>('/trains/catalog/', { params });
    return response.data.data?.trains || [];
  },

  getSchedule: async (trainNumber: string): Promise<any> => {
    const response = await apiClient.get<{ success: boolean; data: any }>(
      `/trains/${trainNumber}/schedule/`
    );
    return response.data.data;
  },

  ingestFeed: async (): Promise<any> => {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      '/trains/ingest/'
    );
    return response.data.data;
  },
};

// Department Logistics & Rosters API Wrappers (SVC-DEPT, TSK-P2-06)
export interface GangRecord {
  id: string;
  gang_number: string;
  department_id: string;
  department_code: string;
  department_name: string;
  supervisor_id?: string | null;
  supervisor_name: string;
  headquarters_station: string;
  crew_strength: number;
  assigned_section_start_km: number;
  assigned_section_end_km: number;
  is_active: boolean;
}

export interface EquipmentRecord {
  id: string;
  equipment_code: string;
  equipment_name: string;
  equipment_type: string;
  equipment_type_display: string;
  department_code: string;
  home_depot: string;
  current_location_km: number;
  operational_status: string;
  fitness_expiry_date: string;
  is_fit: boolean;
  is_fitness_expired: boolean;
}

export const departmentService = {
  getGangs: async (params?: {
    department?: string;
    station?: string;
    available?: boolean;
    start_time?: string;
    end_time?: string;
    search?: string;
  }): Promise<GangRecord[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: { count: number; gangs: GangRecord[] };
    }>('/departments/gangs/', { params });
    return response.data.data?.gangs || [];
  },

  getEquipment: async (params?: {
    type?: string;
    status?: string;
    department?: string;
    fit_only?: boolean;
    start_time?: string;
    end_time?: string;
    search?: string;
  }): Promise<EquipmentRecord[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: { count: number; equipment: EquipmentRecord[] };
    }>('/departments/equipment/', { params });
    return response.data.data?.equipment || [];
  },
};


