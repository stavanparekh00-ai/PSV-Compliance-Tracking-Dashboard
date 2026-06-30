import type { ComplianceState, PSVStatus } from '../types';
import { COMPLIANCE_LABELS, STATUS_LABELS } from '../utils/compliance';

const STATUS_STYLES: Record<PSVStatus, string> = {
  installed: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  out_for_service: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  inventory: 'bg-sky-100 text-sky-800 ring-sky-600/20',
};

const COMPLIANCE_STYLES: Record<ComplianceState, string> = {
  compliant: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  due_soon: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  overdue: 'bg-red-100 text-red-800 ring-red-600/20',
  not_installed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const BASE =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap';

export function StatusBadge({ status }: { status: PSVStatus }) {
  return (
    <span className={`${BASE} ${STATUS_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ComplianceBadge({ state }: { state: ComplianceState }) {
  return (
    <span className={`${BASE} ${COMPLIANCE_STYLES[state]}`}>{COMPLIANCE_LABELS[state]}</span>
  );
}
