import { useEffect, useState } from 'react';
import { COPY } from '../lib/copy';
import type { ViewState, Vote } from '../lib/types';
import ResultView from './ResultView';

export default function VoteButtons({ slug, view }: { slug: string; view: ViewState }) {
  const [state, setState] = useState<ViewState>(view);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.kind === 'invitee-open') {
      navigator.sendBeacon?.('/api/events', JSON.stringify({ kind: 'invitee_viewed', checkId: state.id }));
    }
  }, []);

  async function vote(v: Vote) {
    setBusy(true);
    const res = await fetch('/api/vote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, vote: v }),
    });
    if (res.ok) setState(await res.json());
    setBusy(false);
  }

  if (state.kind !== 'invitee-open') return <ResultView view={state} />;

  return (
    <div className="card center">
      <h2>{COPY.inviteeQuestion(state.title)}</h2>
      {state.eventAt && <p className="note">{new Date(state.eventAt).toLocaleString()}</p>}
      <div className="vote-row">
        <button type="button" data-testid="vote-on" className="vote-btn" disabled={busy} onClick={() => vote('on')}>{COPY.voteOn}</button>
        <button type="button" data-testid="vote-bail" className="vote-btn" disabled={busy} onClick={() => vote('bail')}>{COPY.voteBail}</button>
      </div>
      <p className="note">{COPY.votePrivacyNote}</p>
    </div>
  );
}
