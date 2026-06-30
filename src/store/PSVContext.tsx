import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppData,
  Equipment,
  Location,
  PSV,
  PSVDatasheet,
  PSVEvent,
  PSVStatus,
} from '../types';
import { seedData } from '../data/mockData';
import { uid } from '../utils/id';
import { todayISO } from '../utils/dates';
import { STATUS_LABELS } from '../utils/compliance';
import { isSupabaseConfigured, STATE_ROW_ID, STATE_TABLE, supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

const STORAGE_KEY = 'psv-dashboard-data-v3';

export type SyncStatus = 'local' | 'loading' | 'saving' | 'saved' | 'error';

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && Array.isArray(parsed.psvs) && Array.isArray(parsed.equipment)) {
        return parsed;
      }
    }
  } catch {
    // ignore and fall back to seed
  }
  return structuredClone(seedData);
}

interface PSVContextValue {
  data: AppData;
  /** Cloud sync state ('local' when running without Supabase). */
  syncStatus: SyncStatus;

  // selectors
  getEquipment: (id: string) => Equipment | undefined;
  getLocation: (id: string) => Location | undefined;
  getPSV: (id: string) => PSV | undefined;
  locationsForEquipment: (equipmentId: string) => Location[];
  psvsForLocation: (locationId: string) => PSV[];
  psvsForEquipment: (equipmentId: string) => PSV[];

  // equipment CRUD
  addEquipment: (e: Omit<Equipment, 'id'>) => Equipment;
  updateEquipment: (id: string, patch: Partial<Omit<Equipment, 'id'>>) => void;
  deleteEquipment: (id: string) => void;

  // location CRUD
  addLocation: (l: Omit<Location, 'id'>) => Location;
  updateLocation: (id: string, patch: Partial<Omit<Location, 'id'>>) => void;
  deleteLocation: (id: string) => void;

  // PSV CRUD
  addPSV: (input: NewPSVInput) => PSV;
  updatePSV: (
    id: string,
    patch: Partial<Pick<PSV, 'serialNumber' | 'tag' | 'locationId' | 'servicedOnSite'>>,
  ) => void;
  updateDatasheet: (id: string, datasheet: PSVDatasheet) => void;
  deletePSV: (id: string) => void;

  // status + history
  setStatus: (id: string, status: PSVStatus, date: string, note?: string) => void;
  addHistoryEvent: (id: string, event: NewEventInput) => void;
  updateHistoryEvent: (id: string, eventId: string, patch: Partial<PSVEvent>) => void;
  deleteHistoryEvent: (id: string, eventId: string) => void;

  // bulk
  resetToSeed: () => void;
  clearAll: () => void;
  replaceData: (data: AppData) => void;
}

export interface NewPSVInput {
  serialNumber: string;
  tag?: string;
  locationId: string;
  datasheet: PSVDatasheet;
  status: PSVStatus;
  servicedOnSite?: boolean;
  /** Effective date of the initial status (defaults to today). */
  statusDate?: string;
}

export interface NewEventInput {
  type: PSVEvent['type'];
  status?: PSVStatus;
  date: string;
  description?: string;
  note?: string;
}

const PSVContext = createContext<PSVContextValue | null>(null);

const EMPTY_DATA: AppData = { equipment: [], locations: [], psvs: [] };

/**
 * Enforces "only one installed PSV per location": when `keepId` is installed at
 * `locationId`, any other installed valve there is moved to Out for Service and
 * the change is logged. On-site serviced valves are left untouched.
 */
function enforceSingleInstalled(
  psvs: PSV[],
  locationId: string,
  keepId: string,
  now: string,
): PSV[] {
  return psvs.map((p) => {
    if (
      p.id !== keepId &&
      p.locationId === locationId &&
      p.status === 'installed' &&
      !p.servicedOnSite
    ) {
      return {
        ...p,
        status: 'out_for_service' as PSVStatus,
        events: [
          ...p.events,
          {
            id: uid('evt'),
            psvId: p.id,
            type: 'status-change' as const,
            status: 'out_for_service' as PSVStatus,
            date: todayISO(),
            description: 'Removed — another valve was installed at this location',
            recordedAt: now,
          },
        ],
      };
    }
    return p;
  });
}

