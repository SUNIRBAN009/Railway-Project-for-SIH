import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Database,
  MapPin,
  Train as TrainIcon,
  Users,
  Wrench,
  Layers,
  CheckCircle2,
  Copy,
  Download,
  Search,
  Check,
  ShieldAlert,
  Zap,
  Radio,
  FileCode,
  Compass,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Station {
  code: string;
  name: string;
  chainage_km: number;
  latitude: number;
  longitude: number;
  is_junction: boolean;
  zone: string;
  division: string;
  number_of_platforms: number;
  has_wifi?: boolean;
  has_medical_booth?: boolean;
  rpf_post_phone?: string;
}

interface TrainScheduleItem {
  station: string;
  station_sequence: number;
  arrival: string;
  departure: string;
  day: number;
  km: number;
  platform: string;
}

interface MasterTrain {
  train_number: string;
  name: string;
  type: string;
  train_type: string;
  priority_rank: number;
  max_speed_kmph: number;
  source: string;
  destination: string;
  direction: string;
  pax_capacity: number;
  schedule: TrainScheduleItem[];
}

interface StaffPersona {
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string;
  employee_id: string;
  phone: string;
  badge_number: string;
  division: string;
}

interface MasterAsset {
  asset_tag: string;
  tms_id: string;
  smms_id: string;
  tdms_id: string;
  name: string;
  type: string;
  asset_category: string;
  sub_type: string;
  chainage_km: number;
  latitude: number;
  longitude: number;
  department: string;
  line_type: string;
  current_health_score: number;
  tqi_index: number;
  installation_date: string;
  is_operational: boolean;
}

interface MasterDataResponse {
  stations: Station[];
  trains: MasterTrain[];
  users: StaffPersona[];
  assets: MasterAsset[];
  corridor: {
    code: string;
    name: string;
    start_km: number;
    end_km: number;
    total_length_km: number;
    zone: string;
    division: string;
    electrification: string;
    max_permissible_speed_kmh: number;
  };
  stats: {
    stations_count: number;
    trains_count: number;
    users_count: number;
    assets_count: number;
    coherence_rules_enforced: number;
  };
}

