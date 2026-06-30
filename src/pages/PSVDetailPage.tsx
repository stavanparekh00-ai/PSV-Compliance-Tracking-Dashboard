import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarClock,
  ClipboardList,
  FileSpreadsheet,
  Pencil,
  Plus,
  ToggleRight,
  Trash2,
  Wrench,
} from 'lucide-react';
import { usePSV } from '../store/PSVContext';
import { getCompliance, lastServiceDate } from '../utils/compliance';
import { exportPSVToExcel } from '../utils/excelExport';
import { formatDate, formatDateTime, relativeDays, RECERT_INTERVAL_YEARS } from '../utils/dates';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ComplianceBadge, StatusBadge } from '../components/Badges';
import { PSVFormModal } from '../components/forms/PSVFormModal';
import { EventFormModal } from '../components/forms/EventFormModal';
import type { PSVDatasheet, PSVEvent } from '../types';

export function PSVDetailPage() {
  const { psvId = '' } = useParams();
  const navigate = useNavigate();
  const { data, getPSV, getLocation, getEquipment, deletePSV, deleteHistoryEvent } = usePSV();

  const psv = getPSV(psvId);
  const location = psv ? getLocation(psv.locationId) : undefined;
  const equipment = location ? getEquipment(location.equipmentId) : undefined;

  const [editPSV, setEditPSV] = useState(false);
  const [addEvent, setAddEvent] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);

  const sortedEvents = useMemo(() => {
    if (!psv) return [];
    return [...psv.events].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.recordedAt < b.recordedAt ? 1 : -1;
    });
  }, [psv]);

  if (!psv) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-500">PSV not found.</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const compliance = getCompliance(psv);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          ...(equipment ? [{ label: equipment.name, to: `/equipment/${equipment.id}` }] : []),
          ...(location ? [{ label: location.name, to: `/location/${location.id}` }] : []),
          { label: psv.serialNumber },
        ]}
      />

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Serial Number
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{psv.serialNumber}</h2>
              {psv.tag && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-600">
                  {psv.tag}
                </span>
              )}
              <StatusBadge status={psv.status} />
              <ComplianceBadge state={compliance.state} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {equipment?.name} · {location?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary"
              onClick={() => exportPSVToExcel(data, psv)}
              title="Export this PSV's datasheet and full history to Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </button>
            <button className="btn-secondary" onClick={() => setEditPSV(true)}>
              <Pencil className="h-4 w-4" />
              Edit PSV
            </button>
            <button
              className="btn-secondary text-red-600 hover:bg-red-50"
              onClick={() => {
                if (confirm(`Delete PSV ${psv.serialNumber}? This cannot be undone.`)) {
                  deletePSV(psv.id);
                  navigate(location ? `/location/${location.id}` : '/');
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KeyFact
            icon={Wrench}
            label={psv.servicedOnSite ? 'Last Service Date' : 'Last Install Date'}
            value={formatDate(
              psv.servicedOnSite ? lastServiceDate(psv) ?? compliance.lastInstallDate : compliance.lastInstallDate,
            )}
          />
          <KeyFact
            icon={CalendarClock}
            label={`Recert Due (${psv.servicedOnSite ? 'service' : 'install'} + ${RECERT_INTERVAL_YEARS} yrs)`}
            value={compliance.dueDate ? formatDate(compliance.dueDate) : 'Not installed'}
            sub={compliance.dueDate ? relativeDays(compliance.daysRemaining) : undefined}
            tone={
              compliance.state === 'overdue'
                ? 'danger'
                : compliance.state === 'due_soon'
                  ? 'warn'
                  : 'normal'
            }
          />
          <KeyFact
            icon={ToggleRight}
            label="Current Status"
            value={psv.servicedOnSite ? 'Serviced on site' : statusText(psv.status)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-maroon-700" />
            <h3 className="text-lg font-bold text-slate-900">Datasheet</h3>
          </div>
          <DatasheetGrid sheet={psv.datasheet} />
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">History</h3>
            <button className="btn-primary" onClick={() => setAddEvent(true)}>
              <Plus className="h-4 w-4" />
              Add Entry
            </button>
          </div>

          {sortedEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No history recorded yet.</p>
          ) : (
            <ol className="relative space-y-1 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-slate-200">
              {sortedEvents.map((event) => (
                <HistoryItem
                  key={event.id}
                  event={event}
                  onEdit={() => setEditEventId(event.id)}
                  onDelete={() => {
                    if (confirm('Delete this history entry?')) deleteHistoryEvent(psv.id, event.id);
                  }}
                />
              ))}
            </ol>
          )}
        </section>
      </div>

      <PSVFormModal open={editPSV} psvId={psv.id} onClose={() => setEditPSV(false)} />
      <EventFormModal open={addEvent} psvId={psv.id} onClose={() => setAddEvent(false)} />
      <EventFormModal
        open={editEventId !== null}
        psvId={psv.id}
        eventId={editEventId ?? undefined}
        onClose={() => setEditEventId(null)}
      />
    </div>
  );
}

function statusText(status: string) {
  return status === 'installed'
    ? 'Installed'
    : status === 'out_for_service'
      ? 'Out for Service'
      : 'In Inventory';
}

function KeyFact({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'normal',
}: {
  icon: typeof Wrench;
  label: string;
  value: string;
  sub?: string;
  tone?: 'normal' | 'warn' | 'danger';
}) {
  const subColor =
    tone === 'danger' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-400';
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
      {sub && <p className={`text-xs font-medium ${subColor}`}>{sub}</p>}
    </div>
  );
}

function DatasheetGrid({ sheet }: { sheet: PSVDatasheet }) {
  const rows: Array<[string, string | number | undefined]> = [
    ['Make / Manufacturer', sheet.make],
    ['Model Number', sheet.model],
    ['Type', sheet.type],
    ['Set Pressure', `${sheet.setPressure} ${sheet.pressureUnit}`],
    ['Capacity', sheet.capacity],
    ['Inlet Size', sheet.inletSize],
    ['Outlet Size', sheet.outletSize],
    ['Orifice', sheet.orifice],
    ['Body Material', sheet.bodyMaterial],
    ['Spring Material', sheet.springMaterial],
    ['Connection Type', sheet.connectionType],
    ['Cold Diff. Test Pressure', sheet.coldDifferentialTestPressure],
    ['Service Medium', sheet.serviceMedium],
    ['National Board No.', sheet.nationalBoardNumber],
    ['Manufacture Year', sheet.manufactureYear],
  ];
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 border-b border-slate-100 pb-2">
          <dt className="text-sm text-slate-500">{label}</dt>
          <dd className="text-right text-sm font-semibold text-slate-800">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

const DOT_COLORS: Record<string, string> = {
  installed: 'bg-emerald-500',
  out_for_service: 'bg-amber-500',
  inventory: 'bg-sky-500',
};

function HistoryItem({
  event,
  onEdit,
  onDelete,
}: {
  event: PSVEvent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dot = event.status
    ? DOT_COLORS[event.status]
    : event.type === 'service'
      ? 'bg-maroon-700'
      : 'bg-slate-400';
  return (
    <li className="group relative flex gap-3 rounded-lg py-2 pl-1 pr-1 hover:bg-slate-50">
      <span className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">{event.description}</p>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={onEdit}
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              title="Edit entry"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-600"
              title="Delete entry"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs font-medium text-slate-600">{formatDate(event.date)}</p>
        {event.note && <p className="mt-0.5 text-xs italic text-slate-500">“{event.note}”</p>}
        <p className="text-[11px] text-slate-400">Recorded {formatDateTime(event.recordedAt)}</p>
      </div>
    </li>
  );
}
