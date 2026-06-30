import { useEffect, useState } from 'react';
import { usePSV } from '../../store/PSVContext';
import { Modal } from '../Modal';
import { Field } from '../Field';
import { STATUS_LABELS } from '../../utils/compliance';
import { todayISO } from '../../utils/dates';
import type { PSVStatus } from '../../types';

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  psvId: string;
  /** Provide to edit an existing history entry. */
  eventId?: string;
}

type EntryKind = 'status-change' | 'service' | 'note';

export function EventFormModal({ open, onClose, psvId, eventId }: EventFormModalProps) {
  const { getPSV, addHistoryEvent, updateHistoryEvent } = usePSV();
  const psv = getPSV(psvId);
  const existing = eventId ? psv?.events.find((e) => e.id === eventId) : undefined;
  const editing = Boolean(existing);

  const [kind, setKind] = useState<EntryKind>('status-change');
  const [status, setStatus] = useState<PSVStatus>('installed');
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setKind(
        existing.type === 'status-change'
          ? 'status-change'
          : existing.type === 'service'
            ? 'service'
            : 'note',
      );
      setStatus(existing.status ?? 'installed');
      setDate(existing.date);
      setDescription(existing.description);
      setNote(existing.note ?? '');
    } else {
      setKind('status-change');
      setStatus('installed');
      setDate(todayISO());
      setDescription('');
      setNote('');
    }
  }, [open, existing]);

  const handleSave = () => {
    const isStatus = kind === 'status-change';
    const desc =
      description.trim() ||
      (isStatus
        ? `Status set to ${STATUS_LABELS[status]}`
        : kind === 'service'
          ? 'Serviced on site'
          : 'History note');

    const payload = {
      type: kind,
      status: isStatus ? status : undefined,
      date,
      description: desc,
      note: note.trim() || undefined,
    } as const;

    if (editing && existing) {
      updateHistoryEvent(psvId, existing.id, payload);
    } else {
      addHistoryEvent(psvId, payload);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={editing ? 'Edit history entry' : 'Add history entry'}
      description="Correct a mistake or log an install / service / inventory event."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {editing ? 'Save changes' : 'Add entry'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Entry Type">
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as EntryKind)}>
            <option value="status-change">Status change (install / out for service / inventory)</option>
            <option value="service">On-site service / recertification</option>
            <option value="note">Note</option>
          </select>
        </Field>
        {kind === 'status-change' && (
          <Field label="Status" hint="Install dates drive the 3-year recertification due date.">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as PSVStatus)}>
              {(Object.keys(STATUS_LABELS) as PSVStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Date" required>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Description" hint="Leave blank to auto-generate from the status.">
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <textarea
            className="input min-h-[64px] resize-y"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
