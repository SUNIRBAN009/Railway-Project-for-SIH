import { useState, useEffect, useCallback } from 'react';
import { Block, DepartmentCode } from '../types';

export function useLiveBlocks(department?: DepartmentCode) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocks = useCallback(async () => {
    try {
      const url = department
        ? `http://127.0.0.1:8000/api/v1/demo/blocks/?department=${department}`
        : 'http://127.0.0.1:8000/api/v1/demo/blocks/';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.blocks) {
        setBlocks(data.blocks);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [department]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  return { blocks, setBlocks, isLoading, error, refetch: fetchBlocks };
}
