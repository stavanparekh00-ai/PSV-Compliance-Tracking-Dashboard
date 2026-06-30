import {
  Boxes,
  Container,
  Factory,
  Flame,
  Gauge,
  Snowflake,
  Thermometer,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Picks an icon for a piece of equipment based on keywords in its type/name.
 * Tuned for the equipment Utilities & Energy Services tracks (boilers, hot
 * water heating boilers, HRSGs, etc.) with sensible fallbacks.
 */
export function equipmentIcon(type: string, name = ''): LucideIcon {
  const t = `${type} ${name}`.toLowerCase();

  if (t.includes('hrsg') || t.includes('heat recovery')) return Wind;
  if (t.includes('hot water') || t.includes('hydronic') || t.includes('domestic water'))
    return Thermometer;
  if (t.includes('boiler') || t.includes('steam')) return Flame;
  if (t.includes('chiller') || t.includes('refriger') || t.includes('cooling')) return Snowflake;
  if (t.includes('compress') || t.includes('air')) return Wind;
  if (t.includes('deaerator') || t.includes('tank') || t.includes('vessel') || t.includes('receiver'))
    return Container;
  if (t.includes('prv') || t.includes('pressure reduc') || t.includes('station')) return Gauge;
  if (t.includes('plant') || t.includes('generator')) return Factory;

  return Boxes;
}