export const MasterDataInspector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stations' | 'trains' | 'users' | 'assets' | 'geojson'>('stations');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MasterDataResponse | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'ENG' | 'TRD' | 'SNT'>('ALL');
  const [trainFilter, setTrainFilter] = useState<'ALL' | 'PRESTIGE' | 'EXPRESS' | 'FREIGHT'>('ALL');
  const [expandedTrain, setExpandedTrain] = useState<string | null>('12301');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<MasterAsset | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [masterRes, geoRes] = await Promise.all([
          axios.get('/api/v1/demo/master-data/').catch(() => null),
          axios.get('/api/v1/demo/geojson/').catch(() => null),
        ]);

        if (masterRes && masterRes.data) {
          setData(masterRes.data);
        }
        if (geoRes && geoRes.data) {
          setGeoJsonData(geoRes.data);
        }
      } catch (err) {
        console.error('Failed to load master demo data from API', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownloadGeoJson = () => {
    if (!geoJsonData) return;
    const blob = new Blob([JSON.stringify(geoJsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ndls_cnb_master_corridor.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter logic
  const filteredStations = (data?.stations || []).filter(
    (s) =>
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTrains = (data?.trains || []).filter((t) => {
    const matchesSearch =
      t.train_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = trainFilter === 'ALL' || t.type === trainFilter;
    return matchesSearch && matchesType;
  });

  const filteredUsers = (data?.users || []).filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssets = (data?.assets || []).filter((a) => {
    const matchesSearch =
      a.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tms_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = assetFilter === 'ALL' || a.department === assetFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Master Corridor Info */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/50 via-slate-900 to-blue-950/40 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400">
                <Database className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold font-mono tracking-tight text-white">
                    Master Ground-Truth Data Inspector & GeoJSON Console
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    PHASE 0.5
                  </span>
                </div>
                <p className="text-xs text-control-muted font-mono mt-0.5">
                  NDLS–CNB 440.2km Trunk Corridor • PostGIS SRID 4326 • 7 Coherence Rules Enforced
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadGeoJson}
              disabled={!geoJsonData}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export GeoJSON (RFC 7946)
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 flex items-center gap-2 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Seed 26027 Coherent</span>
            </div>
          </div>
        </div>

        {/* 4 Entity Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5">
          <div
            onClick={() => setActiveTab('stations')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
              activeTab === 'stations'
                ? 'bg-cyan-950/50 border-cyan-400 shadow-md shadow-cyan-950/40'
                : 'bg-control-panel/80 border-control-border hover:border-cyan-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-cyan-400 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-control-muted">Stations</span>
              <MapPin className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{data?.stats.stations_count || 6}</div>
            <p className="text-[10px] text-control-muted font-mono mt-0.5">NDLS 0km → CNB 440.2km</p>
          </div>

          <div
            onClick={() => setActiveTab('trains')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
              activeTab === 'trains'
                ? 'bg-blue-950/50 border-blue-400 shadow-md shadow-blue-950/40'
                : 'bg-control-panel/80 border-control-border hover:border-blue-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-blue-400 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-control-muted">Authoritative Trains</span>
              <TrainIcon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{data?.stats.trains_count || 12}</div>
            <p className="text-[10px] text-control-muted font-mono mt-0.5">4 Prestige • 4 Express • 4 Freight</p>
          </div>

          <div
            onClick={() => setActiveTab('users')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
              activeTab === 'users'
                ? 'bg-purple-950/50 border-purple-400 shadow-md shadow-purple-950/40'
                : 'bg-control-panel/80 border-control-border hover:border-purple-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-purple-400 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-control-muted">Staff Personas</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{data?.stats.users_count || 8}</div>
            <p className="text-[10px] text-control-muted font-mono mt-0.5">COA • ENG • TRD • SNT • Admin</p>
          </div>

          <div
            onClick={() => setActiveTab('assets')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
              activeTab === 'assets'
                ? 'bg-amber-950/50 border-amber-400 shadow-md shadow-amber-950/40'
                : 'bg-control-panel/80 border-control-border hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-amber-400 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-control-muted">Track Assets</span>
              <Wrench className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{data?.stats.assets_count || 51}</div>
            <p className="text-[10px] text-control-muted font-mono mt-0.5">Rule 6 Triplet IDs Mapped</p>
          </div>
        </div>
      </div>

      {/* Tabs & Search Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-control-border pb-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('stations')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition ${
              activeTab === 'stations'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-control-muted hover:text-white border border-transparent'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Stations ({data?.stations.length || 6})
          </button>

          <button
            onClick={() => setActiveTab('trains')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition ${
              activeTab === 'trains'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                : 'text-control-muted hover:text-white border border-transparent'
            }`}
          >
            <TrainIcon className="w-4 h-4" />
            Timetabled Trains ({data?.trains.length || 12})
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition ${
              activeTab === 'users'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'text-control-muted hover:text-white border border-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            Staff Personas ({data?.users.length || 8})
          </button>

          <button
            onClick={() => setActiveTab('assets')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition ${
              activeTab === 'assets'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-control-muted hover:text-white border border-transparent'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Unified Assets ({data?.assets.length || 51})
          </button>

          <button
            onClick={() => setActiveTab('geojson')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition ${
              activeTab === 'geojson'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'text-control-muted hover:text-white border border-transparent'
            }`}
          >
            <FileCode className="w-4 h-4" />
            GeoJSON & Vector Twin
          </button>
        </div>

        {/* Global Search */}
        {activeTab !== 'geojson' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-control-muted" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-control-border bg-control-bg text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Stations */}
      {activeTab === 'stations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStations.map((station) => (
              <div
                key={station.code}
                className="p-4 rounded-xl border border-control-border bg-control-panel/70 hover:border-cyan-500/40 transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-sm">
                      {station.code}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-white font-mono">{station.name}</h3>
                      <p className="text-[11px] text-control-muted font-mono">
                        {station.zone} Zone • {station.division} Division
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                    KM {station.chainage_km.toFixed(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-control-bg/60 p-2.5 rounded-lg border border-control-border/60">
                  <div>
                    <span className="text-control-muted">Latitude:</span>
                    <p className="text-white font-bold">{station.latitude}° N</p>
                  </div>
                  <div>
                    <span className="text-control-muted">Longitude:</span>
                    <p className="text-white font-bold">{station.longitude}° E</p>
                  </div>
                  <div>
                    <span className="text-control-muted">Platforms:</span>
                    <p className="text-white font-bold">{station.number_of_platforms} Lines</p>
                  </div>
                  <div>
                    <span className="text-control-muted">RPF Emergency:</span>
                    <p className="text-white font-bold truncate">{station.rpf_post_phone || '139'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-control-muted pt-1">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    SRID 4326 PostGIS Verified
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `POINT(${station.longitude} ${station.latitude})`,
                        `wkt-${station.code}`
                      )
                    }
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {copiedText === `wkt-${station.code}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>WKT</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Trains */}
      {activeTab === 'trains' && (
        <div className="space-y-4">
          {/* Train Category Filters */}
          <div className="flex items-center gap-2">
            {(['ALL', 'PRESTIGE', 'EXPRESS', 'FREIGHT'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setTrainFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                  trainFilter === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-control-bg text-control-muted hover:text-white border border-control-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredTrains.map((train) => {
              const isExpanded = expandedTrain === train.train_number;
              const typeColor =
                train.type === 'PRESTIGE'
                  ? 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40'
                  : train.type === 'EXPRESS'
                  ? 'border-blue-500/40 text-blue-300 bg-blue-950/40'
                  : 'border-amber-500/40 text-amber-300 bg-amber-950/40';

              return (
                <div
                  key={train.train_number}
                  className="rounded-xl border border-control-border bg-control-panel/70 overflow-hidden transition"
                >
                  <div
                    onClick={() => setExpandedTrain(isExpanded ? null : train.train_number)}
                    className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer hover:bg-control-bg/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-extrabold text-base text-white px-2.5 py-1 rounded-lg bg-control-bg border border-control-border">
                        {train.train_number}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-white font-mono">{train.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${typeColor}`}>
                            {train.type}
                          </span>
                        </div>
                        <p className="text-xs text-control-muted font-mono mt-0.5 flex items-center gap-2">
                          <span>
                            {train.source} → {train.destination} ({train.direction})
                          </span>
                          <span>•</span>
                          <span>Max {train.max_speed_kmph} km/h</span>
                          <span>•</span>
                          <span>{train.pax_capacity > 0 ? `${train.pax_capacity} Pax` : 'Goods Freight'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <span className="text-xs font-mono text-control-muted">
                        {train.schedule?.length || 0} Corridor Stops
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded Schedule Timeline */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-control-border/60 bg-control-bg/40">
                      <h4 className="text-xs font-mono font-bold text-control-muted uppercase tracking-wider mb-2.5">
                        Authoritative Timetable Schedule (NDLS-CNB Corridor):
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {(train.schedule || []).map((stop) => (
                          <div
                            key={stop.station_sequence}
                            className="p-2.5 rounded-lg border border-control-border/80 bg-control-panel/60 text-xs font-mono"
                          >
                            <div className="flex items-center justify-between font-bold text-cyan-300">
                              <span>{stop.station}</span>
                              <span className="text-[10px] text-control-muted font-normal">Seq {stop.station_sequence}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-white">
                              <div>Arr: {stop.arrival}</div>
                              <div>Dep: {stop.departure}</div>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px] text-control-muted border-t border-control-border/50 pt-1">
                              <span>KM {stop.km}</span>
                              <span className="text-amber-400">P#{stop.platform}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Users / Personas */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredUsers.map((user) => {
            const deptColor =
              user.department === 'OPERATIONS'
                ? 'border-cyan-500/40 text-cyan-300 bg-cyan-950/30'
                : user.department === 'ENG'
                ? 'border-blue-500/40 text-blue-300 bg-blue-950/30'
                : user.department === 'TRD'
                ? 'border-amber-500/40 text-amber-300 bg-amber-950/30'
                : 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30';

            return (
              <div
                key={user.username}
                className="p-4 rounded-xl border border-control-border bg-control-panel/70 hover:border-purple-500/40 transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${deptColor}`}>
                    {user.department}
                  </span>
                  <span className="text-[10px] font-mono text-control-muted">{user.employee_id}</span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-white font-mono">
                    {user.first_name} {user.last_name}
                  </h3>
                  <p className="text-xs font-mono text-purple-400">{user.role}</p>
                </div>

                <div className="space-y-1 text-xs font-mono bg-control-bg/60 p-2.5 rounded-lg border border-control-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-control-muted">Username:</span>
                    <strong className="text-white">{user.username}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-control-muted">Badge:</span>
                    <span className="text-white">{user.badge_number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-control-muted">Phone:</span>
                    <span className="text-white">{user.phone}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-control-muted flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Argon2id Seeded
                  </span>
                  <button
                    onClick={() => handleCopy(user.username, `user-${user.username}`)}
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {copiedText === `user-${user.username}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy Login</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 4: Assets */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(['ALL', 'ENG', 'TRD', 'SNT'] as const).map((dept) => (
                <button
                  key={dept}
                  onClick={() => setAssetFilter(dept)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                    assetFilter === dept
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-control-bg text-control-muted hover:text-white border border-control-border'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-control-muted">
              Showing {filteredAssets.length} of {data?.assets.length || 51} PostGIS Assets
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredAssets.map((asset) => {
              const isFlaw = asset.current_health_score < 50;
              const deptBadge =
                asset.department === 'ENG'
                  ? 'text-blue-400 bg-blue-950/40 border-blue-500/30'
                  : asset.department === 'TRD'
                  ? 'text-amber-400 bg-amber-950/40 border-amber-500/30'
                  : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';

              return (
                <div
                  key={asset.asset_tag}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isFlaw
                      ? 'border-rose-500/60 bg-rose-950/20 shadow-md shadow-rose-950/30'
                      : 'border-control-border bg-control-panel/70 hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white">{asset.asset_tag}</span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-mono border ${deptBadge}`}>
                        {asset.department}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        isFlaw ? 'text-rose-400 animate-pulse' : 'text-cyan-400'
                      }`}
                    >
                      KM {asset.chainage_km.toFixed(1)}
                    </span>
                  </div>

                  <h4 className="font-mono text-xs font-bold text-white truncate mb-2">{asset.name}</h4>

                  {/* Triplet IDs (Rule 6) */}
                  <div className="space-y-1 text-[10px] font-mono bg-control-bg/60 p-2 rounded border border-control-border/60 mb-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-control-muted">TMS (Track):</span>
                      <span className="text-blue-300 truncate">{asset.tms_id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-control-muted">SMMS (Signal):</span>
                      <span className="text-emerald-300 truncate">{asset.smms_id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-control-muted">TDMS (OHE):</span>
                      <span className="text-amber-300 truncate">{asset.tdms_id}</span>
                    </div>
                  </div>

                  {/* Health Score & TQI */}
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-control-muted text-[11px]">Health:</span>
                      <span
                        className={`font-bold ${
                          asset.current_health_score < 40
                            ? 'text-rose-400 font-extrabold'
                            : asset.current_health_score < 75
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {asset.current_health_score}%
                      </span>
                    </div>
                    <div className="text-[11px] text-control-muted">
                      TQI: <strong className="text-white">{asset.tqi_index}</strong>
                    </div>
                  </div>

                  {isFlaw && (
                    <div className="mt-2 text-[10px] font-mono text-rose-300 bg-rose-950/60 p-1.5 rounded border border-rose-500/40 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>Scenario Flaw: Immediate Maintenance Block Required</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 5: GeoJSON & Vector Twin */}
      {activeTab === 'geojson' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-control-border bg-control-panel/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm font-mono text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                Standard GeoJSON FeatureCollection (RFC 7946)
              </h3>
              <p className="text-xs text-control-muted font-mono mt-0.5">
                Contains 1 Corridor LineString + 6 Station Points + 51 Track Asset Points (EPSG:4326)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleCopy(JSON.stringify(geoJsonData, null, 2), 'raw-geojson')
                }
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-control-bg hover:bg-control-border border border-control-border text-white flex items-center gap-1.5"
              >
                {copiedText === 'raw-geojson' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy JSON</span>
              </button>

              <button
                onClick={handleDownloadGeoJson}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .geojson</span>
              </button>
            </div>
          </div>

          {/* Interactive GeoJSON Visualizer Canvas */}
          <div className="rounded-xl border border-control-border bg-control-bg p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3 text-xs font-mono text-control-muted">
              <span>CORRIDOR SCHEMATIC VECTOR TRACE (KM 0.0 → KM 440.2)</span>
              <span className="text-cyan-400">SRID 4326 PostGIS Synchronized</span>
            </div>

            {/* Schematic track visualizer */}
            <div className="relative h-28 bg-slate-950/80 rounded-xl border border-control-border/60 p-4 flex items-center">
              {/* Main Track Line */}
              <div className="absolute left-8 right-8 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full" />
              
              {/* Stations on Track */}
              {(data?.stations || []).map((stn, idx, arr) => {
                const pct = (stn.chainage_km / 440.2) * 100;
                return (
                  <div
                    key={stn.code}
                    style={{ left: `calc(32px + (100% - 64px) * ${pct / 100})` }}
                    className="absolute -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950 shadow-md group-hover:scale-125 transition" />
                    <span className="text-[10px] font-mono font-bold text-white mt-1 group-hover:text-cyan-300">
                      {stn.code}
                    </span>
                    <span className="text-[9px] font-mono text-control-muted">
                      {stn.chainage_km.toFixed(0)}k
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Raw JSON Code Display */}
            <div className="mt-4">
              <pre className="max-h-96 overflow-auto p-4 rounded-xl bg-slate-950 text-cyan-300 font-mono text-[11px] leading-relaxed border border-control-border/80">
                {JSON.stringify(geoJsonData || { status: 'loading' }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
