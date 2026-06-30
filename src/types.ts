// ---------------------------------------------------------------------------
// Domain model for the PSV (Pressure Safety Valve) compliance dashboard.
//
// Hierarchy:  Site  ->  Equipment  ->  Location  ->  PSV (serial number)
//
// A "Location" is a physical mounting point on a piece of equipment that must be
// protected by a relief valve. Each location typically has 2 PSVs assigned to it:
// one currently installed/active and one spare (either in inventory or out for
// service / recertification) so the device can be swapped without downtime.
// ---------------------------------------------------------------------------

/** The physical/operational state of an individual PSV. */
export type PSVStatus = 'installed' | 'out_for_service' | 'inventory';

/** The kinds of events captured in a PSV's history log. */
export type PSVEventType =
  | 'created'
  | 'status-change'
  | 'service'
  | 'datasheet-update'
  | 'history-edit'
  | 'note';

/** A single, editable entry in a PSV's history. */
export interface PSVEvent {
  id: string;
  psvId: string;
  type: PSVEventType;
  /** Resulting status for `status-change` events. */
  status?: PSVStatus;
  /** Effective date of the event (YYYY-MM-DD). Drives due-date math. */
  date: string;
  /** Human-readable summary shown in history feeds. */
  description: string;
  /** Optional free-form note. */
  note?: string;
  /** Timestamp (ISO) of when the entry was recorded in the system. */
  recordedAt: string;
}

/** Nameplate / datasheet information for a PSV. */
export interface PSVDatasheet {
  make: string;
  model: string;
  type: string;
  setPressure: number;
  pressureUnit: string;
  capacity: string;
  inletSize: string;
  outletSize: string;
  orifice: string;
  bodyMaterial: string;
  springMaterial?: string;
  connectionType?: string;
  coldDifferentialTestPressure?: string;
  serviceMedium?: string;
  nationalBoardNumber?: string;
  manufactureYear?: string;
}

/** An individual Pressure Safety Valve identified by its serial number. */
export interface PSV {
  id: string;
  serialNumber: string;
  tag?: string;
  locationId: string;
  status: PSVStatus;
  /**
   * When true, this PSV has no spare and is recertified in place (on site).
   * Such valves stay installed and are tracked by service date instead of
   * install/inventory swaps; their due date is measured from the last service.
   */
  servicedOnSite?: boolean;
  datasheet: PSVDatasheet;
  events: PSVEvent[];
  createdAt: string;
}

/** A protected point on a piece of equipment that requires a relief valve. */
export interface Location {
  id: string;
  equipmentId: string;
  name: string;
  tag?: string;
  description?: string;
}

/** A piece of equipment in the plant (boiler, chiller, vessel, etc.). */
export interface Equipment {
  id: string;
  name: string;
  tag: string;
  type: string;
  area: string;
  description?: string;
}

/** The full persisted application state. */
export interface AppData {
  equipment: Equipment[];
  locations: Location[];
  psvs: PSV[];
}

// --- Derived / computed helper types --------------------------------------

export type ComplianceState = 'compliant' | 'due_soon' | 'overdue' | 'not_installed';

export interface ComplianceInfo {
  state: ComplianceState;
  /** Computed due date (YYYY-MM-DD) = last install date + 3 years, if installed. */
  dueDate: string | null;
  /** Whole days until due (negative if overdue). Null when not installed. */
  daysRemaining: number | null;
  /** Date the device was last installed (YYYY-MM-DD), if ever. */
  lastInstallDate: string | null;
}

export interface KPISummary {
  total: number;
  installed: number;
  inventory: number;
  outForService: number;
  dueSoon: number;
  overdue: number;
  compliant: number;
  complianceRate: number;
}
