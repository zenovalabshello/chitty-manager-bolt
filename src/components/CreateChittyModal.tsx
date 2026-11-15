import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Frequency, SelectionMethod, ChittyInput, PaymentAccountDetails } from '@/lib/chitties';
import { supabase } from '@/lib/supabase';
import { recordActivity } from '@/lib/activities';

interface CreateChittyModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FormState {
  name: string;
  description: string;
  installment_amount: string;
  members_count: string;
  cycles_count: string;
  frequency: Frequency;
  start_date: string;
  selection_method: SelectionMethod;
  rules: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_number: string;
  bank_name: string;
}

const EMPTY: FormState = {
  name: '',
  description: '',
  installment_amount: '',
  members_count: '',
  cycles_count: '',
  frequency: 'monthly',
  start_date: '',
  selection_method: 'lucky_draw',
  rules: '',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  upi_number: '',
  bank_name: '',
};

function buildPaymentDetails(form: FormState): PaymentAccountDetails | null {
  const details: PaymentAccountDetails = {
    account_holder_name: form.account_holder_name.trim(),
    account_number: form.account_number.trim(),
    ifsc_code: form.ifsc_code.trim(),
    upi_number: form.upi_number.trim(),
    bank_name: form.bank_name.trim(),
  };
  if (!details.account_holder_name && !details.account_number && !details.ifsc_code && !details.upi_number && !details.bank_name) {
    return null;
  }
  return details;
}

export default function CreateChittyModal({ open, onClose, onCreated }: CreateChittyModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!open) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setSubmitError(null);
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = 'Chitty name is required';
    const amount = parseFloat(form.installment_amount);
    if (!form.installment_amount || isNaN(amount) || amount <= 0)
      next.installment_amount = 'Enter a valid amount';
    const members = parseInt(form.members_count, 10);
    if (!form.members_count || isNaN(members) || members <= 0)
      next.members_count = 'Enter a valid number';
    const cycles = parseInt(form.cycles_count, 10);
    if (!form.cycles_count || isNaN(cycles) || cycles <= 0)
      next.cycles_count = 'Enter a valid number';
    if (!form.start_date) next.start_date = 'Start date is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);

    const payload: ChittyInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      installment_amount: parseFloat(form.installment_amount),
      members_count: parseInt(form.members_count, 10),
      cycles_count: parseInt(form.cycles_count, 10),
      frequency: form.frequency,
      start_date: form.start_date,
      selection_method: form.selection_method,
      rules: form.rules.trim() || null,
      payment_account_details: buildPaymentDetails(form),
    };

    const { data, error } = await supabase.from('chitties').insert(payload).select().maybeSingle();
    setSubmitting(false);
    if (error || !data) {
      setSubmitError('Could not save the Chitty. Please try again.');
      return;
    }
    await recordActivity((data as { id: string }).id, 'chitty_created', `Chitty "${payload.name}" was created.`);
    setForm(EMPTY);
    onCreated();
  };

  const handleClose = () => {
    if (submitting) return;
    setForm(EMPTY);
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-soft-lg animate-scale-in dark:bg-neutral-900 sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create a new Chitty</h2>
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
          <Field label="Chitty name" required error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Family Chitty 2026"
              className="input"
            />
          </Field>

          <Field label="Description" hint="Optional">
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="A short note about this Chitty"
              rows={2}
              className="input resize-none"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Installment amount" required error={errors.installment_amount}>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.installment_amount}
                onChange={(e) => update('installment_amount', e.target.value)}
                placeholder="0.00"
                className="input"
              />
            </Field>
            <Field label="Number of members" required error={errors.members_count}>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={form.members_count}
                onChange={(e) => update('members_count', e.target.value)}
                placeholder="e.g. 10"
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Number of cycles" required error={errors.cycles_count}>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={form.cycles_count}
                onChange={(e) => update('cycles_count', e.target.value)}
                placeholder="e.g. 10"
                className="input"
              />
            </Field>
            <Field label="Start date" required error={errors.start_date}>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => update('start_date', e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="Payment frequency" required>
            <SegmentedGroup
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'custom', label: 'Custom' },
              ]}
              value={form.frequency}
              onChange={(v) => update('frequency', v as Frequency)}
            />
          </Field>

          <Field label="Selection method" required>
            <SegmentedGroup
              options={[
                { value: 'lucky_draw', label: 'Lucky Draw' },
                { value: 'manual', label: 'Manual' },
              ]}
              value={form.selection_method}
              onChange={(v) => update('selection_method', v as SelectionMethod)}
            />
          </Field>

          <Field label="Rules / terms" hint="Optional">
            <textarea
              value={form.rules}
              onChange={(e) => update('rules', e.target.value)}
              placeholder="Any rules or terms members should know"
              rows={3}
              className="input resize-none"
            />
          </Field>

          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Payment Account Details
            </p>
            <p className="mb-3 text-xs text-neutral-400">Optional — members will see these when you share collection details.</p>
            <div className="space-y-3">
              <Field label="Account holder name" hint="Optional">
                <input
                  type="text"
                  value={form.account_holder_name}
                  onChange={(e) => update('account_holder_name', e.target.value)}
                  placeholder="e.g. John Doe"
                  className="input"
                />
              </Field>
              <Field label="Bank name" hint="Optional">
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) => update('bank_name', e.target.value)}
                  placeholder="e.g. State Bank of India"
                  className="input"
                />
              </Field>
              <Field label="Account number" hint="Optional">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.account_number}
                  onChange={(e) => update('account_number', e.target.value)}
                  placeholder="e.g. 1234567890123"
                  className="input"
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="IFSC code" hint="Optional">
                  <input
                    type="text"
                    value={form.ifsc_code}
                    onChange={(e) => update('ifsc_code', e.target.value)}
                    placeholder="e.g. SBIN0001234"
                    className="input"
                  />
                </Field>
                <Field label="UPI number" hint="Gpay, PhonePe, etc." >
                  <input
                    type="text"
                    value={form.upi_number}
                    onChange={(e) => update('upi_number', e.target.value)}
                    placeholder="e.g. 9876543210@okhdfcbank"
                    className="input"
                  />
                </Field>
              </div>
            </div>
          </div>

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
              ) : (
                'Save Chitty'
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
