# 03-state-management.md

> **ফাইল ক্রম:** ৩৭/৪৫  
> **ডিরেক্টরি:** `05-deep-dive-logs/`  
> **সার্ভিস স্কোপ:** Frontend State Architecture (Zustand + TanStack Query v5), Daphne WebSockets & PostgreSQL Concurrency  
> **পূর্ববর্তী ফাইল:** [05-deep-dive-logs/02-error-code-registry.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/02-error-code-registry.md) (Enterprise Railway Error Code Registry)  
> **পরবর্তী ফাইল:** [05-deep-dive-logs/04-bug-log-template.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/04-bug-log-template.md) (Production Incident Report & Bug Log Template)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের রিয়েল-টাইম স্টেট সমন্বয়, React 18 ফ্রন্টএন্ডের Zustand স্টোর ও TanStack Query v5 ক্যাশ ইনভ্যালিডেশন আর্কিটেকচার, Daphne ASGI ওয়েবসকেট পুশ-টু-ইনভ্যালিডেট প্যাটার্ন এবং PostgreSQL 15.6 অপ্টিমিস্টিক কনকারেন্সি কন্ট্রোল বিশদভাবে সংজ্ঞায়িত করা হয়েছে।

---

# Real-Time Distributed State Management & Cache Invalidation Architecture (রিয়েল-টাইম ডিস্ট্রিবিউটেড স্টেট ম্যানেজমেন্ট ও ক্যাশ আর্কিটেকচার)

## 1. Dual-Tier State Architecture Overview (দ্বি-স্তর বিশিষ্ট স্টেট আর্কিটেকচার)

```
+-------------------------------------------------------------------------------+
|                      CLIENT-SERVER STATE SYNCHRONIZATION                      |
+-------------------------------------------------------------------------------+
|  React 18 UI  <---- [1. HTTPS REST Data Query] ---->  Django REST Framework   |
|  (TanStack Query v5)                                            |             |
|   Cache Key:                                           [2. ACID Write / Mutate|
|  ['blocks', id]                                                 v             |
|       ^                                              PostgreSQL 15.6 + PostGIS|
|       |                                                Version Column + 1     |
|       |                                                         |             |
|  [4. Invalidate Query Cache]                                [3. Outbox Event] |
|       |                                                         v             |
|  Daphne ASGI WS   <---- [WSS Push Frame] <---- Redis 7 Channel Layer          |
|  (/ws/v1/live/)                                (events:blocks, events:sos)    |
+-------------------------------------------------------------------------------+
```

প্ল্যাটফর্মটিতে নেটওয়ার্ক ব্যান্ডউইথ সাশ্রয় ও ডেটা কনসিস্টেন্সি রক্ষার জন্য **"Push-to-Invalidate"** আর্কিটেকচার গৃহীত হয়েছে:
1. **Source of Truth:** PostgreSQL 15.6 + PostGIS 3.3 রিলেশনাল ও স্প্যাশিয়াল টেবিল।
2. **Client-Side Server Cache:** React 18 অ্যাপ্লিকেশনে `@tanstack/react-query` v5 দ্বারা পরিচালিত।
3. **Local Ephemeral State:** দ্রুত মিথস্ক্রিয়াশীল UI স্টেট (যেমন: ম্যাপ ভিউপোর্ট, ফর্ম ড্রাফট, অডিও সাইরেন টগল) `zustand` স্টোরে সংরক্ষিত।
4. **Push-to-Invalidate Layer:** বিশাল সাইজের পুরো ডেটা পে-লোড ওয়েবসকেটে পাঠানোর বদলে ড্যাফনি শুধুমাত্র ক্ষুদ্র ইনভ্যালিডেশন ইভেন্ট পাঠায় (`{ type: "INVALIDATE_CACHE", domain: "BLOCKS", entity_id: "..." }`), যার ফলে ব্রাউজার ব্যাকগ্রাউন্ডে স্বয়ংক্রিয়ভাবে প্রামাণ্য ডেটা রিফেচ করে নেয়।

---

## 2. Zustand Client Stores (লোকাল ক্লায়েন্ট স্টেট)

