import type { ViewState } from '../lib/types';
import { COPY } from '../lib/copy';
import Fireworks from './Fireworks';

export default function ResultView({ view }: { view: ViewState }) {
  if (view.kind === 'resolved-cancelled') {
    return (
      <div className="card result center">
        <Fireworks />
        <h2>{COPY.cancelledHeading}</h2>
        <p>{COPY.cancelledBody(view.title)}</p>
        <a href="/"><button className="btn-primary">{COPY.startAnother}</button></a>
      </div>
    );
  }
  if (view.kind === 'resolved-stands') {
    return (
      <div className="card result center">
        <h2>{COPY.standsHeading}</h2>
        <p>{COPY.standsBody}</p>
        <a href="/"><button className="btn-primary">{COPY.startAnother}</button></a>
      </div>
    );
  }
  return (
    <div className="card result center">
      <h2>{COPY.expiredHeading}</h2>
      <p>{COPY.expiredBody}</p>
      <a href="/"><button className="btn-primary">{COPY.startAnother}</button></a>
    </div>
  );
}
