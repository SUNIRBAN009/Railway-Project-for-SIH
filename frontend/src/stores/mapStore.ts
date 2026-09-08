import { create } from 'zustand';

interface MapViewport {
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  pitch: number;
  bearing: number;
}

interface MapState {
  viewport: MapViewport;
  showTrains: boolean;
  showBlocks: boolean;
  showHeatmap: boolean;
  showSignals: boolean;
  selectedTrainId: string | null;
  selectedBlockId: string | null;
  selectedStationCode: string | null;

  setViewport: (viewport: Partial<MapViewport>) => void;
  resetViewport: () => void;
  toggleLayer: (layer: 'showTrains' | 'showBlocks' | 'showHeatmap' | 'showSignals') => void;
  selectTrain: (id: string | null) => void;
  selectBlock: (id: string | null) => void;
  selectStation: (code: string | null) => void;
}

// Default centered on Delhi Division (New Delhi - Ghaziabad Corridor)
const DEFAULT_VIEWPORT: MapViewport = {
  center: [77.3000, 28.6500],
  zoom: 11.5,
  pitch: 45,
  bearing: -15,
};

export const useMapStore = create<MapState>((set) => ({
  viewport: DEFAULT_VIEWPORT,
  showTrains: true,
  showBlocks: true,
  showHeatmap: false,
  showSignals: true,
  selectedTrainId: null,
  selectedBlockId: null,
  selectedStationCode: null,

  setViewport: (newVp) =>
    set((state) => ({
      viewport: { ...state.viewport, ...newVp },
    })),

  resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),

  toggleLayer: (layer) =>
    set((state) => ({
      [layer]: !state[layer],
    })),

  selectTrain: (id) => set({ selectedTrainId: id }),
  selectBlock: (id) => set({ selectedBlockId: id }),
  selectStation: (code) => set({ selectedStationCode: code }),
}));
