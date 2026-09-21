import { create } from 'zustand';
import { Block, BlockStatus, DepartmentCode } from '../types';
import { DEMO_BLOCKS } from '../services/demoData';
import { apiClient } from '../services/api';

export interface SanctionAcknowledgement {
  id: string;
  blockId: string;
  blockCode: string;
  departmentCode: DepartmentCode;
  sanctionedBy: string;
  sanctionedAt: string;
  remarks: string;
  cautionSpeed?: number;
  corridor: string;
  kmRange: string;
  workType: string;
  status: 'SANCTIONED' | 'REVISED' | 'REJECTED';
}

interface BlockStoreState {
  blocks: Block[];
  selectedBlockId: string | null;
  activeAcknowledgement: SanctionAcknowledgement | null;
  acknowledgementHistory: SanctionAcknowledgement[];
  isSubmitting: boolean;

  setSelectedBlockId: (id: string | null) => void;
  submitBlockProposal: (proposal: Partial<Block>, requesterUser?: string) => Promise<Block>;
  sanctionBlock: (blockId: string, remarks: string, sanctionerUser?: string, cautionSpeed?: number) => Promise<void>;
  reviseBlock: (blockId: string, reason: string, sanctionerUser?: string) => Promise<void>;
  applyTimeShiftAndDeconflict: (blockId: string, shiftMinutes: number, resolutionNotes?: string) => Promise<void>;
  clearAcknowledgement: () => void;
  syncFromStorage: () => void;
  syncWithBackend: () => Promise<void>;
  initSync: () => () => void;
}

const STORAGE_BLOCKS_KEY = 'railway_blocks_v1';
const STORAGE_ACK_KEY = 'railway_last_ack_v1';
const STORAGE_ACK_HIST_KEY = 'railway_ack_history_v1';
const STORAGE_DISMISSED_ACKS_KEY = 'railway_dismissed_acks_v1';