export function PSVProvider({ children }: { children: ReactNode }) {
  const { authed } = useAuth();
  const cloud = isSupabaseConfigured;

  const [data, setData] = useState<AppData>(() =>
    cloud ? structuredClone(EMPTY_DATA) : loadData(),
  );
  // In cloud mode, true once the initial shared state has been loaded.
  const [synced, setSynced] = useState(!cloud);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloud ? 'loading' : 'local');
  const applyingRemote = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Local mode: persist to localStorage ---------------------------------
  useEffect(() => {
    if (cloud) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage may be unavailable; non-fatal
    }
  }, [data, cloud]);

  // --- Cloud mode: load the shared state + subscribe to live changes -------
  useEffect(() => {
    if (!cloud || !authed || !supabase) return;
    const sb = supabase;
    let active = true;
    setSyncStatus('loading');

    (async () => {
      const { data: row, error } = await sb
        .from(STATE_TABLE)
        .select('data')
        .eq('id', STATE_ROW_ID)
        .maybeSingle();
      if (!active) return;

      if (!error && row?.data) {
        applyingRemote.current = true;
        setData(row.data as AppData);
      } else if (!error) {
        // First run: seed the shared table with the sample data.
        const seed = structuredClone(seedData);
        await sb
          .from(STATE_TABLE)
          .upsert({ id: STATE_ROW_ID, data: seed, updated_at: new Date().toISOString() });
        applyingRemote.current = true;
        setData(seed);
      }
      setSynced(true);
      setSyncStatus(error ? 'error' : 'saved');
    })();

    const channel = sb
      .channel('app_state_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: STATE_TABLE, filter: `id=eq.${STATE_ROW_ID}` },
        (payload) => {
          const incoming = (payload.new as { data?: AppData } | null)?.data;
          if (incoming) {
            applyingRemote.current = true;
            setData(incoming);
            setSyncStatus('saved');
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [cloud, authed]);

  // --- Cloud mode: save local edits back to the shared state (debounced) ---
  useEffect(() => {
    if (!cloud || !authed || !synced || !supabase) return;
    if (applyingRemote.current) {
      // This change came from a remote update — don't echo it back.
      applyingRemote.current = false;
      return;
    }
    const sb = supabase;
    setSyncStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const snapshot = data;
    saveTimer.current = setTimeout(() => {
      sb.from(STATE_TABLE)
        .upsert({
          id: STATE_ROW_ID,
          data: snapshot,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => setSyncStatus(error ? 'error' : 'saved'));
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, cloud, authed, synced]);

  const getEquipment = useCallback(
    (id: string) => data.equipment.find((e) => e.id === id),
    [data.equipment],
  );
  const getLocation = useCallback(
    (id: string) => data.locations.find((l) => l.id === id),
    [data.locations],
  );
  const getPSV = useCallback((id: string) => data.psvs.find((p) => p.id === id), [data.psvs]);

  const locationsForEquipment = useCallback(
    (equipmentId: string) => data.locations.filter((l) => l.equipmentId === equipmentId),
    [data.locations],
  );
  const psvsForLocation = useCallback(
    (locationId: string) => data.psvs.filter((p) => p.locationId === locationId),
    [data.psvs],
  );
  const psvsForEquipment = useCallback(
    (equipmentId: string) => {
      const locIds = new Set(
        data.locations.filter((l) => l.equipmentId === equipmentId).map((l) => l.id),
      );
      return data.psvs.filter((p) => locIds.has(p.locationId));
    },
    [data.locations, data.psvs],
  );

  // --- Equipment -----------------------------------------------------------
  const addEquipment = useCallback((e: Omit<Equipment, 'id'>) => {
    const created: Equipment = { ...e, id: uid('eq') };
    setData((d) => ({ ...d, equipment: [...d.equipment, created] }));
    return created;
  }, []);

  const updateEquipment = useCallback(
    (id: string, patch: Partial<Omit<Equipment, 'id'>>) => {
      setData((d) => ({
        ...d,
        equipment: d.equipment.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
    },
    [],
  );

  const deleteEquipment = useCallback((id: string) => {
    setData((d) => {
      const locIds = new Set(d.locations.filter((l) => l.equipmentId === id).map((l) => l.id));
      return {
        equipment: d.equipment.filter((e) => e.id !== id),
        locations: d.locations.filter((l) => l.equipmentId !== id),
        psvs: d.psvs.filter((p) => !locIds.has(p.locationId)),
      };
    });
  }, []);

  // --- Location ------------------------------------------------------------
  const addLocation = useCallback((l: Omit<Location, 'id'>) => {
    const created: Location = { ...l, id: uid('loc') };
    setData((d) => ({ ...d, locations: [...d.locations, created] }));
    return created;
  }, []);

  const updateLocation = useCallback(
    (id: string, patch: Partial<Omit<Location, 'id'>>) => {
      setData((d) => ({
        ...d,
        locations: d.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }));
    },
    [],
  );

  const deleteLocation = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      locations: d.locations.filter((l) => l.id !== id),
      psvs: d.psvs.filter((p) => p.locationId !== id),
    }));
  }, []);

  // --- PSV -----------------------------------------------------------------
  const addPSV = useCallback((input: NewPSVInput) => {
    const id = uid('psv');
    const now = new Date().toISOString();
    const date = input.statusDate ?? todayISO();
    // On-site serviced valves have no spare and are always treated as installed.
    const status: PSVStatus = input.servicedOnSite ? 'installed' : input.status;
    const events: PSVEvent[] = [
      {
        id: uid('evt'),
        psvId: id,
        type: 'created',
        date,
        description: `PSV ${input.serialNumber} added to the tracking system`,
        recordedAt: now,
      },
      {
        id: uid('evt'),
        psvId: id,
        type: 'status-change',
        status,
        date,
        description: `Status set to ${STATUS_LABELS[status]}`,
        recordedAt: now,
      },
    ];
    const created: PSV = {
      id,
      serialNumber: input.serialNumber,
      tag: input.tag,
      locationId: input.locationId,
      status,
      servicedOnSite: input.servicedOnSite || undefined,
      datasheet: input.datasheet,
      events,
      createdAt: now,
    };
    setData((d) => {
      let psvs = [...d.psvs, created];
      if (status === 'installed') {
        psvs = enforceSingleInstalled(psvs, created.locationId, id, now);
      }
      return { ...d, psvs };
    });
    return created;
  }, []);

  const updatePSV = useCallback(
    (
      id: string,
      patch: Partial<Pick<PSV, 'serialNumber' | 'tag' | 'locationId' | 'servicedOnSite'>>,
    ) => {
      setData((d) => ({
        ...d,
        psvs: d.psvs.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    [],
  );

  const updateDatasheet = useCallback((id: string, datasheet: PSVDatasheet) => {
    const now = new Date().toISOString();
    setData((d) => ({
      ...d,
      psvs: d.psvs.map((p) =>
        p.id === id
          ? {
              ...p,
              datasheet,
              events: [
                ...p.events,
                {
                  id: uid('evt'),
                  psvId: id,
                  type: 'datasheet-update',
                  date: todayISO(),
                  description: 'Datasheet information updated',
                  recordedAt: now,
                },
              ],
            }
          : p,
      ),
    }));
  }, []);

  const deletePSV = useCallback((id: string) => {
    setData((d) => ({ ...d, psvs: d.psvs.filter((p) => p.id !== id) }));
  }, []);

  // --- Status + history ----------------------------------------------------
  const setStatus = useCallback(
    (id: string, status: PSVStatus, date: string, note?: string) => {
      const now = new Date().toISOString();
      setData((d) => {
        const target = d.psvs.find((p) => p.id === id);
        let psvs = d.psvs.map((p) =>
          p.id === id
            ? {
                ...p,
                status,
                events: [
                  ...p.events,
                  {
                    id: uid('evt'),
                    psvId: id,
                    type: 'status-change' as const,
                    status,
                    date,
                    description: `Status set to ${STATUS_LABELS[status]}`,
                    note,
                    recordedAt: now,
                  },
                ],
              }
            : p,
        );
        if (status === 'installed' && target) {
          psvs = enforceSingleInstalled(psvs, target.locationId, id, now);
        }
        return { ...d, psvs };
      });
    },
    [],
  );

  const addHistoryEvent = useCallback((id: string, event: NewEventInput) => {
    const now = new Date().toISOString();
    setData((d) => {
      let installedAtLoc: string | null = null;
      const psvs = d.psvs.map((p) => {
        if (p.id !== id) return p;
        const defaultDescription =
          event.type === 'service'
            ? 'Serviced on site'
            : event.status
              ? `Status set to ${STATUS_LABELS[event.status]}`
              : 'History entry';
        const newEvent: PSVEvent = {
          id: uid('evt'),
          psvId: id,
          type: event.type,
          status: event.status,
          date: event.date,
          description: event.description ?? defaultDescription,
          note: event.note,
          recordedAt: now,
        };
        // If this status-change is the latest by date, reflect it as current status.
        let status = p.status;
        if (event.type === 'status-change' && event.status) {
          const latestDate = p.events
            .filter((e) => e.type === 'status-change')
            .map((e) => e.date)
            .sort()
            .pop();
          if (!latestDate || event.date >= latestDate) status = event.status;
        }
        if (status === 'installed') installedAtLoc = p.locationId;
        return { ...p, status, events: [...p.events, newEvent] };
      });
      return {
        ...d,
        psvs: installedAtLoc ? enforceSingleInstalled(psvs, installedAtLoc, id, now) : psvs,
      };
    });
  }, []);

  const recomputeStatus = (events: PSVEvent[], fallback: PSVStatus): PSVStatus => {
    const statusEvents = events
      .filter((e) => e.type === 'status-change' && e.status)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return statusEvents.length ? statusEvents[statusEvents.length - 1].status! : fallback;
  };

  const updateHistoryEvent = useCallback(
    (id: string, eventId: string, patch: Partial<PSVEvent>) => {
      setData((d) => ({
        ...d,
        psvs: d.psvs.map((p) => {
          if (p.id !== id) return p;
          const events = p.events.map((e) => (e.id === eventId ? { ...e, ...patch } : e));
          return { ...p, events, status: recomputeStatus(events, p.status) };
        }),
      }));
    },
    [],
  );

  const deleteHistoryEvent = useCallback((id: string, eventId: string) => {
    setData((d) => ({
      ...d,
      psvs: d.psvs.map((p) => {
        if (p.id !== id) return p;
        const events = p.events.filter((e) => e.id !== eventId);
        return { ...p, events, status: recomputeStatus(events, p.status) };
      }),
    }));
  }, []);

  const resetToSeed = useCallback(() => setData(structuredClone(seedData)), []);
  const clearAll = useCallback(() => setData(structuredClone(EMPTY_DATA)), []);
  const replaceData = useCallback((d: AppData) => setData(structuredClone(d)), []);

  const value = useMemo<PSVContextValue>(
    () => ({
      data,
      syncStatus,
      getEquipment,
      getLocation,
      getPSV,
      locationsForEquipment,
      psvsForLocation,
      psvsForEquipment,
      addEquipment,
      updateEquipment,
      deleteEquipment,
      addLocation,
      updateLocation,
      deleteLocation,
      addPSV,
      updatePSV,
      updateDatasheet,
      deletePSV,
      setStatus,
      addHistoryEvent,
      updateHistoryEvent,
      deleteHistoryEvent,
      resetToSeed,
      clearAll,
      replaceData,
    }),
    [
      data,
      syncStatus,
      getEquipment,
      getLocation,
      getPSV,
      locationsForEquipment,
      psvsForLocation,
      psvsForEquipment,
      addEquipment,
      updateEquipment,
      deleteEquipment,
      addLocation,
      updateLocation,
      deleteLocation,
      addPSV,
      updatePSV,
      updateDatasheet,
      deletePSV,
      setStatus,
      addHistoryEvent,
      updateHistoryEvent,
      deleteHistoryEvent,
      resetToSeed,
      clearAll,
      replaceData,
    ],
  );

  return <PSVContext.Provider value={value}>{children}</PSVContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePSV(): PSVContextValue {
  const ctx = useContext(PSVContext);
  if (!ctx) throw new Error('usePSV must be used within a PSVProvider');
  return ctx;
}
