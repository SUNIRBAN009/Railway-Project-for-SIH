# 01-frontend-core.md

> **ফাইল ক্রম:** ৫/৪৫  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/00-backend-core.md` (API envelope, JWT strategy, RBAC, WebSocket endpoint, CORS origin)  
> **পরবর্তী ফাইল:** `01-tech-infra/02-data-layer.md`  
> **সংযোগ:** এই ফাইলে ব্যবহৃত `Zustand store structure`, `API client base URL`, এবং `Auth flow` `02-data-layer.md`-এর caching strategy এবং session management-এর সাথে সরাসরি লিংকড। `02-data-layer.md`-এ MySQL 8.0 schema এবং Redis cache key design করা হবে, যা frontend-এর server state sync-এর জন্য দরকার।

---

## 1. Framework & Versions

| Technology | Version | Purpose | Justification |
|-----------|---------|---------|---------------|
| **React** | 18.2.0 | UI library | Component-based, mature ecosystem, team familiarity |
| **Vite** | 5.0.0 | Build tool & dev server | HMR ~50ms, native ESM, faster than Webpack |
| **React Router DOM** | 6.22.0 | Client-side routing | Declarative routing, loader/action pattern, lazy loading |
| **Zustand** | 4.5.0 | Global client state | 1KB bundle, minimal boilerplate, hooks API |
| **TanStack Query (React Query)** | 5.24.0 | Server state management | Caching, background refetch, deduping, stale-while-revalidate |
| **Axios** | 1.6.0 | HTTP client | Interceptors, request/response transformation, timeout handling |
| **Mapbox GL JS** | 2.15.0 | Interactive rail map | Vector tiles, 3D buildings, dark theme, custom layers |
| **Tailwind CSS** | 3.4.0 | Utility-first styling | Rapid dark theme implementation, design system consistency |
| **Recharts** | 2.12.0 | Data visualization | Dashboard charts (block utilization, impact scores) |
| **date-fns** | 3.3.0 | Date manipulation | Tree-shakeable, immutable, timezone support |
| **clsx + tailwind-merge** | 2.2.0 | Conditional class merging | Dynamic Tailwind class composition without conflicts |

**Rejected Alternatives:**
- **Next.js 14:** Rejected — App Router learning curve, Mapbox GL JS client-only rendering complexity, SSR unnecessary for internal tool
- **Redux Toolkit:** Rejected — Boilerplate overhead, hackathon timeline unfriendly
- **Leaflet:** Rejected — Raster tiles, limited 3D/animation support (backup only)

---

## 2. State Management Architecture

### 2.1 Server State (TanStack Query)

**Responsibility:** API data caching, background refetching, optimistic updates, deduplication.

| Query Key Pattern | Endpoint | Stale Time | Cache Time |
|------------------|----------|------------|------------|
| `['blocks', 'pending']` | `GET /api/v1/blocks/pending/` | 30s | 5min |
| `['blocks', 'my']` | `GET /api/v1/blocks/?dept=ENG` | 30s | 5min |
| `['trains']` | `GET /api/v1/trains/` | 60s | 10min |
| `['crews']` | `GET /api/v1/crews/` | 5min | 30min |
| `['sections']` | `GET /api/v1/trains/sections/` | 10min | 1hr |
| `['notifications']` | `GET /api/v1/notifications/` | 10s | 2min |

**Mutations:**
- `useCreateBlock()` — On success: invalidate `['blocks', 'pending']` and `['blocks', 'my']`
- `useApproveBlock()` — On success: invalidate affected block + trigger WebSocket refresh
- `useEmergencyBlock()` — Optimistic update: immediately add to pending list before server confirm

### 2.2 Global Client State (Zustand)

**Store Structure:**

```javascript
// stores/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  user: null,           // { id, username, role, dept, name }
  accessToken: null,    // JWT access token (memory only)
  isAuthenticated: false,
  login: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  setUser: (user) => set({ user }),
}));

