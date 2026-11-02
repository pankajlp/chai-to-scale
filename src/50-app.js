/* App shell: views, progress, widgets. */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app'); let sims = [], view = '', cloud = null;
const KEY = 'chai-to-scale-v1';
let S = { done: {}, quiz: {}, miss: {}, cups: 0, days: 0, last: '' };
try { S = Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} if (cloud) cloud.set(S).catch(() => {}); score(); }
const RANKS = [[0, 'Chai cart'], [6, 'Corner shop'], [14, 'City chain'], [24, 'State brand'], [32, 'National brand']];
const rank = () => { const n = Object.keys(S.done).length; return RANKS.filter(r => n >= r[0]).pop()[1]; };
function score() { $('#score').innerHTML = `<span>${esc(rank())}</span><span><b>${S.cups}</b> cups</span>${S.days > 1 ? `<span><b>${S.days}</b> day run</span>` : ''}`; }
function today() {
  const d = new Date().toISOString().slice(0, 10); if (S.last === d) return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10); S.days = S.last === y ? S.days + 1 : 1; S.last = d;
}
let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
function clear() { sims.forEach(s => s.destroy()); sims = []; }
function addSim(host, key) { const cfg = SIMS[key](); cfg.key = key; const s = new Sim(cfg, host); sims.push(s); return s; }
function go(v, noHash) {
  view = v; clear(); render(); scrollTo(0, 0);
  if (!noHash) { try { if (location.hash.slice(1) !== v) location.hash = v; } catch (e) {} }
}
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== view && valid(h)) go(h, true); });
const valid = h => ['home', 'lab', 'cases', 'words'].includes(h) || LESSONS.some(l => 'l-' + l.id === h) || CASES.some(c => 'c-' + c.id === h);
function render() {
  const top = view.startsWith('l-') ? 'home' : view.startsWith('c-') ? 'cases' : view;
  $$('#nav button').forEach(b => b.dataset.go === top ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  if (view === 'home') home(); else if (view === 'lab') lab(); else if (view === 'cases') cases(); else if (view === 'words') words();
  else if (view.startsWith('l-')) lesson(LESSONS.find(l => 'l-' + l.id === view)); else caseView(CASES.find(c => 'c-' + c.id === view));
}
$('#brand').onclick = () => go('home'); $$('#nav button').forEach(b => b.onclick = () => go(b.dataset.go));
const nextL = () => LESSONS.find(l => !S.done[l.id]);

function home() {
  const n = Object.keys(S.done).length, nx = nextL();
  app.innerHTML = `<div class="wrap"><section class="hero">
    <div class="stack"><div class="board"><p class="label">Platform 1 · System design</p><h1>From one chai stall to a crore customers</h1></div>
      <p class="lead">Learn how apps like IRCTC, WhatsApp and UPI work, with no coding needed. You run a chai stall. Each problem it hits is a real problem big apps face, and you fix it with your own hands.</p>
      <div class="row"><button class="btn" id="start">${n ? 'Continue: ' + esc(nx ? nx.t : 'Build Lab') : 'Start at station 1'}</button><button class="btn ghost" id="golab">Try the Build Lab</button></div>
      <p class="label">${n} of ${LESSONS.length} lessons done · rank: ${esc(rank())}</p></div>
    <div class="stack" style="gap:8px"><p class="simtry"><b>Try it now.</b> This is your stall. Each dot is a customer. Drag the crowd up.</p><div id="heroSim"></div></div>
  </section>
  <div class="row" style="gap:8px"><h2>The line, station by station</h2></div>
  <p style="color:var(--mute);margin-top:6px">Each station is harder than the last. Every lesson takes about 5 minutes.</p>
  <div class="line">${STATIONS.map((s, i) => {
    const full = s.lessons.every(l => S.done[l.id]);
    return `<section class="stn ${full ? 'full' : ''}"><div class="board"><p class="label">Station ${i + 1} · ${esc(s.size)}</p><h2>${esc(s.name)}</h2></div><p class="blurb">${esc(s.blurb)}</p>
    <div class="lessons">${s.lessons.map(l => `<button class="${S.done[l.id] ? 'done' : ''}" data-l="${l.id}"><span class="tick">${S.done[l.id] ? 'DONE' : LESSONS.indexOf(l) + 1}</span><span class="name">${esc(l.t)}<span class="sub">${esc(l.sub)}</span></span></button>`).join('')}</div></section>`;
  }).join('')}
  <section class="stn"><div class="board"><p class="label">Final stop · Real life</p><h2>Real Apps Terminal</h2></div><p class="blurb">Take the tools apart inside IRCTC, WhatsApp, Hotstar, UPI and more.</p><div class="row"><button class="btn ghost" id="gocases">See how real apps work</button></div></section>
  </div><footer>Your progress saves automatically. Case-study numbers are rounded public figures.</footer></div>`;
  addSim($('#heroSim'), 'stall');
  $('#start').onclick = () => go(nx ? 'l-' + nx.id : 'lab'); $('#golab').onclick = () => go('lab'); $('#gocases').onclick = () => go('cases');
  $$('[data-l]').forEach(b => b.onclick = () => go('l-' + b.dataset.l));
}

function lesson(l) {
  const i = LESSONS.indexOf(l), prev = LESSONS[i - 1], next = LESSONS[i + 1];
  app.innerHTML = `<div class="wrap"><div class="read stack">
    <div class="crumb"><button class="linkish" id="back">Back to the line</button><span class="label">${esc(l.st.name)} · Lesson ${i + 1} of ${LESSONS.length}</span></div>
    <h1>${esc(l.t)}</h1>
    <div class="block"><p class="label">The problem</p><p class="bigtext">${esc(l.p)}</p></div>
    <div class="board"><p class="label">The simple idea</p><p class="idea">${esc(l.i)}</p></div>
    <div class="block"><p class="label">${l.sim ? 'Try it yourself' : 'See it'}</p>${l.try ? `<p class="simtry">${l.try}</p>` : ''}<div id="lsim"></div></div>
    <div class="block"><p class="label">Where you have already seen this</p><div class="realgrid">${l.real.map(([a, b]) => `<div class="real"><b>${esc(a)}</b>${esc(b)}</div>`).join('')}</div></div>
    <div class="cost"><p class="label">What it costs</p><p>${esc(l.cost)}</p></div>
    <div class="block"><p class="label">Words to know</p><dl class="words">${l.words.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl></div>
    <details class="deep"><summary>Go deeper (for the curious)</summary><p>${esc(l.deep)}</p></details>
    <div class="block"><p class="label">Quick check</p><div class="stack" style="gap:12px" id="quiz"></div></div>
    <div class="ask" id="ask" hidden><p class="label">Still confused?</p><p>Ask anything about this topic. Claude answers in plain words.</p>
      <label class="label" for="askq">Your question</label><input id="askq" placeholder="Example: Why can't we just buy one huge server?">
      <div class="row"><button class="btn small" id="askgo">Ask</button><button class="btn ghost small" id="askeli">Explain it like I am 10</button></div><p class="ans" id="ans" aria-live="polite"></p></div>
    <div class="next">${prev ? `<button class="btn ghost" id="prev">Back: ${esc(prev.t)}</button>` : '<span></span>'}${next ? `<button class="btn" id="next">Next: ${esc(next.t)}</button>` : '<button class="btn" id="tolab">Go to the Build Lab</button>'}</div>
  </div></div>`;
  const host = $('#lsim'); if (l.sim) addSim(host, l.sim); else VIS[l.vis](host);
  quiz(l); tutor(l);
  $('#back').onclick = () => go('home');
  if (prev) $('#prev').onclick = () => go('l-' + prev.id);
  if (next) $('#next').onclick = () => go('l-' + next.id); else $('#tolab').onclick = () => go('lab');
}
function quiz(l) {
  const box = $('#quiz'), got = S.quiz[l.id] || [];
  l.quiz.forEach(([q, opts, a, why], qi) => {
    const d = document.createElement('div'); d.className = 'q'; d.innerHTML = `<p><b>${esc(q)}</b></p><div class="stack" style="gap:6px"></div><p class="why" hidden></p>`;
    const list = d.children[1], whyEl = d.children[2];
    const order = opts.map((o, i) => i).sort((x, y) => ((x * 7 + qi * 3 + l.id.length) % 4) - ((y * 7 + qi * 3 + l.id.length) % 4));
    order.forEach(i => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = opts[i];
      if (got[qi] && i === a) b.classList.add('right');
      b.onclick = () => {
        if (got[qi]) return;
        if (i !== a) { b.classList.add('wrong'); whyEl.hidden = false; whyEl.textContent = 'Not quite. Try another one.'; return; }
        b.classList.add('right'); whyEl.hidden = false; whyEl.textContent = 'Correct. ' + why; got[qi] = 1; S.quiz[l.id] = got;
        if (l.quiz.every((_, k) => got[k]) && !S.done[l.id]) { S.done[l.id] = 1; S.cups += 10; today(); toast('Lesson done. +10 cups of chai'); }
        save();
      };
      list.appendChild(b);
    });
    if (got[qi]) { whyEl.hidden = false; whyEl.textContent = why; }
    box.appendChild(d);
  });
}
async function tutor(l) {
  if (!window.claude || !window.claude.use) return;
  const sample = await window.claude.use('sample'); if (!sample || view !== 'l-' + l.id) return;
  const box = $('#ask'); if (!box) return; box.hidden = false;
  const ans = $('#ans'), ctx = `You are a friendly teacher of system design for a person with no technical background. Use the running example of a chai stall that grows into a national chain, plus everyday Indian examples. Use short sentences and no jargon unless you explain it. Answer in under 120 words, as plain text with no markdown.\nLesson: ${l.t}. Key idea: ${l.i} Problem story: ${l.p}\n`;
  const ask = async q => {
    ans.textContent = 'Thinking...';
    try { const r = await sample(ctx + 'Learner asks: ' + q, { modelTier: 'quick', onText: ({ text }) => ans.textContent = text }); ans.textContent = r.text; }
    catch (e) { if (e && e.code === 'not_granted') box.hidden = true; else ans.textContent = e && e.code === 'rate_limited' ? 'Too many questions right now. Try again in a minute.' : 'That did not work. Please try again.'; }
  };
  $('#askgo').onclick = () => { const q = $('#askq').value.trim(); if (q) ask(q); else $('#askq').focus(); };
  $('#askq').onkeydown = e => { if (e.key === 'Enter') $('#askgo').click(); };
  $('#askeli').onclick = () => ask('Explain this whole idea as if I am 10 years old.');
}

