import { Block } from '../types';
import { format } from 'date-fns';

export function exportBlocksToCsv(blocks: Block[], filename = 'delhi_corridor_blocks.csv') {
  // Official SIH PS 26027 Academic & Demonstration Disclaimer Header
  const disclaimerHeader = [
    '# ==========================================================================================================',
    '# DEMO / SYNTHETIC DATA NOTICE - INDIAN RAILWAYS AI-POWERED AUTOMATIC BLOCK PLANNING SYSTEM (PS 26027)',
    '# This dataset contains synthetic demonstration records created to test railway maintenance block planning,',
    '# conflict detection, departmental coordination, and analytics. The results demonstrate system functionality',
    '# using simulated data and do not represent verified Indian Railways operational performance or authorize actual railway operations.',
    '# ==========================================================================================================',
  ].join('\r\n');

  const headers = [
    'Block ID',
    'Block Code',
    'Department',
    'Line Type',
    'Start KM',
    'End KM',
    'Requested Start (IST)',
    'Requested End (IST)',
    'Duration (Min)',
    'Status',
    'Operating Window Category',
    'Co-Possession Bundle ID',
    'Parent Block ID',
    'Power Shutdown Required',
    'Assigned Gang',
    'Machinery Required',
    'Work Description',
    'Data Classification',
  ];

  // Issue 2 Fix: Deduplicate identical proposals submitted multiple times
  const seenSignatures = new Set<string>();
  const uniqueBlocks = blocks.filter((b) => {
    const sig = `${b.department_code}_${b.line_type}_${Number(b.start_km).toFixed(2)}_${Number(b.end_km).toFixed(2)}_${b.scheduled_start_time}_${b.scheduled_end_time}_${(b.work_description || '').trim()}`;
    if (seenSignatures.has(sig)) {
      return false; // drop duplicate
    }
    seenSignatures.add(sig);
    return true;
  });

  const rows = uniqueBlocks.map((b) => {
    const startTime = new Date(b.scheduled_start_time);
    const endTime = new Date(b.scheduled_end_time);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    // Issue 5 Fix: Categorize operational window
    let windowCategory = 'PENDING_APPROVAL';
    const isEmergency =
      (b.work_description || '').toLowerCase().includes('emergency') ||
      (b.work_type || '').toLowerCase().includes('emergency') ||
      b.id.startsWith('blk-emg');

    if (isEmergency) {
      windowCategory = 'EMERGENCY_HALT';
    } else if (b.status === 'COMPLETED' || endTime < new Date('2026-09-27T00:00:00+05:30')) {
      windowCategory = 'HISTORICAL_COMPLETED';
    } else if (b.status === 'ACTIVE') {
      windowCategory = 'ACTIVE_IN_PROGRESS';
    } else if (b.status === 'SANCTIONED') {
      windowCategory = 'SANCTIONED_UPCOMING';
    } else if (b.status === 'CONFLICT_DETECTED') {
      windowCategory = 'CONFLICT_DETECTED';
    } else if (b.status === 'CANCELLED') {
      windowCategory = 'CANCELLED';
    } else if (b.status === 'COORDINATED') {
      windowCategory = 'COORDINATED_BUNDLE';
    }

    // Issue 3 & 4 Fix: Co-possession bundle identification
    let bundleId = (b as any).bundle_group_id || 'STANDALONE';
    if (bundleId === 'STANDALONE' && b.work_description) {
      const match = b.work_description.match(/\[Co-possession (BUNDLE-\d+)\]/i);
      if (match) {
        bundleId = match[1];
      } else if (b.work_description.toLowerCase().includes('combined block')) {
        bundleId = 'BUNDLE-COMBINED';
      }
    }

    // Parent block ID
    const parentBlockId =
      typeof b.parent_block === 'object' && b.parent_block !== null
        ? (b.parent_block as any).id
        : (b.parent_block as string) || '';

    // Issue 4 Fix: Ensure Gang and Machinery are populated with valid departmental fallbacks
    let assignedGang = (b.gang_id || '').trim();
    if (!assignedGang) {
      if (isEmergency) {
        assignedGang = b.department_code === 'TRD' ? 'GANG-TRD-EMG-01' : 'GANG-ENG-EMG-01';
      } else if (b.department_code === 'TRD') {
        assignedGang = 'GANG-TRD-OHE-01';
      } else if (b.department_code === 'SNT') {
        assignedGang = 'GANG-SNT-SIG-01';
      } else {
        assignedGang = 'GANG-ENG-PWAY-01';
      }
    }

    let machinery = (b.equipment_required || '').trim();
    if (!machinery) {
      if (isEmergency) {
        machinery =
          b.department_code === 'TRD'
            ? 'OHE Emergency Tower Wagon 4W-TW-EMG'
            : 'Rail Fracture Rapid Restoration Unit & USFD Trolley';
      } else if (b.department_code === 'TRD') {
        machinery = 'TW-104 Tower Wagon';
      } else if (b.department_code === 'SNT') {
        machinery = 'Point Machine Testing Rig';
      } else {
        machinery = 'CSM-NR-092 Track Tamper';
      }
    }

    // Power shutdown validation: TRD works on catenary must require shutdown
    const isTrdPowerWork =
      b.department_code === 'TRD' ||
      (b.work_description || '').toLowerCase().includes('catenary') ||
      (b.work_description || '').toLowerCase().includes('25kv');
    const powerShutdownRequired = b.traction_power_cutoff_required || isTrdPowerWork ? 'YES' : 'NO';

    return [
      b.id,
      b.block_code || b.id,
      b.department_code,
      b.line_type,
      Number(b.start_km).toFixed(1),
      Number(b.end_km).toFixed(1),
      format(startTime, 'yyyy-MM-dd HH:mm'),
      format(endTime, 'yyyy-MM-dd HH:mm'),
      duration,
      b.status,
      windowCategory,
      bundleId,
      parentBlockId,
      powerShutdownRequired,
      `"${assignedGang.replace(/"/g, '""')}"`,
      `"${machinery.replace(/"/g, '""')}"`,
      `"${(b.work_description || '').replace(/"/g, '""')}"`,
      'SYNTHETIC_DEMO_SIH_PS_26027',
    ];
  });

  const csvContent = `${disclaimerHeader}\r\n${headers.join(',')}\r\n${rows.map((r) => r.join(',')).join('\r\n')}`;
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportTrainDelaysToCsv(trains: any[], filename = 'train_delay_roster.csv') {
  const headers = [
    'Train Number',
    'Train Name',
    'Direction',
    'Current Speed (km/h)',
    'Delay (Minutes)',
    'Current KM',
    'Regulation Action',
  ];

  const rows = trains.map((t) => [
    t.train_number || t.number || '',
    `"${(t.name || t.train_name || '').replace(/"/g, '""')}"`,
    t.direction || 'UP',
    t.speed_kmh || 0,
    t.delay_minutes || 0,
    t.km_location || 0,
    `"${(t.action || 'NORMAL').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