// stores/uiStore.js
export const useUIStore = create((set) => ({
  sidebarOpen: true,
  activeDepartment: 'ENG', // 'ENG' | 'TRD' | 'SNT' | 'COA'
  mapView: 'network',      // 'network' | 'section' | 'heat'
  bigScreenMode: false,
  activeConflict: null,
  emergencyAlert: null,
  theme: 'dark',           // 'dark' | 'light' (always dark for control room)
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveDepartment: (dept) => set({ activeDepartment: dept }),
  setBigScreenMode: (mode) => set({ bigScreenMode: mode }),
  setActiveConflict: (conflict) => set({ activeConflict: conflict }),
  setEmergencyAlert: (alert) => set({ emergencyAlert: alert }),
}));

// stores/mapStore.js
export const useMapStore = create((set) => ({
  selectedSection: null,   // 'HWH-KGP' | null
  selectedTrain: null,
  blockOverlays: [],       // GeoJSON features for active blocks
  trainPositions: [],      // Animated marker positions
  mapCenter: [88.35, 22.58], // [lng, lat] Howrah
  mapZoom: 11,
  setSelectedSection: (id) => set({ selectedSection: id }),
  updateTrainPosition: (trainId, coords) => set((s) => ({
    trainPositions: s.trainPositions.map(t => 
      t.id === trainId ? { ...t, coords } : t
    )
  })),
  updateSectionStatus: (sectionId, status) => set((s) => ({
    blockOverlays: s.blockOverlays.map(sec => 
      sec.id === sectionId ? { ...sec, status } : sec
    )
  })),
}));
```

### 2.3 Local State (React useState/useReducer)

Used for:
- Form inputs (block request form, login form)
- Modal open/close states
- Map popup content
- Table sorting/filtering (client-side)
- Stepper state (multi-step block request wizard)

### 2.4 Form State (React Hook Form)

| Form | Library | Validation | Submission |
|------|---------|------------|------------|
| **Login** | React Hook Form | `required`, `minLength: 3` | Direct API call |
| **Block Request** | React Hook Form + Zod resolver | Section exists, time valid, KM range valid | `useCreateBlock()` mutation |
| **Emergency Block** | React Hook Form | Photo required, reason required | `useEmergencyBlock()` mutation |
| **Crew Assignment** | React Hook Form | Date range, gang size | `useAssignCrew()` mutation |

---

## 3. Routing Architecture

### 3.1 Route Definitions

| Route | Type | Guard | Component | Lazy |
|-------|------|-------|-----------|------|
| `/login` | Public | None | `LoginPage` | No |
| `/` | Protected | Auth | `DashboardRedirect` | No |
| `/eng` | Protected | Role: ENG/COA | `EngDashboard` | Yes |
| `/trd` | Protected | Role: TRD/COA | `TrdDashboard` | Yes |
| `/snt` | Protected | Role: SNT/COA | `SntDashboard` | Yes |
| `/coa` | Protected | Role: COA | `ControlRoomDashboard` | Yes |
| `/coa/bigscreen` | Protected | Role: COA | `BigScreenMode` | Yes |
| `/blocks/new` | Protected | Auth | `BlockRequestPage` | Yes |
| `/blocks/:id` | Protected | Auth | `BlockDetailPage` | Yes |
| `/map` | Protected | Auth | `NetworkMapPage` | Yes |
| `/reports` | Protected | Role: COA | `ReportsPage` | Yes |
| `/profile` | Protected | Auth | `ProfilePage` | Yes |

### 3.2 Route Guards

```javascript
// components/guards/RoleGuard.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function RoleGuard({ allowedRoles, children }) {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true });
    } else if (!allowedRoles.includes(user.role)) {
      navigate(`/${user.role.toLowerCase().split('_')[0]}`, { replace: true });
    }
  }, [user, isAuthenticated, allowedRoles, navigate]);
  
  if (!user || !allowedRoles.includes(user.role)) return null;
  return children;
}
```

### 3.3 Lazy Loading

```javascript
// router.jsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RoleGuard } from './components/guards/RoleGuard';
import PageLoader from './components/common/PageLoader';
import LoginPage from './pages/LoginPage';

