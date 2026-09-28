// Authoritative GeoJSON coordinates for Northern Railway & NCR (PS 26027)
// Master Corridor: New Delhi (NDLS) to Kanpur Central (CNB) Golden Trunk
// SRS: EPSG:4326 (WGS84)

export interface StationData {
  code: string;
  name: string;
  division: string;
  zone: string;
  coordinates: [number, number]; // [lng, lat]
  kmPost: number;
  platforms: number;
  dailyFootfall: string;
  interchange: string;
}

export const DELHI_STATIONS: StationData[] = [
  {
    code: 'NDLS',
    name: 'New Delhi',
    division: 'Delhi',
    zone: 'Northern Railway',
    coordinates: [77.2191, 28.6429],
    kmPost: 0.0,
    platforms: 16,
    dailyFootfall: '520,000 Passengers',
    interchange: 'Yellow Line, Airport Express, DLI Chord',
  },
  {
    code: 'TKJ',
    name: 'Tilak Bridge',
    division: 'Delhi',
    zone: 'Northern Railway',
    coordinates: [77.2410, 28.6250],
    kmPost: 2.5,
    platforms: 4,
    dailyFootfall: '65,000 Passengers',
    interchange: 'Suburban EMU Ring Railway',
  },
  {
    code: 'DLI',
    name: 'Old Delhi Junction',
    division: 'Delhi',
    zone: 'Northern Railway',
    coordinates: [77.2289, 28.6606],
    kmPost: 3.5,
    platforms: 16,
    dailyFootfall: '280,000 Passengers',
    interchange: 'Yellow & Red Line Metro, Sadar Bazar',
  },
  {
    code: 'ANVT',
    name: 'Anand Vihar Terminal',
    division: 'Delhi',
    zone: 'Northern Railway',
    coordinates: [77.3153, 28.6502],
    kmPost: 12.8,
    platforms: 7,
    dailyFootfall: '190,000 Passengers',
    interchange: 'Blue & Pink Line Metro, ISBT Terminal',
  },
  {
    code: 'SBB',
    name: 'Sahibabad Junction',
    division: 'Delhi',
    zone: 'Northern Railway',
    coordinates: [77.3475, 28.6722],
    kmPost: 18.0,
    platforms: 5,
    dailyFootfall: '85,000 Passengers',
    interchange: 'Delhi-Meerut RRTS Corridor Interchange',
  },
  {
    code: 'GZB',
    name: 'Ghaziabad Junction',
    division: 'Delhi',
    zone: 'Northern Railway',
    coordinates: [77.4262, 28.6538],
    kmPost: 24.5,
    platforms: 6,
    dailyFootfall: '240,000 Passengers',
    interchange: 'Moradabad / Saharanpur / Aligarh Trunk Lines',
  },
  {
    code: 'MIU',
    name: 'Maripat',
    division: 'Delhi',
    zone: 'Northern Railway',
    coordinates: [77.4800, 28.5900],
    kmPost: 32.0,
    platforms: 4,
    dailyFootfall: '25,000 Passengers',
    interchange: 'EDFC Freight Feeder Loop',
  },
  {
    code: 'DER',
    name: 'Dadri',
    division: 'Delhi',
    zone: 'Northern Railway',
    coordinates: [77.5583, 28.5528],
    kmPost: 45.0,
    platforms: 3,
    dailyFootfall: '45,000 Passengers',
    interchange: 'Eastern & Western DFC Junction Hub',
  },
  {
    code: 'ALJN',
    name: 'Aligarh Junction',
    division: 'Prayagraj',
    zone: 'North Central Railway',
    coordinates: [78.0772, 27.8937],
    kmPost: 126.1,
    platforms: 7,
    dailyFootfall: '140,000 Passengers',
    interchange: 'Bareilly Branch, Chandausi Loop',
  },
  {
    code: 'TDL',
    name: 'Tundla Junction',
    division: 'Agra',
    zone: 'North Central Railway',
    coordinates: [78.2393, 27.2043],
    kmPost: 204.3,
    platforms: 5,
    dailyFootfall: '95,000 Passengers',
    interchange: 'Agra Fort Bypass, Yamuna Bridge Line',
  },
  {
    code: 'ETW',
    name: 'Etawah Junction',
    division: 'Prayagraj',
    zone: 'North Central Railway',
    coordinates: [79.0182, 26.7865],
    kmPost: 296.8,
    platforms: 5,
    dailyFootfall: '80,000 Passengers',
    interchange: 'Gwalior / Mainpuri Branch Line',
  },
  {
    code: 'CNB',
    name: 'Kanpur Central',
    division: 'Prayagraj',
    zone: 'North Central Railway',
    coordinates: [80.3475, 26.4525],
    kmPost: 440.2,
    platforms: 10,
    dailyFootfall: '380,000 Passengers',
    interchange: 'Lucknow / Prayagraj / Jhansi Main Trunk',
  },
];

