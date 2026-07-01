import type {
  AppData,
  Equipment,
  Location,
  PSV,
  PSVDatasheet,
  PSVEvent,
  PSVStatus,
} from '../types';

// ---------------------------------------------------------------------------
// Seed data for the dashboard. This is placeholder data modelled on the kind of
// equipment a campus Utilities & Energy Services group operates (boilers, hot
// water heating boilers, HRSGs). Used only as a fallback when no saved data
// exists in the browser yet.
// ---------------------------------------------------------------------------

let evtCounter = 0;
const eid = () => `evt-seed-${++evtCounter}`;
const isoDateTime = (date: string) => `${date}T09:00:00.000Z`;

const STATUS_DESCRIPTION: Record<PSVStatus, string> = {
  installed: 'Installed in service',
  out_for_service: 'Removed — sent out for service / recertification',
  inventory: 'Placed in inventory (spare)',
};

interface TimelineEntry {
  date: string;
  status?: PSVStatus;
  /** When set, this entry is logged as an on-site service event (no swap). */
  service?: boolean;
  note?: string;
}

const DEFAULT_DATASHEET: PSVDatasheet = {
  make: 'Consolidated',
  model: '1900-30',
  type: 'Conventional Spring',
  setPressure: 150,
  pressureUnit: 'PSIG',
  capacity: '12,500 lb/hr',
  inletSize: '2"',
  outletSize: '3"',
  orifice: 'J',
  bodyMaterial: 'Carbon Steel (WCB)',
  springMaterial: 'Tungsten Alloy Steel',
  connectionType: 'Flanged (RF)',
  coldDifferentialTestPressure: '150 PSIG',
  serviceMedium: 'Saturated Steam',
  nationalBoardNumber: 'NB-22184',
  manufactureYear: '2019',
};

function ds(partial: Partial<PSVDatasheet>): PSVDatasheet {
  return { ...DEFAULT_DATASHEET, ...partial };
}

function buildValve(args: {
  id: string;
  sn: string;
  tag: string;
  locationId: string;
  datasheet: PSVDatasheet;
  createdAt: string;
  servicedOnSite?: boolean;
  timeline: TimelineEntry[];
}): PSV {
  const events: PSVEvent[] = [
    {
      id: eid(),
      psvId: args.id,
      type: 'created',
      date: args.createdAt,
      description: `PSV ${args.sn} added to the tracking system`,
      recordedAt: isoDateTime(args.createdAt),
    },
  ];

  let status: PSVStatus = args.servicedOnSite ? 'installed' : 'inventory';

  for (const t of args.timeline) {
    if (t.service) {
      events.push({
        id: eid(),
        psvId: args.id,
        type: 'service',
        date: t.date,
        description: 'Serviced on site',
        note: t.note,
        recordedAt: isoDateTime(t.date),
      });
    } else if (t.status) {
      events.push({
        id: eid(),
        psvId: args.id,
        type: 'status-change',
        status: t.status,
        date: t.date,
        description: STATUS_DESCRIPTION[t.status],
        note: t.note,
        recordedAt: isoDateTime(t.date),
      });
      status = t.status;
    }
  }

  if (args.servicedOnSite) status = 'installed';

  return {
    id: args.id,
    serialNumber: args.sn,
    tag: args.tag,
    locationId: args.locationId,
    status,
    servicedOnSite: args.servicedOnSite || undefined,
    datasheet: args.datasheet,
    events,
    createdAt: isoDateTime(args.createdAt),
  };
}

/** Standard swap location: one installed valve + one spare. */
function swapPair(args: {
  ids: [string, string];
  sns: [string, string];
  tag: string;
  locationId: string;
  createdAt: string;
  installedDate: string;
  spareStatus: 'inventory' | 'out_for_service';
  spareNote?: string;
  datasheet: PSVDatasheet;
  spareDatasheet?: PSVDatasheet;
}): PSV[] {
  const spareDs = args.spareDatasheet ?? args.datasheet;
  return [
    buildValve({
      id: args.ids[0],
      sn: args.sns[0],
      tag: args.tag,
      locationId: args.locationId,
      datasheet: args.datasheet,
      createdAt: args.createdAt,
      timeline: [{ date: args.installedDate, status: 'installed' }],
    }),
    buildValve({
      id: args.ids[1],
      sn: args.sns[1],
      tag: args.tag,
      locationId: args.locationId,
      datasheet: spareDs,
      createdAt: args.createdAt,
      timeline: [{ date: args.installedDate, status: args.spareStatus, note: args.spareNote }],
    }),
  ];
}

