// Indian Railways Block Planning Platform (PS 26027) TypeScript Definitions

export type UserRole =
  | 'CHIEF_CONTROLLER'
  | 'SECTION_CONTROLLER'
  | 'DEPT_ENGINEER'
  | 'SITE_SUPERVISOR'
  | 'AUDITOR'
  | 'ADMIN';

export type DepartmentCode = 'ENG' | 'TRD' | 'SNT' | 'OPERATIONS' | 'SAFETY';

export type BlockStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'COORDINATED'
  | 'SANCTIONED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CONFLICT_DETECTED'
  | 'PENDING_APPROVAL'
  | 'REJECTED';

export type LineType = 'UP' | 'DOWN' | 'SINGLE' | 'BOTH';

export interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  department_code: DepartmentCode;
  division_code: string;
  employee_id?: string;
}

export interface Corridor {
  id: string;
  code: string;
  name: string;
  zone: string;
  division: string;
  source_station: string;
  destination_station: string;
  start_km: number;
  end_km: number;
  is_electrified: boolean;
  max_permissible_speed_kmh: number;
}

export interface BlockConflict {
  id: string;
  conflict_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  conflicting_entity_id: string;
  conflicting_entity_label: string;
  overlap_start_km: number;
  overlap_end_km: number;
  conflict_start_time: string;
  conflict_end_time: string;
  resolution_status: 'UNRESOLVED' | 'AUTO_RESOLVED' | 'SHADOW_MERGED' | 'RESOLVED_BY_COA';
  resolution_notes: string;
  created_at?: string;
}

export interface CombinedRecommendation {
  is_combined_candidate: boolean;
  primary_block_code?: string;
  secondary_block_code?: string;
  candidate_blocks?: string[];
  departments?: string[];
  work_types?: string[];
  overlap_span_km?: number;
  overlap_start_km?: number;
  overlap_end_km?: number;
  unified_span_km?: string;
  unified_window?: string;
  track_capacity_saved_hours?: number;
  train_delay_prevented_minutes?: number;
  shadow_bundling_efficiency?: string;
  synergy_tier?: string;
  ai_rationale?: string;
  status?: string;
}

export interface Block {
  id: string;
  block_code: string;
  corridor: Corridor | { code: string; name: string; [key: string]: any };
  corridor_code?: string;
  corridor_name?: string;
  line_type: LineType;
  department_code: DepartmentCode;
  work_type: string;
  status: BlockStatus;
  start_km: number;
  end_km: number;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  gang_id?: string;
  equipment_required?: string;
  traction_power_cutoff_required: boolean;
  work_description: string;
  version: number;
  rejection_reason?: string;
  caution_order_id?: string;
  conflicts?: BlockConflict[];
  combined_recommendation?: CombinedRecommendation;
  is_shadow?: boolean;
  parent_block?: string | Block | null;
}


export interface Train {
  id: string;
  train_number: string;
  train_name: string;
  train_type: string;
  priority_rank: number;
  source_station: string;
  destination_station: string;
  max_speed_kmh: number;
}

export interface LiveTrainPosition {
  train_number: string;
  train_name: string;
  current_km: number;
  speed_kmh: number;
  delay_minutes: number;
  status: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  created_at: string;
  is_read: boolean;
}

export interface CrewGang {
  id: string;
  gang_code: string;
  name: string;
  department: DepartmentCode;
  supervisor_name: string;
  supervisor_phone: string;
  strength: number;
  base_station: string;
  status: 'AVAILABLE' | 'DEPLOYED' | 'STANDBY';
  current_block_id?: string;
  certification: string;
}

export interface TrackMachinery {
  id: string;
  machine_code: string;
  name: string;
  type: 'BCM' | 'CSM' | 'TOWER_WAGON' | 'UNIMAT' | 'DGS';
  department: DepartmentCode;
  fitness_valid_until: string;
  fitness_status: 'FIT' | 'INSPECTION_DUE' | 'MAINTENANCE';
  operator_name: string;
  base_depot: string;
  status: 'IDLE' | 'DEPLOYED' | 'MAINTENANCE';
}

export interface MaterialStock {
  id: string;
  item_code: string;
  name: string;
  department: DepartmentCode;
  category: string;
  current_stock: number;
  required_minimum: number;
  unit: string;
  location: string;
  status: 'OPTIMAL' | 'LOW' | 'CRITICAL';
}

export interface ConflictItem {
  id: string;
  block_id: string;
  conflicting_train_number?: string;
  conflicting_train_name?: string;
  conflicting_block_id?: string;
  conflict_type: 'TRAIN_COLLISION' | 'POWER_INTERLOCK' | 'ADJACENT_LINE_SAFETY';
  start_km: number;
  end_km: number;
  estimated_delay_minutes: number;
  resolution_suggestion: string;
  recommended_shift_minutes: number;
  severity: 'CRITICAL' | 'MAJOR' | 'MODERATE';
}

export interface BlockAuditEntry {
  id: string;
  timestamp: string;
  action: 'PROPOSED' | 'ENDORSED' | 'SANCTIONED' | 'REVISED' | 'REJECTED';
  actor_name: string;
  actor_role: string;
  department: string;
  remarks: string;
}