// Fallback alias for backward compatibility
export const WB_STATIONS = DELHI_STATIONS;

// Simplified NDLS to CNB Trunk coordinates
export const CORRIDOR_MAIN_LINE: [number, number][] = [
  [77.2191, 28.6429], // NDLS
  [77.2410, 28.6250], // TKJ
  [77.3153, 28.6502], // ANVT
  [77.3475, 28.6722], // SBB
  [77.4262, 28.6538], // GZB
  [77.4800, 28.5900], // MIU
  [77.5583, 28.5528], // DER
  [78.0772, 27.8937], // ALJN
  [78.2393, 27.2043], // TDL
  [79.0182, 26.7865], // ETW
  [80.3475, 26.4525], // CNB
];

export const CORRIDOR_UP_LINE = CORRIDOR_MAIN_LINE;
export const CORRIDOR_DOWN_LINE = CORRIDOR_MAIN_LINE;

// Operational Block Sections with live statuses
export interface TrackSectionGeo {
  id: string;
  name: string;
  startKm: number;
  endKm: number;
  status: 'CLEAR' | 'POSSESSION' | 'CAUTION';
  activeBlockId?: string;
  cautionSpeedKmh?: number;
  coordinates: [number, number][];
}

export const TRACK_SECTIONS: TrackSectionGeo[] = [
  {
    id: 'SEC-DLI-01',
    name: 'New Delhi – Tilak Bridge',
    startKm: 0.0,
    endKm: 2.5,
    status: 'CLEAR',
    coordinates: [
      [77.2191, 28.6429],
      [77.2410, 28.6250],
    ],
  },
  {
    id: 'SEC-DLI-02',
    name: 'Tilak Bridge – Anand Vihar',
    startKm: 2.5,
    endKm: 12.8,
    status: 'CLEAR',
    coordinates: [
      [77.2410, 28.6250],
      [77.3153, 28.6502],
    ],
  },
  {
    id: 'SEC-DLI-03',
    name: 'Anand Vihar – Sahibabad',
    startKm: 12.8,
    endKm: 18.0,
    status: 'CAUTION',
    cautionSpeedKmh: 45,
    coordinates: [
      [77.3153, 28.6502],
      [77.3475, 28.6722],
    ],
  },
  {
    id: 'SEC-DLI-04',
    name: 'Sahibabad – Ghaziabad (DOWN)',
    startKm: 18.0,
    endKm: 24.5,
    status: 'POSSESSION',
    activeBlockId: 'BLK-ENG-DLI-01',
    coordinates: [
      [77.3475, 28.6722],
      [77.4262, 28.6538],
    ],
  },
  {
    id: 'SEC-DLI-05',
    name: 'Ghaziabad – Maripat (UP)',
    startKm: 24.5,
    endKm: 32.0,
    status: 'CLEAR',
    coordinates: [
      [77.4262, 28.6538],
      [77.4800, 28.5900],
    ],
  },
  {
    id: 'SEC-DLI-06',
    name: 'Maripat – Dadri (Main Trunk)',
    startKm: 32.0,
    endKm: 45.0,
    status: 'CLEAR',
    coordinates: [
      [77.4800, 28.5900],
      [77.5583, 28.5528],
    ],
  },
];