const STEAM_DRUM_DS = ds({
  make: 'Consolidated',
  model: '1900-30JM',
  setPressure: 650,
  capacity: '185,000 lb/hr',
  orifice: 'M',
  inletSize: '4"',
  outletSize: '6"',
  serviceMedium: 'Saturated Steam',
  manufactureYear: '2018',
  nationalBoardNumber: 'NB-19842',
});

const SUPERHEATER_DS = ds({
  make: 'Crosby',
  model: 'HCI-2',
  setPressure: 600,
  capacity: '120,000 lb/hr',
  orifice: 'L',
  inletSize: '3"',
  outletSize: '4"',
  serviceMedium: 'Superheated Steam',
  manufactureYear: '2020',
  nationalBoardNumber: 'NB-20551',
});

const ECONOMIZER_DS = ds({
  make: 'Kunkle',
  model: '6010',
  setPressure: 700,
  capacity: '95,000 lb/hr',
  orifice: 'K',
  inletSize: '2.5"',
  outletSize: '4"',
  serviceMedium: 'Feedwater',
  manufactureYear: '2021',
});

const MUD_DRUM_DS = ds({
  make: 'Consolidated',
  model: '1900-20',
  setPressure: 650,
  capacity: '75,000 lb/hr',
  orifice: 'K',
  inletSize: '3"',
  outletSize: '4"',
  serviceMedium: 'Saturated Steam',
  manufactureYear: '2019',
});

const REHEAT_DS = ds({
  make: 'Dresser',
  model: '1900',
  setPressure: 550,
  capacity: '110,000 lb/hr',
  orifice: 'L',
  inletSize: '3"',
  outletSize: '5"',
  serviceMedium: 'Superheated Steam',
  manufactureYear: '2021',
});

// --- Equipment -------------------------------------------------------------

const equipment: Equipment[] = [
  {
    id: 'eq-blr1',
    name: 'Boiler #1',
    tag: 'BLR-001',
    type: 'Boiler',
    area: 'Central Utility Plant',
    description: '250,000 lb/hr high-pressure watertube steam boiler serving the campus loop.',
  },
  {
    id: 'eq-blr2',
    name: 'Boiler #2',
    tag: 'BLR-002',
    type: 'Boiler',
    area: 'Central Utility Plant',
    description: '250,000 lb/hr high-pressure watertube steam boiler (lead/lag with Boiler #1).',
  },
  {
    id: 'eq-blr3',
    name: 'Boiler #3',
    tag: 'BLR-003',
    type: 'Boiler',
    area: 'West Campus Satellite Plant',
    description: '180,000 lb/hr watertube boiler supporting west campus academic buildings.',
  },
  {
    id: 'eq-blr4',
    name: 'Boiler #4',
    tag: 'BLR-004',
    type: 'Boiler',
    area: 'East Campus Satellite Plant',
    description: '200,000 lb/hr watertube boiler for east campus steam distribution.',
  },
  {
    id: 'eq-blr5',
    name: 'Boiler #5',
    tag: 'BLR-005',
    type: 'Boiler',
    area: 'Research Campus Plant',
    description: '150,000 lb/hr boiler dedicated to research lab steam loads.',
  },
  {
    id: 'eq-blr6',
    name: 'Boiler #6',
    tag: 'BLR-006',
    type: 'Boiler',
    area: 'Medical District Plant',
    description: '220,000 lb/hr boiler with redundant relief for hospital steam service.',
  },
  {
    id: 'eq-blr7',
    name: 'Boiler #7',
    tag: 'BLR-007',
    type: 'Boiler',
    area: 'Combined Heat & Power Plant',
    description: '175,000 lb/hr auxiliary boiler supporting the CHP steam header.',
  },
];

// --- Locations -------------------------------------------------------------