const EngDashboard = lazy(() => import('./pages/EngDashboard'));
const TrdDashboard = lazy(() => import('./pages/TrdDashboard'));
const SntDashboard = lazy(() => import('./pages/SntDashboard'));
const ControlRoomDashboard = lazy(() => import('./pages/ControlRoomDashboard'));
const BigScreenMode = lazy(() => import('./pages/BigScreenMode'));
const BlockRequestPage = lazy(() => import('./pages/BlockRequestPage'));
const BlockDetailPage = lazy(() => import('./pages/BlockDetailPage'));
const NetworkMapPage = lazy(() => import('./pages/NetworkMapPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/eng" element={
          <RoleGuard allowedRoles={['ENG_JE', 'SE', 'COA']}><EngDashboard /></RoleGuard>
        } />
        <Route path="/trd" element={
          <RoleGuard allowedRoles={['TRD_JE', 'SE', 'COA']}><TrdDashboard /></RoleGuard>
        } />
        <Route path="/snt" element={
          <RoleGuard allowedRoles={['SNT_JE', 'SE', 'COA']}><SntDashboard /></RoleGuard>
        } />
        <Route path="/coa" element={
          <RoleGuard allowedRoles={['COA']}><ControlRoomDashboard /></RoleGuard>
        } />
        <Route path="/coa/bigscreen" element={
          <RoleGuard allowedRoles={['COA']}><BigScreenMode /></RoleGuard>
        } />
        <Route path="/blocks/new" element={<BlockRequestPage />} />
        <Route path="/blocks/:id" element={<BlockDetailPage />} />
        <Route path="/map" element={<NetworkMapPage />} />
        <Route path="/reports" element={
          <RoleGuard allowedRoles={['COA']}><ReportsPage /></RoleGuard>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
```

**Code Splitting Strategy:**
- `vendor` chunk: React, ReactDOM, Router, Zustand, TanStack Query, Axios
- `mapbox` chunk: Mapbox GL JS + map components (loaded only on `/map` and dashboard routes)
- `charts` chunk: Recharts (loaded only on `/coa` and `/reports`)
- `pdf` chunk: PDF generation library (loaded only on report download)

---

## 4. Component Architecture

**Pattern:** Feature-Based + Atomic Design Hybrid

```
src/
├── components/
│   ├── ui/                    # Atomic: Buttons, Inputs, Badges, Cards, Modals
│   │   ├── Button.jsx
│   │   ├── StatusBadge.jsx    # 🟢 FREE | 🔴 BLOCKED | 🟡 PENDING
│   │   ├── PriorityPill.jsx   # Critical (red) | High (orange) | Medium (yellow) | Low (blue)
│   │   ├── SectionCard.jsx
│   │   └── DataTable.jsx
│   ├── layout/                # Layout: Sidebar, Header, ControlPanel
│   │   ├── Sidebar.jsx
│   │   ├── TopNav.jsx
│   │   ├── DepartmentLayout.jsx
│   │   └── ControlRoomLayout.jsx
│   ├── map/                   # Map-specific components
│   │   ├── RailMap.jsx
│   │   ├── SectionLayer.jsx
│   │   ├── TrainMarker.jsx
│   │   ├── BlockOverlay.jsx
│   │   └── MapPopup.jsx
│   └── common/                # Shared: Loading, ErrorBoundary, EmptyState
│       ├── PageLoader.jsx
│       ├── ErrorFallback.jsx
│       └── EmptyState.jsx
├── features/                  # Feature-based modules
│   ├── blocks/
│   │   ├── BlockRequestForm.jsx
│   │   ├── BlockList.jsx
│   │   ├── BlockTimeline.jsx
│   │   ├── ConflictAlert.jsx
│   │   ├── EmergencyButton.jsx
│   │   └── hooks/
│   │       ├── useBlocks.js
│   │       └── useConflict.js
│   ├── auth/
│   │   ├── LoginForm.jsx
│   │   └── hooks/
│   │       └── useAuth.js
│   ├── ontology/
│   │   ├── ImpactPanel.jsx
│   │   ├── AffectedTrainList.jsx
│   │   └── hooks/
│   │       └── useReasoning.js
│   └── notifications/
│       ├── NotificationBell.jsx
│       ├── NotificationList.jsx
│       └── hooks/
│           └── useNotifications.js
└── pages/                     # Route-level pages
    ├── LoginPage.jsx
    ├── EngDashboard.jsx
    ├── TrdDashboard.jsx
    ├── SntDashboard.jsx
    ├── ControlRoomDashboard.jsx
    ├── BigScreenMode.jsx
    ├── NetworkMapPage.jsx
    └── BlockDetailPage.jsx
```

---

## 5. API Client

### 5.1 Axios Instance Configuration

```javascript
// services/api.js
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Required for httpOnly refresh token cookie
});

