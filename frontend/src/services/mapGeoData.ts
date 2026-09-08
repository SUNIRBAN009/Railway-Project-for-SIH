// Authoritative GeoJSON coordinates for Northern Railway Delhi Division (PS 26027)
// SRS: EPSG:4326 (WGS84)

export interface StationData {
  code: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  kmPost: number;
  platforms: number;
  dailyFootfall: string;
  interchange: string;
}

export const DELHI_STATIONS: StationData[] = [
  {
    code: 'NDLS',
    name: 'New Delhi Railway Station',
    coordinates: [77.2218, 28.6429],
    kmPost: 0.0,
    platforms: 16,
    dailyFootfall: '520,000 Passengers',
    interchange: 'Yellow & Airport Express Metro',
  },
  {
    code: 'TKJ',
    name: 'Tilak Bridge',
    coordinates: [77.2420, 28.6280],
    kmPost: 2.6,
    platforms: 4,
    dailyFootfall: '45,000 Passengers',
    interchange: 'Suburban EMU Rakes',
  },
  {
    code: 'ANVT',
    name: 'Anand Vihar Terminal',
    coordinates: [77.3150, 28.6475],
    kmPost: 12.0,
    platforms: 7,
    dailyFootfall: '180,000 Passengers',
    interchange: 'Blue & Pink Line Metro',
  },
  {
    code: 'SBB',
    name: 'Sahibabad Junction',
    coordinates: [77.3615, 28.6730],
    kmPost: 16.4,
    platforms: 5,
    dailyFootfall: '65,000 Passengers',
    interchange: 'Delhi-Meerut RRTS RapidX',
  },
  {
    code: 'GZB',
    name: 'Ghaziabad Junction',
    coordinates: [77.4320, 28.6650],
    kmPost: 25.6,
    platforms: 6,
    dailyFootfall: '240,000 Passengers',
    interchange: 'Main Quad-Track Interchange',
  },
  {
    code: 'ALJN',
    name: 'Aligarh Junction',
    coordinates: [78.0770, 27.8974],
    kmPost: 131.2,
    platforms: 7,
    dailyFootfall: '95,000 Passengers',
    interchange: 'NCR Main Line',
  },
];

// NDLS to GZB Corridor UP Line coordinates
export const CORRIDOR_UP_LINE: [number, number][] = [
  [77.2218, 28.6429], // NDLS
  [77.2420, 28.6280], // TKJ
  [77.2750, 28.6340], // Yamuna Bridge
  [77.3150, 28.6475], // ANVT
  [77.3615, 28.6730], // SBB
  [77.4000, 28.6690], // Hindon River
  [77.4320, 28.6650], // GZB
];

// NDLS to GZB Corridor DOWN Line coordinates (parallel offset)
export const CORRIDOR_DOWN_LINE: [number, number][] = [
  [77.2220, 28.6433],
  [77.2422, 28.6284],
  [77.2752, 28.6344],
  [77.3152, 28.6479],
  [77.3617, 28.6734],
  [77.4002, 28.6694],
  [77.4322, 28.6654],
];

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
    id: 'SEC-01',
    name: 'NDLS – Tilak Bridge (UP)',
    startKm: 0.0,
    endKm: 2.6,
    status: 'CLEAR',
    coordinates: [
      [77.2218, 28.6429],
      [77.2420, 28.6280],
    ],
  },
  {
    id: 'SEC-02',
    name: 'Tilak Bridge – Anand Vihar (UP)',
    startKm: 2.6,
    endKm: 12.0,
    status: 'CLEAR',
    coordinates: [
      [77.2420, 28.6280],
      [77.2750, 28.6340],
      [77.3150, 28.6475],
    ],
  },
  {
    id: 'SEC-03',
    name: 'Anand Vihar – Sahibabad (UP)',
    startKm: 12.0,
    endKm: 16.4,
    status: 'POSSESSION',
    activeBlockId: 'BLK-ENG-NDLS-01',
    coordinates: [
      [77.3150, 28.6475],
      [77.3615, 28.6730],
    ],
  },
  {
    id: 'SEC-04',
    name: 'Sahibabad – Ghaziabad (UP)',
    startKm: 16.4,
    endKm: 25.6,
    status: 'CAUTION',
    cautionSpeedKmh: 45,
    coordinates: [
      [77.3615, 28.6730],
      [77.4000, 28.6690],
      [77.4320, 28.6650],
    ],
  },
];