const locations: Location[] = [
  // Boiler #1 — 5 locations
  { id: 'loc-blr1-drum', equipmentId: 'eq-blr1', name: 'Steam Drum Relief', tag: 'BLR-001-PSV-A', description: 'Primary drum safety valve.' },
  { id: 'loc-blr1-sh', equipmentId: 'eq-blr1', name: 'Superheater Outlet Relief', tag: 'BLR-001-PSV-B', description: 'Superheater outlet protection.' },
  { id: 'loc-blr1-econ', equipmentId: 'eq-blr1', name: 'Economizer Relief', tag: 'BLR-001-PSV-C', description: 'Economizer overpressure protection.' },
  { id: 'loc-blr1-mud', equipmentId: 'eq-blr1', name: 'Mud Drum Relief', tag: 'BLR-001-PSV-D', description: 'Mud drum safety valve.' },
  { id: 'loc-blr1-att', equipmentId: 'eq-blr1', name: 'Attemperator Relief', tag: 'BLR-001-PSV-E', description: 'Attemperator spray header protection.' },

  // Boiler #2 — 5 locations
  { id: 'loc-blr2-drum', equipmentId: 'eq-blr2', name: 'Steam Drum Relief', tag: 'BLR-002-PSV-A', description: 'Primary drum safety valve.' },
  { id: 'loc-blr2-sh', equipmentId: 'eq-blr2', name: 'Superheater Outlet Relief', tag: 'BLR-002-PSV-B', description: 'Superheater outlet protection.' },
  { id: 'loc-blr2-econ', equipmentId: 'eq-blr2', name: 'Economizer Relief', tag: 'BLR-002-PSV-C', description: 'Economizer overpressure protection.' },
  { id: 'loc-blr2-mud', equipmentId: 'eq-blr2', name: 'Mud Drum Relief', tag: 'BLR-002-PSV-D', description: 'Mud drum safety valve.' },
  { id: 'loc-blr2-reheat', equipmentId: 'eq-blr2', name: 'Reheat Outlet Relief', tag: 'BLR-002-PSV-E', description: 'Reheat steam outlet protection.' },

  // Boiler #3 — 4 locations
  { id: 'loc-blr3-drum', equipmentId: 'eq-blr3', name: 'Steam Drum Relief', tag: 'BLR-003-PSV-A', description: 'Primary drum safety valve.' },
  { id: 'loc-blr3-sh', equipmentId: 'eq-blr3', name: 'Superheater Outlet Relief', tag: 'BLR-003-PSV-B', description: 'Superheater outlet protection.' },
  { id: 'loc-blr3-econ', equipmentId: 'eq-blr3', name: 'Economizer Relief', tag: 'BLR-003-PSV-C', description: 'Economizer overpressure protection.' },
  { id: 'loc-blr3-mud', equipmentId: 'eq-blr3', name: 'Mud Drum Relief', tag: 'BLR-003-PSV-D', description: 'Mud drum safety valve.' },

  // Boiler #4 — 5 locations
  { id: 'loc-blr4-drum', equipmentId: 'eq-blr4', name: 'Steam Drum Relief', tag: 'BLR-004-PSV-A', description: 'Primary drum safety valve.' },
  { id: 'loc-blr4-sh', equipmentId: 'eq-blr4', name: 'Superheater Outlet Relief', tag: 'BLR-004-PSV-B', description: 'Superheater outlet protection.' },
  { id: 'loc-blr4-econ', equipmentId: 'eq-blr4', name: 'Economizer Relief', tag: 'BLR-004-PSV-C', description: 'Economizer overpressure protection.' },
  { id: 'loc-blr4-att', equipmentId: 'eq-blr4', name: 'Attemperator Relief', tag: 'BLR-004-PSV-D', description: 'Attemperator spray header protection.' },
  { id: 'loc-blr4-reheat', equipmentId: 'eq-blr4', name: 'Reheat Outlet Relief', tag: 'BLR-004-PSV-E', description: 'Reheat steam outlet protection.' },

  // Boiler #5 — 4 locations
  { id: 'loc-blr5-drum', equipmentId: 'eq-blr5', name: 'Steam Drum Relief', tag: 'BLR-005-PSV-A', description: 'Primary drum safety valve.' },
  { id: 'loc-blr5-sh', equipmentId: 'eq-blr5', name: 'Superheater Outlet Relief', tag: 'BLR-005-PSV-B', description: 'Superheater outlet protection.' },
  { id: 'loc-blr5-econ', equipmentId: 'eq-blr5', name: 'Economizer Relief', tag: 'BLR-005-PSV-C', description: 'Economizer overpressure protection.' },
  { id: 'loc-blr5-mud', equipmentId: 'eq-blr5', name: 'Mud Drum Relief', tag: 'BLR-005-PSV-D', description: 'Mud drum safety valve.' },

  // Boiler #6 — 5 locations
  { id: 'loc-blr6-drum', equipmentId: 'eq-blr6', name: 'Steam Drum Relief', tag: 'BLR-006-PSV-A', description: 'Primary drum safety valve.' },
  { id: 'loc-blr6-sh', equipmentId: 'eq-blr6', name: 'Superheater Outlet Relief', tag: 'BLR-006-PSV-B', description: 'Superheater outlet protection.' },
  { id: 'loc-blr6-econ', equipmentId: 'eq-blr6', name: 'Economizer Relief', tag: 'BLR-006-PSV-C', description: 'Economizer overpressure protection.' },
  { id: 'loc-blr6-att', equipmentId: 'eq-blr6', name: 'Attemperator Relief', tag: 'BLR-006-PSV-D', description: 'Attemperator spray header protection.' },
  { id: 'loc-blr6-mud', equipmentId: 'eq-blr6', name: 'Mud Drum Relief', tag: 'BLR-006-PSV-E', description: 'Mud drum safety valve.' },

  // Boiler #7 — 4 locations
  { id: 'loc-blr7-drum', equipmentId: 'eq-blr7', name: 'Steam Drum Relief', tag: 'BLR-007-PSV-A', description: 'Primary drum safety valve.' },
  { id: 'loc-blr7-sh', equipmentId: 'eq-blr7', name: 'Superheater Outlet Relief', tag: 'BLR-007-PSV-B', description: 'Superheater outlet protection.' },
  { id: 'loc-blr7-econ', equipmentId: 'eq-blr7', name: 'Economizer Relief', tag: 'BLR-007-PSV-C', description: 'Economizer overpressure protection.' },
  { id: 'loc-blr7-reheat', equipmentId: 'eq-blr7', name: 'Reheat Outlet Relief', tag: 'BLR-007-PSV-D', description: 'Reheat steam outlet protection.' },
];

