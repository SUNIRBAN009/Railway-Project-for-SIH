import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Block, DepartmentCode } from '../types';
import { blockService } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const EMPTY_BLOCKS: Block[] = [];

export function useLiveBlocks(department?: DepartmentCode) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const fetchBlocks = useCallback(async (): Promise<Block[]> => {
    if (isAuthenticated) {
      try {
        const apiBlocks = await blockService.getBlocks(
          department ? { department } : undefined
        );
        if (Array.isArray(apiBlocks) && apiBlocks.length > 0) {
          return apiBlocks.map((b: any) => ({
            ...b,
            start_km: typeof b.start_km === 'string' ? parseFloat(b.start_km) : Number(b.start_km),
            end_km: typeof b.end_km === 'string' ? parseFloat(b.end_km) : Number(b.end_km),
            corridor:
              typeof b.corridor === 'object' && b.corridor !== null
                ? b.corridor
                : { code: b.corridor_code || 'NDLS-CNB-MAIN', name: b.corridor_name || 'NDLS-CNB Main Corridor' },
            version: typeof b.version === 'number' ? b.version : 1,
          }));
        }
      } catch (apiErr) {
        console.warn('blockService.getBlocks call failed, falling back to demo endpoint:', apiErr);
      }
    }

    const url = department
      ? `/api/v1/demo/blocks/?department=${department}`
      : '/api/v1/demo/blocks/';
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok && data.blocks) {
      return data.blocks;
    }
    return [];
  }, [department, isAuthenticated]);

  // TanStack Query integration with queryKey: ['blocks', department] (TSK-P3-01-FE)
  const {
    data: blocksData = EMPTY_BLOCKS,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['blocks', department || 'all'],
    queryFn: fetchBlocks,
    staleTime: 10 * 1000,
  });

  const [localBlocks, setLocalBlocks] = useState<Block[]>(blocksData);

  useEffect(() => {
    setLocalBlocks(blocksData);
  }, [blocksData]);

  // Reactive listener for push-to-invalidate custom events dispatched by useCorridorSocket
  useEffect(() => {
    const handleBlockUpdate = () => {
      refetch();
    };
    window.addEventListener('corridor_block_updated', handleBlockUpdate);
    return () => {
      window.removeEventListener('corridor_block_updated', handleBlockUpdate);
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
