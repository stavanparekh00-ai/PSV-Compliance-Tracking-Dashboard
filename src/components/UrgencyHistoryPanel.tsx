import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  History,
  PencilLine,
  StickyNote,
  ToggleRight,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePSV } from '../store/PSVContext';
import { getCompliance } from '../utils/compliance';
import { buildActivityFeed } from '../utils/activity';
import { formatDate, formatDateTime, relativeDays } from '../utils/dates';
import { ComplianceBadge } from './Badges';
import type { PSVEventType } from '../types';

type Tab = 'due' | 'history';

const EVENT_ICONS: Record<PSVEventType, LucideIcon> = {
  created: FilePlus2,
  'status-change': ToggleRight,
  service: Wrench,
  'datasheet-update': PencilLine,
  'history-edit': PencilLine,
  note: StickyNote,
};

export function UrgencyHistoryPanel({ equipmentId }: { equipmentId?: string }) {
  const { data, psvsForEquipment } = usePSV();
  const [tab, setTab] = useState<Tab>('due');

  const scopedPsvs = equipmentId ? psvsForEquipment(equipmentId) : data.psvs;

  const dueList = useMemo(() => {
    return scopedPsvs
      .map((psv) => ({ psv, compliance: getCompliance(psv) }))
      .filter((x) => x.compliance.state !== 'not_installed')
      .sort((a, b) => (a.compliance.daysRemaining ?? 0) - (b.compliance.daysRemaining ?? 0));
  }, [scopedPsvs]);

  const activity = useMemo(() => {
    const feed = buildActivityFeed(data, undefined);
    const filtered = equipmentId ? feed.filter((a) => a.equipmentId === equipmentId) : feed;
    return filtered.slice(0, 40);
  }, [data, equipmentId]);

  const locName = (locationId: string) => data.locations.find((l) => l.id === locationId)?.name ?? '';
  const eqNameForLoc = (locationId: string) => {
    const loc = data.locations.find((l) => l.id === locationId);
    return loc ? data.equipment.find((e) => e.id === loc.equipmentId)?.name ?? '' : '';
  };

  return (
    <div className="card flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-slate-200 p-2">
        <TabButton active={tab === 'due'} onClick={() => setTab('due')} icon={CalendarClock}>
          Upcoming Due
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')} icon={History}>
          Status Changes
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'due' ? (
          dueList.length === 0 ? (
            <Empty icon={CheckCircle2} text="No installed PSVs to track yet." />
          ) : (
            <ul className="space-y-2">
              {dueList.map(({ psv, compliance }) => (
                <li key={psv.id}>
                  <Link
                    to={`/psv/${psv.id}`}
                    className="block rounded-lg border border-slate-200 p-3 transition-colors hover:border-maroon-300 hover:bg-maroon-50/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800">{psv.serialNumber}</span>
                      <ComplianceBadge state={compliance.state} />
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {eqNameForLoc(psv.locationId)} · {locName(psv.locationId)}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Due <span className="font-medium text-slate-700">{formatDate(compliance.dueDate)}</span>
                      </span>
                      <span
                        className={
                          (compliance.daysRemaining ?? 0) < 0
                            ? 'font-semibold text-red-600'
                            : (compliance.daysRemaining ?? 0) <= 90
                              ? 'font-semibold text-amber-600'
                              : 'text-slate-500'
                        }
                      >
                        {relativeDays(compliance.daysRemaining)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : activity.length === 0 ? (
          <Empty icon={History} text="No history recorded yet." />
        ) : (
          <ul className="space-y-1">
            {activity.map((item) => {
              const Icon = EVENT_ICONS[item.event.type] ?? StickyNote;
              return (
                <li key={item.event.id}>
                  <Link
                    to={`/psv/${item.psvId}`}
                    className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold">{item.serialNumber}</span> — {item.event.description}
                      </p>
                      {item.event.note && (
                        <p className="truncate text-xs italic text-slate-400">“{item.event.note}”</p>
                      )}
                      <p className="text-xs text-slate-400">
                        {item.equipmentName} · {item.locationName} · {formatDateTime(item.event.recordedAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-maroon-900 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function Empty({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-slate-400">
      <Icon className="h-8 w-8" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
