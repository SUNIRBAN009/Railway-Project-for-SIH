# 03-state-management.md

> **File Sequence:** 37/45  
> **Previous Document:** [05-deep-dive-logs/02-error-code-registry.md](02-error-code-registry.md)  
> **Next Document:** [05-deep-dive-logs/04-bug-log-template.md](04-bug-log-template.md)  
> **Context:** Comprehensive state synchronization architecture across React 18 frontend, Daphne WebSocket push-to-invalidate channels, and MySQL 8.0 optimistic concurrency controls.

---

# Real-Time Distributed State Management & Cache Invalidation Architecture

---

## 1. Dual-Tier State Architecture Overview

```
+-------------------------------------------------------------------------------+
|                      CLIENT-SERVER STATE SYNCHRONIZATION                      |
+-------------------------------------------------------------------------------+
|  React 18 UI  <---- [1. HTTPS REST Data Query] ---->  Django REST Framework   |
|  TanStack Query                                                 |             |
|   Cache Key:                                           [2. ACID Write / Mutate|
|  ['blocks', id]                                                 v             |
|       ^                                              MySQL 8.0 (InnoDB)       |
|       |                                                Version Column + 1     |
|       |                                                         |             |
|  [4. Invalidate Query Cache]                                [3. Outbox Event] |
|       |                                                         v             |
|  Daphne WebSocket  <---- [WSS Push Frame] <---- Redis 7 Channel Layer         |
|  (/ws/v1/live/)                                (events:blocks)                |
+-------------------------------------------------------------------------------+
```

The system uses a **"Push-to-Invalidate"** architecture rather than pushing full data blobs over WebSockets:
1. **Source of Truth:** MySQL 8.0 InnoDB tables.
2. **Client-Side Cache:** Managed by TanStack Query v5 in React.
3. **Notification Layer:** Lightweight WebSocket frames inform connected clients that a specific entity or domain collection has transitioned, triggering automatic, deterministic background refetches.

---

## 2. TanStack Query Cache Hierarchy

```typescript
// Standard Query Key Factories in frontend/src/lib/queryKeys.ts
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
    live: (corridor: string) => ['trains', 'live', corridor] as const,
    schedule: (trainNumber: string) => ['trains', 'schedule', trainNumber] as const,
  },
  assets: {
    corridor: (corridorId: string) => ['assets', 'corridor', corridorId] as const,
  }
};
```

---

## 3. WebSocket Invalidation Handler (React 18)

```typescript
// frontend/src/hooks/useCorridorSocket.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export function useCorridorSocket(corridorCode: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const wsUrl = `wss://${window.location.host}/ws/v1/notifications/?token=${token}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'INVALIDATE_CACHE') {
        switch (message.domain) {
          case 'BLOCKS':
            // Invalidate all block list queries to refresh the corridor timeline
            queryClient.invalidateQueries({ queryKey: queryKeys.blocks.lists() });
            if (message.entity_id) {
              queryClient.invalidateQueries({ queryKey: queryKeys.blocks.detail(message.entity_id) });
            }
            break;
          case 'TRAINS':
            queryClient.invalidateQueries({ queryKey: queryKeys.trains.live(corridorCode) });
            break;
        }
      }
    };

    return () => socket.close();
  }, [corridorCode, queryClient]);
}
```

---

## 4. Optimistic UI Updates & Rollback Pattern

When a Section Controller sanctions a block in the UI, optimistic updates guarantee zero perceptual lag:

```typescript
// Optimistic Sanction Mutation
const sanctionMutation = useMutation({
  mutationFn: (blockId: string) => api.blocks.sanction(blockId),
  onMutate: async (blockId) => {
    // 1. Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: queryKeys.blocks.detail(blockId) });

    // 2. Snapshot previous state
    const previousBlock = queryClient.getQueryData(queryKeys.blocks.detail(blockId));

    // 3. Optimistically set status to SANCTIONED
    queryClient.setQueryData(queryKeys.blocks.detail(blockId), (old: any) => ({
      ...old,
      status: 'SANCTIONED',
      sanctioned_at: new Date().toISOString()
    }));

    return { previousBlock };
  },
  onError: (err, blockId, context) => {
    // 4. Rollback on failure (e.g. 409 Conflict with high-speed Rajdhani)
    if (context?.previousBlock) {
      queryClient.setQueryData(queryKeys.blocks.detail(blockId), context.previousBlock);
    }
    toast.error(`Sanction failed: ${err.message}`);
  },
  onSettled: (data, err, blockId) => {
    // 5. Always refetch authoritative server state
    queryClient.invalidateQueries({ queryKey: queryKeys.blocks.detail(blockId) });
  }
});
```

---

## 5. Concurrent Modification & Optimistic Locking in MySQL

To prevent race conditions when two controllers simultaneously attempt to modify or approve a block possession:

```sql
-- Step 1: Query current version
SELECT id, status, version FROM blocks WHERE id = 'block-uuid-4412';

-- Step 2: Atomic update with version check
UPDATE blocks 
SET status = 'SANCTIONED', 
    version = version + 1,
    sanctioned_by_user_id = 'controller-uuid-1',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 'block-uuid-4412' AND version = 1;

-- If rows affected == 0 -> Another controller updated the record.
-- Return HTTP 409 Conflict with error code BLK-006.
```