### ২.১ অথেনটিকেশন ও কুইক-সুইচ সেশন স্টোর (`useAuthStore`)
```typescript
// frontend/src/stores/useAuthStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserProfile {
  employee_id: string;
  full_name: string;
  role: 'CHIEF_CONTROLLER' | 'SECTION_CONTROLLER' | 'SITE_SUPERVISOR' | 'SAFETY_OFFICER';
  division: string;
  assigned_sections: string[];
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  activeSection: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, token: string) => void;
  switchSection: (sectionCode: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      activeSection: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, accessToken: token, isAuthenticated: true, activeSection: user.assigned_sections[0] || null }),
      switchSection: (sectionCode) => set({ activeSection: sectionCode }),
      logout: () => set({ user: null, accessToken: null, activeSection: null, isAuthenticated: false }),
    }),
    {
      name: 'railblock-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### ২.২ ইন্টারেক্টিভ ম্যাপ ও স্প্যাশিয়াল লেয়ার স্টোর (`useMapStore`)
```typescript
// frontend/src/stores/useMapStore.ts
import { create } from 'zustand';

interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

interface MapState {
  viewport: MapViewport;
  activeCorridorCode: string | null;
  showSafetyBuffer50m: boolean;
  activeLayers: {
    tracks: boolean;
    activeBlocks: boolean;
    liveTrains: boolean;
    signals: boolean;
    defects: boolean;
  };
  setViewport: (vp: Partial<MapViewport>) => void;
  setActiveCorridor: (corridorCode: string | null) => void;
  toggleSafetyBuffer: () => void;
  toggleLayer: (layer: keyof MapState['activeLayers']) => void;
}

export const useMapStore = create<MapState>((set) => ({
  viewport: { latitude: 28.6139, longitude: 77.2090, zoom: 12 }, // Default New Delhi Hub
  activeCorridorCode: null,
  showSafetyBuffer50m: true,
  activeLayers: {
    tracks: true,
    activeBlocks: true,
    liveTrains: true,
    signals: true,
    defects: true,
  },
  setViewport: (vp) => set((state) => ({ viewport: { ...state.viewport, ...vp } })),
  setActiveCorridor: (corridorCode) => set({ activeCorridorCode: corridorCode }),
  toggleSafetyBuffer: () => set((state) => ({ showSafetyBuffer50m: !state.showSafetyBuffer50m })),
  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: { ...state.activeLayers, [layer]: !state.activeLayers[layer] },
    })),
}));
```

---

## 3. TanStack Query v5 Cache Hierarchy & Query Keys

```typescript
// frontend/src/lib/queryKeys.ts
export interface BlockFilterParams {
  section_code?: string;
  status?: string;
  date?: string;
}

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  blocks: {
    all: ['blocks'] as const,
    lists: () => [...queryKeys.blocks.all, 'list'] as const,
    list: (filters: BlockFilterParams) => [...queryKeys.blocks.lists(), filters] as const,
    details: () => [...queryKeys.blocks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.blocks.details(), id] as const,
    conflicts: (id: string) => [...queryKeys.blocks.detail(id), 'conflicts'] as const,
  },
  trains: {
    all: ['trains'] as const,
    live: (corridor: string) => ['trains', 'live', corridor] as const,
    schedule: (trainNumber: string) => ['trains', 'schedule', trainNumber] as const,
    delays: (corridor: string) => ['trains', 'delays', corridor] as const,
  },
  assets: {
    all: ['assets'] as const,
    corridor: (corridorId: string) => ['assets', 'corridor', corridorId] as const,
    criticality: () => ['assets', 'criticality'] as const,
  },
  analytics: {
    availabilityScore: (division: string, period: string) => 
      ['analytics', 'availability', division, period] as const,
    varianceReport: (blockId: string) => ['analytics', 'variance', blockId] as const,
  },
  notifications: {
    unread: () => ['notifications', 'unread'] as const,
    sosActive: () => ['notifications', 'sos', 'active'] as const,
  }
};
```

---

## 4. Daphne WebSocket Push-to-Invalidate Client Hook

```typescript
// frontend/src/hooks/useCorridorSocket.ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/useAuthStore';

