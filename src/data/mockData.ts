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
// water heating boilers, HRSGs). Replace the arrays below — or use the in-app
// "Clear all data" option and enter your own — when real data is available.
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
    id: 'eq-hwb1',
    name: 'Hot Water Heating Boiler',
    tag: 'HWB-101',
    type: 'Hot Water Heating Boiler',
    area: 'West Campus Satellite Utility Plant',
    description:
      'Hydronic hot water heating boiler. Relief valves are recertified on site (no spares).',
  },
  {
    id: 'eq-hrsg1',
    name: 'HRSG #1',
    tag: 'HRSG-201',
    type: 'HRSG',
    area: 'Combined Heat & Power Plant',
    description: 'Heat Recovery Steam Generator on the combustion turbine exhaust.',
  },
];

// --- Locations -------------------------------------------------------------

const locations: Location[] = [
  // Boiler #1
  { id: 'loc-blr1-drum', equipmentId: 'eq-blr1', name: 'Steam Drum Relief', tag: 'BLR-001-PSV-A', description: 'Primary drum safety valve.' },
  { id: 'loc-blr1-sh', equipmentId: 'eq-blr1', name: 'Superheater Outlet Relief', tag: 'BLR-001-PSV-B', description: 'Superheater outlet protection.' },
  // Boiler #2
  { id: 'loc-blr2-drum', equipmentId: 'eq-blr2', name: 'Steam Drum Relief', tag: 'BLR-002-PSV-A', description: 'Primary drum safety valve.' },
  { id: 'loc-blr2-econ', equipmentId: 'eq-blr2', name: 'Economizer Relief', tag: 'BLR-002-PSV-C', description: 'Economizer overpressure protection.' },
  // Hot Water Heating Boiler (on-site serviced, no spares)
  { id: 'loc-hwb1-outlet', equipmentId: 'eq-hwb1', name: 'Hot Water Outlet Relief', tag: 'HWB-101-PSV-A', description: 'Boiler outlet relief — serviced on site.' },
  { id: 'loc-hwb1-exp', equipmentId: 'eq-hwb1', name: 'Expansion Tank Relief', tag: 'HWB-101-PSV-B', description: 'Expansion tank relief — serviced on site.' },
  // HRSG #1
  { id: 'loc-hrsg1-hp', equipmentId: 'eq-hrsg1', name: 'HP Drum Relief', tag: 'HRSG-201-PSV-A', description: 'High-pressure drum safety valve.' },
  { id: 'loc-hrsg1-lp', equipmentId: 'eq-hrsg1', name: 'LP Drum Relief', tag: 'HRSG-201-PSV-B', description: 'Low-pressure drum safety valve.' },
];

// --- PSVs ------------------------------------------------------------------
// Swap locations have an installed valve + a spare (inventory or out for
// service). The hot water boiler valves are serviced on site (no spare).

