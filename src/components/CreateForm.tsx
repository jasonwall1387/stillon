import { useState } from 'react';
import { COPY } from '../lib/copy';
import type { Vote } from '../lib/types';

type Created = { id: string; creatorUrl: string; shareUrl: string };

export default function CreateForm() {
  const [title, setTitle] = useState('');
  const [eventAt, setEventAt] = useState('');
  const [vote, setVote] = useState<Vote | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit() {
    if (!title.trim() || !vote) { setError('Give the plan a name and pick your answer.'); return; }
    setBusy(true); setError('');
    const res = await fetch('/api/checks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, creatorVote: vote,
        eventAt: eventAt ? new Date(eventAt).toISOString() : undefined,
        notifyEmail: email || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
    document.cookie = `so_own_${data.id}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    setCreated(data);
  }

  async function share() {
    if (!created) return;
    navigator.sendBeacon?.('/api/events', JSON.stringify({ kind: 'share_clicked', checkId: created.id }));
    const text = COPY.shareText(title, created.shareUrl);
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch { /* fall through */ }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  if (created) {
    return (
      <div className="card">
        <h2>{COPY.shareHeading}</h2>
        <p className="note">{COPY.shareBody}</p>
        <div className="share-url">{created.shareUrl}</div>
        <button className="btn-primary" onClick={share}>
          {copied ? COPY.copied : COPY.shareButton}
        </button>
        <p className="note">
          Your private status page (bookmark it): <a href={created.creatorUrl}>{created.creatorUrl}</a>
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <label>{COPY.titleLabel}</label>
      <input value={title} maxLength={80} placeholder={COPY.titlePlaceholder}
        onChange={(e) => setTitle(e.target.value)} />
      <label>{COPY.whenLabel}</label>
      <input type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} />
      <label>{COPY.voteQuestion}</label>
      <div className="vote-row">
        <button className={`vote-btn ${vote === 'on' ? 'selected' : ''}`} onClick={() => setVote('on')}>{COPY.voteOn}</button>
        <button className={`vote-btn ${vote === 'bail' ? 'selected' : ''}`} onClick={() => setVote('bail')}>{COPY.voteBail}</button>
      </div>
      <p className="note">{COPY.votePrivacyNote}</p>
      <label>{COPY.emailLabel}</label>
      <input type="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
      {error && <p className="note" style={{ color: '#e53170' }}>{error}</p>}
      <button className="btn-primary" disabled={busy} onClick={submit}>{COPY.createCta}</button>
    </div>
  );
}
