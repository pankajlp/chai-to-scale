/* Sim engine: dots are requests that travel between nodes, wait in queues and get served. */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LIVE = new Set();
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

class Sim {
  constructor(cfg, host) {
    this.cfg = cfg; this.host = host || null;
    this.t = 0; this.acc = 0; this.ps = []; this.log = []; this.rate = cfg.rate ?? 1;
    this.bgDone = 0; this.blocked = 0; this.total = { ok: 0, lost: 0, ms: 0 }; this.data = {};
    this.patience = cfg.patience ?? 7000; this.playing = !REDUCED; this.visible = false;
    this.nodes = {}; this.edges = [];
    this.setGraph(cfg.nodes, cfg.edges || []);
    if (cfg.init) cfg.init(this);
    if (host) this.mount();
    (cfg.controls || []).forEach(c => { if (c.set && c.val !== undefined) c.set(this, c.val); });
  }
  setGraph(nodes, edges) {
    const old = this.nodes; this.nodes = {};
    for (const id in nodes) {
      const prev = old[id], n = nodes[id];
      this.nodes[id] = Object.assign({ id, workers: 1, ms: 0, queue: 0, busy: 0, q: [], down: false, off: false, hl: false }, n,
        prev ? { busy: prev.busy, q: prev.q, down: prev.down } : {});
    }
    this.edges = edges;
  }
  n(id) { return this.nodes[id]; }
  alive(ids) { return ids.filter(i => { const n = this.nodes[i]; return n && !n.down && !n.off; }); }
  spawn(tag) {
    const from = (tag && tag.from) || this.cfg.origin || 'c', o = this.nodes[from];
    const p = { at: from, from, path: [from], state: 'idle', born: this.t, tag: tag || {}, bg: false, k: 0, x: o.x, y: o.y };
    this.ps.push(p); this.forward(p); return p;
  }
  forward(p) {
    const next = this.cfg.route(p, p.at, this);
    if (p.state === 'lost') return;
    if (next === null || next === undefined) { this.finish(p); return; }
    if (Array.isArray(next)) {
      next.forEach(id => { const c = Object.assign({}, p, { path: p.path.slice(), tag: Object.assign({}, p.tag), bg: true }); this.ps.push(c); this.go(c, id); });
      p.state = 'gone'; return;
    }
    this.go(p, next);
  }
  go(p, id) {
    const a = this.nodes[p.at], b = this.nodes[id];
    p.to = id; p.k = 0; p.state = 'move'; p.dur = b.hop ?? this.cfg.hop ?? 320; p.ax = a.x; p.ay = a.y; p.bx = b.x; p.by = b.y;
  }
  arrive(p) {
    const n = this.nodes[p.to]; p.at = p.to; p.path.push(p.at); p.x = n.x; p.y = n.y;
    if (n.down || n.off) { this.lose(p); return; }
    if (n.gate && !n.gate(p, this)) { this.block(p); return; }
    if (n.ack && !p.bg) this.ack(p);
    if (!n.ms) { this.forward(p); return; }
    if (n.busy < n.workers) this.begin(p, n);
    else if (n.q.length < n.queue) { n.q.push(p); p.state = 'wait'; p.qt = this.t; }
    else this.lose(p);
  }
  begin(p, n) { n.busy++; p.state = 'work'; p.until = this.t + n.ms * rnd(.75, 1.25); p.node = n; }
  ack(p) {
    const c = Object.assign({}, p, { path: p.path.slice(), tag: Object.assign({}, p.tag) }); this.ps.push(c); this.finish(c); p.bg = true;
  }
  finish(p) {
    if (p.bg) { this.bgDone++; if (this.cfg.onBgDone) this.cfg.onBgDone(p, this); p.state = 'gone'; return; }
    p.state = 'back'; p.seg = p.path.length - 1; p.k = 0;
  }
  done(p) {
    p.state = 'gone'; const ms = this.t - p.born;
    this.log.push({ t: this.t, ok: true, ms }); this.total.ok++; this.total.ms += ms;
    if (this.cfg.onDone) this.cfg.onDone(p, this);
  }
  lose(p) {
    p.state = 'lost'; p.fade = 1;
    if (p.bg) { this.data.bgLost = (this.data.bgLost || 0) + 1; return; }
    this.log.push({ t: this.t, ok: false }); this.total.lost++;
    if (this.cfg.onLost) this.cfg.onLost(p, this);
  }
  block(p) { p.state = 'lost'; p.fade = 1; p.blocked = true; this.blocked++; this.data.blocked = this.blocked; if (this.cfg.onBlock) this.cfg.onBlock(p, this); }
  setDown(id, v = true) {
    const n = this.nodes[id]; if (!n) return; n.down = v;
    if (v) { n.q.splice(0).forEach(p => this.lose(p)); this.ps.filter(p => p.state === 'work' && p.node === n).forEach(p => { n.busy--; this.lose(p); }); }
  }
  trace(ids) {
    /* a single bright dot for walk-throughs */
    this.ps = this.ps.filter(p => !p.trace);
    if (ids.length < 2) return;
    const a = this.nodes[ids[0]];
    this.ps.push({ trace: true, ids, i: 0, k: 0, x: a.x, y: a.y, state: 'trace' });
  }
  highlight(ids) { for (const i in this.nodes) this.nodes[i].hl = ids.includes(i); }
  step(dt) {
    this.t += dt; const cfg = this.cfg;
    if (cfg.tick) cfg.tick(this, dt);
    this.acc += this.rate * dt / 1000;
    while (this.acc >= 1) { this.acc -= 1; const tag = cfg.tag ? cfg.tag(this) : {}; if (tag !== false) this.spawn(tag); }
    for (const p of this.ps) {
      if (p.state === 'move') {
        p.k += dt / p.dur; const k = Math.min(1, p.k); p.x = p.ax + (p.bx - p.ax) * k; p.y = p.ay + (p.by - p.ay) * k;
        if (p.k >= 1) this.arrive(p);
      } else if (p.state === 'work') {
        if (this.t >= p.until) {
          const n = p.node; n.busy--; p.state = 'idle';
          while (n.q.length && n.busy < n.workers) { const q = n.q.shift(); this.begin(q, n); }
          this.forward(p);
        }
      } else if (p.state === 'wait') {
        if (this.t - p.born > this.patience) { const n = this.nodes[p.at]; n.q.splice(n.q.indexOf(p), 1); this.lose(p); }
      } else if (p.state === 'back') {
        if (p.seg <= 0) { this.done(p); continue; }
        const a = this.nodes[p.path[p.seg]], b = this.nodes[p.path[p.seg - 1]];
        p.k += dt / ((a.hop ?? cfg.hop ?? 320) * .55);
        const k = Math.min(1, p.k); p.x = a.x + (b.x - a.x) * k; p.y = a.y + (b.y - a.y) * k;
        if (p.k >= 1) { p.seg--; p.k = 0; }
      } else if (p.state === 'lost') {
        p.fade -= dt / 900; p.y += dt * .00003; if (p.fade <= 0) p.state = 'gone';
      } else if (p.state === 'trace') {
        const a = this.nodes[p.ids[p.i]], b = this.nodes[p.ids[p.i + 1]];
        p.k += dt / 480; const k = Math.min(1, p.k); p.x = a.x + (b.x - a.x) * k; p.y = a.y + (b.y - a.y) * k;
        if (p.k >= 1) { p.k = 0; p.i++; if (p.i >= p.ids.length - 1) { p.i = 0; } }
      }
    }
    if (this.ps.length > 60) this.ps = this.ps.filter(p => p.state !== 'gone');
    if (this.log.length > 900 || (this.log[0] && this.log[0].t < this.t - 10000)) this.log = this.log.filter(l => l.t > this.t - 10000);
  }
  recent() {
    const ok = this.log.filter(l => l.ok), lost = this.log.length - ok.length;
    return { ok: ok.length, lost, wait: ok.length ? ok.reduce((a, l) => a + l.ms, 0) / ok.length : 0 };
  }
  signal() {
    const r = this.recent(), n = r.ok + r.lost; if (!n) return 'go';
    const pct = r.lost / n, slow = this.cfg.okMs ?? 3000;
    if (pct > .15 || r.wait > slow * 1.7) return 'stop';
    if (pct > .02 || r.wait > slow) return 'wait';
    return 'go';
  }
  /* view */
  mount() {
    const h = this.host, cfg = this.cfg; h.className = 'sim'; h.innerHTML = '';
    h.innerHTML = `<div class="simhead"><div class="signal" data-s="go" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="stat"><span data-st="ok">0</span><small>${esc(cfg.okWord || 'Served')}</small></div>
      <div class="stat"><span data-st="lost">0</span><small>${esc(cfg.lostWord || 'Gave up')}</small></div>
      <div class="stat"><span data-st="wait">0.0s</span><small>Avg wait</small></div>
      <div class="spacer"></div><button class="btn ghost small" data-play type="button">${this.playing ? 'Pause' : 'Play'}</button></div>
      <canvas role="img" aria-label="${esc(cfg.alt || 'Live animation of requests moving through the system')}"></canvas>
      <div class="simsay" aria-live="off"></div>
      <div class="legend"><span><i style="background:var(--rail)"></i>${esc(cfg.reqWord || 'Request going in')}</span><span><i style="background:var(--go)"></i>Answer coming back</span><span><i style="background:var(--stop)"></i>Lost</span>${cfg.legend || ''}</div>`;
    this.cv = h.querySelector('canvas'); this.ctx = this.cv.getContext('2d'); this.sayEl = h.querySelector('.simsay'); this.sig = h.querySelector('.signal');
    h.querySelector('[data-play]').onclick = e => { this.playing = !this.playing; e.target.textContent = this.playing ? 'Pause' : 'Play'; };
    if ((cfg.controls || []).length) { const c = document.createElement('div'); c.className = 'ctrls'; h.appendChild(c); this.buildCtl(c); }
    this.size(); this.ro = new ResizeObserver(() => this.size()); this.ro.observe(h);
    this.io = new IntersectionObserver(es => { this.visible = es[0].isIntersecting; }); this.io.observe(this.cv);
    LIVE.add(this); this.draw(); this.hud();
  }
  buildCtl(wrap) {
    const btnRow = document.createElement('div'); btnRow.className = 'ctlbtns';
    (this.cfg.controls).forEach((c, i) => {
      const uid = (this.cfg.key || 'sim') + '-c' + i;
      if (c.k === 'range') {
        const d = document.createElement('div'); d.className = 'ctl';
        d.innerHTML = `<label for="${uid}">${esc(c.label)}</label><input id="${uid}" type="range" min="${c.min}" max="${c.max}" step="${c.step || 1}" value="${c.val}"><output for="${uid}"></output>`;
        const inp = d.querySelector('input'), out = d.querySelector('output'), fmt = c.fmt || (v => v);
        const upd = () => { const v = +inp.value; out.textContent = fmt(v); c.set(this, v); };
        out.textContent = fmt(c.val); inp.oninput = upd; wrap.appendChild(d);
      } else if (c.k === 'toggle') {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'tog'; b.id = uid; b.textContent = c.label;
        b.setAttribute('aria-pressed', !!c.val); b.onclick = () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', v); c.set(this, v); };
        btnRow.appendChild(b);
      } else if (c.k === 'btn') {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'act'; b.id = uid; b.textContent = c.label;
        b.onclick = () => c.do(this, b); btnRow.appendChild(b);
      } else if (c.k === 'seg') {
        const d = document.createElement('div'); d.className = 'ctl'; d.style.gridTemplateColumns = 'minmax(0,190px) minmax(0,1fr)';
        d.innerHTML = `<span>${esc(c.label)}</span><div class="seg" id="${uid}"></div>`;
        const s = d.querySelector('.seg');
        c.opts.forEach(([v, l]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.setAttribute('aria-pressed', v === c.val);
          b.onclick = () => { s.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); c.set(this, v); }; s.appendChild(b); });
        wrap.appendChild(d);
      }
    });
    if (btnRow.children.length) wrap.appendChild(btnRow);
  }
  size() {
    if (!this.cv) return; const W = this.host.clientWidth - 4; if (W <= 0) return;
    const H = this.cfg.h ?? 260, r = Math.min(2, devicePixelRatio || 1);
    const hh = W < 460 ? H + 30 : H;
    this.W = W; this.H = hh; this.cv.width = W * r; this.cv.height = hh * r; this.cv.style.height = hh + 'px'; this.ctx.setTransform(r, 0, 0, r, 0, 0);
    this.colors = null; this.draw();
  }
  pal() {
    return this.colors = { card: cssv('--card'), sunk: cssv('--sunk'), ink: cssv('--ink'), mute: cssv('--mute'), line: cssv('--line'), rail: cssv('--rail'), go: cssv('--go'), stop: cssv('--stop'), wait: cssv('--wait'), sign: cssv('--sign'), signink: cssv('--signink') };
  }
  draw() {
    if (!this.ctx || !this.W) return;
    if (!this.colors || (this.frame = (this.frame || 0) + 1) % 90 === 0) this.pal();
    const c = this.ctx, C = this.colors, W = this.W, H = this.H, cfg = this.cfg;
    c.clearRect(0, 0, W, H); c.fillStyle = C.card; c.fillRect(0, 0, W, H);
    const nw = Math.min(cfg.nw ?? 108, clamp(W * .15, 62, 108)), nh = cfg.nh ?? 46, m = nw / 2 + 6;
    const X = v => m + v * (W - 2 * m), Y = v => 30 + v * (H - 62);
    c.lineWidth = 1.5; c.strokeStyle = C.line; c.setLineDash([5, 5]);
    for (const [a, b] of this.edges) { const A = this.nodes[a], B = this.nodes[b]; if (!A || !B || A.off || B.off) continue; c.beginPath(); c.moveTo(X(A.x), Y(A.y)); c.lineTo(X(B.x), Y(B.y)); c.stroke(); }
    c.setLineDash([]);
    for (const id in this.nodes) {
      const n = this.nodes[id]; if (n.off) continue;
      const x = X(n.x) - nw / 2, y = Y(n.y) - nh / 2, kind = n.kind || 'server';
      c.fillStyle = n.hl ? C.sign : (kind === 'client' ? C.sunk : C.card);
      c.strokeStyle = n.down ? C.stop : (n.hl ? C.signink : C.ink); c.lineWidth = n.hl ? 3 : 2;
      c.beginPath(); kind === 'client' ? c.roundRect(x, y, nw, nh, 23) : c.rect(x, y, nw, nh); c.fill(); c.stroke();
      if (kind === 'db') { c.beginPath(); c.moveTo(x, y + 9); c.quadraticCurveTo(x + nw / 2, y + 17, x + nw, y + 9); c.lineWidth = 1.5; c.stroke(); }
      if (kind === 'cache' || kind === 'queue' || kind === 'lb') { c.fillStyle = kind === 'cache' ? C.wait : kind === 'queue' ? C.go : C.rail; c.fillRect(x, y, 6, nh); }
      c.fillStyle = n.hl ? C.signink : (n.down ? C.stop : C.ink); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '700 12px "Atkinson Hyperlegible",system-ui,sans-serif';
      const lab = n.down ? 'DOWN' : n.label; const sub = n.down ? n.label : n.sub;
      c.fillText(lab, x + nw / 2 + (kind === 'cache' || kind === 'queue' || kind === 'lb' ? 3 : 0), y + (sub ? 18 : nh / 2 + 1), nw - 8);
      if (sub) { c.font = '400 10px "Atkinson Hyperlegible",system-ui,sans-serif'; c.fillStyle = n.hl ? C.signink : C.mute; c.fillText(sub, x + nw / 2, y + 33, nw - 6); }
      if (n.ms && !n.down) {
        const f = Math.min(1, n.busy / n.workers); c.fillStyle = C.sunk; c.fillRect(x, y + nh + 3, nw, 4);
        c.fillStyle = f >= 1 ? (n.q.length ? C.stop : C.wait) : C.go; c.fillRect(x, y + nh + 3, nw * f, 4);
      }
      if (n.q.length) {
        const q = n.q.length, show = Math.min(q, 14), s = Math.min(6, (nw - 4) / show - 1);
        c.fillStyle = q >= n.queue ? C.stop : C.wait;
        for (let i = 0; i < show; i++) c.fillRect(x + 2 + i * (s + 1), y - 9, s, 6);
        if (q > 14) { c.fillStyle = C.ink; c.font = '700 10px "JetBrains Mono",monospace'; c.textAlign = 'right'; c.fillText(q, x + nw, y - 15); }
      }
    }
    for (const p of this.ps) {
      if (p.state === 'gone' || p.state === 'work' || p.state === 'wait' || p.state === 'idle') continue;
      let col = C.rail, r = 4.5;
      if (p.state === 'back') col = p.flag ? C.wait : C.go;
      if (p.bg) { col = C.mute; r = 3.5; }
      if (cfg.color) col = cfg.color(p, C) || col;
      if (p.state === 'lost') { col = p.blocked ? C.wait : C.stop; c.globalAlpha = Math.max(0, p.fade); }
      if (p.trace) { col = C.stop; r = 7; }
      c.fillStyle = col; c.beginPath(); c.arc(X(p.x), Y(p.y), r, 0, 7); c.fill(); c.globalAlpha = 1;
    }
  }
  hud() {
    if (!this.host) return;
    const r = this.recent(), h = this.host;
    h.querySelector('[data-st=ok]').textContent = r.ok; h.querySelector('[data-st=lost]').textContent = r.lost;
    h.querySelector('[data-st=wait]').textContent = (r.wait / 1000).toFixed(1) + 's';
    this.sig.dataset.s = this.signal();
    const s = this.cfg.say ? this.cfg.say(this, r) : ''; if (this.sayEl.textContent !== s) this.sayEl.textContent = s;
  }
  destroy() { LIVE.delete(this); this.ro && this.ro.disconnect(); this.io && this.io.disconnect(); }
}
let lastTs = 0, hudT = 0;
function loop(ts) {
  const dt = Math.min(50, ts - lastTs || 16); lastTs = ts; hudT += dt;
  for (const s of LIVE) { if (!s.visible) continue; if (s.playing) s.step(dt); s.draw(); }
  if (hudT > 400) { hudT = 0; for (const s of LIVE) if (s.visible) s.hud(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
