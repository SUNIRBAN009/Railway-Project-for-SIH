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
    name: 'New Delhi Main Terminal',
    coordinates: [77.2218, 28.6429],
    kmPost: 0.0,
    platforms: 16,
    dailyFootfall: '520,000 Passengers',
    interchange: 'Yellow & Airport Express Metro',
  },
  {
    code: 'CSB',
    name: 'Shivaji Bridge Halt',
    coordinates: [77.2320, 28.6350],
    kmPost: 1.4,
    platforms: 2,
    dailyFootfall: '22,000 Passengers',
    interchange: 'Connaught Place Feeder',
  },
  {
    code: 'TKJ',
    name: 'Tilak Bridge Station',
    coordinates: [77.2420, 28.6280],
    kmPost: 2.6,
    platforms: 4,
    dailyFootfall: '45,000 Passengers',
    interchange: 'Suburban EMU Rakes',
  },
  {
    code: 'MWC',
    name: 'Mandawali Chander Vihar',
    coordinates: [77.2850, 28.6360],
    kmPost: 7.8,
    platforms: 2,
    dailyFootfall: '32,000 Passengers',
    interchange: 'East Delhi Suburban Ring',
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
    code: 'CNJ',
    name: 'Chander Nagar Crossing',
    coordinates: [77.3380, 28.6600],
    kmPost: 14.1,
    platforms: 2,
    dailyFootfall: '18,000 Passengers',
    interchange: 'Local Commuter EMU',
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
    name: 'Ghaziabad Main Junction',
    coordinates: [77.4320, 28.6650],
    kmPost: 25.6,
    platforms: 6,
    dailyFootfall: '240,000 Passengers',
    interchange: 'Quad-Track Western DFC Node',
  },
  {
    code: 'MIU',
    name: 'Maripat Freight Terminal',
    coordinates: [77.5100, 28.6400],
    kmPost: 32.0,
    platforms: 4,
    dailyFootfall: '15,000 Passengers',
    interchange: 'Eastern Dedicated Freight Corridor (EDFC)',
  },
];

// NDLS to GZB Corridor UP Line coordinates
export const CORRIDOR_UP_LINE: [number, number][] = [
  [77.2218, 28.6429], // NDLS
  [77.2320, 28.6350], // CSB
  [77.2420, 28.6280], // TKJ
  [77.2750, 28.6340], // Yamuna Bridge
  [77.2850, 28.6360], // MWC
  [77.3150, 28.6475], // ANVT
  [77.3380, 28.6600], // CNJ
  [77.3615, 28.6730], // SBB
  [77.4000, 28.6690], // Hindon River
  [77.4320, 28.6650], // GZB
  [77.5100, 28.6400], // MIU
];

// NDLS to GZB Corridor DOWN Line coordinates (parallel offset)
export const CORRIDOR_DOWN_LINE: [number, number][] = [
  [77.2220, 28.6433],
  [77.2322, 28.6354],
  [77.2422, 28.6284],
  [77.2752, 28.6344],
  [77.2852, 28.6364],
  [77.3152, 28.6479],
  [77.3382, 28.6604],
  [77.3617, 28.6734],
  [77.4002, 28.6694],
  [77.4322, 28.6654],
  [77.5102, 28.6404],
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
  {
    id: 'SEC-05',
    name: 'Ghaziabad – Maripat (UP)',
    startKm: 25.6,
    endKm: 32.0,
    status: 'CLEAR',
    coordinates: [
      [77.4320, 28.6650],
      [77.5100, 28.6400],
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
    speedKmh: 115,
    delayMinutes: 2,
    status: 'ON_TIME',
    lineType: 'UP',
    currentSection: 'NDLS – Tilak Bridge',
  },
  {
    id: 'trn-map-3',
    trainNumber: '22436',
    trainName: 'Vande Bharat Express (Varanasi)',
    type: 'VANDE_BHARAT',
    coordinates: [77.3000, 28.6420],
    heading: 70,
    speedKmh: 140,
    delayMinutes: 0,
    status: 'ON_TIME',
    lineType: 'UP',
    currentSection: 'Tilak Bridge – Anand Vihar',
  },
  {
    id: 'trn-map-4',
    trainNumber: '12260',
    trainName: 'Sealdah AC Duronto Express',
    type: 'DURONTO',
    coordinates: [77.4200, 28.6660],
    heading: 250,
    speedKmh: 122,
    delayMinutes: 0,
    status: 'ON_TIME',
    lineType: 'DOWN',
    currentSection: 'Ghaziabad – Sahibabad',
  },
  {
    id: 'trn-map-5',
    trainNumber: '12302',
    trainName: 'Howrah Rajdhani Express',
    type: 'SUPERFAST',
    coordinates: [77.2600, 28.6300],
    heading: 68,
    speedKmh: 130,
    delayMinutes: 0,
    status: 'ON_TIME',
    lineType: 'UP',
    currentSection: 'Tilak Bridge – Yamuna Bridge',
  },
  {
    id: 'trn-map-6',
    trainNumber: '12560',
    trainName: 'Shiv Ganga Superfast Express',
    type: 'EXPRESS',
    coordinates: [77.3800, 28.6710],
    heading: 255,
    speedKmh: 105,
    delayMinutes: 6,
    status: 'DELAYED',
    lineType: 'DOWN',
    currentSection: 'Ghaziabad – Sahibabad',
  },
  {
    id: 'trn-map-7',
    trainNumber: 'FRT-BCN-88',
    trainName: 'Loaded Coal Freight Rake (BCN)',
    type: 'FREIGHT',
    coordinates: [77.3615, 28.6730],
    heading: 0,
    speedKmh: 65,
    delayMinutes: 12,
    status: 'REGULATED',
    lineType: 'UP',
    currentSection: 'Sahibabad Loop 3',
  },
  {
    id: 'trn-map-8',
    trainNumber: 'CON-DL-09',
    trainName: 'Dedicated Freight Container Express',
    type: 'FREIGHT',
    coordinates: [77.4800, 28.6500],
    heading: 65,
    speedKmh: 75,
    delayMinutes: 0,
    status: 'ON_TIME',
    lineType: 'UP',
    currentSection: 'Ghaziabad – Maripat DFC Line',
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
    containmentStatus: 'Clamped with Jogglled Plate (Speed 30 km/h)',
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
  {
    id: 'usfd-04',
    coordinates: [77.4500, 28.6600], // Near KM 28.4
    kmPost: 28.4,
    flawSeverity: 'MODERATE',
    detectionDate: '2026-09-09',
    flawType: 'Ballast Shoulder Cushion Depletion',
    containmentStatus: 'Scheduled for BCM Ballast Cleaning',
  },
];
