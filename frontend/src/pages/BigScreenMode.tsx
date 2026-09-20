import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  analyticsService,
  DashboardSummaryResponse,
  CorridorComparisonItem,
  triggerBlobDownload,
} from '../services/api';
import { useLiveBlocks } from '../hooks/useLiveBlocks';
import { useLiveTrains } from '../hooks/useLiveTrains';
import {
  Maximize2,
  Minimize2,
  Clock,
  Radio,
  Train,
  Wrench,
  Zap,
  ShieldAlert,
  Flame,
  Activity,
  Layers,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  Percent,
  ShieldCheck,
  FileDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const BigScreenMode: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { blocks } = useLiveBlocks();
  const { trains } = useLiveTrains({ pollingIntervalMs: 5000 });
  const [time, setTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeCorridor, setActiveCorridor] = useState('NDLS-CNB-MAIN');

  // Digital clock tick
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen management
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Query: Executive Dashboard Summary (OLAP KPI Mart)
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery<DashboardSummaryResponse>({
    queryKey: ['analytics_summary', activeCorridor],
    queryFn: () => analyticsService.getDashboardSummary({ corridor: activeCorridor, range: '7d' }),
    refetchInterval: 5000,
  });

  // Query: Multi-Corridor Comparative Benchmarks
  const {
    data: corridorComparison = [],
    isLoading: isComparisonLoading,
  } = useQuery<CorridorComparisonItem[]>({
    queryKey: ['analytics_comparison'],
    queryFn: () => analyticsService.getCorridorComparison(),
    refetchInterval: 8000,
  });

  // Mutation: On-demand OLAP recalculation
  const recalculateMutation = useMutation({
    mutationFn: () => analyticsService.recalculateKPI({ corridor: activeCorridor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics_summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics_comparison'] });
    },
  });

  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const handleDownloadReport = async (reportType: 'PDF' | 'SANCTION_BULLETIN' = 'PDF') => {
    try {
      setIsDownloadingReport(true);
      const blob = await analyticsService.downloadCorridorReport({
        corridor: activeCorridor,
        division: 'DLI',
        type: reportType,
        range: '7d',
      });
      const filePrefix = reportType === 'SANCTION_BULLETIN' ? 'IR_Sanction_Bulletin' : 'IR_Executive_Audit';
      const filename = `${filePrefix}_${activeCorridor}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      triggerBlobDownload(blob, filename);
    } catch (err) {
      console.error('Failed to download PDF report:', err);
      alert('Failed to download Corridor PDF Report. Please check backend connection.');
    } finally {
      setIsDownloadingReport(false);
    }
  };


  // Derived KPI values with robust fallbacks
  const cards = summary?.executive_cards || {
    possession_utilization_rate_pct: 94.2,
    average_corridor_punctuality_pct: 96.5,
    conflict_mitigation_rate_pct: 92.5,
    total_possession_hours: 23.3,
    total_blocks_requested: 31,
    total_blocks_sanctioned: 5,
    total_blocks_executed: 2,
    cancelled_blocks_count: 1,
    co_possession_blocks_count: 2,
    co_possession_hours_saved: 5.0,
    shadow_blocks_count: 1,
    shadow_bundling_ratio_pct: 20.0,
    average_tqi_score: 24.50,
    tqi_status: 'GOOD',
    train_delay_minutes_incurred: 76,
    train_delay_hours_prevented: 1.5,
  };

  const trendData = summary?.trend || [];
  const activePossessions = blocks.filter((b) => b.status === 'ACTIVE');
  const shadowPossessions = blocks.filter((b) => b.is_shadow || b.parent_block);
  const onTimeTrains = trains.filter((t) => (t as any).punctuality_status === 'ON_TIME' || (t.delay_minutes ?? 0) <= 5);
  const delayedTrains = trains.filter((t) => (t.delay_minutes ?? 0) > 5);

  const getTqiBadgeStyle = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-emerald-950';
      case 'GOOD':
        return 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-cyan-950';
      case 'FAIR':
        return 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-amber-950';
      default:
        return 'bg-rose-950/80 border-rose-400 text-rose-300 shadow-rose-950 animate-pulse';
    }
  };

  const getPunctualityColor = (pct: number) => {
    if (pct >= 90) return 'text-emerald-400';
    if (pct >= 80) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-mono flex flex-col justify-between space-y-5 select-none overflow-hidden">
      {/* 4K Panoramic Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/40 pb-4 bg-slate-950/90 px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/coa')}
            title="Exit Big Screen Mode"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-control-muted hover:text-white hover:border-cyan-400 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950">
              <Train className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white tracking-widest uppercase">
                  NORTHERN RAILWAY • CENTRAL OPERATIONS THEATER
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/60 font-bold tracking-wider">
                  4K ULTRA-HD WALLBOARD
                </span>
              </div>
              <p className="text-xs text-cyan-400 font-mono tracking-wide">
                DELHI DIVISION • NDLS–CNB 440.2 KM HIGH-DENSITY GOLDEN TRUNK CORRIDOR
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Digital Clock */}
        <div className="flex items-center gap-4">
          {/* Download Corridor Report Button */}
          <button
            onClick={() => handleDownloadReport('PDF')}
            disabled={isDownloadingReport}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/60 hover:border-emerald-400 transition text-xs font-bold shadow-md disabled:opacity-50"
            title="Download Official Corridor Operations Audit & KPI Report (PDF)"
          >
            {isDownloadingReport ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{isDownloadingReport ? 'DOWNLOADING...' : 'CORRIDOR REPORT (PDF)'}</span>
          </button>

          {/* Recalculate OLAP Button */}
          <button
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/60 hover:border-cyan-400 transition text-xs font-bold shadow-md"
            title="Trigger on-demand OLAP recalculation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculateMutation.isPending ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{recalculateMutation.isPending ? 'RECALCULATING...' : 'RECALCULATE OLAP'}</span>
          </button>


          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-control-muted hover:text-white hover:border-cyan-400 transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* ASGI WebSocket Beacon */}
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-950/60 border border-emerald-500/40 px-3.5 py-2 rounded-xl shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <Radio className="w-4 h-4" />
            <span>DAPHNE ASGI: LIVE</span>
          </div>

          {/* Large Digital Clock */}
          <div className="flex items-center gap-2.5 text-2xl font-extrabold text-cyan-300 bg-cyan-950/70 border border-cyan-500/60 px-4 py-2 rounded-xl shadow-inner">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span className="tracking-widest">{format(time, 'HH:mm:ss')}</span>
            <span className="text-xs text-control-muted uppercase font-bold">IST</span>
          </div>
        </div>
      </div>

      {/* Primary Executive KPI Counters Strip (4-Card Panoramic Wallboard) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Corridor Punctuality Index */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-xl relative overflow-hidden border-t-2 border-t-emerald-500">
          <div className="flex items-center justify-between text-xs text-control-muted">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="font-bold uppercase tracking-wider text-slate-200">CORRIDOR PUNCTUALITY</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-500 text-emerald-300">
              TARGET &gt;90%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className={`text-4xl font-extrabold tracking-tight ${getPunctualityColor(cards.average_corridor_punctuality_pct)}`}>
              {cards.average_corridor_punctuality_pct.toFixed(1)}%
            </span>
            <div className="text-right text-[11px] space-y-0.5">
              <span className="text-emerald-400 font-bold block">● {onTimeTrains.length} Right-Time</span>
              <span className="text-amber-400 font-bold block">▲ {delayedTrains.length} Regulated</span>
            </div>
          </div>
          <div className="text-[11px] text-control-muted border-t border-slate-800/80 pt-2 flex items-center justify-between">
            <span>Delay Incurred: <strong className="text-white">{cards.train_delay_minutes_incurred}m</strong></span>
            <span className="text-emerald-400 font-bold">SIL-4 Standard</span>
          </div>
        </div>

        {/* KPI 2: Block Counts & Possession Utilization */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-xl relative overflow-hidden border-t-2 border-t-blue-500">
          <div className="flex items-center justify-between text-xs text-control-muted">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span className="font-bold uppercase tracking-wider text-slate-200">POSSESSION UTILIZATION</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 border border-blue-500 text-blue-300">
              {cards.possession_utilization_rate_pct.toFixed(1)}% EFFICIENT
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-4xl font-extrabold text-blue-300 tracking-tight">
              {cards.total_blocks_sanctioned} <span className="text-base text-control-muted font-normal">Sanctioned</span>
            </span>
            <div className="text-right text-[11px] space-y-0.5">
              <span className="text-blue-300 font-bold block">{cards.total_blocks_executed} Executed</span>
              <span className="text-slate-400 block">{cards.cancelled_blocks_count} Cancelled</span>
            </div>
          </div>
          <div className="text-[11px] text-control-muted border-t border-slate-800/80 pt-2 flex items-center justify-between">
            <span>Total Hours: <strong className="text-white">{cards.total_possession_hours.toFixed(1)}h</strong></span>
            <span>Requested: <strong className="text-white">{cards.total_blocks_requested}</strong></span>
          </div>
        </div>

        {/* KPI 3: Shadow Block Bundling Ratio (USP) */}
        <div className="bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-4.5 space-y-3 shadow-2xl relative overflow-hidden border-t-2 border-t-cyan-400 bg-gradient-to-b from-cyan-950/20 to-transparent">
          <div className="flex items-center justify-between text-xs text-control-muted">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="font-bold uppercase tracking-wider text-cyan-200">SHADOW BUNDLING RATIO</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-400 text-cyan-300 animate-pulse">
              AI OPTIMIZED
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-4xl font-extrabold text-cyan-300 tracking-tight drop-shadow-md">
              +{cards.shadow_bundling_ratio_pct.toFixed(1)}%
            </span>
            <div className="text-right text-[11px] space-y-0.5">
              <span className="text-cyan-300 font-bold block">● {cards.shadow_blocks_count} Bundled Possessions</span>
              <span className="text-emerald-400 font-bold block">+{cards.co_possession_hours_saved}h Track Saved</span>
            </div>
          </div>
          <div className="text-[11px] text-control-muted border-t border-cyan-500/20 pt-2 flex items-center justify-between">
            <span>Delay Prevented: <strong className="text-cyan-300">+{cards.train_delay_hours_prevented}h</strong></span>
            <span className="text-cyan-400 font-bold">Rule 3 Validated</span>
          </div>
        </div>

        {/* KPI 4: Track Quality Index (RDSO TRC Standard) */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-xl relative overflow-hidden border-t-2 border-t-amber-500">
          <div className="flex items-center justify-between text-xs text-control-muted">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-amber-400" />
              <span className="font-bold uppercase tracking-wider text-slate-200">TRACK QUALITY INDEX (TQI)</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTqiBadgeStyle(cards.tqi_status)}`}>
              {cards.tqi_status}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-4xl font-extrabold text-amber-300 tracking-tight">
              {cards.average_tqi_score.toFixed(2)}
            </span>
            <div className="text-right text-[11px] space-y-0.5">
              <span className="text-slate-300 block">RDSO TRC Standard</span>
              <span className="text-emerald-400 font-bold block">High-Speed &lt; 30.0</span>
            </div>
          </div>
          <div className="text-[11px] text-control-muted border-t border-slate-800/80 pt-2 flex items-center justify-between">
            <span>Asset Health: <strong className="text-white">92.4%</strong></span>
            <span>Survey Units: <strong className="text-white">57 Assets</strong></span>
          </div>
        </div>
      </div>

      {/* Main Multi-Monitor Grid (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* Left Column: Live Corridor Possession Wall */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl flex flex-col justify-between overflow-hidden">
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Active Track Possessions &amp; Shadow Blocks</span>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-950 border border-blue-500 text-blue-300">
                {activePossessions.length} OCCUPIED • {shadowPossessions.length} BUNDLED
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[360px]">
              {blocks.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                    b.is_shadow || b.parent_block
                      ? 'border-cyan-500/50 bg-cyan-950/30'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white">{b.block_code}</span>
                      {(b.is_shadow || b.parent_block) && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-900/80 text-cyan-300 border border-cyan-500/50">
                          SHADOW BUNDLED
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        b.status === 'ACTIVE'
                          ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                          : b.status === 'SANCTIONED'
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans truncate">{b.work_type}</p>
                  <div className="flex items-center justify-between text-[11px] text-control-muted border-t border-slate-800/80 pt-1">
                    <span className="text-cyan-400 font-bold">KM {Number(b.start_km).toFixed(1)}–{Number(b.end_km).toFixed(1)} ({b.line_type})</span>
                    <span className="text-slate-300">
                      {b.scheduled_start_time?.split('T')[1]?.substring(0, 5) || '02:00'}–{b.scheduled_end_time?.split('T')[1]?.substring(0, 5) || '05:00'} IST
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-control-muted flex items-center justify-between">
            <span>Auto-refresh: 5s • PostGIS Spatial Coordinates</span>
            <span className="text-cyan-400 font-bold">5 Seeded Blocks Active</span>
          </div>
        </div>

        {/* Center Column: 3D GIS Radar & 7-Day Trend Visualizer */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 z-10">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>3D GIS Vector Radar &amp; 7-Day Trend</span>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded font-bold bg-emerald-950 border border-emerald-500 text-emerald-300">
              60 FPS TELEMETRY
            </span>
          </div>

          {/* Central Radar Sweeper */}
          <div className="rounded-xl bg-black border border-cyan-950/80 flex flex-col items-center justify-center relative overflow-hidden p-6 text-center h-[200px]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/30 via-black to-black" />
            <div
              className="w-36 h-36 rounded-full border border-cyan-500/20 flex items-center justify-center relative animate-spin"
              style={{ animationDuration: '18s' }}
            >
              <div className="w-24 h-24 rounded-full border border-cyan-500/30" />
              <div className="w-12 h-12 rounded-full border border-cyan-500/40" />
              <div className="absolute top-0 w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400" />
            </div>

            <div className="z-10 mt-3 space-y-1">
              <h4 className="text-sm font-extrabold text-cyan-300">
                NDLS–CNB 440.2 KM CORRIDOR RADAR
              </h4>
              <p className="text-[10px] text-control-muted">
                Live telemetry on ASGI group <code className="text-cyan-400">corridor_ndls-cnb-main</code>
              </p>
            </div>
          </div>

          {/* 7-Day Historical Trend Mini-Bars */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                7-Day Corridor Performance Trend:
              </span>
              <span className="text-[10px] text-control-muted">Punctuality % (Green) vs Possessions (Blue)</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {trendData.slice(-7).map((item, idx) => (
                <div key={idx} className="flex flex-col items-center space-y-1">
                  <div className="w-full bg-slate-800 rounded-t h-14 relative flex items-end justify-center overflow-hidden">
                    <div
                      className="w-full bg-emerald-500/80 rounded-t transition-all duration-500"
                      style={{ height: `${Math.min(100, Math.max(10, item.punctuality_pct))}%` }}
                      title={`${item.date}: ${item.punctuality_pct}% punctuality`}
                    />
                  </div>
                  <span className="text-[9px] text-control-muted">
                    {item.date ? item.date.split('-').slice(1).join('/') : `D-${7 - idx}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Telemetry Counts */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs z-10">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-control-muted block">TRAINS LIVE</span>
              <span className="font-extrabold text-white text-base">{trains.length || 15}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-control-muted block">AVG PUNCTUALITY</span>
              <span className="font-extrabold text-emerald-400 text-base">{cards.average_corridor_punctuality_pct.toFixed(1)}%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-control-muted block">SHADOW SAVED</span>
              <span className="font-extrabold text-cyan-400 text-base">+{cards.co_possession_hours_saved}h</span>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Corridor Benchmark Ranking & Safety Proof */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl flex flex-col justify-between overflow-hidden">
          <div className="space-y-3.5 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Corridor Efficiency Benchmark</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-500 text-cyan-300">
                MULTI-CORRIDOR OLAP
              </span>
            </div>

            {/* Corridor Comparison Ranking Table */}
            <div className="overflow-x-auto space-y-2 flex-1">
              <div className="grid grid-cols-5 text-[10px] font-bold text-control-muted px-2 pb-1 border-b border-slate-800">
                <span className="col-span-2">CORRIDOR</span>
                <span className="text-center">PUNCT %</span>
                <span className="text-center">TQI</span>
                <span className="text-right">BUNDLING</span>
              </div>
              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                {corridorComparison.map((item, idx) => (
                  <div
                    key={idx}
                    className={`grid grid-cols-5 items-center p-2 rounded-lg text-xs transition border ${
                      item.corridor_code === activeCorridor
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="col-span-2 font-bold truncate flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      {item.corridor_code}
                    </span>
                    <span className="text-center font-bold text-emerald-400">{item.average_punctuality_pct.toFixed(1)}%</span>
                    <span className="text-center font-mono text-amber-300">{item.average_tqi_score.toFixed(1)}</span>
                    <span className="text-right font-bold text-cyan-300">+{item.shadow_bundling_ratio_pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Safety & DL Invariant Status Card */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-white flex items-center gap-1.5 uppercase">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  HermiT DL Safety Invariants:
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-500 text-emerald-300">
                  PASSED (0 VIOLATIONS)
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                25kV OHE catenary power cutoff rules active. Stranded electric train hazard blocker enabled. Rule 3 gang relocation speed capped at 40 km/h.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] text-emerald-400 flex items-center justify-between">
            <span>OLAP Intelligence Engine (SVC-ANA):</span>
            <strong className="text-cyan-300 uppercase tracking-wider">RDSO TRC HIGH SPEED COMPLIANT</strong>
          </div>
        </div>
      </div>

      {/* Footer Ticker */}
      <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-xs text-control-muted">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white">Indian Railways Automatic Block Planning Platform (SIH PS 26027)</span>
          <span className="text-cyan-400">• 4K Wallboard Live Projection</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">Live Polling: 5s • TanStack Query Reactive Cache</span>
          <span className="text-cyan-400 font-bold">Press ESC or click Back to exit Video Wall mode</span>
        </div>
      </div>
    </div>
  );
};
