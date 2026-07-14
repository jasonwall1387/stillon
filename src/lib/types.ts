export type Vote = 'on' | 'bail';
export type Status = 'open' | 'cancelled' | 'stands' | 'expired';
export type Role = 'creator' | 'invitee';
export interface CheckRow {
  id: string; title: string; event_at: string | null; created_at: string;
  expires_at: string; status: Status; resolved_at: string | null;
  creator_hash: string; invitee_hash: string; og_id: string;
  creator_vote: Vote; creator_voted_at: string;
  invitee_vote: Vote | null; invitee_voted_at: string | null;
  notify_email: string | null; notified_at: string | null;
  title_purged: boolean; ip_hash: string;
}
export type ViewState =
  | { kind: 'creator-open'; id: string; title: string; eventAt: string | null; myVote: Vote; expiresAt: string }
  | { kind: 'invitee-open'; id: string; title: string; eventAt: string | null }
  | { kind: 'resolved-cancelled'; id: string; title: string; ogId: string }
  | { kind: 'resolved-stands'; id: string; title: string }
  | { kind: 'expired'; id: string; title: string };
