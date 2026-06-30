import { AlertTriangle, CheckCircle2, Clock, Gauge, Package, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { KPISummary } from '../types';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  hint?: string;
}

function KPICard({ label, value, icon: Icon, accent, iconBg, hint }: KPICardProps) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">{label}</p>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

export function KPIGrid({ summary }: { summary: KPISummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      <KPICard
        label="Total PSVs"
        value={summary.total}
        icon={Gauge}
        accent="text-slate-700"
        iconBg="bg-slate-100"
      />
      <KPICard
        label="Installed"
        value={summary.installed}
        icon={CheckCircle2}
        accent="text-emerald-600"
        iconBg="bg-emerald-50"
      />
      <KPICard
        label="In Inventory"
        value={summary.inventory}
        icon={Package}
        accent="text-sky-600"
        iconBg="bg-sky-50"
      />
      <KPICard
        label="Out for Service"
        value={summary.outForService}
        icon={Wrench}
        accent="text-amber-600"
        iconBg="bg-amber-50"
      />
      <KPICard
        label="Due Soon (≤90d)"
        value={summary.dueSoon}
        icon={Clock}
        accent="text-amber-600"
        iconBg="bg-amber-50"
      />
      <KPICard
        label="Overdue"
        value={summary.overdue}
        icon={AlertTriangle}
        accent="text-red-600"
        iconBg="bg-red-50"
      />
    </div>
  );
}
