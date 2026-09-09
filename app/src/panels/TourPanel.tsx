import { useState } from 'react';
import { TOURS } from '../tours';
import { setState, select, focusPanel } from '../state/store';
import { getAlgebra } from '../algebra';

export function TourPanel() {
  const [tourIdx, setTourIdx] = useState(0);
  const [step, setStep] = useState(0);
  const tour = TOURS[tourIdx];
  const apply = (i: number) => {
    const s = tour.steps[i];
    setStep(i);
    if (s.preset) { getAlgebra(s.preset); setState({ preset: s.preset }); }
    setState({ overlay: s.overlay ?? 'none' });
    if (s.gridD) setState({ gridD: s.gridD });
    if (s.frame) setState({ frame: s.frame });
    if (s.observable) setState({ observable: s.observable });
    if (s.grid) setState({ grid: s.grid });
    select(s.select ?? {});
    if (s.panel) focusPanel(s.panel);
  };
  return (
    <div className="panel">
      <div className="row">
        <select className="tour-select" value={tourIdx} onChange={(e) => { setTourIdx(Number(e.target.value)); setStep(0); }}>{TOURS.map((t, i) => <option key={t.id} value={i}>Tour {t.id}: {t.title}</option>)}</select>
        <button onClick={() => apply(0)}>start</button>
      </div>
      <div className="tour-caption">
        <div className="muted">step {step + 1} of {tour.steps.length}</div>
        <div>{tour.steps[step].caption}</div>
      </div>
      <div className="row">
        <button disabled={step === 0} onClick={() => apply(step - 1)}>‹ previous</button>
        <button onClick={() => apply(step)}>apply this step</button>
        <button disabled={step >= tour.steps.length - 1} onClick={() => apply(step + 1)}>next ›</button>
      </div>
      <ol>{tour.steps.map((s, i) => <li key={i} className={i === step ? '' : 'muted'} style={{ cursor: 'pointer' }} onClick={() => apply(i)}>{s.caption.slice(0, 90)}{s.caption.length > 90 ? '…' : ''}</li>)}</ol>
    </div>
  );
}
