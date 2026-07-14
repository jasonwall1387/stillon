import { useEffect, useState } from 'react';
import { COPY } from '../lib/copy';
import type { ViewState, Vote } from '../lib/types';
import ResultView from './ResultView';

export default function CreatorPanel({ slug, view }: { slug: string; view: ViewState }) {
  const [state, setState] = useState<ViewState>(view);

  useEffect(() => {
    if (state.kind !== 'creator-open') return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/state/${slug}`);
      if (res.ok) {
        const next: ViewState = await res.json();
        setState(next);
        if (next.kind !== 'creator-open') clearInterval(t);
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [state.kind, slug]);

  async function flip(v: Vote) {
    const res = await fetch('/api/vote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, vote: v }),
    });
    if (res.ok) setState(await res.json());
  }

  if (state.kind !== 'creator-open') return <ResultView view={state} />;

  return (
    <div className="card center">
      <h2>{COPY.creatorStatusHeading}</h2>
      <p className="note">{COPY.creatorStatusBody}</p>
      <p className="note">"{state.title}"</p>
      <div className="vote-row">
        <button className={`vote-btn ${state.myVote === 'on' ? 'selected' : ''}`} onClick={() => flip('on')}>{COPY.voteOn}</button>
        <button className={`vote-btn ${state.myVote === 'bail' ? 'selected' : ''}`} onClick={() => flip('bail')}>{COPY.voteBail}</button>
      </div>
      <p className="note">{COPY.changeVote}</p>
    </div>
  );
}