// Live Train Markers with coordinates along corridor
export interface LiveMapTrain {
  id: string;
  trainNumber: string;
  trainName: string;
  type: string;
  coordinates: [number, number];
  heading: number; // degrees
  speedKmh: number;
  delayMinutes: number;
  status: 'ON_TIME' | 'DELAYED' | 'REGULATED';
  lineType: 'UP' | 'DOWN';
  currentSection: string;
}

export const LIVE_MAP_TRAINS: LiveMapTrain[] = [
  {
    id: 'trn-map-1',
    trainNumber: '12424',
    trainName: 'Dibrugarh Rajdhani Express',
    type: 'SUPERFAST',
    coordinates: [77.3400, 28.6600],
    heading: 65,
    speedKmh: 128,
    delayMinutes: 0,
    status: 'ON_TIME',
    lineType: 'UP',
    currentSection: 'Anand Vihar – Sahibabad',
  },
  {
    id: 'trn-map-2',
    trainNumber: '12004',
    trainName: 'Lucknow Swarna Shatabdi Express',
    type: 'SHATABDI',
    coordinates: [77.2350, 28.6320],
    heading: 75,
    speedKmh: 110,
    delayMinutes: 4,
    status: 'ON_TIME',
    lineType: 'UP',
    currentSection: 'NDLS – Tilak Bridge',
  },
  {
    id: 'trn-map-3',
    trainNumber: '12260',
    trainName: 'Sealdah AC Duronto',
    type: 'DURONTO',
    coordinates: [77.4200, 28.6660],
    heading: 250,
    speedKmh: 125,
    delayMinutes: 0,
    status: 'ON_TIME',
    lineType: 'DOWN',
    currentSection: 'Ghaziabad – Sahibabad',
  },
  {
    id: 'trn-map-4',
    trainNumber: 'FRT-BCN-88',
    trainName: 'Loaded Coal Rake (BCN)',
    type: 'FREIGHT',
    coordinates: [77.3615, 28.6730],
    heading: 0,
    speedKmh: 0,
    delayMinutes: 18,
    status: 'REGULATED',
    lineType: 'UP',
    currentSection: 'Sahibabad Loop 3',
  },
];

// Ultrasonic (USFD) defect heatmap points
export interface USFDDefectPoint {
  id: string;
  coordinates: [number, number];
  kmPost: number;
  flawSeverity: 'CRITICAL' | 'MAJOR' | 'MODERATE';
  detectionDate: string;
  flawType: string;
  containmentStatus: string;
}

export const USFD_DEFECT_POINTS: USFDDefectPoint[] = [
  {
    id: 'usfd-01',
    coordinates: [77.3480, 28.6650], // Near KM 14.8
    kmPost: 14.8,
    flawSeverity: 'CRITICAL',
    detectionDate: '2026-09-08',
    flawType: '4.8mm Transverse Fatigue Crack',
    containmentStatus: 'Clamped with Jogglled Plate',
  },
  {
    id: 'usfd-02',
    coordinates: [77.3950, 28.6700], // Near KM 20.2
    kmPost: 20.2,
    flawSeverity: 'MODERATE',
    detectionDate: '2026-09-02',
    flawType: 'Weld Scab on Rail Head',
    containmentStatus: 'Observation / Ultrasonic Polling',
  },
  {
    id: 'usfd-03',
    coordinates: [77.2900, 28.6380], // Near KM 7.5
    kmPost: 7.5,
    flawSeverity: 'MAJOR',
    detectionDate: '2026-08-28',
    flawType: 'Bolt Hole Hairline Fissure',
    containmentStatus: 'Fishplate Reinforced',
  },
];