/* hand-built visuals for lessons without a flow sim */
const VIS = {
  sql(h) {
    h.className = 'vis'; h.innerHTML = `<div class="two"><div class="stack" style="gap:8px"><h3>SQL: neat register</h3><div style="overflow-x:auto"><table class="tbl"><tr><th>id</th><th>name</th><th>amount</th></tr><tr><td>1</td><td>Raju</td><td>₹40</td></tr><tr><td>2</td><td>Meena</td><td>₹25</td></tr><tr><td>3</td><td>Salim</td><td>₹60</td></tr></table></div><p>Every row has the same columns. Think Excel with strict rules.</p></div>
    <div class="stack" style="gap:8px"><h3>NoSQL: flexible folders</h3><pre class="code">{ "name": "Raju",
  "photo": "raju.jpg" }

{ "name": "Meena",
  "voice_note": "m.mp3",
  "stars": 5 }</pre><p>Each record can have different fields.</p></div></div>`;
  },
  txn(h) {
    h.className = 'vis'; let on = false, a = 1000, b = 500, msg = 'Press Send and the power fails halfway.';
    h.innerHTML = `<div class="row"><button class="tog" id="txon" type="button" aria-pressed="false">Use a transaction</button><button class="act" id="txgo" type="button">Send ₹500, power fails midway</button><button class="btn ghost small" id="txre" type="button">Reset</button></div><div class="txnrow"><div class="acct">You<b id="txa"></b></div><div class="acct">Friend<b id="txb"></b></div></div><p id="txm" style="font-weight:700"></p>`;
    const up = () => { $('#txa').textContent = '₹' + a; $('#txb').textContent = '₹' + b; $('#txm').textContent = `Total in the system: ₹${a + b}. ${msg}`; };
    $('#txon').onclick = e => { on = !on; e.target.setAttribute('aria-pressed', on); };
    $('#txgo').onclick = () => { a = 1000; b = 500; if (on) msg = 'Power failed, so step 1 was rolled back. Your money is safe. Try again later.'; else { a = 500; msg = 'Your ₹500 left, and your friend never got it. Money has vanished!'; } up(); };
    $('#txre').onclick = () => { a = 1000; b = 500; msg = 'Press Send and the power fails halfway.'; up(); }; up();
  },
  monitor(h) {
    h.className = 'vis'; const v = [.2, .25, .2, .3, .22, .24, .3, .26, .2, .28, .25, .3, .22, .24, .27, .25, .3, .26, .9, 3.2].sort((a, b) => a - b), mx = 3.2, avg = v.reduce((a, b) => a + b) / v.length;
    h.innerHTML = `<h3>Time taken by 20 requests</h3><div class="bars" style="margin-top:10px" role="img" aria-label="Bar chart: most requests take about 0.25 seconds; the slowest takes 3.2 seconds">${v.map(x => `<i class="${x > 1 ? 'slow' : ''}" style="height:${x / mx * 100}%"></i>`).join('')}</div>
    <div class="nums" style="margin-top:12px"><div><b>${avg.toFixed(2)} s</b>Average</div><div><b>${v[10].toFixed(2)} s</b>Typical user (p50)</div><div><b>3.2 s</b>Unlucky user (p99)</div></div>
    <div class="realgrid" style="margin-top:12px"><div class="real"><b>Metrics</b>The car speedometer. Numbers over time.</div><div class="real"><b>Logs</b>The shop diary. What happened, and when.</div><div class="real"><b>Traces</b>Parcel tracking. Each stop of one request.</div></div>`;
  },
  calc(h) {
    h.className = 'vis'; const v = { dau: 1000000, act: 10, peak: 5, kb: 2 };
    h.innerHTML = `<div class="stack" style="gap:8px">${[['dau', 'Daily users', 10000, 100000000, 10000], ['act', 'Actions per user per day', 1, 100, 1], ['peak', 'Peak is how many times normal', 2, 10, 1], ['kb', 'Data saved per action (KB)', 1, 1000, 1]].map(([k, l, a, b, st]) => `<div class="ctl" style="grid-template-columns:minmax(0,1fr) 150px"><label for="calc-${k}">${l}</label><input id="calc-${k}" type="number" min="${a}" max="${b}" step="${st}" value="${v[k]}" style="padding:6px;border:2px solid var(--ink);background:var(--card);width:100%"></div>`).join('')}</div><div class="nums" style="margin-top:14px"><div><b id="o1"></b>Requests per sec, normal</div><div><b id="o2"></b>Requests per sec, peak</div><div><b id="o3"></b>Servers (1,000 per sec each, plus a spare)</div></div><p style="margin-top:10px" id="o4"></p>`;
    const n = x => Math.round(x).toLocaleString('en-IN');
    const up = () => { const f = k => Math.max(0, +$('#calc-' + k).value || 0), rps = f('dau') * f('act') / 100000, pk = rps * f('peak'), gb = f('dau') * f('act') * f('kb') * 365 / 1e6;
      $('#o1').textContent = n(rps); $('#o2').textContent = n(pk); $('#o3').textContent = n(Math.ceil(pk / 1000) + 1); $('#o4').textContent = `Storage needed in a year: about ${gb >= 1000 ? n(gb / 1000) + ' TB' : n(gb) + ' GB'}.`; };
    $$('input', h).forEach(i => i.oninput = up); up();
  },
  method(h) {
    h.className = 'vis'; h.innerHTML = `<div style="overflow-x:auto"><table class="tbl"><tr><th>Step</th><th>Ask yourself</th><th>Example: WhatsApp</th></tr>
    ${[['1. Ask', 'What must it do? For whom?', 'One-to-one chat, groups, ticks. Photos later.'], ['2. Size', 'How many users? How much data?', '200 crore users, 1 lakh messages a second on average.'], ['3. Sketch', 'What are the main boxes?', 'Phones, chat servers, message store, push alerts.'], ['4. Zoom in', 'What is hardest here?', 'Delivering instantly when the friend is online or offline.'], ['5. Break it', 'What can fail? What then?', 'A chat server dies, so phones reconnect to another one.']].map(r => `<tr>${r.map((c, i) => i ? `<td>${c}</td>` : `<td><b>${c}</b></td>`).join('')}</tr>`).join('')}</table></div>`;
  },
  trade(h) {
    h.className = 'vis'; h.innerHTML = `<div style="overflow-x:auto"><table class="tbl"><tr><th>You want</th><th>You pay with</th><th>Use it when</th></tr>
    ${[['Cache: speed', 'Possibly old data', 'Read-heavy pages'], ['Copies: safety', 'Short delays, more cost', 'Data you cannot lose'], ['Shards: size', 'Harder queries', 'Data outgrows one machine'], ['Queues: smooth load', 'Results come later', 'The work can wait'], ['Microservices: team speed', 'Running many parts', 'Many teams, one product'], ['Strict correctness', 'Sometimes refusing users', 'Money, seats, stock']].map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table></div>`;
  },
};

