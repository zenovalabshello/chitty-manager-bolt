import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Link2,
  Unlink,
  Loader2,
  Phone,
  Briefcase,
  MapPin,
  User as UserIcon,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { Chitty } from '@/lib/chitties';
import { syncChittyStatus } from '@/lib/chitties';
import type { Member, MemberPair, PairWithMembers } from '@/lib/members';
import { supabase } from '@/lib/supabase';
import { recordActivity } from '@/lib/activities';
import MemberFormModal from '@/components/MemberFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { formatCurrency } from '@/components/ChittyCard';

interface ChittyMembersTabProps {
  chitty: Chitty;
  onMembersChanged?: () => void;
}

export default function ChittyMembersTab({ chitty, onMembersChanged }: ChittyMembersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [pairs, setPairs] = useState<PairWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [pairingMode, setPairingMode] = useState(false);
  const [selectedForPair, setSelectedForPair] = useState<string[]>([]);
  const [pairError, setPairError] = useState<string | null>(null);
  const [unpairTarget, setUnpairTarget] = useState<PairWithMembers | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [membersRes, pairsRes] = await Promise.all([
      supabase.from('members').select('*').eq('chitty_id', chitty.id).order('created_at', { ascending: true }),
      supabase.from('member_pairs').select('*').eq('chitty_id', chitty.id),
    ]);

    if (membersRes.error || pairsRes.error) {
      setError('Could not load members.');
      setLoading(false);
      return;
    }

    const memberList = (membersRes.data as Member[]) ?? [];
    const pairList = (pairsRes.data as MemberPair[]) ?? [];
    const pairsWithMembers: PairWithMembers[] = pairList.map((pair) => {
      const member1 = memberList.find((m) => m.id === pair.member1_id)!;
      const member2 = memberList.find((m) => m.id === pair.member2_id)!;
      return { pair, member1, member2 };
    });

    setMembers(memberList);
    setPairs(pairsWithMembers);
    setLoading(false);
    onMembersChanged?.();
  }, [chitty.id, onMembersChanged]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fullMembers = members.filter((m) => m.membership_type === 'full');
  const halfMembers = members.filter((m) => m.membership_type === 'half');
  const pairedIds = new Set<string>();
  pairs.forEach((p) => {
    pairedIds.add(p.pair.member1_id);
    pairedIds.add(p.pair.member2_id);
  });
  const unpairedHalfMembers = halfMembers.filter((m) => !pairedIds.has(m.id));
  const drawUnits = fullMembers.length + pairs.length;

  const handleAdd = () => {
    setEditingMember(null);
    setFormOpen(true);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormOpen(true);
  };

  const handleFormSaved = () => {
    setFormOpen(false);
    setEditingMember(null);
    syncChittyStatus(chitty.id).then(() => loadData());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('members').delete().eq('id', deleteTarget.id);
    if (error) {
      setError('Could not remove the member. Please try again.');
      return;
    }
    await recordActivity(chitty.id, 'member_removed', `Member "${deleteTarget.name}" was removed.`, { member_name: deleteTarget.name });
    await syncChittyStatus(chitty.id);
    setDeleteTarget(null);
    loadData();
  };

  const toggleSelectForPair = (memberId: string) => {
    setPairError(null);
    setSelectedForPair((prev) => {
      if (prev.includes(memberId)) return prev.filter((id) => id !== memberId);
      if (prev.length >= 2) return [prev[1], memberId];
      return [...prev, memberId];
    });
  };

  const handleCreatePair = async () => {
    if (selectedForPair.length !== 2) {
      setPairError('Select exactly two half members to create a pair.');
      return;
    }

    const [id1, id2] = selectedForPair;
    const m1 = members.find((m) => m.id === id1);
    const m2 = members.find((m) => m.id === id2);
    if (!m1 || !m2) return;

    if (m1.membership_type !== 'half' || m2.membership_type !== 'half') {
      setPairError('Only half members can be paired.');
      return;
    }

    if (pairedIds.has(id1) || pairedIds.has(id2)) {
      setPairError('One of these members is already paired.');
      return;
    }

    const { error } = await supabase.from('member_pairs').insert({
      chitty_id: chitty.id,
      member1_id: id1,
      member2_id: id2,
    });

    if (error) {
      setPairError(error.message || 'Could not create the pair.');
      return;
    }

    await recordActivity(chitty.id, 'members_paired', `Half members "${m1.name}" and "${m2.name}" were paired.`, { member1_name: m1.name, member2_name: m2.name });
    setSelectedForPair([]);
    setPairingMode(false);
    setPairError(null);
    loadData();
  };

  const handleUnpair = async () => {
    if (!unpairTarget) return;
    const { error } = await supabase.from('member_pairs').delete().eq('id', unpairTarget.pair.id);
    if (error) {
      setError('Could not unpair the members. Please try again.');
      return;
    }
    await recordActivity(chitty.id, 'members_unpaired', `Half members "${unpairTarget.member1.name}" and "${unpairTarget.member2.name}" were unpaired.`, { member1_name: unpairTarget.member1.name, member2_name: unpairTarget.member2.name });
    setUnpairTarget(null);
    loadData();
  };

  const cancelPairing = () => {
    setPairingMode(false);
    setSelectedForPair([]);
    setPairError(null);
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-2 px-6 py-16 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading members…
      </div>
    );
  }

  if (error && members.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button onClick={loadData} className="btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total" value={members.length} />
        <SummaryCard label="Full" value={fullMembers.length} />
        <SummaryCard label="Half" value={halfMembers.length} />
        <SummaryCard label="Draw units" value={drawUnits} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={handleAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add member
          </button>
          {halfMembers.length >= 2 && !pairingMode && (
            <button onClick={() => setPairingMode(true)} className="btn-secondary">
              <Link2 className="h-4 w-4" />
              Pair half members
            </button>
          )}
        </div>
        {pairingMode && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {selectedForPair.length}/2 selected
            </span>
            <button
              onClick={handleCreatePair}
              disabled={selectedForPair.length !== 2}
              className="btn-primary disabled:opacity-40"
            >
              <Link2 className="h-4 w-4" />
              Create pair
            </button>
            <button onClick={cancelPairing} className="btn-secondary">
              Cancel
            </button>
          </div>
        )}
      </div>

      {pairError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {pairError}
        </p>
      )}

      {pairingMode && unpairedHalfMembers.length < 2 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          You need at least two unpaired half members to create a pair.
        </p>
      )}

      {/* Pairs section */}
      {pairs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            Half-member pairs ({pairs.length})
          </h3>
          {pairs.map((p) => (
            <div key={p.pair.id} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold">Pair — 1 draw unit</span>
                </div>
                <button
                  onClick={() => setUnpairTarget(p)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-red-400"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Unpair
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <PairMemberCard member={p.member1} installment={chitty.installment_amount / 2} />
                <PairMemberCard member={p.member2} installment={chitty.installment_amount / 2} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unpaired half members (selectable during pairing mode) */}
      {unpairedHalfMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            Unpaired half members ({unpairedHalfMembers.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {unpairedHalfMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                installment={chitty.installment_amount / 2}
                selectable={pairingMode}
                selected={selectedForPair.includes(member.id)}
                onSelect={() => toggleSelectForPair(member.id)}
                onEdit={() => handleEdit(member)}
                onDelete={() => setDeleteTarget(member)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Full members */}
      {fullMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            Full members ({fullMembers.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fullMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                installment={chitty.installment_amount}
                selectable={false}
                selected={false}
                onSelect={() => {}}
                onEdit={() => handleEdit(member)}
                onDelete={() => setDeleteTarget(member)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {members.length === 0 && (
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <Users className="h-7 w-7" />
          </div>
          <div className="max-w-sm space-y-1.5">
            <h2 className="text-lg font-semibold">No members yet</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Add members to this Chitty. You can add Full or Half members, and pair two Half members
              to form a single draw unit.
            </p>
          </div>
          <button onClick={handleAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add first member
          </button>
        </div>
      )}

      <MemberFormModal
        open={formOpen}
        chittyId={chitty.id}
        member={editingMember}
        onClose={() => {
          setFormOpen(false);
          setEditingMember(null);
        }}
        onSaved={handleFormSaved}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove member?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed from this Chitty. This cannot be undone.`
            : ''
        }
        confirmLabel="Remove"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!unpairTarget}
        title="Unpair members?"
        message={
          unpairTarget
            ? `"${unpairTarget.member1.name}" and "${unpairTarget.member2.name}" will be unpaired. Neither member will be deleted.`
            : ''
        }
        confirmLabel="Unpair"
        onConfirm={handleUnpair}
        onCancel={() => setUnpairTarget(null)}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-0.5 text-xl font-bold">{value}</p>
    </div>
  );
}

function PairMemberCard({ member, installment }: { member: Member; installment: number }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/m/${member.share_token}`;
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/50">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-500 shadow-soft dark:bg-neutral-900 dark:text-neutral-400">
          <UserIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{member.name}</p>
          <p className="text-xs text-neutral-400">{formatCurrency(installment)} / installment</p>
        </div>
        <button
          onClick={handleCopy}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
          aria-label="Copy personal link"
          title="Copy personal link"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

interface MemberCardProps {
  member: Member;
  installment: number;
  selectable: boolean;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function MemberCard({ member, installment, selectable, selected, onSelect, onEdit, onDelete }: MemberCardProps) {
  const isHalf = member.membership_type === 'half';
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/m/${member.share_token}`;
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div
      className={`card p-4 transition-all ${
        selected ? 'ring-2 ring-brand-500' : ''
      } ${selectable ? 'cursor-pointer hover:shadow-soft-lg' : ''}`}
      onClick={selectable ? onSelect : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {selectable && (
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                selected
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-neutral-300 dark:border-neutral-600'
              }`}
            >
              {selected && (
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{member.name}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isHalf
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                }`}
              >
                {isHalf ? 'Half' : 'Full'}
              </span>
              <span className="text-xs text-neutral-400">{formatCurrency(installment)} / installment</span>
            </div>
          </div>
        </div>
        {!selectable && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyLink}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-600 dark:hover:bg-neutral-800 dark:hover:text-brand-400"
              aria-label="Copy personal link"
              title="Copy personal link"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800 dark:hover:text-red-400"
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
        {member.place && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span>{member.place}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          <span>{member.contact1}</span>
          {member.contact2 && <span className="text-neutral-400">· {member.contact2}</span>}
        </div>
        {member.job && (
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span>{member.job}</span>
          </div>
        )}
        {member.id_proof_type && (
          <div className="flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span>
              {member.id_proof_type}
              {member.id_number ? ` · ${member.id_number}` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