// Request Interceptor: Attach JWT access token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add request ID for tracing
    config.headers['X-Request-ID'] = crypto.randomUUID();
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Refresh token is in httpOnly cookie (auto-sent)
        const refreshResponse = await axios.post(
          `${api.defaults.baseURL}/auth/refresh/`,
          {},
          { withCredentials: true }
        );
        
        const newAccessToken = refreshResponse.data.access;
        useAuthStore.getState().login(
          useAuthStore.getState().user,
          newAccessToken
        );
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed → logout
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // Handle rate limiting (429)
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10);
      return new Promise((resolve) => {
        setTimeout(() => resolve(api(originalRequest)), retryAfter * 1000);
      });
    }
    
    // Standardize error
    const errorData = error.response?.data || {};
    const standardizedError = {
      message: errorData.message || 'An error occurred',
      code: errorData.error_code || 'GEN-500-001',
      status: error.response?.status || 500,
      details: errorData.details || null,
    };
    
    return Promise.reject(standardizedError);
  }
);

export default api;
```

### 5.2 API Service Modules

```javascript
// services/blockService.js
import api from './api';

export const blockService = {
  getPending: () => api.get('/blocks/pending/'),
  getMyBlocks: (dept) => api.get(`/blocks/?dept=${dept}`),
  create: (data) => api.post('/blocks/', data),
  approve: (id) => api.post(`/blocks/${id}/approve/`),
  emergency: (data) => api.post('/blocks/emergency/', data),
  getConflicts: () => api.get('/blocks/conflicts/'),
  resolve: (id, resolution) => api.post(`/blocks/${id}/resolve/`, resolution),
};

// services/ontologyService.js
import api from './api';

export const ontologyService = {
  getAffectedTrains: (sectionId) => 
    api.get(`/ontology/reason/?section=${sectionId}`),
  syncStatus: () => api.get('/ontology/sync/'),
};
```

---

## 6. Auth Flow (Frontend)

### 6.1 Token Storage Strategy

| Token | Storage | Justification |
|-------|---------|---------------|
| **Access Token** | Zustand memory store (never localStorage) | XSS attack surface minimized; lost on page refresh but short-lived (60 min) |
| **Refresh Token** | HttpOnly cookie (set by backend) | JavaScript access impossible; secure against XSS; auto-sent with `withCredentials` |
| **User Info** | Zustand memory store | Minimal PII in memory |

**Why not localStorage for access token?**
- `localStorage` is vulnerable to XSS — malicious scripts can steal tokens.
- Memory storage is cleared on page refresh, forcing refresh token rotation (more secure).
- Internal enterprise application: session security takes priority over persistence.

### 6.2 Authentication Flow

```
┌─────────────┐
│  LoginPage  │
│  (React)    │
└──────┬──────┘
       │ POST /api/v1/auth/login/
       │ { username, password }
       ▼
┌─────────────┐     ┌─────────────────────────────────────────┐
│   Backend   │────►│ • Validate credentials                  │
│   (Django)  │     │ • Generate access token (JWT, 60 min)   │
└──────┬──────┘     │ • Set refresh token in httpOnly cookie  │
       │             │ • Return: { user, access_token }        │
       │             └─────────────────────────────────────────┘
       │ { user, access_token }
       ▼
┌─────────────┐     ┌─────────────────────────────────────────┐
│  authStore  │────►│ • Save access_token in memory           │
│  (Zustand)  │     │ • Save user object                      │
└──────┬──────┘     │ • isAuthenticated = true                │
       │             └─────────────────────────────────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────────────────────────────────┐
