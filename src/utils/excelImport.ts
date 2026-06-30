import type { AppData, Equipment, Location, PSV, PSVDatasheet, PSVEvent, PSVStatus } from '../types';
import { uid } from './id';
import { toISODate, todayISO } from './dates';

// ---------------------------------------------------------------------------
// Bulk data import from Excel/CSV (and JSON backups). The Excel layout matches
// the downloadable template: one row per PSV, with its equipment + location.
// xlsx is imported dynamically so it only loads when importing/templating.
// ---------------------------------------------------------------------------

export interface ImportResult {
  data: AppData;
  counts: { equipment: number; locations: number; psvs: number; rows: number };
  warnings: string[];
}

/** Column headers used by the import template (also accepted on import). */
export const TEMPLATE_HEADERS = [
  'Equipment',
  'Equipment Tag',
  'Equipment Type',
  'Area',
  'Location',
  'Location Tag',
  'Serial Number',
  'PSV Tag',
  'Status',
  'Serviced On Site',
  'Make',
  'Model',
  'Type',
  'Set Pressure',
  'Pressure Unit',
  'Capacity',
  'Inlet Size',
  'Outlet Size',
  'Orifice',
  'Body Material',
  'National Board No.',
  'Install Date',
  'Service Date',
] as const;

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Looks up a value in a row by any of the candidate header names. */
function pick(_row: Record<string, unknown>, normMap: Map<string, unknown>, ...candidates: string[]) {
  for (const c of candidates) {
    const v = normMap.get(norm(c));
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
}

function toIso(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (v instanceof Date && !isNaN(v.getTime())) return toISODate(v);
  if (typeof v === 'number') {
    // Excel serial date (days since 1899-12-30)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return toISODate(d);
  }
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? undefined : toISODate(d);
}

function normStatus(v: unknown): PSVStatus {
  const t = String(v ?? '').toLowerCase();
  if (t.includes('install')) return 'installed';
  if (t.includes('out') || t.includes('service')) return 'out_for_service';
  if (t.includes('invent') || t.includes('spare') || t.includes('shelf')) return 'inventory';
  return 'inventory';
}

function isYes(v: unknown): boolean {
  const t = String(v ?? '').toLowerCase().trim();
  return t === 'yes' || t === 'y' || t === 'true' || t === '1';
}

/** Parses an uploaded Excel/CSV file into AppData. */
export async function parseExcelFile(file: File): Promise<ImportResult> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });

  // Prefer a sheet named like the register/import; otherwise use the first.
  const sheetName =
    wb.SheetNames.find((n) => /register|import|psv/i.test(n)) ?? wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error('The file has no readable sheet.');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return buildFromRows(rows);
}

function buildFromRows(rows: Record<string, unknown>[]): ImportResult {
  const equipment: Equipment[] = [];
  const locations: Location[] = [];
  const psvs: PSV[] = [];
  const warnings: string[] = [];

  const eqByKey = new Map<string, Equipment>();
  const locByKey = new Map<string, Location>();
  const now = new Date().toISOString();

  let rowNum = 1;
  for (const raw of rows) {
    rowNum += 1;
    const normMap = new Map<string, unknown>();
    for (const [k, v] of Object.entries(raw)) normMap.set(norm(k), v);

    const sn = String(pick(raw, normMap, 'Serial Number', 'S/N', 'SN', 'Serial') ?? '').trim();
    const eqName = String(pick(raw, normMap, 'Equipment', 'Equipment Name') ?? '').trim();
    if (!sn && !eqName) continue; // skip blank lines
    if (!sn) {
      warnings.push(`Row ${rowNum}: missing Serial Number — skipped.`);
      continue;
    }

    const eqTag = String(pick(raw, normMap, 'Equipment Tag', 'Asset Number', 'Asset No') ?? '').trim();
    const eqType = String(pick(raw, normMap, 'Equipment Type', 'Type of Equipment') ?? '').trim();
    const area = String(pick(raw, normMap, 'Area', 'Plant', 'Building', 'Location Area') ?? '').trim();

    const eqKey = norm(eqTag || eqName || 'unassigned');
    let eq = eqByKey.get(eqKey);
    if (!eq) {
      eq = {
        id: uid('eq'),
        name: eqName || eqTag || 'Unassigned Equipment',
        tag: eqTag,
        type: eqType,
        area,
        description: '',
      };
      eqByKey.set(eqKey, eq);
      equipment.push(eq);
    }

    const locName = String(pick(raw, normMap, 'Location', 'Location Name', 'Service') ?? '').trim();
    const locTag = String(pick(raw, normMap, 'Location Tag', 'Service Tag') ?? '').trim();
    const locKey = `${eqKey}|${norm(locTag || locName || 'unassigned')}`;
    let loc = locByKey.get(locKey);
    if (!loc) {
      loc = {
        id: uid('loc'),
        equipmentId: eq.id,
        name: locName || locTag || 'Unassigned Location',
        tag: locTag,
        description: '',
      };
      locByKey.set(locKey, loc);
      locations.push(loc);
    }

    const servicedOnSite = isYes(pick(raw, normMap, 'Serviced On Site', 'On Site Service', 'No Spare'));
    let status = normStatus(pick(raw, normMap, 'Status'));
    if (servicedOnSite) status = 'installed';

    const installDate = toIso(pick(raw, normMap, 'Install Date', 'Last Install Date', 'Installation Date'));
    const serviceDate = toIso(pick(raw, normMap, 'Service Date', 'Last Service Date'));

    const datasheet: PSVDatasheet = {
      make: String(pick(raw, normMap, 'Make', 'Manufacturer') ?? '').trim(),
      model: String(pick(raw, normMap, 'Model', 'Model Number') ?? '').trim(),
      type: String(pick(raw, normMap, 'Type', 'Valve Type') ?? '').trim() || 'Conventional Spring',
      setPressure: Number(pick(raw, normMap, 'Set Pressure', 'Set Point')) || 0,
      pressureUnit: String(pick(raw, normMap, 'Pressure Unit', 'Unit') ?? 'PSIG').trim() || 'PSIG',
      capacity: String(pick(raw, normMap, 'Capacity') ?? '').trim(),
      inletSize: String(pick(raw, normMap, 'Inlet Size', 'Inlet') ?? '').trim(),
      outletSize: String(pick(raw, normMap, 'Outlet Size', 'Outlet') ?? '').trim(),
      orifice: String(pick(raw, normMap, 'Orifice') ?? '').trim(),
      bodyMaterial: String(pick(raw, normMap, 'Body Material', 'Material') ?? '').trim(),
      nationalBoardNumber: String(pick(raw, normMap, 'National Board No.', 'National Board', 'NB No') ?? '').trim(),
      serviceMedium: String(pick(raw, normMap, 'Service Medium', 'Medium') ?? '').trim(),
      manufactureYear: String(pick(raw, normMap, 'Manufacture Year', 'Year') ?? '').trim(),
    };

    const psvId = uid('psv');
    const createdDate = installDate ?? todayISO();
    const events: PSVEvent[] = [
      {
        id: uid('evt'),
        psvId,
        type: 'created',
        date: createdDate,
        description: `PSV ${sn} imported`,
        recordedAt: now,
      },
    ];

    if (installDate) {
      events.push({
        id: uid('evt'),
        psvId,
        type: 'status-change',
        status: servicedOnSite ? 'installed' : status,
        date: installDate,
        description: 'Installed in service',
        recordedAt: now,
      });
    } else {
      events.push({
        id: uid('evt'),
        psvId,
        type: 'status-change',
        status,
        date: createdDate,
        description: `Status set to ${status}`,
        recordedAt: now,
      });
    }

    if (serviceDate) {
      events.push({
        id: uid('evt'),
        psvId,
        type: servicedOnSite ? 'service' : 'status-change',
        status: servicedOnSite ? undefined : 'out_for_service',
        date: serviceDate,
        description: servicedOnSite ? 'Serviced on site' : 'Service / recertification recorded',
        recordedAt: now,
      });
    }

    psvs.push({
      id: psvId,
      serialNumber: sn,
      tag: String(pick(raw, normMap, 'PSV Tag', 'Tag') ?? '').trim() || undefined,
      locationId: loc.id,
      status,
      servicedOnSite: servicedOnSite || undefined,
      datasheet,
      events,
      createdAt: now,
    });
  }

  return {
    data: { equipment, locations, psvs },
    counts: {
      equipment: equipment.length,
      locations: locations.length,
      psvs: psvs.length,
      rows: rows.length,
    },
    warnings,
  };
}