function cases() {
  app.innerHTML = `<div class="wrap stack" style="padding-block:24px 40px"><div class="board" style="align-self:flex-start"><p class="label">Real Apps Terminal</p><h1>How the apps you use really work</h1></div>
  <p>Each one is a step-by-step ride through a system you already use. The designs show the common way to build such a system, simplified for learning. Each company's real setup differs in the details.</p>
  <div class="casegrid">${CASES.map(c => `<button class="casecard" data-c="${c.id}"><span class="pill ${S.done['c-' + c.id] ? 'ok' : ''}">${S.done['c-' + c.id] ? 'DONE' : esc(c.tag)}</span><h2>${esc(c.name)}</h2><span class="sub">${esc(c.hook)}</span></button>`).join('')}</div></div>`;
  $$('[data-c]').forEach(b => b.onclick = () => go('c-' + b.dataset.c));
}
function caseView(c) {
  const i = CASES.indexOf(c), next = CASES[i + 1];
  app.innerHTML = `<div class="wrap stack" style="padding-bottom:40px"><div class="crumb"><button class="linkish" id="back">All real apps</button><span class="label">${esc(c.tag)}</span></div>
  <h1>${esc(c.name)}</h1><p class="bigtext" style="max-width:62ch">${esc(c.hook)}</p>
  <div class="nums">${c.nums.map(([a, b]) => `<div><b>${esc(a)}</b>${esc(b)}</div>`).join('')}</div>
  <div class="block"><p class="label">The ride, step by step</p><p>Click each step. The red dot follows the path.</p>
  <div class="casewide"><div id="csim"></div><ol class="steps">${c.steps.map((s, k) => `<li><button class="stepbtn" data-s="${k}" aria-pressed="false"><span class="n">${k + 1}</span><span>${esc(s[0])}</span></button></li>`).join('')}</ol></div></div>
  <div class="block"><p class="label">Problems and how they are solved</p><div class="fixes">${c.fixes.map(([a, b, l]) => `<div class="fix"><div><b>Problem</b><br>${esc(a)}</div><div><b>Solution</b><br>${esc(b)} <button class="linkish" data-l="${l}">Learn this</button></div></div>`).join('')}</div></div>
  <div class="row"><button class="btn" id="cdone">${S.done['c-' + c.id] ? 'Completed' : 'Mark as understood (+15 cups)'}</button>${next ? `<button class="btn ghost" id="cnext">Next: ${esc(next.name)}</button>` : ''}</div></div>`;
  const s = new Sim({ key: 'case-' + c.id, rate: 0, h: 300, nw: 92, nh: 44, nodes: c.nodes, edges: c.edges, route: () => null, tag: () => false, alt: 'Diagram of ' + c.name + ': ' + c.steps.map(x => x[0]).join(' ') }, $('#csim')); sims.push(s);
  $$('.simhead,.legend,.simsay', $('#csim')).forEach(e => e.hidden = true);
  const pick = k => { $$('.stepbtn').forEach((b, j) => b.setAttribute('aria-pressed', j === k)); s.highlight(c.steps[k][1]); s.trace(c.steps[k][1]); };
  $$('.stepbtn').forEach((b, k) => b.onclick = () => pick(k)); pick(0);
  $('#back').onclick = () => go('cases'); if (next) $('#cnext').onclick = () => go('c-' + next.id);
  $$('[data-l]').forEach(b => b.onclick = () => go('l-' + b.dataset.l));
  $('#cdone').onclick = e => { if (S.done['c-' + c.id]) return; S.done['c-' + c.id] = 1; S.cups += 15; today(); save(); e.target.textContent = 'Completed'; toast('+15 cups of chai'); };
}

