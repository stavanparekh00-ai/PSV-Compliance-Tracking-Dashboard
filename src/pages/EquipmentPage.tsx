import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, FileSpreadsheet, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { usePSV } from '../store/PSVContext';
import { getCompliance, summarize } from '../utils/compliance';
import { exportToExcel } from '../utils/excelExport';
import { equipmentIcon } from '../utils/equipmentIcon';
import { formatDate, relativeDays } from '../utils/dates';
import { KPIGrid } from '../components/KPIGrid';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { UrgencyHistoryPanel } from '../components/UrgencyHistoryPanel';
import { ComplianceBadge } from '../components/Badges';
import { EquipmentFormModal } from '../components/forms/EquipmentFormModal';
import { LocationFormModal } from '../components/forms/LocationFormModal';
import type { Location, PSV } from '../types';

export function EquipmentPage() {
  const { equipmentId = '' } = useParams();
  const navigate = useNavigate();
  const {
    data,
    getEquipment,
    locationsForEquipment,
    psvsForEquipment,
    psvsForLocation,
    deleteLocation,
  } = usePSV();

  const equipment = getEquipment(equipmentId);
  const [editEquipment, setEditEquipment] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [editLocationId, setEditLocationId] = useState<string | null>(null);

  const locations = locationsForEquipment(equipmentId);
  const summary = useMemo(() => summarize(psvsForEquipment(equipmentId)), [psvsForEquipment, equipmentId]);

  if (!equipment) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-500">Equipment not found.</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const EqIcon = equipmentIcon(equipment.type, equipment.name);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: equipment.name }]} />

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-maroon-50 text-maroon-800">
              <EqIcon className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900">{equipment.name}</h2>
                <span className="rounded-md bg-maroon-50 px-2 py-0.5 text-sm font-semibold text-maroon-800">
                  {equipment.tag}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{equipment.type}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-400">
                <MapPin className="h-4 w-4" />
                {equipment.area}
              </p>
              {equipment.description && (
                <p className="mt-2 max-w-2xl text-sm text-slate-500">{equipment.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary"
              onClick={() => exportToExcel(data, { equipment })}
              title="Export this equipment's PSV report to Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </button>
            <button className="btn-secondary" onClick={() => setEditEquipment(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>
      </div>

      <KPIGrid summary={summary} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Locations</h3>
            <button className="btn-primary" onClick={() => setShowAddLocation(true)}>
              <Plus className="h-4 w-4" />
              Add Location
            </button>
          </div>

          {locations.length === 0 ? (
            <div className="card p-10 text-center text-slate-400">
              No locations yet. Add a relief-valve location to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((loc) => (
                <LocationRow
                  key={loc.id}
                  location={loc}
                  psvs={psvsForLocation(loc.id)}
                  onOpen={() => navigate(`/location/${loc.id}`)}
                  onEdit={() => setEditLocationId(loc.id)}
                  onDelete={() => {
                    if (confirm(`Delete location “${loc.name}” and its PSVs?`)) deleteLocation(loc.id);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-1">
          <div className="h-[640px]">
            <UrgencyHistoryPanel equipmentId={equipmentId} />
          </div>
        </section>
      </div>

      <EquipmentFormModal
        open={editEquipment}
        equipmentId={equipmentId}
        onClose={() => setEditEquipment(false)}
      />
      <LocationFormModal
        open={showAddLocation}
        equipmentId={equipmentId}
        onClose={() => setShowAddLocation(false)}
      />
      <LocationFormModal
        open={editLocationId !== null}
        equipmentId={equipmentId}
        locationId={editLocationId ?? undefined}
        onClose={() => setEditLocationId(null)}
      />
    </div>
  );
}

function LocationRow({
  location,
  psvs,
  onOpen,
  onEdit,
  onDelete,
}: {
  location: Location;
  psvs: PSV[];
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const installed = psvs.find((p) => p.status === 'installed');
  const compliance = installed ? getCompliance(installed) : null;
  const spares = psvs.filter((p) => p.status !== 'installed');

  return (
    <div
      onClick={onOpen}
      className="card group cursor-pointer p-4 transition-all hover:border-maroon-200 hover:shadow-card-hover"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-slate-900">{location.name}</h4>
            {location.tag && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                {location.tag}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {installed ? (
              <>
                <span className="text-slate-600">
                  Installed:{' '}
                  <Link
                    to={`/psv/${installed.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-maroon-800 hover:underline"
                  >
                    {installed.serialNumber}
                  </Link>
                </span>
                {compliance && (
                  <>
                    <span className="text-slate-500">
                      Due <span className="font-medium text-slate-700">{formatDate(compliance.dueDate)}</span>{' '}
                      <span
                        className={
                          (compliance.daysRemaining ?? 0) < 0
                            ? 'text-red-600'
                            : (compliance.daysRemaining ?? 0) <= 90
                              ? 'text-amber-600'
                              : 'text-slate-400'
                        }
                      >
                        ({relativeDays(compliance.daysRemaining)})
                      </span>
                    </span>
                    <ComplianceBadge state={compliance.state} />
                  </>
                )}
              </>
            ) : (
              <span className="font-medium text-amber-600">No valve currently installed</span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>{psvs.length} PSV(s):</span>
            {psvs.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1">
                <span className="font-medium text-slate-600">{p.serialNumber}</span>
              </span>
            ))}
            {spares.length > 0 && (
              <span className="text-slate-300">· {spares.length} spare(s)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
            title="Edit location"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
            title="Delete location"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <ChevronRight className="h-5 w-5 text-slate-300" />
        </div>
      </div>
    </div>
  );
}
