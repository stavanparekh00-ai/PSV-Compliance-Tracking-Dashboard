import { useEffect, useState } from 'react';
import { usePSV } from '../../store/PSVContext';
import { Modal } from '../Modal';
import { Field } from '../Field';

interface LocationFormModalProps {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  locationId?: string;
}

export function LocationFormModal({ open, onClose, equipmentId, locationId }: LocationFormModalProps) {
  const { getLocation, addLocation, updateLocation } = usePSV();
  const existing = locationId ? getLocation(locationId) : undefined;
  const editing = Boolean(existing);

  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? '');
    setTag(existing?.tag ?? '');
    setDescription(existing?.description ?? '');
  }, [open, existing]);

  const canSave = name.trim() !== '';

  const handleSave = () => {
    if (!canSave) return;
    const payload = { name: name.trim(), tag: tag.trim(), description: description.trim() };
    if (editing && existing) updateLocation(existing.id, payload);
    else addLocation({ equipmentId, ...payload });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit location' : 'Add location'}
      description="A protected point on the equipment that requires a relief valve."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave}>
            {editing ? 'Save changes' : 'Add location'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Steam Drum Relief" />
        </Field>
        <Field label="Service Tag">
          <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. BLR-001-PSV-A" />
        </Field>
        <Field label="Description">
          <textarea className="input min-h-[64px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
