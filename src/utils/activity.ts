import type { AppData, PSVEvent } from '../types';

export interface ActivityItem {
  event: PSVEvent;
  psvId: string;
  serialNumber: string;
  locationId: string;
  locationName: string;
  equipmentId: string;
  equipmentName: string;
}

/** Flattens every PSV event across the site into a single feed (newest first). */
export function buildActivityFeed(data: AppData, limit?: number): ActivityItem[] {
  const locById = new Map(data.locations.map((l) => [l.id, l]));
  const eqById = new Map(data.equipment.map((e) => [e.id, e]));

  const items: ActivityItem[] = [];
  for (const psv of data.psvs) {
    const loc = locById.get(psv.locationId);
    const eq = loc ? eqById.get(loc.equipmentId) : undefined;
    for (const event of psv.events) {
      items.push({
        event,
        psvId: psv.id,
        serialNumber: psv.serialNumber,
        locationId: psv.locationId,
        locationName: loc?.name ?? 'Unknown location',
        equipmentId: eq?.id ?? '',
        equipmentName: eq?.name ?? 'Unknown equipment',
      });
    }
  }

  items.sort((a, b) => (a.event.recordedAt < b.event.recordedAt ? 1 : -1));
  return typeof limit === 'number' ? items.slice(0, limit) : items;
}
