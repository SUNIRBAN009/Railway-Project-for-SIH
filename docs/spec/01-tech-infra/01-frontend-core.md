# 01-frontend-core.md

> **File Order:** 5/45  
> **Previous File:** `01-tech-infra/00-backend-core.md` (Backend API definitions)  
> **Next File:** `01-tech-infra/02-data-layer.md`  
> **Connection:** The React frontend connects to the Backend API (REST) and WebSocket Channels described in the previous file. The Global State defined here handles the tokens issued by the auth flow.

---

## 1. Project Organization (React + Vite)

**Framework:** React 18
**Bundler:** Vite
**Routing:** React Router v6

### 1.1 Folder Structure

```text
frontend/src/
├── 📁 assets/             # Static images, SVGs, Mapbox styles
├── 📁 components/         # Reusable UI elements (Buttons, Modals, Forms)
│   ├── 📁 common/         # Shared across all domains
│   ├── 📁 map/            # Mapbox GL JS wrapper components
│   ├── 📁 blocks/         # Block specific UI (Timeline, Forms)
│   └── 📁 auth/           # Login form, Role selector
├── 📁 hooks/              # Custom React hooks
│   ├── useAuth.js         # Auth state + API wrapper
│   ├── useWebSocket.js    # Reconnecting websocket manager
│   └── useMapSync.js      # Syncs block data to map layers
├── 📁 pages/              # Route-level components
│   ├── 📁 COA/            # Control Room Dashboard
│   ├── 📁 JE/             # Junior Engineer Dashboard
│   ├── 📁 SE/             # Section Engineer Dashboard
│   └── Login.jsx          # Public login page
├── 📁 services/           # API clients
│   ├── apiClient.js       # Axios instance with interceptors
│   └── queryClient.js     # TanStack Query config
├── 📁 stores/             # Zustand global state slices
│   ├── authStore.js       # User, role, token state
│   ├── mapStore.js        # Viewport, active layers
│   └── alertStore.js      # Emergency / Snackbar state
├── 📁 utils/              # Helper functions
│   ├── formatters.js      # Date, distance, currency formatters
│   ├── validators.js      # Client-side validation logic
│   └── constants.js       # Enum mappings, colors
├── App.jsx                # Root component + Provider wrappers
└── main.jsx               # React DOM render entry
```

---

## 2. API Client & Auth Flow (Axios)

We use Axios for API requests with an interceptor to handle JWT authorization and automatic token refresh.

### 2.1 Axios Interceptor Setup