// --- PSVs ------------------------------------------------------------------
// Swap locations have an installed valve + a spare (inventory or out for
// service). Install dates are varied to populate overdue / due soon / compliant KPIs.

const psvs: PSV[] = [
  // --- Boiler #1 -----------------------------------------------------------
  ...swapPair({
    ids: ['psv-1001', 'psv-1002'],
    sns: ['CV-1001', 'CV-1002'],
    tag: 'BLR-001-PSV-A',
    locationId: 'loc-blr1-drum',
    createdAt: '2018-05-01',
    installedDate: '2023-01-15',
    spareStatus: 'inventory',
    spareNote: 'Shelf spare',
    datasheet: STEAM_DRUM_DS,
  }),
  ...swapPair({
    ids: ['psv-1010', 'psv-1011'],
    sns: ['CV-1010', 'CV-1011'],
    tag: 'BLR-001-PSV-B',
    locationId: 'loc-blr1-sh',
    createdAt: '2020-03-10',
    installedDate: '2023-07-20',
    spareStatus: 'out_for_service',
    spareNote: 'At vendor for recertification',
    datasheet: SUPERHEATER_DS,
  }),
  ...swapPair({
    ids: ['psv-1020', 'psv-1021'],
    sns: ['CV-1020', 'CV-1021'],
    tag: 'BLR-001-PSV-C',
    locationId: 'loc-blr1-econ',
    createdAt: '2021-08-01',
    installedDate: '2024-09-10',
    spareStatus: 'inventory',
    spareNote: 'Shelf spare',
    datasheet: ECONOMIZER_DS,
  }),
  ...swapPair({
    ids: ['psv-1030', 'psv-1031'],
    sns: ['CV-1030', 'CV-1031'],
    tag: 'BLR-001-PSV-D',
    locationId: 'loc-blr1-mud',
    createdAt: '2019-06-15',
    installedDate: '2023-03-01',
    spareStatus: 'inventory',
    datasheet: MUD_DRUM_DS,
  }),
  ...swapPair({
    ids: ['psv-1040', 'psv-1041'],
    sns: ['CV-1040', 'CV-1041'],
    tag: 'BLR-001-PSV-E',
    locationId: 'loc-blr1-att',
    createdAt: '2020-11-20',
    installedDate: '2024-01-18',
    spareStatus: 'out_for_service',
    spareNote: 'Sent for bench test',
    datasheet: ds({ make: 'Crosby', model: 'JOS-E', setPressure: 500, capacity: '85,000 lb/hr', orifice: 'K', inletSize: '2.5"', outletSize: '4"', serviceMedium: 'Superheated Steam', manufactureYear: '2020' }),
  }),

  // --- Boiler #2 -----------------------------------------------------------
  ...swapPair({
    ids: ['psv-2001', 'psv-2002'],
    sns: ['CV-2001', 'CV-2002'],
    tag: 'BLR-002-PSV-A',
    locationId: 'loc-blr2-drum',
    createdAt: '2018-05-01',
    installedDate: '2022-12-10',
    spareStatus: 'inventory',
    spareNote: 'Shelf spare',
    datasheet: STEAM_DRUM_DS,
  }),
  ...swapPair({
    ids: ['psv-2010', 'psv-2011'],
    sns: ['CV-2010', 'CV-2011'],
    tag: 'BLR-002-PSV-B',
    locationId: 'loc-blr2-sh',
    createdAt: '2020-03-10',
    installedDate: '2024-06-05',
    spareStatus: 'inventory',
    datasheet: SUPERHEATER_DS,
  }),
  ...swapPair({
    ids: ['psv-2020', 'psv-2021'],
    sns: ['CV-2020', 'CV-2021'],
    tag: 'BLR-002-PSV-C',
    locationId: 'loc-blr2-econ',
    createdAt: '2021-08-01',
    installedDate: '2024-09-10',
    spareStatus: 'inventory',
    spareNote: 'Shelf spare',
    datasheet: ECONOMIZER_DS,
  }),
  ...swapPair({
    ids: ['psv-2030', 'psv-2031'],
    sns: ['CV-2030', 'CV-2031'],
    tag: 'BLR-002-PSV-D',
    locationId: 'loc-blr2-mud',
    createdAt: '2019-04-12',
    installedDate: '2023-05-22',
    spareStatus: 'out_for_service',
    spareNote: 'At vendor',
    datasheet: MUD_DRUM_DS,
  }),
  ...swapPair({
    ids: ['psv-2040', 'psv-2041'],
    sns: ['CV-2040', 'CV-2041'],
    tag: 'BLR-002-PSV-E',
    locationId: 'loc-blr2-reheat',
    createdAt: '2021-02-08',
    installedDate: '2023-08-15',
    spareStatus: 'inventory',
    datasheet: REHEAT_DS,
  }),

  // --- Boiler #3 -----------------------------------------------------------
  ...swapPair({
    ids: ['psv-3001', 'psv-3002'],
    sns: ['CV-3001', 'CV-3002'],
    tag: 'BLR-003-PSV-A',
    locationId: 'loc-blr3-drum',
    createdAt: '2017-09-01',
    installedDate: '2023-02-28',
    spareStatus: 'inventory',
    datasheet: STEAM_DRUM_DS,
  }),
  ...swapPair({
    ids: ['psv-3010', 'psv-3011'],
    sns: ['CV-3010', 'CV-3011'],
    tag: 'BLR-003-PSV-B',
    locationId: 'loc-blr3-sh',
    createdAt: '2019-01-15',
    installedDate: '2024-11-20',
    spareStatus: 'inventory',
    datasheet: SUPERHEATER_DS,
  }),
  ...swapPair({
    ids: ['psv-3020', 'psv-3021'],
    sns: ['CV-3020', 'CV-3021'],
    tag: 'BLR-003-PSV-C',
    locationId: 'loc-blr3-econ',
    createdAt: '2020-07-22',
    installedDate: '2023-09-12',
    spareStatus: 'out_for_service',
    spareNote: 'Recertification in progress',
    datasheet: ECONOMIZER_DS,
  }),
  ...swapPair({
    ids: ['psv-3030', 'psv-3031'],
    sns: ['CV-3030', 'CV-3031'],
    tag: 'BLR-003-PSV-D',
    locationId: 'loc-blr3-mud',
    createdAt: '2018-11-05',
    installedDate: '2024-03-08',
    spareStatus: 'inventory',
    datasheet: MUD_DRUM_DS,
  }),

  // --- Boiler #4 -----------------------------------------------------------
  ...swapPair({
    ids: ['psv-4001', 'psv-4002'],
    sns: ['CV-4001', 'CV-4002'],
    tag: 'BLR-004-PSV-A',
    locationId: 'loc-blr4-drum',
    createdAt: '2018-02-14',
    installedDate: '2022-11-01',
    spareStatus: 'inventory',
    datasheet: STEAM_DRUM_DS,
  }),
  ...swapPair({
    ids: ['psv-4010', 'psv-4011'],
    sns: ['CV-4010', 'CV-4011'],
    tag: 'BLR-004-PSV-B',
    locationId: 'loc-blr4-sh',
    createdAt: '2019-08-20',
    installedDate: '2023-06-18',
    spareStatus: 'inventory',
    datasheet: SUPERHEATER_DS,
  }),
  ...swapPair({
    ids: ['psv-4020', 'psv-4021'],
    sns: ['CV-4020', 'CV-4021'],
    tag: 'BLR-004-PSV-C',
    locationId: 'loc-blr4-econ',
    createdAt: '2020-05-11',
    installedDate: '2025-01-22',
    spareStatus: 'inventory',
    datasheet: ECONOMIZER_DS,
  }),
  ...swapPair({
    ids: ['psv-4030', 'psv-4031'],
    sns: ['CV-4030', 'CV-4031'],
    tag: 'BLR-004-PSV-D',
    locationId: 'loc-blr4-att',
    createdAt: '2021-03-30',
    installedDate: '2023-04-05',
    spareStatus: 'out_for_service',
    datasheet: ds({ make: 'Crosby', model: 'JOS-E', setPressure: 500, capacity: '85,000 lb/hr', orifice: 'K', inletSize: '2.5"', outletSize: '4"', serviceMedium: 'Superheated Steam', manufactureYear: '2021' }),
  }),
  ...swapPair({
    ids: ['psv-4040', 'psv-4041'],
    sns: ['CV-4040', 'CV-4041'],
    tag: 'BLR-004-PSV-E',
    locationId: 'loc-blr4-reheat',
    createdAt: '2020-10-07',
    installedDate: '2024-07-14',
    spareStatus: 'inventory',
    datasheet: REHEAT_DS,
  }),

  // --- Boiler #5 -----------------------------------------------------------
  ...swapPair({
    ids: ['psv-5001', 'psv-5002'],
    sns: ['CV-5001', 'CV-5002'],
    tag: 'BLR-005-PSV-A',
    locationId: 'loc-blr5-drum',
    createdAt: '2019-12-01',
    installedDate: '2023-10-05',
    spareStatus: 'inventory',
    datasheet: STEAM_DRUM_DS,
  }),
  ...swapPair({
    ids: ['psv-5010', 'psv-5011'],
    sns: ['CV-5010', 'CV-5011'],
    tag: 'BLR-005-PSV-B',
    locationId: 'loc-blr5-sh',
    createdAt: '2020-04-18',
    installedDate: '2024-02-28',
    spareStatus: 'inventory',
    datasheet: SUPERHEATER_DS,
  }),
  ...swapPair({
    ids: ['psv-5020', 'psv-5021'],
    sns: ['CV-5020', 'CV-5021'],
    tag: 'BLR-005-PSV-C',
    locationId: 'loc-blr5-econ',
    createdAt: '2021-01-25',
    installedDate: '2023-11-30',
    spareStatus: 'out_for_service',
    spareNote: 'Vendor bench test',
    datasheet: ECONOMIZER_DS,
  }),
  ...swapPair({
    ids: ['psv-5030', 'psv-5031'],
    sns: ['CV-5030', 'CV-5031'],
    tag: 'BLR-005-PSV-D',
    locationId: 'loc-blr5-mud',
    createdAt: '2018-07-09',
    installedDate: '2024-05-17',
    spareStatus: 'inventory',
    datasheet: MUD_DRUM_DS,
  }),

  // --- Boiler #6 -----------------------------------------------------------
  ...swapPair({
    ids: ['psv-6001', 'psv-6002'],
    sns: ['CV-6001', 'CV-6002'],
    tag: 'BLR-006-PSV-A',
    locationId: 'loc-blr6-drum',
    createdAt: '2017-06-20',
    installedDate: '2023-01-08',
    spareStatus: 'inventory',
    datasheet: STEAM_DRUM_DS,
  }),
  ...swapPair({
    ids: ['psv-6010', 'psv-6011'],
    sns: ['CV-6010', 'CV-6011'],
    tag: 'BLR-006-PSV-B',
    locationId: 'loc-blr6-sh',
    createdAt: '2019-03-14',
    installedDate: '2023-07-20',
    spareStatus: 'inventory',
    datasheet: SUPERHEATER_DS,
  }),
  ...swapPair({
    ids: ['psv-6020', 'psv-6021'],
    sns: ['CV-6020', 'CV-6021'],
    tag: 'BLR-006-PSV-C',
    locationId: 'loc-blr6-econ',
    createdAt: '2020-09-28',
    installedDate: '2025-02-10',
    spareStatus: 'inventory',
    datasheet: ECONOMIZER_DS,
  }),
  ...swapPair({
    ids: ['psv-6030', 'psv-6031'],
    sns: ['CV-6030', 'CV-6031'],
    tag: 'BLR-006-PSV-D',
    locationId: 'loc-blr6-att',
    createdAt: '2021-05-03',
    installedDate: '2022-10-15',
    spareStatus: 'inventory',
    datasheet: ds({ make: 'Crosby', model: 'JOS-E', setPressure: 500, capacity: '85,000 lb/hr', orifice: 'K', inletSize: '2.5"', outletSize: '4"', serviceMedium: 'Superheated Steam', manufactureYear: '2021' }),
  }),
  ...swapPair({
    ids: ['psv-6040', 'psv-6041'],
    sns: ['CV-6040', 'CV-6041'],
    tag: 'BLR-006-PSV-E',
    locationId: 'loc-blr6-mud',
    createdAt: '2018-04-22',
    installedDate: '2024-08-03',
    spareStatus: 'out_for_service',
    spareNote: 'Awaiting spare return',
    datasheet: MUD_DRUM_DS,
  }),

  // --- Boiler #7 -----------------------------------------------------------
  ...swapPair({
    ids: ['psv-7001', 'psv-7002'],
    sns: ['CV-7001', 'CV-7002'],
    tag: 'BLR-007-PSV-A',
    locationId: 'loc-blr7-drum',
    createdAt: '2019-05-17',
    installedDate: '2024-04-12',
    spareStatus: 'inventory',
    datasheet: STEAM_DRUM_DS,
  }),
  ...swapPair({
    ids: ['psv-7010', 'psv-7011'],
    sns: ['CV-7010', 'CV-7011'],
    tag: 'BLR-007-PSV-B',
    locationId: 'loc-blr7-sh',
    createdAt: '2020-02-01',
    installedDate: '2023-08-15',
    spareStatus: 'inventory',
    datasheet: SUPERHEATER_DS,
  }),
  ...swapPair({
    ids: ['psv-7020', 'psv-7021'],
    sns: ['CV-7020', 'CV-7021'],
    tag: 'BLR-007-PSV-C',
    locationId: 'loc-blr7-econ',
    createdAt: '2021-07-19',
    installedDate: '2024-12-01',
    spareStatus: 'inventory',
    datasheet: ECONOMIZER_DS,
  }),
  ...swapPair({
    ids: ['psv-7030', 'psv-7031'],
    sns: ['CV-7030', 'CV-7031'],
    tag: 'BLR-007-PSV-D',
    locationId: 'loc-blr7-reheat',
    createdAt: '2020-12-08',
    installedDate: '2023-03-22',
    spareStatus: 'out_for_service',
    spareNote: 'At vendor for recertification',
    datasheet: REHEAT_DS,
  }),
];

export const seedData: AppData = { equipment, locations, psvs };
