import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Pencil, Trash2 } from 'lucide-react';
import type { Equipment } from '../types';
import { usePSV } from '../store/PSVContext';
import { equipmentIcon } from '../utils/equipmentIcon';

interface EquipmentCardProps {
  equipment: Equipment;
  onEdit: () => void;
}

export function EquipmentCard({ equipment, onEdit }: EquipmentCardProps) {
  const navigate = useNavigate();
  const { deleteEquipment } = usePSV();
  const Icon = equipmentIcon(equipment.type, equipment.name);

  return (
    <div
      onClick={() => navigate(`/equipment/${equipment.id}`)}
      className="card group flex cursor-pointer items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-maroon-200 hover:shadow-card-hover"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-maroon-50 text-maroon-800">
        <Icon className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-bold text-slate-900">{equipment.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {equipment.area || '—'}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-maroon-800">{equipment.tag || '—'}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
          title="Edit equipment"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (
              confirm(
                `Delete ${equipment.name} and all of its locations and PSVs? This cannot be undone.`,
              )
            ) {
              deleteEquipment(equipment.id);
            }
          }}
          className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          title="Delete equipment"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <ChevronRight className="h-5 w-5 text-slate-300" />
      </div>
    </div>
  );
}
