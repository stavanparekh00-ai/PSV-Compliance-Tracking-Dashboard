import type { WorkSheet } from 'xlsx';
import type { AppData, Equipment, PSV } from '../types';
import {
  COMPLIANCE_LABELS,
  STATUS_LABELS,
  getCompliance,
  lastInstallDate,
  lastServiceDate,
  summarize,
} from './compliance';
import { buildActivityFeed } from './activity';
import { formatDate, formatDateTime, todayISO } from './dates';

interface ExportScope {
  /** Optional single equipment to scope the report to. */
  equipment?: Equipment;
}

/**
 * Builds and downloads a multi-sheet Excel workbook for the given data/scope.
 * xlsx is imported dynamically so it is only loaded when an export is requested.
 */
export async function exportToExcel(data: AppData, scope: ExportScope = {}) {
  const XLSX = await import('xlsx');
  const eqIds = scope.equipment ? new Set([scope.equipment.id]) : null;

  const equipment = eqIds ? data.equipment.filter((e) => eqIds.has(e.id)) : data.equipment;
  const locations = eqIds
    ? data.locations.filter((l) => eqIds.has(l.equipmentId))
    : data.locations;
  const locIds = new Set(locations.map((l) => l.id));
  const psvs = data.psvs.filter((p) => locIds.has(p.locationId));

  const eqById = new Map(data.equipment.map((e) => [e.id, e]));
  const locById = new Map(data.locations.map((l) => [l.id, l]));

  const wb = XLSX.utils.book_new();

  // --- Sheet 1: PSV Register ------------------------------------------------
  const registerRows = psvs
    .map((psv) => {
      const loc = locById.get(psv.locationId);
      const eq = loc ? eqById.get(loc.equipmentId) : undefined;
      const c = getCompliance(psv);
      return {
        Equipment: eq?.name ?? '',
        'Equipment Tag': eq?.tag ?? '',
        Area: eq?.area ?? '',
        Location: loc?.name ?? '',
        'Location Tag': loc?.tag ?? '',
        'Serial Number': psv.serialNumber,
        'PSV Tag': psv.tag ?? '',
        Status: STATUS_LABELS[psv.status],
        'Serviced On Site': psv.servicedOnSite ? 'Yes' : 'No',
        Make: psv.datasheet.make,
        Model: psv.datasheet.model,
        Type: psv.datasheet.type,
        'Set Pressure': psv.datasheet.setPressure,
        Unit: psv.datasheet.pressureUnit,
        Capacity: psv.datasheet.capacity,
        Inlet: psv.datasheet.inletSize,
        Outlet: psv.datasheet.outletSize,
        Orifice: psv.datasheet.orifice,
        'Body Material': psv.datasheet.bodyMaterial,
        'National Board No.': psv.datasheet.nationalBoardNumber ?? '',
        'Last Install Date': formatDate(lastInstallDate(psv)),
        'Last Service Date': formatDate(lastServiceDate(psv)),
        'Due Date': c.dueDate ? formatDate(c.dueDate) : '',
        'Days Remaining': c.daysRemaining ?? '',
        Compliance: COMPLIANCE_LABELS[c.state],
      };
    })
    .sort((a, b) => a.Equipment.localeCompare(b.Equipment) || a.Location.localeCompare(b.Location));

  const wsRegister = XLSX.utils.json_to_sheet(
    registerRows.length ? registerRows : [{ Note: 'No PSVs to report.' }],
  );
  autoWidth(wsRegister, registerRows);
  XLSX.utils.book_append_sheet(wb, wsRegister, 'PSV Register');

  // --- Sheet 2: Compliance Summary -----------------------------------------
  const summaryRows: Array<Record<string, string | number>> = equipment.map((eq) => {
    const eqLocIds = new Set(data.locations.filter((l) => l.equipmentId === eq.id).map((l) => l.id));
    const eqPsvs = data.psvs.filter((p) => eqLocIds.has(p.locationId));
    const s = summarize(eqPsvs);
    return {
      Equipment: eq.name,
      Tag: eq.tag,
      Area: eq.area,
      'Total PSVs': s.total,
      Installed: s.installed,
      Inventory: s.inventory,
      'Out for Service': s.outForService,
      'Due Soon': s.dueSoon,
      Overdue: s.overdue,
    };
  });
  const totals = summarize(psvs);
  summaryRows.push({
    Equipment: 'TOTAL',
    Tag: '',
    Area: '',
    'Total PSVs': totals.total,
    Installed: totals.installed,
    Inventory: totals.inventory,
    'Out for Service': totals.outForService,
    'Due Soon': totals.dueSoon,
    Overdue: totals.overdue,
  });
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  autoWidth(wsSummary, summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Compliance Summary');

  // --- Sheet 3: Due & Overdue ----------------------------------------------
  const dueRows = psvs
    .map((psv) => ({ psv, c: getCompliance(psv) }))
    .filter((x) => x.c.state !== 'not_installed')
    .sort((a, b) => (a.c.daysRemaining ?? 0) - (b.c.daysRemaining ?? 0))
    .map(({ psv, c }) => {
      const loc = locById.get(psv.locationId);
      const eq = loc ? eqById.get(loc.equipmentId) : undefined;
      return {
        Equipment: eq?.name ?? '',
        Location: loc?.name ?? '',
        'Serial Number': psv.serialNumber,
        'Due Date': formatDate(c.dueDate),
        'Days Remaining': c.daysRemaining ?? '',
        Compliance: COMPLIANCE_LABELS[c.state],
      };
    });
  const wsDue = XLSX.utils.json_to_sheet(
    dueRows.length ? dueRows : [{ Note: 'No installed PSVs to report.' }],
  );
  autoWidth(wsDue, dueRows);
  XLSX.utils.book_append_sheet(wb, wsDue, 'Due & Overdue');

  // --- Sheet 4: History Log -------------------------------------------------
  const feed = buildActivityFeed(data).filter((a) =>
    eqIds ? eqIds.has(a.equipmentId) : true,
  );
  const historyRows = feed.map((item) => ({
    'Recorded At': formatDateTime(item.event.recordedAt),
    'Event Date': formatDate(item.event.date),
    Equipment: item.equipmentName,
    Location: item.locationName,
    'Serial Number': item.serialNumber,
    Type: item.event.type,
    Description: item.event.description,
    Note: item.event.note ?? '',
  }));
  const wsHistory = XLSX.utils.json_to_sheet(
    historyRows.length ? historyRows : [{ Note: 'No history recorded.' }],
  );
  autoWidth(wsHistory, historyRows);
  XLSX.utils.book_append_sheet(wb, wsHistory, 'History Log');

  const scopeName = scope.equipment
    ? scope.equipment.tag || scope.equipment.name.replace(/\s+/g, '-')
    : 'All-Equipment';
  const filename = `PSV-Report_${scopeName}_${todayISO()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  created: 'Created',
  'status-change': 'Status Change',
  service: 'On-site Service',
  'datasheet-update': 'Datasheet Update',
  'history-edit': 'History Edit',
  note: 'Note',
};

/**
 * Builds and downloads an Excel workbook for a single PSV: a summary/datasheet
 * sheet plus the full chronological history (status changes, services, etc.).
 */
export async function exportPSVToExcel(data: AppData, psv: PSV) {
  const XLSX = await import('xlsx');
  const loc = data.locations.find((l) => l.id === psv.locationId);
  const eq = loc ? data.equipment.find((e) => e.id === loc.equipmentId) : undefined;
  const c = getCompliance(psv);

  const wb = XLSX.utils.book_new();

  // --- Sheet 1: Summary & Datasheet ----------------------------------------
  const summaryAoa: Array<[string, string | number]> = [
    ['PSV SUMMARY', ''],
    ['Serial Number', psv.serialNumber],
    ['PSV Tag', psv.tag ?? ''],
    ['Equipment', eq?.name ?? ''],
    ['Equipment Tag', eq?.tag ?? ''],
    ['Location', loc?.name ?? ''],
    ['Current Status', STATUS_LABELS[psv.status]],
    ['Serviced On Site', psv.servicedOnSite ? 'Yes' : 'No'],
    ['Last Install Date', formatDate(lastInstallDate(psv))],
    ['Last Service Date', formatDate(lastServiceDate(psv))],
    ['Recert Due Date', c.dueDate ? formatDate(c.dueDate) : 'Not installed'],
    ['Days Remaining', c.daysRemaining ?? ''],
    ['Compliance', COMPLIANCE_LABELS[c.state]],
    ['', ''],
    ['DATASHEET', ''],
    ['Make / Manufacturer', psv.datasheet.make],
    ['Model Number', psv.datasheet.model],
    ['Type', psv.datasheet.type],
    ['Set Pressure', `${psv.datasheet.setPressure} ${psv.datasheet.pressureUnit}`],
    ['Capacity', psv.datasheet.capacity],
    ['Inlet Size', psv.datasheet.inletSize],
    ['Outlet Size', psv.datasheet.outletSize],
    ['Orifice', psv.datasheet.orifice],
    ['Body Material', psv.datasheet.bodyMaterial],
    ['Spring Material', psv.datasheet.springMaterial ?? ''],
    ['Connection Type', psv.datasheet.connectionType ?? ''],
    ['Cold Diff. Test Pressure', psv.datasheet.coldDifferentialTestPressure ?? ''],
    ['Service Medium', psv.datasheet.serviceMedium ?? ''],
    ['National Board No.', psv.datasheet.nationalBoardNumber ?? ''],
    ['Manufacture Year', psv.datasheet.manufactureYear ?? ''],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // --- Sheet 2: History -----------------------------------------------------
  const historyRows = [...psv.events]
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.recordedAt < b.recordedAt ? 1 : -1;
    })
    .map((e) => ({
      'Event Date': formatDate(e.date),
      Type: EVENT_TYPE_LABELS[e.type] ?? e.type,
      Status: e.status ? STATUS_LABELS[e.status] : '',
      Description: e.description,
      Note: e.note ?? '',
      'Recorded At': formatDateTime(e.recordedAt),
    }));
  const wsHistory = XLSX.utils.json_to_sheet(
    historyRows.length ? historyRows : [{ Note: 'No history recorded.' }],
  );
  autoWidth(wsHistory, historyRows);
  XLSX.utils.book_append_sheet(wb, wsHistory, 'History');

  const safeSn = psv.serialNumber.replace(/[^\w.-]+/g, '-');
  XLSX.writeFile(wb, `PSV_${safeSn}_${todayISO()}.xlsx`);
}

/** Sets reasonable column widths based on header + content length. */
function autoWidth(ws: WorkSheet, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  ws['!cols'] = keys.map((key) => {
    const maxContent = rows.reduce((max, row) => {
      const v = row[key];
      const len = v === null || v === undefined ? 0 : String(v).length;
      return Math.max(max, len);
    }, key.length);
    return { wch: Math.min(Math.max(maxContent + 2, 10), 40) };
  });
}
