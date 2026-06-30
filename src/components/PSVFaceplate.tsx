import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, Gauge, Wrench } from 'lucide-react';
import type { PSV, PSVStatus } from '../types';
import { usePSV } from '../store/PSVContext';
import { getCompliance, lastServiceDate, STATUS_LABELS } from '../utils/compliance';
import { formatDate, relativeDays, todayISO } from '../utils/dates';
import { ComplianceBadge } from './Badges';

const TOGGLE_ORDER: PSVStatus[] = ['installed', 'out_for_service', 'inventory'];

const ACTIVE_TOGGLE: Record<PSVStatus, string> = {
  installed: 'bg-emerald-600 text-white',
  out_for_service: 'bg-amber-500 text-white',
  inventory: 'bg-sky-600 text-white',
};

function dueColor(days: number | null): string {
  if (days === null) return 'text-slate-400';
  if (days < 0) return 'font-semibold text-red-600';
  if (days <= 90) return 'font-semibold text-amber-600';
  return 'text-slate-400';
}

export function PSVFaceplate({ psv }: { psv: PSV }) {
  const navigate = useNavigate();
  const { setStatus, addHistoryEvent } = usePSV();
  const compliance = getCompliance(psv);
  const onSite = Boolean(psv.servicedOnSite);
  const isInstalled = psv.status === 'installed';

  const headerColor = onSite
    ? 'bg-maroon-800'
    : isInstalled
      ? 'bg-emerald-600'
      : psv.status === 'out_for_service'
        ? 'bg-amber-500'
        : 'bg-slate-500';

  return (
    <div
      className={`card flex flex-col overflow-hidden transition-all hover:shadow-card-hover ${
        isInstalled ? 'ring-2 ring-emerald-500/60' : ''
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wide text-white ${headerColor}`}
      >
        <span>{onSite ? 'Serviced On Site' : STATUS_LABELS[psv.status]}</span>
        {(isInstalled || onSite) && <span className="rounded bg-white/20 px-1.5 py-0.5">In Service</span>}
      </div>

      <button onClick={() => navigate(`/psv/${psv.id}`)} className="group flex-1 px-4 py-3 text-left">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Serial No.</p>
            <h4 className="text-lg font-bold text-slate-900">{psv.serialNumber}</h4>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-maroon-700" />
        </div>

        <div className="mt-2 space-y-1.5 text-sm text-slate-600">
          <p className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-slate-400" />
            {psv.datasheet.make} {psv.datasheet.model} · {psv.datasheet.setPressure}{' '}
            {psv.datasheet.pressureUnit}
          </p>
          {compliance.dueDate && (
            <>
              <p className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-slate-400" />
                Installed {formatDate(compliance.lastInstallDate)}
              </p>
              <p className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                Due {formatDate(compliance.dueDate)}
                <span className={dueColor(compliance.daysRemaining)}>
                  ({relativeDays(compliance.daysRemaining)})
                </span>
              </p>
            </>
          )}
          {onSite && (
            <p className="flex items-center gap-1.5 text-slate-500">
              <Wrench className="h-3.5 w-3.5 text-slate-400" />
              Last serviced {formatDate(lastServiceDate(psv))}
            </p>
          )}
        </div>

        <div className="mt-2">
          <ComplianceBadge state={compliance.state} />
        </div>
      </button>

      <div className="border-t border-slate-100 p-3">
        {onSite ? (
          <button
            className="btn-secondary w-full"
            onClick={() =>
              addHistoryEvent(psv.id, {
                type: 'service',
                date: todayISO(),
                description: 'Serviced on site',
              })
            }
            title="Record an on-site service / recertification (uses today's date)"
          >
            <Wrench className="h-4 w-4" />
            Record Service (today)
          </button>
        ) : (
          <>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Set status
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {TOGGLE_ORDER.map((s) => {
                const active = psv.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => {
                      if (!active) setStatus(psv.id, s, todayISO());
                    }}
                    className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                      active ? ACTIVE_TOGGLE[s] : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={active ? `Currently ${STATUS_LABELS[s]}` : `Set to ${STATUS_LABELS[s]} (today)`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
