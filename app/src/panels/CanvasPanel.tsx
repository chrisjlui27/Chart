import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBSERVABLES, buildFrame, type SampleResult, type FrameSpec, type ObservableSpec } from '@hav/core';
import { useStore, setState } from '../state/store';
import { useEngine } from '../engine/client';
import { getAlgebra, labelsFor } from '../algebra';

function colormap(t: number): [number, number, number] {
  // simple perceptual ramp: deep blue -> teal -> yellow
  const c = Math.max(0, Math.min(1, t));
  const stops: [number, number, number][] = [[0.27, 0.0, 0.33], [0.23, 0.32, 0.55], [0.13, 0.57, 0.55], [0.37, 0.79, 0.38], [0.99, 0.91, 0.14]];
  const k = c * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(k)), f = k - i;
  return [0, 1, 2].map((j) => stops[i][j] * (1 - f) + stops[i + 1][j] * f) as [number, number, number];
}
function textSprite(text: string, color: string): THREE.Sprite {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 40;
  const ctx = cv.getContext('2d')!; ctx.font = '22px ui-monospace, Menlo, monospace'; ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text, 4, 20);
  const tex = new THREE.CanvasTexture(cv); const m = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sp = new THREE.Sprite(m); sp.scale.set(0.64, 0.2, 1); return sp;
}

