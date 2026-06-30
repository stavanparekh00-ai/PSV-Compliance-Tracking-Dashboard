import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Info, Pencil, Plus } from 'lucide-react';
import { usePSV } from '../store/PSVContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { PSVFaceplate } from '../components/PSVFaceplate';
import { PSVFormModal } from '../components/forms/PSVFormModal';
import { LocationFormModal } from '../components/forms/LocationFormModal';

export function LocationPage() {
  const { locationId = '' } = useParams();
  const { getLocation, getEquipment, psvsForLocation } = usePSV();

  const location = getLocation(locationId);
  const equipment = location ? getEquipment(location.equipmentId) : undefined;
  const psvs = psvsForLocation(locationId);

  const [showAddPSV, setShowAddPSV] = useState(false);
  const [editLocation, setEditLocation] = useState(false);

  if (!location || !equipment) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-500">Location not found.</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const installedCount = psvs.filter((p) => p.status === 'installed').length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: equipment.name, to: `/equipment/${equipment.id}` },
          { label: location.name },
        ]}
      />

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{location.name}</h2>
              {location.tag && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-600">
                  {location.tag}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {equipment.name} · {equipment.tag}
            </p>
            {location.description && (
              <p className="mt-2 max-w-2xl text-sm text-slate-500">{location.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => setEditLocation(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button className="btn-primary" onClick={() => setShowAddPSV(true)}>
              <Plus className="h-4 w-4" />
              Add PSV
            </button>
          </div>
        </div>

        {installedCount === 0 && psvs.length > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <Info className="h-4 w-4" />
            No valve is currently installed at this location.
          </div>
        )}
        {installedCount > 1 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <Info className="h-4 w-4" />
            More than one valve is marked installed at this location — verify the records.
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-4 text-lg font-bold text-slate-900">
          PSVs at this location <span className="text-slate-400">({psvs.length})</span>
        </h3>
        {psvs.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">
            No PSVs assigned yet. Use “Add PSV” to assign one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {psvs.map((psv) => (
              <PSVFaceplate key={psv.id} psv={psv} />
            ))}
          </div>
        )}
      </div>

      <PSVFormModal
        open={showAddPSV}
        presetLocationId={locationId}
        onClose={() => setShowAddPSV(false)}
      />
      <LocationFormModal
        open={editLocation}
        equipmentId={equipment.id}
        locationId={locationId}
        onClose={() => setEditLocation(false)}
      />
    </div>
  );
}
