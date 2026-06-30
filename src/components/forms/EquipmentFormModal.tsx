import { useEffect, useState } from 'react';
import { usePSV } from '../../store/PSVContext';
import { Modal } from '../Modal';
import { Field } from '../Field';

interface EquipmentFormModalProps {
  open: boolean;
  onClose: () => void;
  equipmentId?: string;
}

export function EquipmentFormModal({ open, onClose, equipmentId }: EquipmentFormModalProps) {
  const { getEquipment, addEquipment, updateEquipment } = usePSV();
  const existing = equipmentId ? getEquipment(equipmentId) : undefined;
  const editing = Boolean(existing);

  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [type, setType] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? '');
    setTag(existing?.tag ?? '');
    setType(existing?.type ?? '');
    setArea(existing?.area ?? '');
    setDescription(existing?.description ?? '');
  }, [open, existing]);

  const canSave = name.trim() !== '';

  const handleSave = () => {
    if (!canSave) return;
    const payload = {
      name: name.trim(),
      tag: tag.trim(),
      type: type.trim(),
      area: area.trim(),
      description: description.trim(),
    };
    if (editing && existing) updateEquipment(existing.id, payload);
    else addEquipment(payload);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit equipment' : 'Add equipment'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave}>
            {editing ? 'Save changes' : 'Add equipment'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Boiler #1" />
        </Field>
        <Field label="Tag">
          <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. BLR-001" />
        </Field>
        <Field label="Type">
          <input className="input" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Watertube Boiler" />
        </Field>
        <Field label="Area / Plant">
          <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Central Utility Plant" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea className="input min-h-[64px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