function words() {
  app.innerHTML = `<div class="wrap read stack" style="padding-block:24px 40px"><div class="board" style="align-self:flex-start"><p class="label">Help desk</p><h1>Fix-it Finder</h1></div>
  <p>Pick what is going wrong. See what fixes it.</p><div class="chips" id="fx">${FIXES.map((f, i) => `<button class="chip" data-i="${i}" aria-pressed="${i === 0}">${esc(f[0])}</button>`).join('')}</div><div class="board" id="fxo"></div>
  <h2>Plain-word dictionary</h2><label class="label" for="wq">Search ${WORDS.length} words</label><input class="search" id="wq" placeholder="Try: cache, shard, latency"><div id="wl"></div></div>`;
  const fx = i => { const f = FIXES[i]; $('#fxo').innerHTML = `<p class="label">The fix</p><p class="idea">${esc(f[2])}</p><div class="row" style="margin-top:8px">${f[1].map(id => { const l = LESSONS.find(x => x.id === id); return `<button class="btn small" data-l="${id}">${esc(l.t)}</button>`; }).join('')}</div>`; $$('#fxo [data-l]').forEach(b => b.onclick = () => go('l-' + b.dataset.l)); };
  $$('#fx .chip').forEach(b => b.onclick = () => { $$('#fx .chip').forEach(x => x.setAttribute('aria-pressed', x === b)); fx(+b.dataset.i); }); fx(0);
  const list = q => { const r = WORDS.filter(w => (w.w + ' ' + w.d).toLowerCase().includes(q)).sort((a, b) => a.w.localeCompare(b.w)); $('#wl').innerHTML = r.length ? r.map(w => `<div class="term"><b>${esc(w.w)}</b><br>${esc(w.d)} <span class="also">From: <button class="linkish" data-l="${w.l}">${esc(w.t)}</button></span></div>`).join('') : '<p class="term">No match. Try a shorter word.</p>'; $$('#wl [data-l]').forEach(b => b.onclick = () => go('l-' + b.dataset.l)); };
  $('#wq').oninput = e => list(e.target.value.trim().toLowerCase()); list('');
}

