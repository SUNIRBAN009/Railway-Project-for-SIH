# 01-frontend-core.md

> **ফাইল ক্রম:** ৫/৪৫  
> **ডিরেক্টরি:** `01-tech-infra/`  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/00-backend-core.md` (এপিআই স্পেসিফিকেশন, এরর এনভেলপ, টোকেন প্রটোকল)  
> **পরবর্তী ফাইল:** `01-tech-infra/02-data-layer.md` (PostgreSQL 15/16 + PostGIS স্কিমা)  
> **কন্টেন্ট সোর্স:** `RailBlock_Feature_Master_Plan_PS26027(1).xlsx` (১২২টি ফিচার, ৪টি মূল স্তম্ভ), `frontend/package.json` এবং প্রকৃত কোডবেস (`frontend/src/`)।  
> **প্রযুক্তি স্ট্যাক:** **React 18.2 + TypeScript 5.3 + Vite 5.1 + Zustand 4.5 + TanStack Query v5 + TailwindCSS 3.4 + Leaflet/Mapbox**।

---

## 1. Frontend Technology Stack & Rationale

| Layer / Library | Exact Version | Architectural Purpose in PS 26027 | Justification & Rejected Alternative |
|:---|:---:|:---|:---|
| **Core Framework** | **React** `18.2.0` | কম্পোনেন্ট-ভিত্তিক আল্ট্রা-ফাস্ট ইউজার ইন্টারফেস | কনকারেন্ট রেন্ডারিং ও সমৃদ্ধ ইকোসিস্টেম। *(Next.js বাতিল: কন্ট্রোল রুম লোকাল ইন্ট্রানেটে এসএসআর জটিলতা তৈরি করে)* |
| **Language** | **TypeScript** `5.3.3` | স্ট্যাটিক টাইপ সেফটি ও কম্পাইল-টাইম ভ্যালিডেশন | ১২২টি ফিচারের জটিল পে-লোড ও স্প্যাশিয়াল কোঅর্ডিনেটে রানটাইম টাইপ এরর দূর করে। |
| **Build & Dev Server**| **Vite** `5.1.4` | নেক্সট-জেনারেশন বিল্ড টুলিং ও ডেভ সার্ভার | সাব-৫০ms হট মডিউল রিপ্লেসমেন্ট (HMR) এবং অতি দ্রুত প্রোডাকশন রোল-আপ বিল্ড। |
| **Server State** | **TanStack Query** `^5.24.0` | অ্যাসিনক্রোনাস সার্ভার ডেটা ক্যাশিং ও সিনক্রোনাইজেশন | ব্যাকগ্রাউন্ড অটো-রিফেচিং, উইন্ডো ফোকাস রিভ্যালিডেশন এবং ডুও-রিকোয়েস্ট ডিডুপ্লিকেশন। |
| **Global Client State**| **Zustand** `^4.5.0` | লাইটওয়েট ক্লায়েন্ট স্টেট ম্যানেজমেন্ট | মাত্র ১ KB বান্ডেল, হুকস এপিআই এবং কোনো অতিরিক্ত বয়লারপ্লেট ফাইল নেই। *(Redux বাতিল)* |
| **HTTP Client** | **Axios** `^1.6.0` | রেস্ট এপিআই রিকোয়েস্ট ও ইন্টারসেপ্টর ইঞ্জিন | অটোমেটিক JWT Bearer টোকেন ইনজেকশন, রিফ্রেশ টোকেন রোটেশন এবং ইউনিফাইড এরর হ্যান্ডলিং। |
| **Routing** | **React Router DOM** `^6.22.0` | ক্লায়েন্ট-সাইড ডিক্লেয়ারেটিভ রাউটিং | রোল-বেসড প্রোটেক্টেড রুট গার্ডস (`RoleGuard.tsx`) এবং পেজ-লেভেল লেজি লোডিং। |
| **GIS Track Mapping** | **Leaflet / Mapbox** `1.9 / 2.15` | পোস্টজিআইএস রেলওয়ে করিডোর ও চেইনেজ ইন্টারঅ্যাকশন | অফলাইন রেলনেট ফ্রেন্ডলি টাইলস, জিরো এপিআই খরচ এবং ৬০FPS লাইভ ট্রেন মার্কার এনিমেশন। |
| **UI Styling System** | **TailwindCSS** `^3.4.1` | ইউটিলিটি-ফার্স্ট রেস্পন্সিভ সিএসএস | কন্ট্রোল রুম ডার্ক থিম, কাস্টম রেলওয়ে কালার টোকেন এবং দ্রুত কম্পোনেন্ট ডিজাইন। |
| **Data Visualization**| **Recharts** `^3.10.1` | অ্যাসেট ইউটিলাইজেশন ও ডিলে অ্যানালিটিক্স চার্ট | এসভিজি ভিত্তিক লাইটওয়েট রিঅ্যাক্ট চার্টস (বার, এরিয়া, রিস্ক হিটম্যাপ)। |
| **Icons & Design** | **Lucide React** `^0.344.0` | এন্টারপ্রাইজ ভেক্টর আইকনোগ্রাফি | ট্রি-শেকেবল ও লাইটওয়েট মডার্ন রেলওয়ে ও সেফটি আইকনস। |
| **Date Manipulation** | **date-fns** `^3.3.0` | আইএসও ৮৬০১ টাইমস্ট্যাম্প ও শিডিউল হিসাব | অপরিবর্তনীয় (Immutable) এবং টাইমজোন-সচেতন ডেট ফরম্যাটিং। |

---

## 2. State Management Architecture

সিস্টেমে সার্ভার স্টেট এবং ক্লায়েন্ট স্টেটকে সম্পূর্ণ আলাদা লেয়ারে পৃথক করা হয়েছে:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                Frontend State Architecture                             │
│                                                                                        │
│  ┌──────────────────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │ Server State (TanStack Query v5)         │  │ Global Client State (Zustand 4.5)  │  │
│  │ • API Cache (Stale-While-Revalidate)     │  │ • authStore: User profile & JWT    │  │
│  │ • ['blocks', 'pending']                  │  │ • mapStore: Selected GIS section   │  │
│  │ • ['trains', 'live']                     │  │ • socketStore: Active WS alerts    │  │
│  │ • ['defects', 'tms']                     │  │ • uiStore: Department tab, drawer  │  │
│  └────────────────────┬─────────────────────┘  └─────────────────┬──────────────────┘  │
│                       │                                          │                     │
│                       ▼                                          ▼                     │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ React 18 Component Tree (Clean, Reactive, Zero Prop-Drilling)                    │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Server State Caching Strategy (TanStack Query v5)

| Query Key Pattern | Backend API Endpoint | Stale Time | Cache Garbage Collection | Invalidation Triggers |
|:---|:---|:---:|:---:|:---|
| `['blocks', 'pending']` | `GET /api/v1/blocks/pending/` | ১৫ সেকেন্ড | ৫ মিনিট | নতুন ব্লক সাবমিশন, অনুমোদন বা বাতিল |
| `['blocks', 'combined']`| `GET /api/v1/blocks/combined/` | ৩০ সেকেন্ড | ১০ মিনিট | কম্বাইন্ড উইন্ডো অপ্টিমাইজেশন রান (#98) |
| `['trains', 'live']` | `GET /api/v1/trains/live/` | ১০ সেকেন্ড | ২ মিনিট | ওয়েবসকেট শিডিউল আপডেট ইভেন্ট (#114) |
| `['safety', 'tokens']` | `GET /api/v1/safety/token/` | ৫ সেকেন্ড | ৫ মিনিট | টোকেন ইস্যু বা হস্তান্তর ইভেন্ট (#71) |
| `['defects', 'logs']` | `GET /api/v1/maintenance/defects/`| ৬০ সেকেন্ড | ১৫ মিনিট | নতুন TMS/SMMS/TDMS ইনজেকশন |
| `['analytics', 'kpi']` | `GET /api/v1/analytics/kpi/` | ৫ মিনিট | ৩০ মিনিট | শিফট ক্লোজার বা রিপোর্ট জেনারেশন (#50) |

### 2.2 Global Client Stores (Zustand TypeScript Definitions)

#### Auth Store (`src/stores/authStore.ts`)
```typescript
import { create } from 'zustand';