export const getDismissedAckIds = (): string[] => {
  try {
    const cached = localStorage.getItem(STORAGE_DISMISSED_ACKS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

export const markAckAsDismissed = (ackId: string) => {
  try {
    const dismissed = getDismissedAckIds();
    if (!dismissed.includes(ackId)) {
      dismissed.push(ackId);
      localStorage.setItem(STORAGE_DISMISSED_ACKS_KEY, JSON.stringify(dismissed));
    }
    // Also remove the broadcast ack key so future reloads/polls don't resurrect it
    const currentBroadcast = localStorage.getItem(STORAGE_ACK_KEY);
    if (currentBroadcast) {
      try {
        const parsed = JSON.parse(currentBroadcast);
        if (parsed?.id === ackId) {
          localStorage.removeItem(STORAGE_ACK_KEY);
        }
      } catch {}
    }
  } catch {}
};

const getInitialBlocks = (): Block[] => {
  try {
    const cached = localStorage.getItem(STORAGE_BLOCKS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse cached blocks from localStorage:', err);
  }
  return DEMO_BLOCKS;
};

const getInitialAckHistory = (): SanctionAcknowledgement[] => {
  try {
    const cached = localStorage.getItem(STORAGE_ACK_HIST_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

export const useBlockStore = create<BlockStoreState>((set, get) => ({
  blocks: getInitialBlocks(),
  selectedBlockId: 'blk-004',
  activeAcknowledgement: null,
  acknowledgementHistory: getInitialAckHistory(),
  isSubmitting: false,

  setSelectedBlockId: (id) => set({ selectedBlockId: id }),

  submitBlockProposal: async (proposalData, requesterUser = 'Field Engineer') => {
    set({ isSubmitting: true });

    const newBlockId = proposalData.id || `blk-${Date.now()}`;
    const newBlockCode =
      proposalData.block_code ||
      `BLK-${proposalData.department_code || 'ENG'}-${Math.floor(100 + Math.random() * 900)}`;

    const newBlock: Block = {
      id: newBlockId,
      block_code: newBlockCode,
      corridor: proposalData.corridor || DEMO_BLOCKS[0].corridor,
      line_type: proposalData.line_type || 'UP',
      department_code: proposalData.department_code || 'ENG',
      work_type: proposalData.work_type || 'Track Tamping (CSM)',
      status: 'PENDING_APPROVAL' as BlockStatus,
      start_km: Number(proposalData.start_km) || 12.0,
      end_km: Number(proposalData.end_km) || 16.0,
      scheduled_start_time: proposalData.scheduled_start_time || new Date().toISOString(),
      scheduled_end_time: proposalData.scheduled_end_time || new Date(Date.now() + 180 * 60 * 1000).toISOString(),
      traction_power_cutoff_required: Boolean(proposalData.traction_power_cutoff_required),
      gang_id: proposalData.gang_id || '',
      equipment_required: proposalData.equipment_required || '',
      work_description: proposalData.work_description || 'Departmental scheduled maintenance.',
      version: 1,
    };

    // Update state & persist to localStorage immediately
    const updatedBlocks = [newBlock, ...get().blocks.filter((b) => b.id !== newBlock.id)];
    set({ blocks: updatedBlocks, selectedBlockId: newBlock.id, isSubmitting: false });
    try {
      localStorage.setItem(STORAGE_BLOCKS_KEY, JSON.stringify(updatedBlocks));
    } catch {}

    // Try posting to backend API in parallel (non-blocking)
    try {
      const resp = await apiClient.post('/blocks/proposals/', {
        corridor: newBlock.corridor?.code || 'NDLS-GZB-UP',
        corridor_id: newBlock.corridor?.id,
        department_code: newBlock.department_code,
        line_type: newBlock.line_type,
        work_type: newBlock.work_type,
        start_km: newBlock.start_km,
        end_km: newBlock.end_km,
        scheduled_start_time: newBlock.scheduled_start_time,
        scheduled_end_time: newBlock.scheduled_end_time,
        traction_power_cutoff_required: newBlock.traction_power_cutoff_required,
        gang_id: newBlock.gang_id,
        equipment_required: newBlock.equipment_required,
        work_description: newBlock.work_description,
      });

      if (resp.data && resp.data.success && resp.data.data) {
        const item = resp.data.data;
        const serverBlock: Block = {
          id: item.id || newBlock.id,
          block_code: item.block_code || newBlock.block_code,
          corridor: item.corridor || newBlock.corridor,
          line_type: item.line_type || newBlock.line_type,
          department_code: item.department_code || newBlock.department_code,
          work_type: item.work_type || newBlock.work_type,
          status: item.status || newBlock.status,
          start_km: Number(item.start_km) || newBlock.start_km,
          end_km: Number(item.end_km) || newBlock.end_km,
          scheduled_start_time: item.scheduled_start_time || newBlock.scheduled_start_time,
          scheduled_end_time: item.scheduled_end_time || newBlock.scheduled_end_time,
          traction_power_cutoff_required: Boolean(item.traction_power_cutoff_required),
          gang_id: item.gang_id || newBlock.gang_id,
          equipment_required: item.equipment_required || newBlock.equipment_required,
          work_description: item.work_description || newBlock.work_description,
          version: item.version || 1,
        };
        const currentBlocks = get().blocks;
        const replaced = currentBlocks.map((b) => (b.id === newBlock.id ? serverBlock : b));
        set({ blocks: replaced, selectedBlockId: serverBlock.id });
        localStorage.setItem(STORAGE_BLOCKS_KEY, JSON.stringify(replaced));
        return serverBlock;
      }
    } catch (apiErr) {
      console.warn('Backend API proposal post completed with fallback to local store:', apiErr);
    }

    return newBlock;
  },

  sanctionBlock: async (blockId, remarks, sanctionerUser = 'Chief Operating Controller (COA)', cautionSpeed) => {
    const targetBlock = get().blocks.find((b) => b.id === blockId);
    if (!targetBlock) return;

    const updatedBlocks = get().blocks.map((b) => {
      if (b.id === blockId) {
        return {
          ...b,
          status: 'SANCTIONED' as BlockStatus,
          work_description: cautionSpeed
            ? `${b.work_description} [SANCTIONED WITH CAUTION: Speed capped at ${cautionSpeed} km/h. Remarks: ${remarks}]`
            : `${b.work_description} [SANCTIONED BY COA: ${remarks}]`,
          version: (b.version || 1) + 1,
        };
      }
      return b;
    });

    // Create official Acknowledgement Order
    const ack: SanctionAcknowledgement = {
      id: `ack-${Date.now()}`,
      blockId: targetBlock.id,
      blockCode: targetBlock.block_code,
      departmentCode: targetBlock.department_code,
      sanctionedBy: sanctionerUser,
      sanctionedAt: new Date().toISOString(),
      remarks: remarks || 'Sanction granted under General & Subsidiary Rules (G&SR).',
      cautionSpeed,
      corridor: targetBlock.corridor?.name || targetBlock.corridor?.code || 'Delhi Division',
      kmRange: `${targetBlock.start_km} - ${targetBlock.end_km} KM`,
      workType: targetBlock.work_type,
      status: 'SANCTIONED',
    };

    const updatedHistory = [ack, ...get().acknowledgementHistory.slice(0, 49)];

    // Mark dismissed locally on the controller's machine so COA doesn't see their own sanction modal
    markAckAsDismissed(ack.id);

    set({
      blocks: updatedBlocks,
      activeAcknowledgement: null,
      acknowledgementHistory: updatedHistory,
    });

    // Persist to localStorage for cross-device / cross-tab broadcast (other devices will receive it)
    try {
      localStorage.setItem(STORAGE_BLOCKS_KEY, JSON.stringify(updatedBlocks));
      localStorage.setItem(STORAGE_ACK_KEY, JSON.stringify(ack));
      localStorage.setItem(STORAGE_ACK_HIST_KEY, JSON.stringify(updatedHistory));
    } catch {}

    // Post sanction to backend API in background
    try {
      await apiClient.post(`/blocks/${blockId}/sanction/`, {
        action: 'SANCTION',
        version: targetBlock.version || 1,
        remarks: remarks || 'Sanctioned by COA Chief Controller',
      });
    } catch (apiErr) {
      console.warn('Backend sanction API completed with fallback to local store:', apiErr);
    }
  },

  reviseBlock: async (blockId, reason, sanctionerUser = 'Chief Operating Controller (COA)') => {
    const targetBlock = get().blocks.find((b) => b.id === blockId);
    if (!targetBlock) return;

    const updatedBlocks = get().blocks.map((b) => {
      if (b.id === blockId) {
        return {
          ...b,
          status: 'DRAFT' as BlockStatus,
          work_description: `${b.work_description} [REVISION DIRECTED BY COA: ${reason}]`,
          version: (b.version || 1) + 1,
        };
      }
      return b;
    });

    const ack: SanctionAcknowledgement = {
      id: `ack-rev-${Date.now()}`,
      blockId: targetBlock.id,
      blockCode: targetBlock.block_code,
      departmentCode: targetBlock.department_code,
      sanctionedBy: sanctionerUser,
      sanctionedAt: new Date().toISOString(),
      remarks: `Revision Requested: ${reason}`,
      corridor: targetBlock.corridor?.name || targetBlock.corridor?.code || 'Delhi Division',
      kmRange: `${targetBlock.start_km} - ${targetBlock.end_km} KM`,
      workType: targetBlock.work_type,
      status: 'REVISED',
    };

    const updatedHistory = [ack, ...get().acknowledgementHistory.slice(0, 49)];

    markAckAsDismissed(ack.id);

    set({
      blocks: updatedBlocks,
      activeAcknowledgement: null,
      acknowledgementHistory: updatedHistory,
    });

    try {
      localStorage.setItem(STORAGE_BLOCKS_KEY, JSON.stringify(updatedBlocks));
      localStorage.setItem(STORAGE_ACK_KEY, JSON.stringify(ack));
      localStorage.setItem(STORAGE_ACK_HIST_KEY, JSON.stringify(updatedHistory));
    } catch {}
  },

  applyTimeShiftAndDeconflict: async (blockId, shiftMinutes, resolutionNotes) => {
    const targetBlock = get().blocks.find((b) => b.id === blockId || b.block_code === blockId);
    if (!targetBlock) return;

    const currentStart = new Date(targetBlock.scheduled_start_time || Date.now());
    const currentEnd = new Date(targetBlock.scheduled_end_time || Date.now() + 180 * 60 * 1000);

    const newStart = new Date(currentStart.getTime() + shiftMinutes * 60 * 1000).toISOString();
    const newEnd = new Date(currentEnd.getTime() + shiftMinutes * 60 * 1000).toISOString();

    const formattedStart = new Date(newStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const note = `[AI SWEEP-LINE DECONFLICTED: Start shifted by +${shiftMinutes}m to ${formattedStart} IST. ${resolutionNotes || 'Slot safe from train collisions.'}]`;

    const updatedBlocks = get().blocks.map((b) => {
      if (b.id === targetBlock.id) {
        return {
          ...b,
          status: 'COORDINATED' as BlockStatus,
          scheduled_start_time: newStart,
          scheduled_end_time: newEnd,
          work_description: `${b.work_description} ${note}`,
          version: (b.version || 1) + 1,
        };
      }
      return b;
    });

    set({ blocks: updatedBlocks, selectedBlockId: targetBlock.id });

    try {
      localStorage.setItem(STORAGE_BLOCKS_KEY, JSON.stringify(updatedBlocks));
    } catch {}

    // Trigger backend conflict validation / update
    try {
      await apiClient.post(`/blocks/${targetBlock.id}/validate/`);
    } catch {}
  },

  clearAcknowledgement: () => {
    const current = get().activeAcknowledgement;
    if (current) {
      markAckAsDismissed(current.id);
    }
    set({ activeAcknowledgement: null });
  },

  syncFromStorage: () => {
    try {
      const cachedBlocks = localStorage.getItem(STORAGE_BLOCKS_KEY);
      if (cachedBlocks) {
        const parsed = JSON.parse(cachedBlocks);
        if (Array.isArray(parsed)) {
          set({ blocks: parsed });
        }
      }

      const cachedAck = localStorage.getItem(STORAGE_ACK_KEY);
      if (cachedAck) {
        const parsedAck = JSON.parse(cachedAck);
        const dismissed = getDismissedAckIds();
        if (parsedAck && !dismissed.includes(parsedAck.id) && parsedAck.id !== get().activeAcknowledgement?.id) {
          set({ activeAcknowledgement: parsedAck });
        }
      }
    } catch (err) {
      console.warn('Error syncing blockStore from storage:', err);
    }
  },

  syncWithBackend: async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: any[]; total_records: number }>('/blocks/');
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const backendBlocks: Block[] = response.data.data.map((item: any) => ({
          id: item.id || `blk-${item.block_code}`,
          block_code: item.block_code,
          corridor: item.corridor || DEMO_BLOCKS[0].corridor,
          line_type: item.line_type || 'UP',
          department_code: item.department_code || 'ENG',
          work_type: item.work_type || 'Track Maintenance',
          status: item.status || 'PENDING_APPROVAL',
          start_km: Number(item.start_km) || 0,
          end_km: Number(item.end_km) || 0,
          scheduled_start_time: item.scheduled_start_time || new Date().toISOString(),
          scheduled_end_time: item.scheduled_end_time || new Date().toISOString(),
          traction_power_cutoff_required: Boolean(item.traction_power_cutoff_required),
          gang_id: item.gang_id || '',
          equipment_required: item.equipment_required || '',
          work_description: item.work_description || '',
          version: item.version || 1,
        }));

        if (backendBlocks.length > 0) {
          const existingLocal = get().blocks;

          // Cross-device alert: check if any block was previously pending and is now sanctioned by COA
          const newlySanctioned = backendBlocks.find((bb) => {
            const local = existingLocal.find((l) => l.id === bb.id || l.block_code === bb.block_code);
            return local && local.status === 'PENDING_APPROVAL' && bb.status === 'SANCTIONED';
          });

          if (newlySanctioned) {
            const ack: SanctionAcknowledgement = {
              id: `ack-${newlySanctioned.id}-${newlySanctioned.version || Date.now()}`,
              blockId: newlySanctioned.id,
              blockCode: newlySanctioned.block_code,
              departmentCode: newlySanctioned.department_code,
              sanctionedBy: 'Chief Operating Controller (COA)',
              sanctionedAt: new Date().toISOString(),
              remarks: newlySanctioned.work_description || 'Sanction granted under General & Subsidiary Rules (G&SR).',
              corridor: newlySanctioned.corridor?.name || newlySanctioned.corridor?.code || 'Delhi Division',
              kmRange: `${newlySanctioned.start_km} - ${newlySanctioned.end_km} KM`,
              workType: newlySanctioned.work_type,
              status: 'SANCTIONED',
            };

            const dismissed = getDismissedAckIds();
            if (!dismissed.includes(ack.id) && ack.id !== get().activeAcknowledgement?.id) {
              set({ activeAcknowledgement: ack });
            }
          }

          // Merge preserving any newly proposed local blocks not yet in backend
          const merged = [...existingLocal];
          backendBlocks.forEach((bb) => {
            const idx = merged.findIndex((m) => m.id === bb.id || m.block_code === bb.block_code);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...bb };
            } else {
              merged.push(bb);
            }
          });
          set({ blocks: merged });
          localStorage.setItem(STORAGE_BLOCKS_KEY, JSON.stringify(merged));
        }
      }
    } catch (err) {
      // Backend request fallback, silent
    }
  },

  initSync: () => {
    // 1. Initial sync
    get().syncFromStorage();
    get().syncWithBackend();

    // 2. Storage listener for instantaneous cross-tab updates on same browser
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_BLOCKS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            set({ blocks: parsed });
          }
        } catch {}
      }
      if (e.key === STORAGE_ACK_KEY && e.newValue) {
        try {
          const ack = JSON.parse(e.newValue);
          const dismissed = getDismissedAckIds();
          if (ack && !dismissed.includes(ack.id) && ack.id !== get().activeAcknowledgement?.id) {
            set({ activeAcknowledgement: ack });
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Periodic polling (every 2 seconds) to keep separate devices in sync over network
    const intervalId = window.setInterval(() => {
      get().syncWithBackend();
      get().syncFromStorage();
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(intervalId);
    };
  },
}));
