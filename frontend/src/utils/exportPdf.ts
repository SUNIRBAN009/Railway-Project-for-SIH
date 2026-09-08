import { Block } from '../types';
import { format } from 'date-fns';

export function printCorridorDailyPossessionSheet(blocks: Block[], corridor = 'NDLS–GZB–ALJN') {
  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (!printWindow) {
    alert('Please allow popups to generate the official possession sheet PDF.');
    return;
  }

  const currentDate = format(new Date(), 'dd-MMM-yyyy HH:mm:ss');

  const rowsHtml = blocks
    .map((b, idx) => {
      const duration = Math.round(
        (new Date(b.scheduled_end_time).getTime() - new Date(b.scheduled_start_time).getTime()) / 60000
      );
      return `
    <tr style="border-bottom: 1px solid #ddd; text-align: left; font-size: 11px;">
      <td style="padding: 6px 8px;">${idx + 1}</td>
      <td style="padding: 6px 8px; font-weight: bold; color: #003366;">${b.id}</td>
      <td style="padding: 6px 8px;">${b.department_code}</td>
      <td style="padding: 6px 8px;">${b.line_type} (KM ${b.start_km} – ${b.end_km})</td>
      <td style="padding: 6px 8px;">${format(new Date(b.scheduled_start_time), 'HH:mm')} – ${format(new Date(b.scheduled_end_time), 'HH:mm')} (${duration}m)</td>
      <td style="padding: 6px 8px;">${b.work_description}</td>
      <td style="padding: 6px 8px; font-weight: bold;">${b.status}</td>
    </tr>
  `;
    })
    .join('');

  const docHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Daily Corridor Possession Sheet — ${corridor}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            color: #111;
          }
          .header-table {
            width: 100%;
            border-bottom: 2px solid #003366;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .emblem-title {
            font-size: 16px;
            font-weight: bold;
            color: #003366;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .sub-title {
            font-size: 12px;
            color: #555;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          table.data-table th {
            background-color: #003366;
            color: white;
            padding: 8px;
            font-size: 11px;
            text-transform: uppercase;
            text-align: left;
          }
          .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          .sig-box {
            border-top: 1px solid #333;
            width: 200px;
            text-align: center;
            padding-top: 5px;
            font-size: 11px;
            font-weight: bold;
          }
          @media print {
            body { margin: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <div class="emblem-title">INDIAN RAILWAYS — NORTHERN RAILWAY</div>
              <div class="sub-title">DELHI DIVISION • CENTRAL OPERATIONS COMMAND & CONTROL OFFICE (COA)</div>
              <div style="font-size: 13px; font-weight: bold; margin-top: 4px;">DAILY TRACK POSSESSION & TRAFFIC BLOCK SANCTION BULLETIN</div>
            </td>
            <td style="text-align: right; font-size: 11px;">
              <div><strong>Corridor:</strong> ${corridor}</div>
              <div><strong>Generated:</strong> ${currentDate} IST</div>
              <div><strong>Authority:</strong> Sr. DOM / COA-DLI</div>
            </td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Block ID</th>
              <th>Dept</th>
              <th>Section / KM Span</th>
              <th>Window (IST)</th>
              <th>Work Nature & Machinery</th>
              <th>Sanction Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 20px; font-size: 10px; color: #666; border-left: 3px solid #003366; padding-left: 8px;">
          <strong>OPERATING DIRECTIVE:</strong> All trains operating on adjacent track lines must observe Caution Order speeds specified in Divisional Circular 14/2026. Traction power cutoff must be cross-verified by TPC before OHE ladder inspection commencement.
        </div>

        <div class="signature-section" style="margin-top: 60px; display: flex; justify-content: space-between;">
          <div class="sig-box">
            Section Controller (DLI)
          </div>
          <div class="sig-box">
            Chief Controller (COA)
          </div>
          <div class="sig-box">
            Sr. Divisional Operations Manager
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(docHtml);
  printWindow.document.close();
}