export function useCorridorSocket(corridorCode: string) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token || !corridorCode) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/v1/corridor/${corridorCode}/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        if (payload.type === 'INVALIDATE_CACHE') {
          switch (payload.domain) {
            case 'BLOCKS':
              queryClient.invalidateQueries({ queryKey: queryKeys.blocks.lists() });
              if (payload.entity_id) {
                queryClient.invalidateQueries({ queryKey: queryKeys.blocks.detail(payload.entity_id) });
              }
              break;
            case 'TRAINS':
              queryClient.invalidateQueries({ queryKey: queryKeys.trains.live(corridorCode) });
              break;
            case 'ASSETS':
              queryClient.invalidateQueries({ queryKey: queryKeys.assets.corridor(corridorCode) });
              break;
            case 'NOTIFICATIONS':
              queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
              break;
          }
        } else if (payload.type === 'EMERGENCY_SOS_SIREN') {
          // Immediate high-priority siren event
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.sosActive() });
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [corridorCode, token, queryClient]);
}
```

---

## 5. Optimistic UI Updates & Automated Rollback Pattern

সেকশন কন্ট্রোলার যখন কোনো ব্লকে অনুমোদন (Sanction) প্রদান করেন, তখন ব্রাউজারে শূন্য-বিলম্ব রেসপন্স নিশ্চিত করতে অপ্টিমিস্টিক আপডেট প্রয়োগ করা হয়:

```typescript
// frontend/src/features/blocks/useSanctionBlock.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';

export function useSanctionBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blockId: string) => api.blocks.sanction(blockId),
    onMutate: async (blockId: string) => {
      // 1. Cancel outgoing queries for this block to prevent overwrite
      await queryClient.cancelQueries({ queryKey: queryKeys.blocks.detail(blockId) });

      // 2. Snapshot current state for rollback
      const previousBlock = queryClient.getQueryData(queryKeys.blocks.detail(blockId));

      // 3. Optimistically set status to 'APPROVED'
      queryClient.setQueryData(queryKeys.blocks.detail(blockId), (old: any) => ({
        ...old,
        status: 'APPROVED',
        sanctioned_at: new Date().toISOString(),
      }));

      return { previousBlock };
    },
    onError: (err: any, blockId: string, context) => {
      // 4. Rollback on failure (e.g. 409 collision with Rajdhani Express or 412 safety missing)
      if (context?.previousBlock) {
        queryClient.setQueryData(queryKeys.blocks.detail(blockId), context.previousBlock);
      }
      toast.error(`Sanction Failed: ${err.response?.data?.error?.message || err.message}`);
    },
    onSettled: (_data, _err, blockId: string) => {
      // 5. Always refetch authoritative server state
      queryClient.invalidateQueries({ queryKey: queryKeys.blocks.detail(blockId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.blocks.lists() });
    },
  });
}
```

---

## 6. PostgreSQL 15.6 Optimistic Concurrency Control (OCC)

দুইজন কন্ট্রোলার একই ব্লকে যুগপৎ অনুমোদন বা এডিট করতে গেলে রেস-কন্ডিশন প্রতিরোধে PostgreSQL সংস্করণ কলাম এবং ট্রানজাকশনাল আপডেট নিশ্চিত করে:

```sql
-- Step 1: Fetch current record and version
SELECT id, status, version 
FROM blocks 
WHERE id = '7f8e9a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b';

-- Step 2: Atomic update with version match validation
UPDATE blocks 
SET status = 'APPROVED', 
    version = version + 1,
    sanctioned_by = 'EMP-CONTR-108',
    sanctioned_at = CURRENT_TIMESTAMP
WHERE id = '7f8e9a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b' 
  AND version = 3
RETURNING version;

-- Evaluation in Python/Django:
-- If rowcount == 0:
--   Raise ConcurrentModificationError (HTTP 409, code: BLK-006)
-- Else:
--   Commit transaction and trigger Redis outbox event for Daphne WebSocket broadcast.
```