│  Role-based │────►│ • COA → /coa                            │
│  Redirect   │     │ • ENG_JE → /eng                         │
│             │     │ • TRD_JE → /trd                         │
│             │     │ • SNT_JE → /snt                         │
└─────────────┘     └─────────────────────────────────────────┘

Token Refresh (Silent):
┌─────────────┐
│  API Call   │──401──┐
│  Fails      │       │
└─────────────┘       ▼
              ┌───────────────┐
              │ Interceptor   │
              │ catches 401   │
              └───────┬───────┘
                      │ POST /api/v1/auth/refresh/ (cookie auto-sent)
                      ▼
              ┌───────────────┐
              │ Backend       │
              │ returns new   │
              │ access_token  │
              └───────┬───────┘
                      │ Update authStore
                      ▼
              ┌───────────────┐
              │ Retry original│
              │ API call      │
              └───────────────┘

Logout:
┌─────────────┐
│  Logout     │──► POST /api/v1/auth/logout/
│  Button     │    • Backend blacklists refresh token in Redis
└─────────────┘    • Frontend clears authStore
                   • Redirect to /login
```

---

## 7. Build & Bundle

### 7.1 Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8001',
        ws: true,
      },
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          mapbox: ['mapbox-gl'],
          charts: ['recharts'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand', '@tanstack/react-query', 'axios'],
        },
      },
    },
  },
  define: {
    'process.env.VITE_MAPBOX_TOKEN': JSON.stringify(process.env.VITE_MAPBOX_TOKEN),
  },
});
```

### 7.2 Bundle Size Budgets

| Chunk | Max Size (Gzipped) | Current Estimate |
|-------|-------------------|------------------|
| `index` (app logic) | 100 KB | 60 KB |
| `vendor` (React, Router, Zustand, Query, Axios) | 150 KB | 120 KB |
| `mapbox` (Map GL JS) | 200 KB | 180 KB |
| `charts` (Recharts + deps) | 100 KB | 80 KB |
| **Total Initial** | **350 KB** | **280 KB** |
| **Total Lazy Loaded** | **300 KB** | **260 KB** |

---

## 8. Styling & Theming

### 8.1 Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // Always dark for control room
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Railway Control Room Dark Theme
        'control-bg': '#0a0e1a',        // Deep navy background
        'control-panel': '#111827',      // Panel background
        'control-border': '#1f2937',     // Border color
        'control-text': '#e5e7eb',       // Primary text
        'control-muted': '#6b7280',      // Secondary text
        
        // Status Colors (match map)
        'status-free': '#00ff88',        // 🟢 Free section
        'status-blocked': '#ff4444',     // 🔴 Blocked
        'status-pending': '#ffaa00',     // 🟡 Pending
        'status-emergency': '#ff0066',   // 🚨 Emergency
        
        // Department Colors
        'dept-eng': '#3b82f6',           // Engineering - Blue
        'dept-trd': '#f59e0b',           // Traction - Amber
        'dept-snt': '#10b981',           // Signal - Emerald
        'dept-coa': '#8b5cf6',           // Control - Violet
        
        // Priority Colors
        'priority-critical': '#ef4444',  // Red
        'priority-high': '#f97316',      // Orange
        'priority-medium': '#eab308',    // Yellow
        'priority-low': '#3b82f6',       // Blue
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'dash-flow': 'dashFlow 1s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 10px currentColor' },
          '50%': { opacity: 0.7, boxShadow: '0 0 20px currentColor' },
        },
        dashFlow: {
          to: { strokeDashoffset: '-20' },
        },
      },
    },
  },
  plugins: [],
};
```

### 8.2 Global Styles

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-control-bg text-control-text font-sans antialiased;
  }
  
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    @apply bg-control-bg;
  }
  ::-webkit-scrollbar-thumb {
    @apply bg-control-border rounded-full;
  }
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-control-muted;
  }
  
  .map-container {
    @apply w-full h-full bg-control-bg;
  }
}

@layer components {
  .control-panel {
    @apply bg-control-panel border border-control-border rounded-lg p-4 shadow-lg;
  }
  
  .status-indicator {
    @apply inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold;
  }
  
  .data-row {
    @apply flex justify-between items-center py-2 border-b border-control-border last:border-0;
  }
}
```