function lab() {
  const L = { servers: 1, cache: false, replicas: 0, queue: false, cdn: false }; let M = MISSIONS.find(m => !S.miss[m.id]) || MISSIONS[0], run = null;
  app.innerHTML = `<div class="wrap stack" style="padding-block:24px 40px"><div class="board" style="align-self:flex-start"><p class="label">Workshop</p><h1>Build Lab</h1></div>
  <p>Pick a mission, add parts, then run a 15-second test. You pass if under 3% of customers leave, the average wait is under 2.5 sec, and you stay on budget.</p>
  <div class="labgrid"><div class="stack" style="gap:10px"><div id="labsim"></div><div id="verdict" class="verdict" hidden aria-live="polite"></div></div>
  <div class="stack" style="gap:12px"><div class="stack" style="gap:6px" id="missions"></div>
   <div class="stack" style="gap:8px"><p class="label">Your parts</p>
    <div class="ctl" style="grid-template-columns:minmax(0,1fr) auto"><label for="lserv">Servers (₹8,000 each)</label><output id="lservo">1</output><input id="lserv" style="grid-column:1/-1" type="range" min="1" max="5" value="1"></div>
    <div class="ctl" style="grid-template-columns:minmax(0,1fr) auto"><label for="lrep">Read copies (₹10,000 each)</label><output id="lrepo">0</output><input id="lrep" style="grid-column:1/-1" type="range" min="0" max="2" value="0"></div>
    <div class="ctlbtns"><button class="tog" data-p="cache" type="button" aria-pressed="false">Cache ₹5,000</button><button class="tog" data-p="queue" type="button" aria-pressed="false">Queue ₹4,000</button><button class="tog" data-p="cdn" type="button" aria-pressed="false">CDN ₹6,000</button></div>
    <p><b id="lcost"></b></p><button class="btn" id="lrun">Run the 15-second test</button><button class="linkish" id="lhint">Need a hint?</button><p id="lhinttxt" hidden></p></div></div></div></div>`;
  const s = new Sim(labCfg(L), $('#labsim')); sims.push(s); s.mount && 0;
  const mis = () => { $('#missions').innerHTML = '<p class="label">Missions</p>' + MISSIONS.map(m => `<button class="casecard mission ${m === M ? 'on' : ''}" data-m="${m.id}"><span class="pill ${S.miss[m.id] ? 'ok' : ''}">${S.miss[m.id] ? 'PASSED' : '₹' + m.budget.toLocaleString('en-IN') + ' budget'}</span><b>${esc(m.name)}</b><span>${esc(m.text)}</span></button>`).join(''); $$('[data-m]').forEach(b => b.onclick = () => { if (run) return; M = MISSIONS.find(m => m.id === b.dataset.m); mis(); setM(); }); };
  const setM = () => { s.data.mix = M.mix; s.rate = M.rate; $('#lhinttxt').hidden = true; $('#verdict').hidden = true; s.setDown('s1', false); s.data.line = M.text; };
  const up = () => { labApply(s, L); const c = labCost(L); $('#lcost').textContent = `Monthly cost: ₹${c.toLocaleString('en-IN')} of ₹${M.budget.toLocaleString('en-IN')}`; $('#lcost').style.color = c > M.budget ? 'var(--stop)' : 'var(--go)'; };
  $('#lserv').oninput = e => { L.servers = +e.target.value; $('#lservo').textContent = L.servers; up(); };
  $('#lrep').oninput = e => { L.replicas = +e.target.value; $('#lrepo').textContent = L.replicas; up(); };
  $$('[data-p]').forEach(b => b.onclick = () => { L[b.dataset.p] = !L[b.dataset.p]; b.setAttribute('aria-pressed', L[b.dataset.p]); up(); });
  $('#lhint').onclick = () => { const h = $('#lhinttxt'); h.hidden = false; h.textContent = M.hint; };
  $('#lrun').onclick = e => {
    if (run) return; s.playing = true; const pb = $('[data-play]', $('#labsim')); if (pb) pb.textContent = 'Pause';
    s.ps = []; for (const k in s.nodes) { s.nodes[k].q = []; s.nodes[k].busy = 0; s.nodes[k].down = false; } s.log = []; s.total = { ok: 0, lost: 0, ms: 0 }; s.rate = M.rate; s.data.mix = M.mix; $('#verdict').hidden = true;
    const t0 = s.t; run = M; e.target.textContent = 'Testing...';
    const tick = () => {
      if (!sims.includes(s)) return; const el = s.t - t0; s.data.line = `Testing: ${Math.max(0, 15 - el / 1000).toFixed(0)} sec left`;
      if (M.kill && el >= M.kill && !s.n('s1').down && !s.n('s1').off) { s.setDown('s1', true); }
      if (el < 15000) { setTimeout(tick, 200); return; }
      const v = labVerdict(s, M, L), o = $('#verdict'); o.hidden = false; o.className = 'verdict ' + (v.pass ? 'ok' : 'no'); run = null; e.target.textContent = 'Run the 15-second test';
      o.textContent = v.pass ? `Mission passed. ${Math.round(v.lost * 100)}% lost, ${v.wait.toFixed(1)} sec wait, ₹${v.cost.toLocaleString('en-IN')} a month.` : 'Not yet: ' + v.why.join('; ') + '.';
      s.data.line = v.pass ? 'That design holds up.' : 'Change your parts and run the test again.';
      if (v.pass && !S.miss[M.id]) { S.miss[M.id] = 1; S.cups += 20; today(); save(); toast('Mission passed. +20 cups of chai'); } mis();
    }; tick();
  };
  mis(); setM(); up();
}