```javascript
// src/services/apiClient.js
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh (401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        // Call refresh endpoint
        const response = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh/`, {
          refresh: refreshToken
        });
        
        const newAccessToken = response.data.access;
        // Update global store
        useAuthStore.getState().setTokens(newAccessToken, refreshToken);
        
        // Retry original request with new token
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        // Refresh token expired or invalid -> Logout user
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // Global Error Handling (Toasts)
    if (error.response?.status >= 500) {
      const { addToast } = useAlertStore.getState();
      addToast('Server Error. Please try again.', 'error');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 3. Global State (Zustand + TanStack Query)

Client State (UI state, auth) is managed by Zustand. Server State (Data fetching, caching) is managed by TanStack Query.

### 3.1 Zustand Stores

```javascript
// src/stores/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,         // { id, username, role, department }
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      
      login: (userData, access, refresh) => set({
        user: userData,
        accessToken: access,
        refreshToken: refresh,
        isAuthenticated: true
      }),
      
      setTokens: (access, refresh) => set({
        accessToken: access,
        refreshToken: refresh
      }),
      
      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false
      })
    }),
    {
      name: 'railway-auth-storage', // localStorage key
    }
  )
);
```

### 3.2 TanStack Query Config

```javascript
// src/services/queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't spam API when switching tabs
      retry: 1,                    // Only retry once on failure
      staleTime: 5 * 60 * 1000,    // Data is fresh for 5 minutes
      cacheTime: 10 * 60 * 1000,   // Cache kept for 10 minutes
    },
  },
});

// Example Usage in Component:
// const { data, isLoading } = useQuery(['pendingBlocks'], () => apiClient.get('/blocks/pending/'))
```

---

## 4. UI Library & Theming (Tailwind CSS)

The application uses Tailwind CSS with a custom configuration designed for a Control Room environment (Dark Theme primary).

### 4.1 Tailwind Config

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Control Room Dark Theme
        rail: {
          bg: '#0F172A',      // Slate 900 (Main Background)
          panel: '#1E293B',   // Slate 800 (Card Background)
          border: '#334155',  // Slate 700
          text: '#F8FAFC',    // Slate 50
          muted: '#94A3B8',   // Slate 400
        },
        // Department Colors
        dept: {
          ENG: '#F59E0B',     // Amber 500 (Engineering / Track)
          TRD: '#3B82F6',     // Blue 500 (Traction / OHE)
          SNT: '#10B981',     // Emerald 500 (Signal & Telecom)
        },
        // Status Colors
        status: {
          pending: '#F59E0B', // Amber
          approved: '#10B981',// Emerald
          rejected: '#EF4444',// Red
          conflict: '#EF4444',// Red
          emergency: '#B91C1C',// Red 700 (Flashing)
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'], // For data logs/terminals
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

---

## 5. Routing Architecture (React Router)

Protected routes based on user roles.

```javascript
// src/App.jsx structure
import { Routes, Route, Navigate } from 'react-router-dom';

<Routes>
  {/* Public Route */}
  <Route path="/login" element={<Login />} />
  
  {/* Protected Routes (Wrapper checks Auth) */}
  <Route element={<ProtectedRoute />}>
    
    {/* COA Role Only */}
    <Route element={<RoleRoute allowedRoles={['COA']} />}>
      <Route path="/coa/dashboard" element={<COADashboard />} />
      <Route path="/coa/conflicts" element={<ConflictResolver />} />
      <Route path="/coa/analytics" element={<AnalyticsReport />} />
    </Route>
    
    {/* JE/SE Roles */}
    <Route element={<RoleRoute allowedRoles={['ENG_JE', 'TRD_JE', 'SNT_JE', 'SE']} />}>
      <Route path="/department/dashboard" element={<DeptDashboard />} />
      <Route path="/blocks/request" element={<BlockRequestForm />} />
    </Route>
    
    {/* Shared Authenticated */}
    <Route path="/map" element={<LiveNetworkMap />} />
    <Route path="/profile" element={<UserProfile />} />
    
  </Route>
  
  {/* Fallback */}
  <Route path="*" element={<Navigate to="/login" replace />} />
</Routes>
```

---

## 6. WebSocket Integration

A custom hook manages the connection to Django Channels for real-time map updates and emergency alerts.

```javascript
// src/hooks/useWebSocket.js
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useAlertStore } from '../stores/alertStore';

export const useWebSocket = () => {
  const ws = useRef(null);
  const token = useAuthStore((state) => state.accessToken);
  const addToast = useAlertStore((state) => state.addToast);

  useEffect(() => {
    if (!token) return;

    // Connect to WebSocket with token in query string (Channels Auth)
    const wsUrl = `${import.meta.env.VITE_WS_BASE_URL}/ws/network/?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => console.log('WebSocket Connected');
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'EMERGENCY_ALERT':
          addToast(`EMERGENCY: ${data.message}`, 'emergency');
          // Trigger alarm sound
          new Audio('/sounds/alarm.mp3').play();
          break;
        case 'BLOCK_APPROVED':
          addToast(`Block Approved: ${data.section}`, 'success');
          // Dispatch to TanStack query cache invalidate
          break;
        case 'CONFLICT_DETECTED':
          addToast(`Conflict Detected!`, 'error');
          break;
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket Disconnected. Reconnecting in 5s...');
      // Implement backoff reconnection logic here
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [token]);

  return ws;
};
```

---

## 7. Performance & Optimization

| Area | Optimization Technique | Rationale |
|------|------------------------|-----------|
| **Bundle Size** | React.lazy() and Suspense | Code-split heavy routes (like the 3D Map) so they only load when visited. |
| **Map Rendering** | WebGL (Mapbox) + GeoJSON data | Use native vector tiles instead of DOM markers. Supports 10,000+ track segments without lag. |
| **State Updates** | Zustand Selectors | Components only re-render if the specific slice of state they depend on changes. |
| **API Load** | TanStack Query caching | Prevents re-fetching static data (e.g., list of stations, material types) across tab switches. |
| **Icons** | Phosphor Icons (Tree-shaken) | Lightweight SVG icons instead of massive font files (like FontAwesome). |