### 8.3 Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Laptop (default dev viewport) |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Big Screen / Control Room Display |

*Control Room Mode:* `2xl` breakpoint-এ sidebar auto-hide, map full-screen, all panels overlay.

---

## 9. WebSocket Client Integration

```javascript
// services/websocket.js
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { useMapStore } from '../stores/mapStore';
import { QueryClient } from '@tanstack/react-query';

export class BlockWebSocket {
  constructor(queryClient) {
    this.ws = null;
    this.queryClient = queryClient;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  connect() {
    const token = useAuthStore.getState().accessToken;
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8001'}/ws/blocks/?token=${token}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected to Railway Control Stream');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (err) {
        console.error('Invalid WS payload:', err);
      }
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectAttempts++;
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case 'block_update':
        if (this.queryClient) {
          this.queryClient.invalidateQueries({ queryKey: ['blocks'] });
        }
        break;
      case 'conflict_alert':
        useUIStore.getState().setActiveConflict(data.payload);
        break;
      case 'emergency_broadcast':
        useUIStore.getState().setEmergencyAlert(data.payload);
        break;
      case 'train_position':
        useMapStore.getState().updateTrainPosition(
          data.payload.train_id,
          data.payload.coordinates
        );
        break;
      case 'section_status_change':
        useMapStore.getState().updateSectionStatus(
          data.payload.section_id,
          data.payload.status
        );
        break;
      default:
        console.log('Unknown WS event:', data.type);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
```

---

## 10. Performance Budgets

| Metric | Target | Measurement Tool | Optimization Strategy |
|--------|--------|------------------|-----------------------|
| **First Contentful Paint (FCP)** | < 1.5s | Lighthouse | Preload critical CSS, inline Tailwind base |
| **Time to Interactive (TTI)** | < 3.0s | Lighthouse | Code splitting, lazy load Mapbox |
| **Largest Contentful Paint (LCP)** | < 2.5s | Lighthouse | Optimize hero map load, skeleton UI |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Lighthouse | Fixed aspect ratios for map containers |
| **Bundle Size (initial)** | < 350 KB gzipped | `vite-bundle-visualizer` | Manual chunks, tree shaking |
| **Map Load Time** | < 2.0s | Mapbox Performance API | Lazy init, cached style JSON |
| **WebSocket Connection** | < 500ms | Browser DevTools | Connection on auth success, not page load |
| **API Response (p95)** | < 500ms | Axios interceptors | TanStack Query caching, stale-while-revalidate |

---

## 11. Next File Dependency Note

> পরবর্তী ফাইল: `01-tech-infra/02-data-layer.md`

`01-frontend-core.md` থেকে `02-data-layer.md`-এ নেওয়া হবে:

| Frontend Decision | Database/Cache Impact |
|-------------------|-----------------------|
| TanStack Query Keys | `['blocks', 'pending']` → Redis cache key pattern design (`cache:blocks:pending:*`) |
| Zustand Auth Store | Session storage strategy — Redis `session:{jwt}` TTL design |
| Access Token (60 min) | JWT expiry → MySQL `users` table `last_login` tracking |
| Refresh Token (httpOnly cookie) | Token blacklist table design in MySQL & Redis |
| WebSocket Groups | Redis Pub/Sub channel naming: `dept:ENG`, `dept:COA`, `section:HWH-KGP` |
| Map Section Data | MySQL `sections` table geometry/GeoJSON storage, Spatial Indexing |
| Block Timeline | MySQL `blocks` table time-range queries, Composite indexes on `(status, priority)` |
| Notification List | MySQL `notifications` table + Redis unread count cache |
| Big Screen Mode | Database indexing and Redis aggregated KPI caching (block utilization, conflict rate) |

`02-data-layer.md`-এ নিচের বিষয়গুলো থাকবে:
- MySQL 8.0 schema design (all 8 apps with InnoDB engine & utf8mb4)
- Entity Relationship Diagram (ASCII)
- Per-table column definitions, indexes, foreign keys
- Redis cache strategy (key patterns, TTL, invalidation)
- Owlready2 quadstore file structure
- Migration strategy and seeding approach
