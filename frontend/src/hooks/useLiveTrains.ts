import { useState, useEffect, useCallback, useRef } from 'react';
import { trainService, LiveTrainRecord } from '../services/api';

interface UseLiveTrainsOptions {
  pollingIntervalMs?: number;
  autoSimulate?: boolean;
}

export const useLiveTrains = (options: UseLiveTrainsOptions = {}) => {
  const { pollingIntervalMs = 5000, autoSimulate = false } = options;

  const [trains, setTrains] = useState<LiveTrainRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'UP' | 'DOWN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON_TIME' | 'DELAYED' | 'REGULATED'>('ALL');
  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(autoSimulate);
  const [isTicking, setIsTicking] = useState<boolean>(false);

  const fetchLiveTrains = useCallback(async () => {
    try {
      const params: { direction?: string; status?: string } = {};
      if (directionFilter !== 'ALL') params.direction = directionFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const data = await trainService.getLiveTrains(params);
      setTrains(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch live trains');
    } finally {
      setIsLoading(false);
    }
  }, [directionFilter, statusFilter]);

  // Initial load and filter change fetch
  useEffect(() => {
    fetchLiveTrains();
  }, [fetchLiveTrains]);

  // Periodic polling for backend telemetry
  useEffect(() => {
    if (pollingIntervalMs <= 0) return;
    const interval = setInterval(fetchLiveTrains, pollingIntervalMs);
    return () => clearInterval(interval);
  }, [fetchLiveTrains, pollingIntervalMs]);

  // Step simulation tick
  const advanceSimulation = useCallback(async (deltaSeconds: number = 30) => {
    setIsTicking(true);
    try {
      await trainService.advanceSimulation(deltaSeconds);
      await fetchLiveTrains();
    } catch (err: any) {
      console.warn('Simulation tick error:', err);
    } finally {
      setIsTicking(false);
    }
  }, [fetchLiveTrains]);

  // Auto-simulation loop if enabled
  useEffect(() => {
    if (!isAutoSimulating) return;
    const interval = setInterval(() => {
      advanceSimulation(30);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoSimulating, advanceSimulation]);

  return {
    trains,
    isLoading,
    error,
    directionFilter,
    setDirectionFilter,
    statusFilter,
    setStatusFilter,
    isAutoSimulating,
    setIsAutoSimulating,
    isTicking,
    advanceSimulation,
    refresh: fetchLiveTrains,
  };
};
