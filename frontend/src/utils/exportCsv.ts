import { Block } from '../types';
import { format } from 'date-fns';

export function exportBlocksToCsv(blocks: Block[], filename = 'delhi_corridor_blocks.csv') {
  const headers = [
    'Block ID',
    'Department',
    'Line Type',
    'Start KM',
    'End KM',
    'Requested Start (IST)',
    'Requested End (IST)',
    'Duration (Min)',
    'Work Description',
    'Status',
    'Power Shutdown Required',
    'Assigned Gang',
    'Machinery Required',
  ];

  const rows = blocks.map((b) => {
    const duration = Math.round(
      (new Date(b.scheduled_end_time).getTime() - new Date(b.scheduled_start_time).getTime()) / 60000
    );
    return [
      b.id,
      b.department_code,
      b.line_type,
      b.start_km,
      b.end_km,
      format(new Date(b.scheduled_start_time), 'yyyy-MM-dd HH:mm'),
      format(new Date(b.scheduled_end_time), 'yyyy-MM-dd HH:mm'),
      duration,
      `"${(b.work_description || '').replace(/"/g, '""')}"`,
      b.status,
      b.traction_power_cutoff_required ? 'YES' : 'NO',
      `"${(b.gang_id || '').replace(/"/g, '""')}"`,
      `"${(b.equipment_required || '')}"`,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
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