/** Builds and downloads an Excel template pre-filled with headers + an example. */
export async function downloadImportTemplate() {
  const XLSX = await import('xlsx');
  const example: Record<string, string | number> = {
    Equipment: 'Boiler #1',
    'Equipment Tag': 'BLR-001',
    'Equipment Type': 'Boiler',
    Area: 'Central Utility Plant',
    Location: 'Steam Drum Relief',
    'Location Tag': 'BLR-001-PSV-A',
    'Serial Number': 'CV-1001',
    'PSV Tag': 'BLR-001-PSV-A',
    Status: 'Installed',
    'Serviced On Site': 'No',
    Make: 'Consolidated',
    Model: '1900-30JM',
    Type: 'Conventional Spring',
    'Set Pressure': 650,
    'Pressure Unit': 'PSIG',
    Capacity: '185,000 lb/hr',
    'Inlet Size': '4"',
    'Outlet Size': '6"',
    Orifice: 'M',
    'Body Material': 'Carbon Steel',
    'National Board No.': 'NB-19842',
    'Install Date': '2024-05-15',
    'Service Date': '',
  };

  const ws = XLSX.utils.json_to_sheet([example], { header: [...TEMPLATE_HEADERS] });
  ws['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 2, 14) }));

  const notes = XLSX.utils.aoa_to_sheet([
    ['PSV Import Template — Instructions'],
    [''],
    ['• One row per PSV (serial number). Equipment & Location are created automatically from the names/tags.'],
    ['• Two PSVs that share the same Equipment + Location are treated as the installed valve + its spare.'],
    ['• Status: Installed, Out for Service, or In Inventory.'],
    ['• Serviced On Site: "Yes" for valves with no spare that are recertified in place.'],
    ['• Install Date drives the recert due date (install + 3 years). For on-site valves, Service Date is used.'],
    ['• Dates can be YYYY-MM-DD or any Excel date cell.'],
    ['• Delete this example row and the Instructions sheet is optional — only the data sheet is read.'],
  ]);
  notes['!cols'] = [{ wch: 110 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PSV Register');
  XLSX.utils.book_append_sheet(wb, notes, 'Instructions');
  XLSX.writeFile(wb, 'PSV-Import-Template.xlsx');
}

/** Parses a JSON backup (as produced by exportBackupJSON) into AppData. */
export function parseJsonBackup(text: string): AppData {
  const parsed = JSON.parse(text) as AppData;
  if (!parsed || !Array.isArray(parsed.equipment) || !Array.isArray(parsed.psvs)) {
    throw new Error('Not a valid PSV backup file.');
  }
  return {
    equipment: parsed.equipment,
    locations: parsed.locations ?? [],
    psvs: parsed.psvs,
  };
}

/** Downloads the full dataset as a JSON backup file. */
export function exportBackupJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PSV-Backup_${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
