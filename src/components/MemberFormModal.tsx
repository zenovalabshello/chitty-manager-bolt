import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { MembershipType, Member, MemberInput } from '@/lib/members';
import { supabase } from '@/lib/supabase';
import { recordActivity } from '@/lib/activities';

interface MemberFormModalProps {
  open: boolean;
  chittyId: string;
  member?: Member | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  place: string;
  contact1: string;
  contact2: string;
  job: string;
  id_proof_type: string;
  id_number: string;
  membership_type: MembershipType;
}

const EMPTY: FormState = {
  name: '',
  place: '',
  contact1: '',
  contact2: '',
  job: '',
  id_proof_type: '',
  id_number: '',
  membership_type: 'full',
};

function toForm(member: Member): FormState {
  return {
    name: member.name,
    place: member.place ?? '',
    contact1: member.contact1,
    contact2: member.contact2 ?? '',
    job: member.job ?? '',
    id_proof_type: member.id_proof_type ?? '',
    id_number: member.id_number ?? '',
    membership_type: member.membership_type,
  };
}

export default function MemberFormModal({ open, chittyId, member, onClose, onSaved }: MemberFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEdit = !!member;

  useEffect(() => {
    if (open) {
      setForm(member ? toForm(member) : EMPTY);
      setErrors({});
      setSubmitError(null);
    }
  }, [open, member]);

  if (!open) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setSubmitError(null);
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.contact1.trim()) next.contact1 = 'Contact number is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);

    const payload: MemberInput = {
      name: form.name.trim(),
      place: form.place.trim() || null,
      contact1: form.contact1.trim(),
      contact2: form.contact2.trim() || null,
      job: form.job.trim() || null,
      id_proof_type: form.id_proof_type.trim() || null,
      id_number: form.id_number.trim() || null,
      membership_type: form.membership_type,
    };

    let error: { message: string } | null = null;
    if (isEdit && member) {
      ({ error } = await supabase.from('members').update(payload).eq('id', member.id));
    } else {
      ({ error } = await supabase.from('members').insert({ ...payload, chitty_id: chittyId }));
    }

    setSubmitting(false);
    if (error) {
      setSubmitError('Could not save the member. Please try again.');
      return;
    }
    if (!member) {
      await recordActivity(chittyId, 'member_added', `Member "${payload.name}" was added.`, { member_name: payload.name, membership_type: payload.membership_type });
    }
    onSaved();
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-soft-lg animate-scale-in dark:bg-neutral-900 sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit member' : 'Add member'}</h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Name" required error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Member name"
              className="input"
            />
          </Field>

          <Field label="Place" hint="Optional">
            <input
              type="text"
              value={form.place}
              onChange={(e) => update('place', e.target.value)}
              placeholder="City or locality"
              className="input"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact No. 1" required error={errors.contact1}>
              <input
                type="tel"
                value={form.contact1}
                onChange={(e) => update('contact1', e.target.value)}
                placeholder="Primary phone"
                className="input"
              />
            </Field>
            <Field label="Contact No. 2" hint="Optional">
              <input
                type="tel"
                value={form.contact2}
                onChange={(e) => update('contact2', e.target.value)}
                placeholder="Secondary phone"
                className="input"
              />
            </Field>
          </div>

          <Field label="Job" hint="Optional">
            <input
              type="text"
              value={form.job}
              onChange={(e) => update('job', e.target.value)}
              placeholder="Occupation"
              className="input"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ID Proof Type" hint="Optional">
              <select
                value={form.id_proof_type}
                onChange={(e) => update('id_proof_type', e.target.value)}
                className="input"
              >
                <option value="">Select type</option>
                <option value="Aadhaar">Aadhaar</option>
                <option value="PAN">PAN</option>
                <option value="Voter ID">Voter ID</option>
                <option value="Passport">Passport</option>
                <option value="Driving License">Driving License</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="ID Number" hint="Optional">
              <input
                type="text"
                value={form.id_number}
                onChange={(e) => update('id_number', e.target.value)}
                placeholder="ID number"
                className="input"
              />
            </Field>
          </div>

          <Field label="Membership type" required>
            <SegmentedGroup
              options={[
                { value: 'full', label: 'Full' },
                { value: 'half', label: 'Half' },
              ]}
              value={form.membership_type}
              onChange={(v) => update('membership_type', v as MembershipType)}
            />
            <p className="mt-1.5 text-xs text-neutral-400">
              {form.membership_type === 'half'
                ? 'Half members pay half the installment and must be paired with another half member to form one draw unit.'
                : 'Full members pay the full installment and count as one draw unit.'}
            </p>
          </Field>

          {submitError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
              {submitError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={handleClose} disabled={submitting} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : isEdit ? (
                'Save changes'
              ) : (
                'Add member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
          {required && <span className="ml-0.5 text-brand-600 dark:text-brand-400">*</span>}
        </label>
        {hint && <span className="text-xs text-neutral-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function SegmentedGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              active
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950 dark:text-brand-300'
                : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
