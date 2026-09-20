import { useQuery, useQueryClient } from '@tanstack/react-query';
import { assetService, RiskMatrixResponse } from '../services/api';
import { useEffect } from 'react';

export const useRiskMatrix = (corridor?: string) => {
  const queryClient = useQueryClient();
  const query = useQuery<RiskMatrixResponse>({
    queryKey: ['risk-matrix', corridor || 'all'],
    queryFn: () => assetService.getRiskMatrix(corridor),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Listen for live corridor update events and invalidate risk matrix
  useEffect(() => {
    const handleCorridorUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['risk-matrix'] });
    };

    window.addEventListener('corridor_block_updated', handleCorridorUpdate);
    return () => {
      window.removeEventListener('corridor_block_updated', handleCorridorUpdate);
    };
  }, [queryClient]);

  return {
    ...query,
    riskMatrix: query.data,
    whyNumberOne: query.data?.why_number_one || null,
    gridCells: query.data?.grid_cells || [],
    rankedDefects: query.data?.ranked_defects || [],
    summary: query.data?.summary || {
      total_active_defects: 0,
      extreme_risk_count: 0,
      high_risk_count: 0,
      medium_risk_count: 0,
      low_risk_count: 0,
    },
  };
};
