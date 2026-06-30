import type {
  ComplianceInfo,
  ComplianceState,
  KPISummary,
  PSV,
  PSVStatus,
} from '../types';
import {
  addYears,
  daysBetween,
  DUE_SOON_DAYS,
  RECERT_INTERVAL_YEARS,
  todayISO,
} from './dates';

/** Returns the most recent install date (YYYY-MM-DD) from a PSV's events, or null. */
export function lastInstallDate(psv: PSV): string | null {
  const installs = psv.events
    .filter((e) => e.type === 'status-change' && e.status === 'installed')
    .map((e) => e.date)
    .sort();
  return installs.length ? installs[installs.length - 1] : null;
}

/** Returns the most recent on-site service date (YYYY-MM-DD), or null. */
export function lastServiceDate(psv: PSV): string | null {
  const services = psv.events
    .filter((e) => e.type === 'service')
    .map((e) => e.date)
    .sort();
  return services.length ? services[services.length - 1] : null;
}

/**
 * Returns the date the recertification clock starts from.
 * - Swap valves: the most recent INSTALL date (a spare's off-site service does
 *   not start the clock — only installation does).
 * - On-site serviced valves (no spare): the most recent SERVICE date, since they
 *   are recertified in place; falls back to the install date if never serviced.
 */
export function getCertDate(psv: PSV): string | null {
  if (psv.servicedOnSite) {
    return lastServiceDate(psv) ?? lastInstallDate(psv);
  }
  return lastInstallDate(psv);
}

/**
 * Computes compliance for a PSV. The due date = certification date + recert
 * interval (3 years). PSVs that are not currently installed (and not serviced
 * on site) do not contribute a live due date.
 */
export function getCompliance(psv: PSV): ComplianceInfo {
  const installDate = lastInstallDate(psv);
  const certDate = getCertDate(psv);
  const active = psv.servicedOnSite || psv.status === 'installed';

  if (!active || !certDate) {
    return {
      state: 'not_installed',
      dueDate: null,
      daysRemaining: null,
      lastInstallDate: installDate,
    };
  }

  const dueDate = addYears(certDate, RECERT_INTERVAL_YEARS);
  const daysRemaining = daysBetween(todayISO(), dueDate);

  let state: ComplianceState;
  if (daysRemaining < 0) state = 'overdue';
  else if (daysRemaining <= DUE_SOON_DAYS) state = 'due_soon';
  else state = 'compliant';

  return { state, dueDate, daysRemaining, lastInstallDate: installDate };
}

/** Aggregates a set of PSVs into KPI counts. */
export function summarize(psvs: PSV[]): KPISummary {
  const summary: KPISummary = {
    total: psvs.length,
    installed: 0,
    inventory: 0,
    outForService: 0,
    dueSoon: 0,
    overdue: 0,
    compliant: 0,
    complianceRate: 100,
  };

  for (const psv of psvs) {
    if (psv.status === 'installed') summary.installed += 1;
    else if (psv.status === 'inventory') summary.inventory += 1;
    else if (psv.status === 'out_for_service') summary.outForService += 1;

    const c = getCompliance(psv);
    if (c.state === 'overdue') summary.overdue += 1;
    else if (c.state === 'due_soon') summary.dueSoon += 1;
    else if (c.state === 'compliant') summary.compliant += 1;
  }

  const activeMonitored = summary.installed;
  summary.complianceRate =
    activeMonitored === 0
      ? 100
      : Math.round((summary.compliant / activeMonitored) * 100);

  return summary;
}

export const STATUS_LABELS: Record<PSVStatus, string> = {
  installed: 'Installed',
  out_for_service: 'Out for Service',
  inventory: 'In Inventory',
};

export const COMPLIANCE_LABELS: Record<ComplianceState, string> = {
  compliant: 'Compliant',
  due_soon: 'Due Soon',
  overdue: 'Overdue',
  not_installed: 'Not Installed',
};
