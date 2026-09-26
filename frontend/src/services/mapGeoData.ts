// Authoritative GeoJSON coordinates for Eastern Railway (PS 26027)
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

export const WB_STATIONS: StationData[] = [
  {
    code: 'HWH',
    name: 'Howrah Junction',
    coordinates: [88.3411, 22.5833],
    kmPost: 0.0,
    platforms: 23,
    dailyFootfall: '1,000,000 Passengers',
    interchange: 'East-West Metro, Ferry',
  },
  {
    code: 'SDAH',
    name: 'Sealdah',
    coordinates: [88.3711, 22.5694],
    kmPost: 0.0,
    platforms: 21,
    dailyFootfall: '1,200,000 Passengers',
    interchange: 'East-West Metro',
  },
  {
    code: 'KGP',
    name: 'Kharagpur Junction',
    coordinates: [87.3275, 22.3364],
    kmPost: 115.0,
    platforms: 12,
    dailyFootfall: '250,000 Passengers',
    interchange: 'South Eastern Railway Main',
  },
  {
    code: 'BWN',
    name: 'Bardhaman Junction',
    coordinates: [87.8631, 23.2389],
    kmPost: 95.0,
    platforms: 8,
    dailyFootfall: '120,000 Passengers',
    interchange: 'Howrah-Bardhaman Chord',
  },
  {
    code: 'ASN',
    name: 'Asansol Junction',
    coordinates: [86.9825, 23.6816],
    kmPost: 200.0,
    platforms: 7,
    dailyFootfall: '90,000 Passengers',
    interchange: 'Eastern Railway Main Line',
  },
  {
    code: 'NJP',
    name: 'New Jalpaiguri',
    coordinates: [88.4372, 26.6806],
    kmPost: 566.0,
    platforms: 8,
    dailyFootfall: '150,000 Passengers',
    interchange: 'Northeast Frontier Railway',
  },
  {
    code: 'MLDT',
    name: 'Malda Town',
    coordinates: [88.1362, 25.0108],
    kmPost: 332.0,
    platforms: 7,
    dailyFootfall: '80,000 Passengers',
    interchange: 'NFR Gateway',
  }
];

export const DELHI_STATIONS: StationData[] = WB_STATIONS;

// Simplified Howrah to NJP Trunk coordinates
export const CORRIDOR_MAIN_LINE: [number, number][] = [
  [88.3411, 22.5833], // HWH
  [87.8631, 23.2389], // BWN
  [86.9825, 23.6816], // ASN
  [88.1362, 25.0108], // MLDT
  [88.4372, 26.6806], // NJP
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
    id: 'SEC-WB-01',
    name: 'Howrah – Bardhaman',
    startKm: 0.0,
    endKm: 95.0,
    status: 'CLEAR',
    coordinates: [
      [88.3411, 22.5833],
      [87.8631, 23.2389],
    ],
  },
  {
    id: 'SEC-WB-02',
    name: 'Bardhaman – Asansol',
    startKm: 95.0,
    endKm: 200.0,
    status: 'CAUTION',
    cautionSpeedKmh: 60,
    coordinates: [
      [87.8631, 23.2389],
      [86.9825, 23.6816],
    ],
  },
  {
    id: 'SEC-WB-03',
    name: 'Asansol – Malda Town',
    startKm: 200.0,
    endKm: 332.0,
    status: 'POSSESSION',
    activeBlockId: 'BLK-ENG-WB-01',
    coordinates: [
      [86.9825, 23.6816],
      [88.1362, 25.0108],
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
    id: 'trn-map-wb-1',
    trainNumber: '12041',
    trainName: 'Howrah NJP Shatabdi Express',
    type: 'SHATABDI',
    coordinates: [88.0000, 24.1000], // Approx between BWN and MLDT
    heading: 10,
    speedKmh: 110,
    delayMinutes: 0,
    status: 'ON_TIME',
    lineType: 'UP',
    currentSection: 'Bardhaman – Malda Town',
  },
  {
    id: 'trn-map-wb-2',
    trainNumber: '12301',
    trainName: 'Howrah Rajdhani Express',
    type: 'SUPERFAST',
    coordinates: [87.4200, 23.4600], // Near Asansol
    heading: 300,
    speedKmh: 130,
    delayMinutes: 0,
    status: 'ON_TIME',
    lineType: 'UP',
    currentSection: 'Bardhaman – Asansol',
  },
  {
    id: 'trn-map-wb-3',
    trainNumber: '12344',
    trainName: 'Darjeeling Mail',
    type: 'SUPERFAST',
    coordinates: [88.2500, 25.8000], // Near NJP
    heading: 190,
    speedKmh: 105,
    delayMinutes: 15,
    status: 'DELAYED',
    lineType: 'DOWN',
    currentSection: 'NJP – Malda Town',
  },
  {
    id: 'trn-map-wb-4',
    trainNumber: 'FRT-BOXN-22',
    trainName: 'Loaded Coal Rake (BOXN)',
    type: 'FREIGHT',
    coordinates: [87.6000, 23.0000], // Near Kharagpur line
    heading: 45,
    speedKmh: 0,
    delayMinutes: 45,
    status: 'REGULATED',
    lineType: 'UP',
    currentSection: 'Kharagpur – Howrah',
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
    id: 'usfd-wb-01',
    coordinates: [87.8631, 23.2389], // Near BWN
    kmPost: 95.0,
    flawSeverity: 'CRITICAL',
    detectionDate: '2026-09-08',
    flawType: '4.8mm Transverse Fatigue Crack',
    containmentStatus: 'Clamped with Jogglled Plate (Speed 30 km/h)',
  },
  {
    id: 'usfd-wb-02',
    coordinates: [86.9825, 23.6816], // Near ASN
    kmPost: 200.0,
    flawSeverity: 'MODERATE',
    detectionDate: '2026-09-02',
    flawType: 'Weld Scab on Rail Head',
    containmentStatus: 'Observation / Ultrasonic Polling',
  },
];