// Live Train Markers with coordinates along corridor
export interface LiveMapTrain {
  id: string;
  trainNumber: string;
  trainName: string;
  type: 'SUPERFAST' | 'SHATABDI' | 'VANDE_BHARAT' | 'DURONTO' | 'EXPRESS' | 'FREIGHT';
  coordinates: [number, number];
  heading: number;
  speedKmh: number;
  delayMinutes: number;
  status: 'ON_TIME' | 'DELAYED' | 'REGULATED';
  lineType: 'UP' | 'DOWN';
  currentSection: string;
  current_km?: number;
}

export const LIVE_MAP_TRAINS: LiveMapTrain[] = [
  {
    id: 'trn-map-dli-1',
    trainNumber: '12424',
    trainName: 'New Delhi - Dibrugarh Rajdhani Express',
    type: 'SUPERFAST',
    coordinates: [77.3758, 28.6515],
    heading: 122,
    speedKmh: 128,
    delayMinutes: 0,
    status: 'ON_TIME',
    lineType: 'DOWN',
    currentSection: 'Sahibabad – Ghaziabad',
    current_km: 19.5,
  },
  {
    id: 'trn-map-dli-2',
    trainNumber: '22436',
    trainName: 'New Delhi - Varanasi Vande Bharat Express',
    type: 'VANDE_BHARAT',
    coordinates: [77.6200, 28.4500],
    heading: 125,
    speedKmh: 155,
    delayMinutes: 0,
    status: 'ON_TIME',
    lineType: 'DOWN',
    currentSection: 'Dadri – Aligarh',
    current_km: 73.3,
  },
  {
    id: 'trn-map-dli-3',
    trainNumber: '12004',
    trainName: 'New Delhi - Lucknow Shatabdi Express',
    type: 'SHATABDI',
    coordinates: [77.3200, 28.6600],
    heading: 110,
    speedKmh: 110,
    delayMinutes: 5,
    status: 'ON_TIME',
    lineType: 'DOWN',
    currentSection: 'Anand Vihar – Sahibabad',
    current_km: 14.2,
  },
  {
    id: 'trn-map-dli-4',
    trainNumber: '12419',
    trainName: 'Gomti Express',
    type: 'EXPRESS',
    coordinates: [78.1500, 27.8500],
    heading: 300,
    speedKmh: 95,
    delayMinutes: 12,
    status: 'DELAYED',
    lineType: 'UP',
    currentSection: 'Aligarh – Dadri',
    current_km: 180.0,
  },
  {
    id: 'trn-map-dli-5',
    trainNumber: 'BCN-774',
    trainName: 'Foodgrain & Bulk Covered Rake (BCN)',
    type: 'FREIGHT',
    coordinates: [77.4900, 28.5800],
    heading: 45,
    speedKmh: 65,
    delayMinutes: 0,
    status: 'ON_TIME',
    lineType: 'DOWN',
    currentSection: 'Ghaziabad – Maripat (EDFC)',
    current_km: 29.8,
  },
];

export const USFD_DEFECT_POINTS = [
  {
    id: 'flaw-dli-01',
    code: 'DEF-USFD-014',
    kmPost: 14.8,
    type: 'Internal Rail Fatigue / Transverse Fissure',
    severity: 'CRITICAL',
    recommendedSpeed: 30,
    coordinates: [77.3320, 28.6620] as [number, number],
  },
  {
    id: 'flaw-dli-02',
    code: 'DEF-WHEEL-020',
    kmPost: 20.2,
    type: 'Wheel Burn / Scabbing',
    severity: 'MEDIUM',
    recommendedSpeed: 50,
    coordinates: [77.3850, 28.6580] as [number, number],
  },
  {
    id: 'flaw-dli-03',
    code: 'DEF-OHE-007',
    kmPost: 7.5,
    type: 'Excessive Contact Wire Sag',
    severity: 'HIGH',
    recommendedSpeed: 75,
    coordinates: [77.2750, 28.6400] as [number, number],
  },
];