const psvs: PSV[] = [
  // --- Boiler #1 / Steam Drum (OVERDUE installed) --------------------------
  buildValve({
    id: 'psv-1001', sn: 'CV-1001', tag: 'BLR-001-PSV-A', locationId: 'loc-blr1-drum',
    datasheet: ds({ make: 'Consolidated', model: '1900-30JM', setPressure: 650, capacity: '185,000 lb/hr', orifice: 'M', inletSize: '4"', outletSize: '6"', serviceMedium: 'Saturated Steam', manufactureYear: '2018', nationalBoardNumber: 'NB-19842' }),
    createdAt: '2018-05-01',
    timeline: [{ date: '2023-01-15', status: 'installed' }],
  }),
  buildValve({
    id: 'psv-1002', sn: 'CV-1002', tag: 'BLR-001-PSV-A', locationId: 'loc-blr1-drum',
    datasheet: ds({ make: 'Consolidated', model: '1900-30JM', setPressure: 650, capacity: '185,000 lb/hr', orifice: 'M', inletSize: '4"', outletSize: '6"', serviceMedium: 'Saturated Steam', manufactureYear: '2018', nationalBoardNumber: 'NB-19843' }),
    createdAt: '2018-05-01',
    timeline: [{ date: '2023-01-15', status: 'inventory', note: 'Shelf spare' }],
  }),

  // --- Boiler #1 / Superheater (DUE SOON) ----------------------------------
  buildValve({
    id: 'psv-1010', sn: 'CV-1010', tag: 'BLR-001-PSV-B', locationId: 'loc-blr1-sh',
    datasheet: ds({ make: 'Crosby', model: 'HCI-2', setPressure: 600, capacity: '120,000 lb/hr', orifice: 'L', inletSize: '3"', outletSize: '4"', serviceMedium: 'Superheated Steam', manufactureYear: '2020', nationalBoardNumber: 'NB-20551' }),
    createdAt: '2020-03-10',
    timeline: [{ date: '2023-07-20', status: 'installed' }],
  }),
  buildValve({
    id: 'psv-1011', sn: 'CV-1011', tag: 'BLR-001-PSV-B', locationId: 'loc-blr1-sh',
    datasheet: ds({ make: 'Crosby', model: 'HCI-2', setPressure: 600, capacity: '120,000 lb/hr', orifice: 'L', inletSize: '3"', outletSize: '4"', serviceMedium: 'Superheated Steam', manufactureYear: '2020', nationalBoardNumber: 'NB-20552' }),
    createdAt: '2020-03-10',
    timeline: [{ date: '2023-06-25', status: 'out_for_service', note: 'At vendor for recertification' }],
  }),

  // --- Boiler #2 / Steam Drum (OVERDUE) ------------------------------------
  buildValve({
    id: 'psv-2001', sn: 'CV-2001', tag: 'BLR-002-PSV-A', locationId: 'loc-blr2-drum',
    datasheet: ds({ make: 'Consolidated', model: '1900-30JM', setPressure: 650, capacity: '185,000 lb/hr', orifice: 'M', inletSize: '4"', outletSize: '6"', serviceMedium: 'Saturated Steam', manufactureYear: '2018' }),
    createdAt: '2018-05-01',
    timeline: [{ date: '2022-12-10', status: 'installed' }],
  }),
  buildValve({
    id: 'psv-2002', sn: 'CV-2002', tag: 'BLR-002-PSV-A', locationId: 'loc-blr2-drum',
    datasheet: ds({ make: 'Consolidated', model: '1900-30JM', setPressure: 650, capacity: '185,000 lb/hr', orifice: 'M', inletSize: '4"', outletSize: '6"', serviceMedium: 'Saturated Steam', manufactureYear: '2018' }),
    createdAt: '2018-05-01',
    timeline: [{ date: '2022-12-10', status: 'inventory', note: 'Shelf spare' }],
  }),

  // --- Boiler #2 / Economizer (COMPLIANT) ----------------------------------
  buildValve({
    id: 'psv-2010', sn: 'CV-2010', tag: 'BLR-002-PSV-C', locationId: 'loc-blr2-econ',
    datasheet: ds({ make: 'Kunkle', model: '6010', setPressure: 700, capacity: '95,000 lb/hr', orifice: 'K', inletSize: '2.5"', outletSize: '4"', serviceMedium: 'Feedwater', manufactureYear: '2021' }),
    createdAt: '2021-08-01',
    timeline: [{ date: '2024-09-10', status: 'installed' }],
  }),
  buildValve({
    id: 'psv-2011', sn: 'CV-2011', tag: 'BLR-002-PSV-C', locationId: 'loc-blr2-econ',
    datasheet: ds({ make: 'Kunkle', model: '6010', setPressure: 700, capacity: '95,000 lb/hr', orifice: 'K', inletSize: '2.5"', outletSize: '4"', serviceMedium: 'Feedwater', manufactureYear: '2021' }),
    createdAt: '2021-08-01',
    timeline: [{ date: '2024-09-10', status: 'inventory', note: 'Shelf spare' }],
  }),

  // --- Hot Water Heating Boiler (SERVICED ON SITE, no spares) ---------------
  buildValve({
    id: 'psv-3001', sn: 'HW-3001', tag: 'HWB-101-PSV-A', locationId: 'loc-hwb1-outlet',
    servicedOnSite: true,
    datasheet: ds({ make: 'Kunkle', model: '537', type: 'Conventional Spring', setPressure: 125, capacity: '6,200 lb/hr', orifice: 'G', inletSize: '1.5"', outletSize: '2"', serviceMedium: 'Hot Water', bodyMaterial: 'Bronze', manufactureYear: '2017' }),
    createdAt: '2017-04-01',
    timeline: [
      { date: '2017-04-15', status: 'installed' },
      { date: '2020-05-02', service: true, note: 'On-site test & reset' },
      { date: '2023-04-20', service: true, note: 'On-site recertification (OVERDUE next cycle)' },
    ],
  }),
  buildValve({
    id: 'psv-3002', sn: 'HW-3002', tag: 'HWB-101-PSV-B', locationId: 'loc-hwb1-exp',
    servicedOnSite: true,
    datasheet: ds({ make: 'Watts', model: '174A', type: 'Conventional Spring', setPressure: 75, capacity: 'N/A', inletSize: '0.75"', outletSize: '1"', serviceMedium: 'Hot Water', bodyMaterial: 'Bronze', manufactureYear: '2019' }),
    createdAt: '2019-03-01',
    timeline: [
      { date: '2019-03-20', status: 'installed' },
      { date: '2024-10-10', service: true, note: 'On-site recertification' },
    ],
  }),

  // --- HRSG #1 / HP Drum (COMPLIANT) ---------------------------------------
  buildValve({
    id: 'psv-4001', sn: 'SV-4001', tag: 'HRSG-201-PSV-A', locationId: 'loc-hrsg1-hp',
    datasheet: ds({ make: 'Dresser', model: '1900', setPressure: 1250, capacity: '210,000 lb/hr', orifice: 'P', inletSize: '6"', outletSize: '8"', serviceMedium: 'Saturated Steam', manufactureYear: '2022' }),
    createdAt: '2022-02-01',
    timeline: [{ date: '2025-03-15', status: 'installed' }],
  }),
  buildValve({
    id: 'psv-4002', sn: 'SV-4002', tag: 'HRSG-201-PSV-A', locationId: 'loc-hrsg1-hp',
    datasheet: ds({ make: 'Dresser', model: '1900', setPressure: 1250, capacity: '210,000 lb/hr', orifice: 'P', inletSize: '6"', outletSize: '8"', serviceMedium: 'Saturated Steam', manufactureYear: '2022' }),
    createdAt: '2022-02-01',
    timeline: [{ date: '2025-03-15', status: 'inventory', note: 'Shelf spare' }],
  }),

  // --- HRSG #1 / LP Drum (DUE SOON) ----------------------------------------
  buildValve({
    id: 'psv-4010', sn: 'SV-4010', tag: 'HRSG-201-PSV-B', locationId: 'loc-hrsg1-lp',
    datasheet: ds({ make: 'Dresser', model: '1900', setPressure: 250, capacity: '90,000 lb/hr', orifice: 'L', inletSize: '3"', outletSize: '4"', serviceMedium: 'Saturated Steam', manufactureYear: '2020' }),
    createdAt: '2020-09-01',
    timeline: [{ date: '2023-08-15', status: 'installed' }],
  }),
  buildValve({
    id: 'psv-4011', sn: 'SV-4011', tag: 'HRSG-201-PSV-B', locationId: 'loc-hrsg1-lp',
    datasheet: ds({ make: 'Dresser', model: '1900', setPressure: 250, capacity: '90,000 lb/hr', orifice: 'L', inletSize: '3"', outletSize: '4"', serviceMedium: 'Saturated Steam', manufactureYear: '2020' }),
    createdAt: '2020-09-01',
    timeline: [{ date: '2023-08-01', status: 'inventory', note: 'Shelf spare' }],
  }),
];

export const seedData: AppData = { equipment, locations, psvs };