export function CanvasPanel() {
  const preset = useStore((s) => s.preset);
  const notation = useStore((s) => s.notation);
  const frame = useStore((s) => s.frame);
  const observable = useStore((s) => s.observable);
  const grid = useStore((s) => s.grid);
  const canvasOpts = useStore((s) => s.canvas);
  const [draft, setDraft] = useState<{ frame: FrameSpec; observable: ObservableSpec }>({ frame, observable });
  useEffect(() => setDraft({ frame, observable }), [frame, observable]);
  const A = getAlgebra(preset);
  const labels = labelsFor(A, notation);
  const sample = useEngine<SampleResult>('sample', [preset, frame, observable, grid]);
  const host = useRef<HTMLDivElement>(null);
  const three = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; group: THREE.Group; raycaster: THREE.Raycaster; points?: THREE.Points } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x14171c);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    camera.position.set(2.6, 2.0, 3.2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const group = new THREE.Group(); scene.add(group);
    const raycaster = new THREE.Raycaster(); raycaster.params.Points = { threshold: 0.05 };
    three.current = { renderer, scene, camera, controls, group, raycaster };
    const resize = () => { const w = el.clientWidth || 600, h = el.clientHeight || 400; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let raf = 0; const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); }; loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); three.current = null; };
  }, []);

  useEffect(() => {
    const t = three.current; if (!t) return;
    t.group.clear(); t.points = undefined;
    if (!sample.data) return;
    const d = sample.data;
    const R = grid.range;
    // axes with labels
    const axisColors = [0xe05c5c, 0x7ccf5f, 0x5fa8e0];
    const axes = frame.axes.filter((s) => s.trim());
    axes.forEach((name, i) => {
      const dir = new THREE.Vector3(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0);
      const g = new THREE.BufferGeometry().setFromPoints([dir.clone().multiplyScalar(-R * 1.15), dir.clone().multiplyScalar(R * 1.15)]);
      t.group.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: axisColors[i], transparent: true, opacity: 0.6 })));
      const sp = textSprite(name + (frame.tilt && frame.tilt.axis === i && frame.tilt.angle ? ` ⟲${(frame.tilt.angle * 180 / Math.PI).toFixed(0)}°` : ''), '#' + axisColors[i].toString(16).padStart(6, '0'));
      sp.position.copy(dir.multiplyScalar(R * 1.3)); t.group.add(sp);
    });
    const n = d.count;
    if (d.value) {
      const [lo, hi] = d.range; const span = hi - lo || 1;
      const colors = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const c = colormap((d.value[i] - lo) / span); colors[3 * i] = c[0]; colors[3 * i + 1] = c[1]; colors[3 * i + 2] = c[2]; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: (2 * R) / Math.max(4, Math.cbrt(n)) * 0.4, vertexColors: true, sizeAttenuation: true }));
      t.group.add(pts); t.points = pts;
      if (d.kind === 'zd' || d.kind === 'ann') {
        const dead: number[] = [];
        for (let i = 0; i < n; i++) if (d.kind === 'zd' ? d.value[i] < canvasOpts.deadThreshold : d.value[i] > 0) dead.push(d.pos[3 * i], d.pos[3 * i + 1], d.pos[3 * i + 2]);
        if (dead.length) { const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dead, 3)); t.group.add(new THREE.Points(dg, new THREE.PointsMaterial({ size: (2 * R) / Math.max(4, Math.cbrt(n)) * 0.9, color: 0xf2d06d, sizeAttenuation: true }))); }
      }
    } else if (d.img && d.leak) {
      const res = Math.round(d.dim === 3 ? Math.cbrt(n) : d.dim === 2 ? Math.sqrt(n) : n);
      const stride = d.dim === 3 ? [res * res, res, 1] : d.dim === 2 ? [res, 1] : [1];
      const segs: number[] = [], cols: number[] = [], gsegs: number[] = [];
      const hi = d.range[1] || 1;
      const idx3 = (i: number) => d.dim === 3 ? [Math.floor(i / (res * res)), Math.floor(i / res) % res, i % res] : d.dim === 2 ? [Math.floor(i / res), i % res] : [i];
      for (let i = 0; i < n; i++) {
        const ix = idx3(i);
        for (let a = 0; a < stride.length; a++) {
          if (ix[a] >= res - 1) continue;
          const j = i + stride[a];
          segs.push(d.img[3 * i], d.img[3 * i + 1], d.img[3 * i + 2], d.img[3 * j], d.img[3 * j + 1], d.img[3 * j + 2]);
          for (const k of [i, j]) { const c = colormap(d.leak[k] / hi); cols.push(c[0], c[1], c[2]); }
          gsegs.push(d.pos[3 * i], d.pos[3 * i + 1], d.pos[3 * i + 2], d.pos[3 * j], d.pos[3 * j + 1], d.pos[3 * j + 2]);
        }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      t.group.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true })));
      if (canvasOpts.showGrid) { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gsegs, 3)); t.group.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0x3a3f48, transparent: true, opacity: 0.5 }))); }
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
      const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.03, color: 0x8b93a1 })); t.group.add(pts); t.points = pts;
    }
    if (d.curves) {
      const { pos, starts, real } = d.curves;
      const segs: number[] = [], cols: number[] = [];
      const total = pos.length / 3;
      for (let c = 0; c < starts.length; c++) {
        const s = starts[c], e = c + 1 < starts.length ? starts[c + 1] : total;
        for (let i = s; i < e - 1; i++) { segs.push(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2], pos[3 * i + 3], pos[3 * i + 4], pos[3 * i + 5]); for (const k of [i, i + 1]) { const cc = colormap(0.5 + 0.25 * Math.tanh(real[k])); cols.push(cc[0], cc[1], cc[2]); } }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      t.group.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true })));
    }
  }, [sample.data, frame, grid.range, canvasOpts]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const t = three.current; if (!t || !t.points || !sample.data) return;
    const r = t.renderer.domElement.getBoundingClientRect();
    const m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    t.raycaster.setFromCamera(m, t.camera);
    const hits = t.raycaster.intersectObject(t.points);
    if (!hits.length || hits[0].index === undefined) return;
    const i = hits[0].index; const d = sample.data;
    try {
      const fr = buildFrame(A, frame);
      const x = Float64Array.from(fr.origin);
      fr.f.forEach((u, k) => { const tk = d.pos[3 * i + k]; for (let q = 0; q < A.n; q++) x[q] += tk * u[q]; });
      setState({ inspect: Array.from(x), focusPanel: 'inspector', focusTick: Date.now() });
    } catch (err) { setError((err as Error).message); }
  };
  const meta = OBSERVABLES.find((o) => o.kind === draft.observable.kind)!;
  const apply = () => { try { buildFrame(A, draft.frame); setError(''); setState({ frame: draft.frame, observable: draft.observable }); } catch (err) { setError((err as Error).message); } };
  const setAxis = (i: number, v: string) => setDraft((s) => { const axes = [...s.frame.axes]; while (axes.length < 3) axes.push(''); axes[i] = v; return { ...s, frame: { ...s.frame, axes } }; });
  const tilt = draft.frame.tilt ?? { axis: 2, target: '', angle: 0 };
  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 6 }}>
      <div className="row">
        <label>observable <select value={draft.observable.kind} onChange={(e) => setDraft((s) => ({ ...s, observable: { ...s.observable, kind: e.target.value as ObservableSpec['kind'] } }))}>{OBSERVABLES.map((o) => <option key={o.kind} value={o.kind}>{o.label}</option>)}</select></label>
        {meta.needs.includes('u') && <label>u <input className="mono" style={{ width: 90 }} value={draft.observable.u ?? ''} onChange={(e) => setDraft((s) => ({ ...s, observable: { ...s.observable, u: e.target.value } }))} /></label>}
        {meta.needs.includes('v') && <label>v <input className="mono" style={{ width: 90 }} value={draft.observable.v ?? ''} onChange={(e) => setDraft((s) => ({ ...s, observable: { ...s.observable, v: e.target.value } }))} /></label>}
        <label>res <input type="number" min={2} max={24} style={{ width: 52 }} value={grid.res} onChange={(e) => setState({ grid: { ...grid, res: Number(e.target.value) } })} /></label>
        <label>range <input type="number" step={0.1} min={0.2} max={5} style={{ width: 56 }} value={grid.range} onChange={(e) => setState({ grid: { ...grid, range: Number(e.target.value) } })} /></label>
        <button className={canvasOpts.showGrid ? 'active' : ''} onClick={() => setState({ canvas: { ...canvasOpts, showGrid: !canvasOpts.showGrid } })}>grid</button>
        {draft.observable.kind === 'zd' && <label>dead below <input type="number" step={0.01} min={0} max={1} style={{ width: 60 }} value={canvasOpts.deadThreshold} onChange={(e) => setState({ canvas: { ...canvasOpts, deadThreshold: Number(e.target.value) } })} /></label>}
        <button onClick={() => { const t = three.current; if (t) { t.camera.position.set(2.6 * grid.range, 2.0 * grid.range, 3.2 * grid.range); t.controls.target.set(0, 0, 0); } }}>reset view</button>
      </div>
      <div className="row">
        <span className="muted">axes</span>
        {[0, 1, 2].map((i) => <input key={i} className="mono" style={{ width: 80, borderColor: ['#e05c5c', '#7ccf5f', '#5fa8e0'][i] }} placeholder={i === 2 ? '(2-D if empty)' : ''} value={draft.frame.axes[i] ?? ''} onChange={(e) => setAxis(i, e.target.value)} />)}
        <span className="muted">origin</span><input className="mono" style={{ width: 60 }} value={draft.frame.origin ?? '0'} onChange={(e) => setDraft((s) => ({ ...s, frame: { ...s.frame, origin: e.target.value } }))} />
        <span className="muted">tilt axis</span><select value={tilt.axis} onChange={(e) => setDraft((s) => ({ ...s, frame: { ...s.frame, tilt: { ...tilt, axis: Number(e.target.value) } } }))}>{[0, 1, 2].map((i) => <option key={i} value={i}>{i + 1}</option>)}</select>
        <span className="muted">toward</span><input className="mono" style={{ width: 70 }} value={tilt.target} onChange={(e) => setDraft((s) => ({ ...s, frame: { ...s.frame, tilt: { ...tilt, target: e.target.value } } }))} />
        <input type="range" min={0} max={Math.PI / 2} step={0.02} value={tilt.angle} onChange={(e) => { const nt = { ...tilt, angle: Number(e.target.value) }; setDraft((s) => ({ ...s, frame: { ...s.frame, tilt: nt } })); setState({ frame: { ...draft.frame, tilt: nt } }); }} />
        <span className="mono">{(tilt.angle * 180 / Math.PI).toFixed(0)}°</span>
        <button onClick={apply}>apply</button>
      </div>
      <div className="row">
        {sample.data && <span>leakage Λ(slice) = <b className={sample.data.frame.leakage < 1e-9 ? 'ok' : 'no'}>{sample.data.frame.leakage.toExponential(2)}</b>{Number.isFinite(sample.data.frame.leakageWithUnit) && <span className="muted"> · with 1: {sample.data.frame.leakageWithUnit.toExponential(2)}</span>}</span>}
        {sample.data?.value && <span className="row"><span className="mono">{sample.data.range[0].toFixed(3)}</span><span style={{ display: 'inline-block', width: 120, height: 10, borderRadius: 3, background: 'linear-gradient(90deg, #440154, #3b5289, #218c8d, #5fc961, #fde724)' }} /><span className="mono">{sample.data.range[1].toFixed(3)}</span>{sample.data.kind === 'zd' && <span className="muted">· <span style={{ color: '#f2d06d' }}>●</span> dead set (below {canvasOpts.deadThreshold})</span>}{sample.data.kind === 'ann' && <span className="muted">· <span style={{ color: '#f2d06d' }}>●</span> zero divisors</span>}</span>}
        {sample.loading && <span className="muted">sampling…</span>}
        {(sample.error || error) && <span className="no">{sample.error || error}</span>}
        <span className="muted">{meta.description} · click a point to inspect · labels: {labels.slice(0, 4).join(' ')} …</span>
      </div>
      <div ref={host} style={{ flex: 1, minHeight: 320, position: 'relative' }} onClick={onClick} />
    </div>
  );
}
