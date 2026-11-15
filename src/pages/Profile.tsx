import { useState } from 'react';
import {
  Mail,
  User,
  Shield,
  Pencil,
  Check,
  X,
  LogOut,
  Trash2,
  Calendar,
  KeyRound,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function Profile() {
  const { user, signOut } = useAuth();

  const fullName = (user?.user_metadata?.full_name as string) || '';
  const email = user?.email ?? '';
  const provider = (user?.app_metadata?.provider as string) ?? 'email';
  const loginMethod = provider === 'google' ? 'Google' : 'Email & Password';
  const createdAt = user?.created_at ?? '';

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(fullName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('Name cannot be empty.');
      return;
    }
    setSavingName(true);
    setNameError(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
    setSavingName(false);
    if (error) {
      setNameError(error.message);
      return;
    }
    setEditingName(false);
    setNameSuccess(true);
    setTimeout(() => setNameSuccess(false), 3000);
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setNameInput(fullName);
    setNameError(null);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setDeleteError('Not authenticated.');
        setDeleting(false);
        return;
      }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.error ?? 'Could not delete account.');
        setDeleting(false);
        return;
      }
      await signOut();
    } catch {
      setDeleteError('Something went wrong. Please try again.');
      setDeleting(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Your account details and preferences.
        </p>
      </div>

      {nameSuccess && (
        <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Your name has been updated.</span>
        </div>
      )}

      {/* Profile info */}
      <div className="card divide-y divide-neutral-200 dark:divide-neutral-800">
        {/* Name row */}
        <div className="flex items-center gap-4 px-5 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Name</p>
            {editingName ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setNameError(null);
                  }}
                  placeholder="Enter your name"
                  className="input flex-1"
                  disabled={savingName}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                  aria-label="Save name"
                >
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={savingName}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                  aria-label="Cancel edit"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-0.5 flex items-center gap-2">
                <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                  {fullName || 'Not set yet'}
                </p>
                <button
                  onClick={() => {
                    setNameInput(fullName);
                    setEditingName(true);
                    setNameError(null);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  aria-label="Edit name"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {nameError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{nameError}</p>
            )}
          </div>
        </div>

        {/* Email row */}
        <div className="flex items-center gap-4 px-5 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <Mail className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Email</p>
            <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{email}</p>
          </div>
        </div>

        {/* Role row */}
        <div className="flex items-center gap-4 px-5 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <Shield className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Role</p>
            <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">Organizer</p>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Account Information</h2>
        <div className="card divide-y divide-neutral-200 dark:divide-neutral-800">
          <div className="flex items-center gap-4 px-5 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <KeyRound className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Login Method</p>
              <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{loginMethod}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-5 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Member Since</p>
              <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{formatDate(createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Actions</h2>
        <div className="card divide-y divide-neutral-200 dark:divide-neutral-800">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <LogOut className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Sign Out</p>
              <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                Sign out of your account on this device.
              </p>
            </div>
          </button>

          <button
            onClick={() => setDeleteOpen(true)}
            className="flex w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete Account</p>
              <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                Permanently delete your account and all associated Chitty data.
              </p>
            </div>
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{deleteError}</span>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete account?"
        message="This will permanently delete your account and all your Chitties, members, payments, draws, and payouts. This action cannot be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete permanently'}
        destructive
        onConfirm={handleDeleteAccount}
        onCancel={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setDeleteError(null);
          }
        }}
      />
    </div>
  );
}