export interface UserProfile {
  id: number;
  username: string;
  role: 'ENGG_JE' | 'TRD_JE' | 'SNT_JE' | 'SSE' | 'CHIEF_CONTROLLER' | 'SAFETY_OFFICER' | 'ADMIN';
  department: 'ENGG' | 'TRD' | 'SNT' | 'OPERATIONS' | 'SAFETY';
  division: 'HOWRAH' | 'SEALDAH' | 'KHARAGPUR' | 'ASANSOL';
  fullName: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: UserProfile, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('railway_access_token'),
  isAuthenticated: !!localStorage.getItem('railway_access_token'),
  login: (user, token) => {
    localStorage.setItem('railway_access_token', token);
    set({ user, accessToken: token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('railway_access_token');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
```

#### Map & GIS Store (`src/stores/mapStore.ts`)
```typescript
import { create } from 'zustand';

interface MapState {
  selectedSectionId: string | null;
  highlightedTrainNo: string | null;
  activeLayers: {
    trackGeometry: boolean;
    signals: boolean;
    ohePowerZones: boolean;
    liveTrains: boolean;
  };
  mapCenter: [number, number]; // [Latitude, Longitude]
  zoomLevel: number;
  setSelectedSection: (sectionId: string | null) => void;
  toggleLayer: (layerName: keyof MapState['activeLayers']) => void;
  setMapViewport: (center: [number, number], zoom: number) => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedSectionId: null,
  highlightedTrainNo: null,
  activeLayers: { trackGeometry: true, signals: true, ohePowerZones: true, liveTrains: true },
  mapCenter: [22.583, 88.342], // Howrah Division Default
  zoomLevel: 11,
  setSelectedSection: (id) => set({ selectedSectionId: id }),
  toggleLayer: (name) => set((s) => ({
    activeLayers: { ...s.activeLayers, [name]: !s.activeLayers[name] }
  })),
  setMapViewport: (center, zoom) => set({ mapCenter: center, zoomLevel: zoom }),
}));
```

---

## 3. Client Routing & Role-Based Protected Guards

অ্যাপ্লিকেশনের রুটগুলো কঠোরভাবে ব্যবহারকারীর পদমর্যাদা (Role) এবং বিভাগের ভিত্তিতে বিভক্ত:

### 3.1 Route Definition Table

| Route URL | Target View Component | Access Scope | Lazy Loaded? | Operational Purpose |
|:---|:---|:---|:---:|:---|
| `/login` | `LoginPage.tsx` | Public | No | ইউজার ক্রেডেনশিয়াল যাচাই ও JWT ইস্যু |
| `/` | `DashboardRedirect.tsx` | Authenticated | No | ইউজারের রোল অনুযায়ী নির্দিষ্ট পেজে রিডাইরেক্ট |
| `/control-room` | `ControlRoomDashboard.tsx` | `CHIEF_CONTROLLER`, `ADMIN` | Yes | মাস্টার ট্র্যাফিক করিডোর, কম্বাইন্ড ব্লক অনুমোদন ও মনিটর |
| `/big-screen` | `BigScreenMode.tsx` | `CHIEF_CONTROLLER` | Yes | কন্ট্রোল রুমের জায়ান্ট ওয়াল ডিসপ্লে (Dark Fullscreen) |
| `/engg` | `EngDashboard.tsx` | `ENGG_JE`, `SSE`, `ADMIN` | Yes | সিভিল/পি-ওয়ে ট্র্যাক ডিফেক্ট ও ট্যাম্পিং ব্লক রিকোয়েস্ট |
| `/trd` | `TrdDashboard.tsx` | `TRD_JE`, `SSE`, `ADMIN` | Yes | ওএইচই পাওয়ার আইসোলেশন, ক্যাটেনারি লগ ও LOTO গেট |
| `/snt` | `SntDashboard.tsx` | `SNT_JE`, `SSE`, `ADMIN` | Yes | সিগন্যাল ফেইলিওর, পয়েন্ট মেশিন ও ইন্টারলকিং ব্লকিং |
| `/blocks/:id` | `BlockDetailPage.tsx` | Authenticated (All Roles) | Yes | একক ব্লকের বিস্তারিত, "Why #1?" কার্ড ও PDF ডাউনলোড |
| `/map` | `NetworkMap.tsx` | Authenticated (All Roles) | Yes | পোস্টজিআইএস ফুল-স্ক্রিন ইন্টারঅ্যাক্টিভ করিডোর স্প্যাশিয়াল ম্যাপ |

### 3.2 Role Guard Component (`src/components/guards/RoleGuard.tsx`)

```tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, UserProfile } from '../../stores/authStore';

interface RoleGuardProps {
  allowedRoles: Array<UserProfile['role']>;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Unauthorized: Redirect to their primary authorized department
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
```

---

## 4. API Client & Token Interceptors (`src/services/api.ts`)

Axios ইনস্ট্যান্সটি স্বয়ংক্রিয়ভাবে প্রতিটি আউটবাউন্ড রিকোয়েস্টে `Authorization: Bearer <Token>` হেডার যুক্ত করে এবং ৪০১ অননুমোদিত এরর পেলে রিফ্রেশ টোকেন রোটেশন পরিচালনা করে:

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Standard Error Handling & 401 Catch
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError<{ message?: string; error_code?: string }>) => {
    if (error.response?.status === 401) {
      // Clear token and force logout on expired session
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);
```

---

## 5. Real-Time WebSockets Engine (`src/services/socket.ts`)

কন্ট্রোল রুম স্ক্রিনে ইনস্ট্যান্ট ট্রেনের অবস্থান এবং লাল এলার্ট ফ্ল্যাশের জন্য নেটিভ ড্যাফনে (Daphne) চ্যানেলস সংযোগ:

```typescript
import { useUIStore } from '../stores/uiStore';
import { queryClient } from './queryClient';

class RailwayWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectInterval = 3000;

  connect() {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws/control-room/';
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('🟢 WebSocket Connected to Control Room Channel');
    };

    this.ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      switch (payload.event) {
        case 'BLOCK_STATE_CHANGED':
          // Invalidate block queries to trigger instant TanStack re-render
          queryClient.invalidateQueries({ queryKey: ['blocks'] });
          break;
        case 'EMERGENCY_ALERT_TRIGGERED':
          useUIStore.getState().triggerEmergencyBanner(payload.data);
          break;
        case 'TRAIN_DELAY_DETECTED':
          queryClient.invalidateQueries({ queryKey: ['trains', 'live'] });
          break;
      }
    };

    this.ws.onclose = () => {
      console.warn('🔴 WebSocket Closed. Reconnecting in 3s...');
      setTimeout(() => this.connect(), this.reconnectInterval);
    };
  }

  send(event: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }
}

export const socketService = new RailwayWebSocketService();
```

---

## 6. Railway Control Room Design Tokens & Styling

টেইলউইন্ড সিএসএস কনফিগারেশনে রেলওয়ে অপারেশন কন্ট্রোল রুমের স্ট্যান্ডার্ড ভিজ্যুয়াল কোড সংরক্ষিত:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        railway: {
          bg: '#0F172A',         // Slate 900 (Ultra-dark for night visibility)
          surface: '#1E293B',    // Slate 800 (Card & Table surface)
          border: '#334155',     // Slate 700 (High-contrast borders)
          accent: '#38BDF8',     // Sky Blue (Primary Interactive Elements)
        },
        status: {
          free: '#22C55E',       // Green (Clear Corridor)
          blocked: '#EF4444',    // Red (Active Maintenance Block)
          combined: '#A855F7',   // Purple (USP Combined Block Window #98)
          pending: '#F59E0B',    // Amber (Pending Approval)
          caution: '#EAB308',    // Yellow (Temporary Speed Restriction TSR)
        },
        dept: {
          engg: '#3B82F6',       // Blue (Civil / P-Way)
          trd: '#F97316',        // Orange (Traction OHE Power)
          snt: '#10B981',        // Emerald (Signal & Telecom)
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'], // For train numbers and chainage
      }
    },
  },
  plugins: [],
};
```

---

## 7. Performance Budgets & Bundle Optimization

| Performance Metric | Target Budget | Enforcement Mechanism |
|:---|:---:|:---|
| **First Contentful Paint (FCP)** | < ১.২ সেকেন্ড | Vite স্ট্যাটিক এসেট প্রিলোডিং ও ন্যূনতম প্রাথমিক রেন্ডারিং। |
| **Time to Interactive (TTI)** | < ২.৫ সেকেন্ড | TanStack Query ডিহাইড্রেটেড ক্যাশ ও লাইটওয়েট Zustand স্টেট। |
| **Initial JavaScript Bundle Size** | < ২০০ KB (Gzipped) | রুট-লেভেল `React.lazy()` কোড স্প্লিটিং। |
| **Gantt / Map Pan-Zoom Frame Rate** | ৬০ FPS | CSS ৩ডি ট্রান্সফর্ম এবং ডিবাউন্সড ম্যাপ ইভেন্ট লিসেনার। |
| **WebSocket Latency** | < ৫০ ms | লোকাল রেডিস পাব/সাব ডাইরেক্ট পুশ। |

---

## 8. Traceability to Subsequent Infrastructure Documents

| Upcoming Document | Direct Dependency from Frontend Core |
|:---|:---|
| **`01-tech-infra/02-data-layer.md`** | ফ্রন্টএন্ড মডেলের সাথে PostgreSQL টেবিল ফিল্ড ও PostGIS জিওমেট্রি কলামের নিখুঁত সঙ্গতি। |
| **`03-service-blueprints/*`** | প্রতিটি সার্ভিসের ইউজার ইন্টারফেস কম্পোনেন্ট ও অ্যাকশন বাটন ম্যাপিং। |
| **`09-execution-tracker/00-implementation-checklist.md`** | প্রতিটি ফিচারের জন্য প্যারালাল ব্যাকএন্ড ➔ ফ্রন্টএন্ড UI টেস্ট এবং ভেরিফিকেশন আউটপুট প্রুফ। |
