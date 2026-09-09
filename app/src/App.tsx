import { useEffect, useRef } from 'react';
import { DockviewReact, type DockviewReadyEvent, type DockviewApi, type IDockviewPanelProps, themeAbyss } from 'dockview';
import 'dockview/dist/styles/dockview.css';
import { useStore, setState, getState } from './state/store';
import { SetPanel } from './panels/SetPanel';
import { TablePanel } from './panels/TablePanel';
import { GraphPanel } from './panels/GraphPanel';
import { FactsPanel } from './panels/FactsPanel';
import { LatticePanel } from './panels/LatticePanel';
import { TriadPanel } from './panels/TriadPanel';
import { ZeroDivisorPanel } from './panels/ZeroDivisorPanel';
import { CensusPanel } from './panels/CensusPanel';
import { ConsolePanel } from './panels/ConsolePanel';
import { TourPanel } from './panels/TourPanel';
import { CanvasPanel } from './panels/CanvasPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import { getAlgebra } from './algebra';

const components: Record<string, React.FunctionComponent<IDockviewPanelProps>> = {
  set: SetPanel, canvas: CanvasPanel, inspector: InspectorPanel, table: TablePanel, graph: GraphPanel, facts: FactsPanel, lattice: LatticePanel, triads: TriadPanel, zd: ZeroDivisorPanel, census: CensusPanel, console: ConsolePanel, tours: TourPanel,
};
const TITLES: Record<string, string> = { set: 'Set', canvas: 'Canvas', inspector: 'Inspector', table: 'Multiplication table', graph: 'Structure graph', facts: 'Facts', lattice: 'Subalgebra lattice', triads: 'Triad explorer', zd: 'Zero divisors', census: 'Census', console: 'Console', tours: 'Tours' };

export function App() {
  const api = useRef<DockviewApi | null>(null);
  const preset = useStore((s) => s.preset);
  const notation = useStore((s) => s.notation);
  const focus = useStore((s) => s.focusPanel);
  const tick = useStore((s) => s.focusTick);
  useEffect(() => { if (focus && api.current) api.current.getPanel(focus)?.api.setActive(); }, [focus, tick]);
  useEffect(() => { (window as unknown as { __havClear?: () => void }).__havClear = () => setState({ log: [] }); }, []);
  const onReady = (e: DockviewReadyEvent) => {
    api.current = e.api;
    const add = (id: string, position?: { referencePanel: string; direction: 'left' | 'right' | 'above' | 'below' | 'within' }) => e.api.addPanel({ id, component: id, title: TITLES[id], position });
    add('canvas');
    add('table', { referencePanel: 'canvas', direction: 'within' });
    add('set', { referencePanel: 'canvas', direction: 'left' });
    add('lattice', { referencePanel: 'set', direction: 'within' });
    add('tours', { referencePanel: 'set', direction: 'below' });
    add('facts', { referencePanel: 'canvas', direction: 'right' });
    add('inspector', { referencePanel: 'facts', direction: 'within' });
    add('census', { referencePanel: 'facts', direction: 'within' });
    add('triads', { referencePanel: 'canvas', direction: 'below' });
    add('zd', { referencePanel: 'triads', direction: 'within' });
    add('graph', { referencePanel: 'triads', direction: 'within' });
    add('console', { referencePanel: 'triads', direction: 'within' });
    e.api.getPanel('set')?.api.setActive();
    e.api.getPanel('facts')?.api.setActive();
    e.api.getPanel('triads')?.api.setActive();
    e.api.getPanel('canvas')?.api.setActive();
    setTimeout(() => { e.api.getPanel('triads')?.api.setSize({ height: 300 }); e.api.getPanel('set')?.api.setSize({ width: 470 }); e.api.getPanel('facts')?.api.setSize({ width: 470 }); }, 0);
  };
  const A = getAlgebra(preset);
  return (
    <div className="app">
      <div className="topbar">
        <span className="title">Hypercomplex Algebra Viewer</span>
        <span className="muted">algebra:</span><b>{A.name}</b><span className="muted">dim {A.n}</span>
        <span className="muted">notation</span>
        <button className={notation === 'graded' ? 'active' : ''} onClick={() => setState({ notation: 'graded' })}>graded o₁₂</button>
        <button className={notation === 'bit' ? 'active' : ''} onClick={() => setState({ notation: 'bit' })}>bitmask e₃</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => { const s = getState(); setState({ selection: {} }); void s; }}>clear selection</button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DockviewReact components={components} onReady={onReady} theme={themeAbyss} />
      </div>
    </div>
  );
}