/* checks every lesson, sim and mission; run from the console */
window.__selftest = () => {
  const bad = [];
  LESSONS.forEach(l => {
    if (!l.sim && !VIS[l.vis]) bad.push('no visual: ' + l.id); if (l.sim && !SIMS[l.sim]) bad.push('no sim: ' + l.id);
    l.quiz.forEach(q => { if (q[2] >= q[1].length) bad.push('quiz: ' + l.id); });
  });
  CASES.forEach(c => { c.steps.forEach(s => s[1].forEach(n => { if (!c.nodes[n]) bad.push('case node ' + c.id + ':' + n); })); c.fixes.forEach(f => { if (!LESSONS.some(l => l.id === f[2])) bad.push('case link ' + f[2]); }); });
  FIXES.forEach(f => f[1].forEach(id => { if (!LESSONS.some(l => l.id === id)) bad.push('fix link ' + id); }));
  for (const k in SIMS) {
    try {
      const c = SIMS[k](), s = new Sim(c); for (let t = 0; t < 12000; t += 16) s.step(16);
      (c.controls || []).forEach(x => { if (x.k === 'toggle') x.set(s, true); if (x.k === 'btn') x.do(s); });
      for (let t = 0; t < 12000; t += 16) s.step(16);
      if (!s.total.ok && k !== 'x') bad.push('sim served nothing: ' + k);
    } catch (e) { bad.push('sim ' + k + ': ' + e.message); }
  }
  const missions = MISSIONS.map(m => { const base = { servers: 1, cache: false, replicas: 0, queue: false, cdn: false }, a = labHeadless(m, { ...base, ...m.pass }), b = labHeadless(m, base); return { id: m.id, pass: a.pass, why: a.why, lost: +a.lost.toFixed(3), wait: +a.wait.toFixed(2), baseFails: !b.pass }; });
  return { lessons: LESSONS.length, cases: CASES.length, words: WORDS.length, bad, missions };
};

/* boot */
today(); score();
const first = location.hash.slice(1); go(valid(first) ? first : 'home', true);
(async () => {
  if (!window.claude || !window.claude.use) return;
  const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); if (!db || !user) return;
  try {
    const id = await user.id(), ref = db.collection('data/users/' + id).doc('progress'), snap = await ref.get(), remote = snap && (snap.data ? snap.data() : snap);
    cloud = ref;
    if (remote && remote.cups >= S.cups) { S = Object.assign(S, remote); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} score(); if (view === 'home') { clear(); render(); } }
    else if (S.cups) save();
  } catch (e) {}
})();
