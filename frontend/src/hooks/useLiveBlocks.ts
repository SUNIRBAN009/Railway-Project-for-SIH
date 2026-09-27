import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Block, DepartmentCode } from '../types';
import { blockService } from '../services/api';
import { useBlockStore } from '../stores/blockStore';
import { REALTIME_BUS_NAME } from '../utils/realtimeBus';

const EMPTY_BLOCKS: Block[] = [];

export function useLiveBlocks(department?: DepartmentCode) {
  const fetchBlocks = useCallback(async (): Promise<Block[]> => {
    try {
      const apiBlocks = await blockService.getBlocks(
        department ? { department } : undefined
      );
      if (Array.isArray(apiBlocks)) {
        const mapped = apiBlocks.map((b: any) => ({
          ...b,
          start_km: typeof b.start_km === 'string' ? parseFloat(b.start_km) : Number(b.start_km),
          end_km: typeof b.end_km === 'string' ? parseFloat(b.end_km) : Number(b.end_km),
          corridor:
            typeof b.corridor === 'object' && b.corridor !== null
              ? b.corridor
              : { code: b.corridor_code || 'NDLS-CNB-MAIN', name: b.corridor_name || 'NDLS-CNB Main Corridor' },
          version: typeof b.version === 'number' ? b.version : 1,
        }));

        // Seamlessly merge any local pending/proposed blocks that may be in transition
        const storeBlocks = useBlockStore.getState().blocks;
        const pendingLocal = storeBlocks.filter(
          (sb) =>
            ['PENDING_APPROVAL', 'PROPOSED', 'SUBMITTED', 'COORDINATED'].includes(sb.status) &&
            (!department || sb.department_code === department) &&
            !mapped.some((mb) => mb.id === sb.id || mb.block_code === sb.block_code)
        );

        return [...pendingLocal, ...mapped];
      }
    } catch (apiErr) {
      console.warn('blockService.getBlocks call failed, falling back to local block store:', apiErr);
    }

    const storeBlocks = useBlockStore.getState().blocks;
    const filteredStore = department
      ? storeBlocks.filter((b) => b.department_code === department)
      : storeBlocks;
    if (filteredStore && filteredStore.length > 0) {
      return filteredStore;
    }

    const url = department
      ? `/api/v1/demo/blocks/?department=${department}`
      : '/api/v1/demo/blocks/';
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.blocks) {
        return data.blocks;
      }
    } catch (e) {
      console.error('Failed to fetch demo blocks:', e);
    }
    return [];
  }, [department]);

  // TanStack Query integration with queryKey: ['blocks', department] (TSK-P3-01-FE)
  const {
    data: blocksData = EMPTY_BLOCKS,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['blocks', department || 'all'],
    queryFn: fetchBlocks,
    staleTime: 3000,
    refetchInterval: 5000,
  });

  const [localBlocks, setLocalBlocks] = useState<Block[]>(blocksData);

  useEffect(() => {
    setLocalBlocks(blocksData);
  }, [blocksData]);

  // Reactive listener for push-to-invalidate custom events & cross-tab BroadcastChannel
  useEffect(() => {
    const handleBlockUpdate = () => {
      refetch();
    };
    window.addEventListener('corridor_block_updated', handleBlockUpdate);

    // Cross-tab broadcast listener
    let bus: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bus = new BroadcastChannel(REALTIME_BUS_NAME);
        bus.onmessage = (ev) => {
          if (ev.data?.type?.includes('BLOCK')) {
            refetch();
          }
        };
      } catch {}
    }

    return () => {
      window.removeEventListener('corridor_block_updated', handleBlockUpdate);
      if (bus) {
        bus.close();
      }
    };
  }, [refetch]);

  return {
    blocks: localBlocks,
    setBlocks: setLocalBlocks,
    isLoading,
    error: queryError ? (queryError as Error).message : null,
    refetch,
  };
}
