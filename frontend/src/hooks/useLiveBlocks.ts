import { useState, useEffect, useCallback } from 'react';
import { Block, DepartmentCode } from '../types';
import { blockService } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useLiveBlocks(department?: DepartmentCode) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const fetchBlocks = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isAuthenticated) {
        try {
          const apiBlocks = await blockService.getBlocks(
            department ? { department } : undefined
          );
          if (Array.isArray(apiBlocks) && apiBlocks.length > 0) {
            const formatted: Block[] = apiBlocks.map((b: any) => ({
              ...b,
              start_km: typeof b.start_km === 'string' ? parseFloat(b.start_km) : Number(b.start_km),
              end_km: typeof b.end_km === 'string' ? parseFloat(b.end_km) : Number(b.end_km),
              corridor:
                typeof b.corridor === 'object' && b.corridor !== null
                  ? b.corridor
                  : { code: b.corridor_code || 'NDLS-CNB-MAIN', name: b.corridor_name || 'NDLS-CNB Main Corridor' },
              version: typeof b.version === 'number' ? b.version : 1,
            }));
            setBlocks(formatted);
            setError(null);
            return;
          }
        } catch (apiErr) {
          // If authenticated call fails, fallback to demo blocks endpoint
          console.warn('blockService.getBlocks call failed, falling back to demo endpoint:', apiErr);
        }
      }

      const url = department
        ? `/api/v1/demo/blocks/?department=${department}`
        : '/api/v1/demo/blocks/';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.blocks) {
        setBlocks(data.blocks);
        setError(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch blocks');
    } finally {
      setIsLoading(false);
    }
  }, [department, isAuthenticated]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  return { blocks, setBlocks, isLoading, error, refetch: fetchBlocks };
}

