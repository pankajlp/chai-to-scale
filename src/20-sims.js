/* Each sim is a small recipe: nodes, a route function and the controls the learner can touch. */
const sec = v => v.toFixed(1) + 's', perSec = v => v + '/sec';
const C0 = { kind: 'client', label: 'Customers' };
const leastBusy = (s, ids) => { const a = s.alive(ids); if (!a.length) return ids[0]; return a.sort((x, y) => (s.n(x).busy + s.n(x).q.length) - (s.n(y).busy + s.n(y).q.length))[0]; };
const rateCtl = (val, max, label = 'Customers per second') => ({ k: 'range', label, min: .5, max, step: .5, val, fmt: perSec, set: (s, v) => s.rate = v });
const SIMS = {
  stall: () => ({
    rate: 1.5, h: 220, nodes: { c: { ...C0, x: 0, y: .5 }, s: { label: 'Your stall', sub: 'makes tea', x: 1, y: .5, ms: 620, queue: 7 } }, edges: [['c', 's']],
    route: (p, at) => at === 'c' ? 's' : null, okMs: 3200,
    controls: [rateCtl(1.5, 10), { k: 'range', label: 'Helpers at the stall', min: 1, max: 5, val: 1, fmt: v => v, set: (s, v) => { s.n('s').workers = v; } }],
    say: (s, r) => s.signal() === 'stop' ? 'Too many customers. The line is full and people are walking away.' : s.signal() === 'wait' ? 'The line is growing. People are starting to wait too long.' : 'Calm. Every customer gets chai quickly.'
  }),
  clientserver: () => ({
    rate: .7, h: 240, reqWord: 'Request (the order)',
    nodes: { a: { kind: 'client', label: 'Phone', x: 0, y: .05 }, b: { kind: 'client', label: 'Laptop', x: 0, y: .5 }, d: { kind: 'client', label: 'Tablet', x: 0, y: .95 }, s: { label: 'Server', sub: 'always on', x: 1, y: .5, ms: 300, workers: 4, queue: 8 } },
    edges: [['a', 's'], ['b', 's'], ['d', 's']], tag: () => ({ from: 'abd'[Math.random() * 3 | 0] }), route: (p, at) => at === 's' ? null : 's',
    controls: [{ k: 'btn', label: 'Send one request', do: s => s.spawn({ from: 'b' }) }, rateCtl(.7, 5, 'Requests per second')],
    say: () => 'Clients ask. The server answers. Blue goes in, green comes back.'
  }),
  dns: () => ({
    rate: .8, h: 240, hop: 420, okMs: 2600, reqWord: 'Your request',
    nodes: { c: { kind: 'client', label: 'Your phone', x: 0, y: .75 }, d: { kind: 'cache', label: 'Phonebook', sub: 'DNS', x: .5, y: .05, ms: 350, workers: 4, queue: 8 }, s: { label: 'Website', sub: '142.250.1.1', x: 1, y: .75, ms: 200, workers: 4, queue: 8 } },
    edges: [['c', 'd'], ['d', 's'], ['c', 's']], route: (p, at, s) => at === 'c' ? (s.data.mem ? 's' : 'd') : at === 'd' ? 's' : null,
    controls: [{ k: 'toggle', label: 'Phone remembers the address', val: false, set: (s, v) => s.data.mem = v }],
    say: (s) => s.data.mem ? 'Address remembered. The phone skips the phonebook and goes straight there.' : 'Every visit first asks the phonebook: what number is this name?'
  }),
  lat: () => ({
    rate: 3, h: 220, okMs: 4000, nodes: { c: { ...C0, x: 0, y: .5 }, s: { label: 'Stall', x: 1, y: .5, ms: 1000, workers: 2, queue: 12 } }, edges: [['c', 's']],
    route: (p, at) => at === 'c' ? 's' : null,
    controls: [rateCtl(3, 8), { k: 'range', label: 'Time for one cup', min: .2, max: 2, step: .1, val: 1, fmt: sec, set: (s, v) => s.n('s').ms = v * 1000 }, { k: 'range', label: 'Helpers', min: 1, max: 6, val: 2, set: (s, v) => s.n('s').workers = v }],
    say: s => { const n = s.n('s'); return `Latency: ${(n.ms / 1000).toFixed(1)} sec per cup. Throughput: ${(n.workers / (n.ms / 1000)).toFixed(1)} cups per sec at most.`; }
  }),
  db: () => ({
    rate: 1, h: 220, okWord: 'Orders done', reqWord: 'Order',
    nodes: { c: { ...C0, x: 0, y: .5 }, s: { label: 'Your stall', sub: 'in your head', x: .5, y: .5, ms: 250, workers: 3, queue: 6 }, d: { kind: 'db', label: 'Notebook', sub: 'database', x: 1, y: .5, ms: 220, workers: 3, queue: 6 } },
    edges: [['c', 's'], ['s', 'd']], init: s => { s.data.head = 0; s.data.book = 0; s.data.useDb = true; },
    route: (p, at, s) => at === 'c' ? 's' : at === 's' && s.data.useDb ? 'd' : null,
    onDone: (p, s) => { s.data.useDb ? s.data.book++ : s.data.head++; },
    controls: [{ k: 'toggle', label: 'Write orders in the notebook', val: true, set: (s, v) => { s.data.useDb = v; s.n('d').off = !v; } },
      { k: 'btn', label: 'Power cut', do: s => { s.data.head = 0; s.setDown('s', true); setTimeout(() => s.setDown('s', false), 1500); s.data.cut = (s.data.cut || 0) + 1; } }],
    say: s => s.data.useDb ? `Notebook holds ${s.data.book} orders. A power cut cannot erase them.` : `${s.data.head} orders in memory only. Press Power cut and they vanish.`
  }),
  vert: () => ({
    rate: 5, h: 220, nodes: { c: { ...C0, x: 0, y: .5 }, s: { label: 'One big stall', x: 1, y: .5, ms: 620, workers: 1, queue: 8 } }, edges: [['c', 's']],
    route: (p, at) => at === 'c' ? 's' : null,
    controls: [rateCtl(5, 16), { k: 'range', label: 'Stall size', min: 1, max: 8, val: 1, fmt: v => v + 'x', set: (s, v) => { s.n('s').workers = v; s.n('s').sub = 'size ' + v + 'x'; s.data.size = v; } },
      { k: 'btn', label: 'Stall breaks down', do: s => { s.setDown('s', true); setTimeout(() => s.setDown('s', false), 3000); } }],
    say: s => { const z = s.data.size || 1; return `Monthly cost: ₹${(15000 * Math.pow(1.6, z - 1) | 0).toLocaleString('en-IN')}. Each size up costs more than the one before.${z === 8 ? ' This is the biggest stall on sale.' : ''}`; }
  }),
  horiz: () => {
    const ids = ['s1', 's2', 's3', 's4', 's5', 's6'], nodes = { c: { ...C0, x: 0, y: .5 }, lb: { kind: 'lb', label: 'Manager', sub: 'points the way', x: .36, y: .5 } };
    ids.forEach((id, i) => nodes[id] = { label: 'Stall ' + (i + 1), x: 1, y: .5, ms: 620, queue: 4, off: true });
    return {
      rate: 3, h: 300, nw: 74, nh: 38, nodes, edges: [['c', 'lb'], ...ids.map(i => ['lb', i])], route: (p, at, s) => at === 'c' ? 'lb' : at === 'lb' ? leastBusy(s, ids) : null,
      controls: [rateCtl(3, 12), { k: 'range', label: 'Number of stalls', min: 1, max: 6, val: 1, set: (s, v) => { ids.forEach((id, i) => { const n = s.n(id); n.off = i >= v; n.y = v === 1 ? .5 : i / (v - 1); }); s.data.n = v; } },
        { k: 'btn', label: 'Stall 1 breaks', do: s => { s.setDown('s1', true); setTimeout(() => s.setDown('s1', false), 4000); } }],
      say: (s, r) => `${s.data.n || 1} stall${s.data.n > 1 ? 's' : ''}, ${(s.data.n || 1) * 1.6} cups per sec. ${s.signal() === 'go' ? 'Keeping up.' : 'Add stalls to keep up.'}`
    };
  },
  lb: () => {
    const ids = ['a', 'b', 'c2'];
    return {
      rate: 4, h: 280, nw: 84, okMs: 2400, nodes: { c: { ...C0, x: 0, y: .5 }, lb: { kind: 'lb', label: 'Load balancer', x: .4, y: .5 }, a: { label: 'Fast server', sub: 'new', x: 1, y: 0, ms: 300, workers: 2, queue: 6 }, b: { label: 'Fast server', sub: 'new', x: 1, y: .5, ms: 300, workers: 2, queue: 6 }, c2: { label: 'Slow server', sub: 'old', x: 1, y: 1, ms: 900, workers: 1, queue: 6 } },
      edges: [['c', 'lb'], ['lb', 'a'], ['lb', 'b'], ['lb', 'c2']], init: s => { s.data.mode = 'rr'; s.data.i = 0; s.data.health = false; },
      route: (p, at, s) => {
        if (at === 'c') return 'lb'; if (at !== 'lb') return null;
        const pool = s.data.health ? s.alive(ids) : ids; if (!pool.length) return ids[0];
        if (s.data.mode === 'rand') return pool[Math.random() * pool.length | 0];
        if (s.data.mode === 'least') return leastBusy(s, pool);
        return pool[s.data.i++ % pool.length];
      },
      controls: [rateCtl(4, 10, 'Requests per second'), { k: 'seg', label: 'How to choose', val: 'rr', opts: [['rr', 'Take turns'], ['rand', 'Random'], ['least', 'Shortest line']], set: (s, v) => s.data.mode = v },
        { k: 'toggle', label: 'Health check', val: false, set: (s, v) => s.data.health = v }, { k: 'btn', label: 'Kill a fast server', do: s => { s.setDown('a', !s.n('a').down); } }],
      say: s => s.n('a').down && !s.data.health ? 'A server is dead and the balancer still sends people there. Turn on Health check.' : s.data.mode === 'least' ? 'Shortest line: the slow server gets fewer customers.' : s.data.mode === 'rr' ? 'Take turns: the slow server gets as many as the fast ones, so its line piles up.' : 'Random: simple, and sometimes unlucky.'
    };
  },
  state: () => {
    const ids = ['s1', 's2', 's3'];
    return {
      rate: 3, h: 280, nw: 84, lostWord: 'Forgotten', nodes: { c: { ...C0, x: 0, y: .5 }, lb: { kind: 'lb', label: 'Manager', x: .32, y: .5 }, s1: { label: 'Stall 1', x: .66, y: 0, ms: 250, workers: 3, queue: 6 }, s2: { label: 'Stall 2', x: .66, y: .5, ms: 250, workers: 3, queue: 6 }, s3: { label: 'Stall 3', x: .66, y: 1, ms: 250, workers: 3, queue: 6 }, r: { kind: 'cache', label: 'Shared book', sub: 'who is who', x: 1, y: .5, ms: 80, workers: 6, queue: 10, off: true } },
      edges: [['c', 'lb'], ['lb', 's1'], ['lb', 's2'], ['lb', 's3'], ['s1', 'r'], ['s2', 'r'], ['s3', 'r']], init: s => s.data.sh = false,
      tag: () => ({ home: ids[Math.random() * 3 | 0] }),
      route: (p, at, s) => {
        if (at === 'c') return 'lb'; if (at === 'lb') return ids[Math.random() * 3 | 0];
        if (at === 'r') return null;
        if (s.data.sh) return 'r';
        if (at !== p.tag.home) { s.lose(p); return undefined; }
        return null;
      },
      controls: [{ k: 'toggle', label: 'Keep customer details in a shared book', val: false, set: (s, v) => { s.data.sh = v; s.n('r').off = !v; } }],
      say: s => s.data.sh ? 'Any stall can serve anyone. The stalls hold nothing personal, so they are stateless.' : 'Each stall only knows its own regulars. If the manager sends you elsewhere: "Who are you?"'
    };
  },
  auto: () => {
    const ids = ['s1', 's2', 's3', 's4', 's5'], nodes = { c: { ...C0, x: 0, y: .5 }, lb: { kind: 'lb', label: 'Manager', x: .36, y: .5 } };
    ids.forEach((id, i) => nodes[id] = { label: 'Stall ' + (i + 1), x: 1, y: i / 4, ms: 620, queue: 4, off: i > 0 });
    return {
      h: 300, nw: 74, nh: 36, nodes, edges: [['c', 'lb'], ...ids.map(i => ['lb', i])], route: (p, at, s) => at === 'c' ? 'lb' : at === 'lb' ? leastBusy(s, ids) : null,
      init: s => { s.data.auto = true; s.data.next = 0; s.data.on = 1; s.data.cost = 0; },
      tick: (s, dt) => {
        s.rate = 3.5 + 3.3 * Math.sin(s.t / 7000 - 1.2); s.data.cost += s.data.on * dt;
        if (s.data.auto && s.t > s.data.next) {
          const up = s.alive(ids), load = s.rate / (up.length * 1.6);
          if (load > .75 && up.length < 5) { s.n(ids[up.length]).off = false; s.data.next = s.t + 1500; }
          else if (load < .4 && up.length > 1) { s.n(ids[up.length - 1]).off = true; s.data.next = s.t + 2500; }
          s.data.on = s.alive(ids).length;
        }
      },
      controls: [{ k: 'toggle', label: 'Autoscaling', val: true, set: (s, v) => { s.data.auto = v; if (!v) { ids.forEach((id, i) => s.n(id).off = i > 0); s.data.on = 1; } } }],
      say: s => `Customers now: ${s.rate.toFixed(1)}/sec. Stalls open: ${s.data.on}. ${s.data.auto ? 'Stalls open at rush hour and close when it is quiet.' : 'Only one stall, whatever the crowd.'}`
    };
  },
  cache: () => ({
    rate: 5, h: 260, okMs: 1800, nodes: { c: { ...C0, x: 0, y: .5 }, s: { label: 'Server', x: .34, y: .5, ms: 100, workers: 8, queue: 8 }, k: { kind: 'cache', label: 'Cache', sub: 'ready flask', x: .67, y: 0, ms: 30, workers: 12, queue: 10 }, d: { kind: 'db', label: 'Database', sub: 'slow', x: 1, y: .5, ms: 900, workers: 3, queue: 8 } },
    edges: [['c', 's'], ['s', 'k'], ['k', 'd'], ['s', 'd']], init: s => { s.data.on = true; s.data.hit = .8; },
    route: (p, at, s) => { if (at === 'c') return 's'; if (at === 's') { if (s.data.on) { p.tag.hit = Math.random() < s.data.hit; return 'k'; } return 'd'; } if (at === 'k') return p.tag.hit ? null : 'd'; return null; },
    controls: [rateCtl(5, 12, 'Requests per second'), { k: 'range', label: 'Share found in cache', min: 0, max: 95, step: 5, val: 80, fmt: v => v + '%', set: (s, v) => s.data.hit = v / 100 }, { k: 'toggle', label: 'Cache on', val: true, set: (s, v) => { s.data.on = v; s.n('k').off = !v; } }],
    say: s => s.data.on ? 'Most answers come from the flask of ready chai. The kitchen stays calm.' : 'Every request goes all the way to the slow database.'
  }),
  stale: () => ({
    rate: 3, h: 240, okMs: 2000, okWord: 'Answers', legend: '<span><i style="background:var(--wait)"></i>Old price served</span>',
    nodes: { c: { ...C0, x: 0, y: .5 }, k: { kind: 'cache', label: 'Price card', sub: 'cache', x: .5, y: .5, ms: 60, workers: 8, queue: 8 }, d: { kind: 'db', label: 'Owner', sub: 'true price', x: 1, y: .5, ms: 500, workers: 3, queue: 8 } },
    edges: [['c', 'k'], ['k', 'd']], init: s => { Object.assign(s.data, { real: 10, card: 10, ttl: 8, until: 8000, wrong: 0, inval: false }); },
    tick: s => { if (s.t > s.data.until) { s.data.expired = true; } },
    route: (p, at, s) => {
      if (at === 'c') return 'k';
      if (at === 'k') { if (s.data.expired) { s.data.expired = false; s.data.fetching = true; return 'd'; } p.flag = s.data.card !== s.data.real; if (p.flag) s.data.wrong++; return null; }
      s.data.card = s.data.real; s.data.until = s.t + s.data.ttl * 1000; return null;
    },
    controls: [{ k: 'btn', label: 'Raise the price', do: s => { s.data.real += 5; if (s.data.inval) { s.data.card = s.data.real; } } }, { k: 'toggle', label: 'Fix the card on every change', val: false, set: (s, v) => s.data.inval = v },
      { k: 'range', label: 'Card expires after', min: 2, max: 15, val: 8, fmt: v => v + ' sec', set: (s, v) => { s.data.ttl = v; s.data.until = Math.min(s.data.until, s.t + v * 1000); } }],
    say: s => `True price ₹${s.data.real}. Card says ₹${s.data.card}. ${s.data.real === s.data.card ? 'They match.' : 'Customers are being told the wrong price!'} Wrong answers so far: ${s.data.wrong}.`
  }),
  cdn: () => ({
    rate: 3, h: 250, okMs: 1600, nodes: { d: { kind: 'client', label: 'Delhi users', x: 0, y: .1 }, g: { kind: 'client', label: 'Guwahati users', x: 0, y: .9 }, o: { label: 'Main server', sub: 'Mumbai', x: 1, y: .5, ms: 300, workers: 3, queue: 10, hop: 1200 }, e1: { kind: 'cache', label: 'Near copy', sub: 'Delhi', x: .3, y: .1, ms: 30, workers: 6, queue: 8, hop: 160, off: true }, e2: { kind: 'cache', label: 'Near copy', sub: 'Guwahati', x: .3, y: .9, ms: 30, workers: 6, queue: 8, hop: 160, off: true } },
    edges: [['d', 'o'], ['g', 'o'], ['d', 'e1'], ['g', 'e2']], init: s => s.data.on = false, tag: () => ({ from: Math.random() < .5 ? 'd' : 'g' }),
    route: (p, at, s) => { if (at === 'o' || at === 'e1' || at === 'e2') return null; return s.data.on ? (at === 'd' ? 'e1' : 'e2') : 'o'; },
    controls: [{ k: 'toggle', label: 'Turn on CDN', val: false, set: (s, v) => { s.data.on = v; s.n('e1').off = !v; s.n('e2').off = !v; } }],
    say: s => s.data.on ? 'Photos and videos are served from a copy near each user.' : 'Everyone travels all the way to Mumbai for every photo.'
  }),
  index: () => ({
    rate: 3, h: 220, okMs: 2200, nodes: { c: { ...C0, x: 0, y: .5 }, s: { label: 'App', x: .45, y: .5, ms: 80, workers: 8, queue: 8 }, d: { kind: 'db', label: 'Register', sub: 'page by page', x: 1, y: .5, ms: 1400, workers: 4, queue: 8 } }, edges: [['c', 's'], ['s', 'd']],
    route: (p, at) => at === 'c' ? 's' : at === 's' ? 'd' : null,
    controls: [rateCtl(3, 10, 'Searches per second'), { k: 'toggle', label: 'Add an index', val: false, set: (s, v) => { s.n('d').ms = v ? 90 : 1400; s.n('d').sub = v ? 'uses the index' : 'page by page'; s.data.ix = v; } }],
    say: s => s.data.ix ? 'Finding a name now takes about 20 page flips out of a million.' : 'Without an index the database reads the whole register for each search.'
  }),
  replica: () => ({
    rate: 6, h: 280, nw: 84, nodes: { c: { ...C0, x: 0, y: .5 }, s: { label: 'App', x: .34, y: .5, ms: 40, workers: 12, queue: 12 }, p: { kind: 'db', label: 'Main copy', sub: 'writes', x: 1, y: 0, ms: 600, workers: 3, queue: 8 }, r1: { kind: 'db', label: 'Copy 1', sub: 'reads', x: 1, y: .5, ms: 600, workers: 3, queue: 8, off: true }, r2: { kind: 'db', label: 'Copy 2', sub: 'reads', x: 1, y: 1, ms: 600, workers: 3, queue: 8, off: true } },
    edges: [['c', 's'], ['s', 'p'], ['s', 'r1'], ['s', 'r2'], ['p', 'r1'], ['p', 'r2']], init: s => s.data.n = 0,
    tag: () => ({ w: Math.random() < .15 }),
    route: (p, at, s) => { if (at === 'c') return 's'; if (at === 's') { if (p.tag.w) return 'p'; const pool = ['p', 'r1', 'r2'].slice(s.n('p').down ? 1 : 0, 1 + s.data.n); return leastBusy(s, pool.length ? pool : ['p']); } return null; },
    color: (p, C) => p.tag.w && p.state === 'move' ? C.wait : null, legend: '<span><i style="background:var(--wait)"></i>Write (new data)</span>',
    controls: [rateCtl(6, 16, 'Requests per second'), { k: 'range', label: 'Read copies', min: 0, max: 2, val: 0, set: (s, v) => { s.data.n = v; s.n('r1').off = v < 1; s.n('r2').off = v < 2; } },
      { k: 'btn', label: 'Main copy fails', do: s => { s.setDown('p', true); setTimeout(() => { s.setDown('p', false); }, 3500); } }],
    say: s => s.n('p').down ? (s.data.n ? 'Reads continue from copies. Writes stop until a copy is promoted.' : 'No copies, so everything is down.') : `85% of work is reading. ${s.data.n} extra cop${s.data.n === 1 ? 'y' : 'ies'} share that work.`
  }),
  shard: () => {
    const ids = ['d1', 'd2', 'd3', 'd4'], names = [['A to Z'], ['A to M', 'N to Z'], ['A to H', 'I to P', 'Q to Z'], ['A to F', 'G to L', 'M to R', 'S to Z']];
    const nodes = { c: { ...C0, x: 0, y: .5 }, s: { label: 'Router', sub: 'reads the key', x: .36, y: .5, ms: 30, workers: 20, queue: 20 } };
    ids.forEach((id, i) => nodes[id] = { kind: 'db', label: 'Shard ' + (i + 1), x: 1, y: .5, ms: 450, workers: 3, queue: 8, off: i > 0 });
    return {
      rate: 8, h: 300, nh: 38, nw: 84, nodes, edges: [['c', 's'], ...ids.map(i => ['s', i])], init: s => { s.data.n = 1; s.data.hot = false; },
      route: (p, at, s) => { if (at === 'c') return 's'; if (at !== 's') return null; if (s.data.hot && Math.random() < .7) return 'd1'; return ids[Math.random() * s.data.n | 0]; },
      controls: [rateCtl(8, 22, 'Requests per second'), { k: 'range', label: 'Shards', min: 1, max: 4, val: 1, set: (s, v) => { s.data.n = v; ids.forEach((id, i) => { const n = s.n(id); n.off = i >= v; n.y = v === 1 ? .5 : i / (v - 1); n.sub = names[v - 1][i]; }); } }, { k: 'toggle', label: 'Celebrity on Shard 1', val: false, set: (s, v) => s.data.hot = v }],
      say: s => s.data.hot ? 'One famous user sends most traffic to one shard. This is called a hot shard.' : `The data is cut into ${s.data.n} piece${s.data.n > 1 ? 's' : ''}. Each piece is a separate database.`
    };
  },
  cap: () => ({
    rate: 3, h: 280, nw: 84, okWord: 'Answered', lostWord: 'Refused', legend: '<span><i style="background:var(--wait)"></i>Answer may be out of date</span>',
    nodes: { a: { kind: 'client', label: 'Patna users', x: 0, y: .1 }, b: { kind: 'client', label: 'Pune users', x: 0, y: .9 }, n1: { kind: 'db', label: 'Patna branch', x: .55, y: .1, ms: 200, workers: 4, queue: 8 }, n2: { kind: 'db', label: 'Pune branch', x: .55, y: .9, ms: 200, workers: 4, queue: 8 }, l: { kind: 'lb', label: 'Phone line', sub: 'keeps in sync', x: 1, y: .5 } },
    edges: [['a', 'n1'], ['b', 'n2'], ['n1', 'l'], ['n2', 'l']], init: s => { s.data.cut = false; s.data.mode = 'ap'; s.data.stale = 0; }, tag: () => ({ from: Math.random() < .5 ? 'a' : 'b' }),
    route: (p, at, s) => {
      if (at === 'a') return 'n1'; if (at === 'b') return 'n2';
      if (s.data.cut && s.data.mode === 'cp') { s.lose(p); return undefined; }
      if (s.data.cut) { p.flag = true; s.data.stale++; } return null;
    },
    controls: [{ k: 'btn', label: 'Cut / restore the phone line', do: s => { s.data.cut = !s.data.cut; s.n('l').down = s.data.cut; } }, { k: 'seg', label: 'When the line is cut', val: 'ap', opts: [['ap', 'Stay open'], ['cp', 'Refuse orders']], set: (s, v) => s.data.mode = v }],
    say: s => !s.data.cut ? 'Line is fine. Both branches agree, and everyone gets a correct answer.' : s.data.mode === 'ap' ? `Stay open: customers are served, but branches may disagree. Risky answers: ${s.data.stale}.` : 'Refuse: every answer is correct, but customers are turned away.'
  }),
  queue: () => ({
    rate: 3, h: 250, okMs: 2200, okWord: 'Got a reply', bg: true, legend: '<span><i style="background:var(--mute)"></i>Work happening behind the scenes</span>',
    nodes: { c: { ...C0, x: 0, y: .5 }, s: { label: 'Counter', x: .36, y: .5, ms: 80, workers: 8, queue: 8 }, q: { kind: 'queue', label: 'Token board', x: .68, y: 0, ms: 1, workers: 30, queue: 30, ack: true, off: false }, k: { label: 'Kitchen', sub: 'slow worker', x: 1, y: .5, ms: 700, workers: 2, queue: 40 } },
    edges: [['c', 's'], ['s', 'q'], ['q', 'k'], ['s', 'k']], init: s => { s.data.on = false; s.patience = 7000; },
    route: (p, at, s) => { if (at === 'c') return 's'; if (at === 's') return s.data.on ? 'q' : 'k'; if (at === 'q') return 'k'; return null; },
    controls: [rateCtl(3, 8), { k: 'toggle', label: 'Use a queue (give tokens)', val: false, set: (s, v) => { s.data.on = v; s.n('q').off = !v; s.n('k').queue = v ? 60 : 6; } }],
    say: (s) => s.data.on ? `Customers get a token at once and sit down. Orders waiting in kitchen: ${s.n('k').q.length}.` : 'Everyone stands at the counter until their food is ready.'
  }),
  pubsub: () => ({
    rate: 1.5, h: 280, nw: 84, okMs: 2500, okWord: 'Orders done', legend: '<span><i style="background:var(--mute)"></i>Message to a team</span>',
    nodes: { c: { ...C0, x: 0, y: .5 }, o: { label: 'Order', x: .3, y: .5, ms: 120, workers: 4, queue: 8 }, b: { kind: 'queue', label: 'Notice board', sub: 'event bus', x: .6, y: .5, ms: 1, workers: 30, queue: 30, ack: true, off: true }, k: { label: 'Kitchen', x: 1, y: 0, ms: 500, workers: 2, queue: 12 }, r: { label: 'Rewards', x: 1, y: .5, ms: 500, workers: 2, queue: 12 }, m: { label: 'SMS', x: 1, y: 1, ms: 500, workers: 2, queue: 12 } },
    edges: [['c', 'o'], ['o', 'k'], ['k', 'r'], ['r', 'm'], ['o', 'b'], ['b', 'k'], ['b', 'r'], ['b', 'm']], init: s => { s.data.bus = false; },
    route: (p, at, s) => {
      if (at === 'c') return 'o';
      if (s.data.bus) { if (at === 'o') return 'b'; if (at === 'b') return ['k', 'r', 'm']; return null; }
      if (at === 'o') return 'k'; if (at === 'k') return 'r'; if (at === 'r') return 'm'; return null;
    },
    controls: [{ k: 'toggle', label: 'Use a notice board', val: false, set: (s, v) => { s.data.bus = v; s.n('b').off = !v; } }, { k: 'btn', label: 'SMS team goes on break', do: s => { s.setDown('m', !s.n('m').down); } }],
    say: s => s.data.bus ? 'The order posts one notice. Each team reads it in its own time. New teams can join with no changes.' : 'The order must call every team, one after another, and wait for each.'
  }),
  micro: () => {
    const sv = ['o', 'p', 'd'];
    return {
      rate: 3, h: 280, nw: 88, nodes: { c: { ...C0, x: 0, y: .5 }, m: { label: 'One big app', sub: 'does everything', x: .6, y: .5, ms: 300, workers: 6, queue: 10 }, o: { label: 'Orders', x: 1, y: 0, ms: 300, workers: 3, queue: 8, off: true }, p: { label: 'Payments', x: 1, y: .5, ms: 300, workers: 3, queue: 8, off: true }, d: { label: 'Delivery', x: 1, y: 1, ms: 300, workers: 3, queue: 8, off: true } },
      edges: [['c', 'm'], ['c', 'o'], ['c', 'p'], ['c', 'd']], init: s => { s.data.split = false; s.data.bug = false; }, tag: () => ({ t: sv[Math.random() * 3 | 0] }),
      route: (p, at, s) => at === 'c' ? (s.data.split ? p.tag.t : 'm') : null,
      controls: [{ k: 'toggle', label: 'Split into small services', val: false, set: (s, v) => { s.data.split = v; s.n('m').off = v; sv.forEach(i => s.n(i).off = !v); if (s.data.bug) { s.setDown('m', !v); s.setDown('p', v); } } },
        { k: 'btn', label: 'Bug in payment code', do: s => { s.data.bug = !s.data.bug; s.setDown(s.data.split ? 'p' : 'm', s.data.bug); } }],
      say: s => !s.data.bug ? (s.data.split ? 'Three small teams, three small apps. Each can change on its own.' : 'One big app is simple to run. All features live together.') : s.data.split ? 'Only payments are broken. People can still browse and track orders.' : 'One bug in payments took the whole app down.'
    };
  },
  gate: () => ({
    rate: 3, h: 250, nw: 84, okMs: 1800, lostWord: 'Lost', legend: '<span><i style="background:var(--wait)"></i>Bot or spam request</span>',
    nodes: { c: { ...C0, x: 0, y: .1 }, b: { kind: 'client', label: 'Spam bot', x: 0, y: .9 }, g: { kind: 'lb', label: 'Gatekeeper', sub: 'API gateway', x: .42, y: .5 }, s: { label: 'Server', x: 1, y: .5, ms: 300, workers: 4, queue: 10 } },
    edges: [['c', 'g'], ['b', 'g'], ['g', 's']], init: s => { s.data.on = false; s.data.bot = 0; s.data.win = []; s.n('g').gate = (p, S) => { if (!S.data.on || !p.tag.bot) return true; S.data.win = S.data.win.filter(t => t > S.t - 1000); if (S.data.win.length < 2) { S.data.win.push(S.t); return true; } return false; }; },
    tick: (s, dt) => { s.data.bacc = (s.data.bacc || 0) + s.data.bot * dt / 1000; while (s.data.bacc >= 1) { s.data.bacc--; s.spawn({ from: 'b', bot: true }); } },
    route: (p, at) => (at === 'c' || at === 'b') ? 'g' : at === 'g' ? 's' : null, color: (p, C) => p.tag.bot && p.state === 'move' ? C.wait : null,
    controls: [{ k: 'range', label: 'Spam requests per sec', min: 0, max: 30, val: 0, fmt: perSec, set: (s, v) => s.data.bot = v }, { k: 'toggle', label: 'Limit each user to 2 per sec', val: false, set: (s, v) => s.data.on = v }],
    say: s => s.data.on ? `Spam blocked at the gate: ${s.blocked}. Real customers get through.` : s.data.bot ? 'The bot fills every queue, and real customers lose out.' : 'Normal day. Drag the spam slider up.'
  }),
  spof: () => ({
    rate: 3, h: 280, nw: 76, nodes: { c: { ...C0, x: 0, y: .5 }, l: { kind: 'lb', label: 'Balancer', x: .3, y: .25 }, l2: { kind: 'lb', label: 'Balancer 2', x: .3, y: .8, off: true }, s: { label: 'Server', x: .65, y: .25, ms: 250, workers: 4, queue: 8 }, s2: { label: 'Server 2', x: .65, y: .8, ms: 250, workers: 4, queue: 8, off: true }, d: { kind: 'db', label: 'Database', x: 1, y: .25, ms: 200, workers: 4, queue: 8 }, d2: { kind: 'db', label: 'Backup DB', x: 1, y: .8, ms: 200, workers: 4, queue: 8, off: true } },
    edges: [['c', 'l'], ['c', 'l2'], ['l', 's'], ['l', 's2'], ['l2', 's'], ['l2', 's2'], ['s', 'd'], ['s', 'd2'], ['s2', 'd'], ['s2', 'd2']],
    route: (p, at, s) => { if (at === 'c') return s.alive(['l', 'l2'])[0] || 'l'; if (at === 'l' || at === 'l2') return s.alive(['s', 's2'])[0] || 's'; if (at === 's' || at === 's2') return s.alive(['d', 'd2'])[0] || 'd'; return null; },
    init: s => s.data.bk = false,
    controls: [{ k: 'toggle', label: 'Add a backup of everything', val: false, set: (s, v) => { s.data.bk = v; ['l2', 's2', 'd2'].forEach(i => s.n(i).off = !v); } }, ...[['l', 'Break balancer'], ['s', 'Break server'], ['d', 'Break database']].map(([id, label]) => ({ k: 'btn', label, do: s => s.setDown(id, !s.n(id).down) }))],
    say: s => { const d = ['l', 's', 'd'].filter(i => s.n(i).down).length; return !d ? 'All parts working. Now break one.' : s.data.bk ? 'A backup took over. Customers did not notice.' : 'One part failed and the whole system stopped. That part is a single point of failure.'; }
  }),
  retry: () => ({
    rate: 1.2, h: 240, hop: 400, okMs: 3000, okWord: 'Paid', lostWord: 'No reply', nodes: { c: { kind: 'client', label: 'You', x: 0, y: .5 }, a: { label: 'Payment app', x: .5, y: .5, ms: 200, workers: 4, queue: 8 }, b: { kind: 'db', label: 'Bank', sub: 'moves money', x: 1, y: .5, ms: 200, workers: 4, queue: 8 } },
    edges: [['c', 'a'], ['a', 'b']], init: s => { Object.assign(s.data, { retry: false, key: false, double: 0, id: 0, seen: new Set() }); },
    tag: s => ({ id: ++s.data.id }),
    route: (p, at, s) => {
      if (at === 'c') return 'a'; if (at === 'a') return 'b';
      const dup = s.data.seen.has(p.tag.id);
      if (!dup) s.data.seen.add(p.tag.id); else if (!s.data.key) s.data.double++;
      if (Math.random() < .35 && !p.tag.tried) { s.lose(p); if (s.data.retry) { const t = { ...p.tag, tried: true }; setTimeout(() => s.spawn(t), 300); } return undefined; }
      return null;
    },
    controls: [{ k: 'toggle', label: 'Retry when no reply', val: false, set: (s, v) => s.data.retry = v }, { k: 'toggle', label: 'Attach a unique payment ID', val: false, set: (s, v) => s.data.key = v }],
    say: s => `Charged twice: ${s.data.double} times. ${s.data.retry && !s.data.key ? 'Retrying without an ID charges people twice!' : s.data.retry ? 'The bank sees the ID and ignores repeats. Safe.' : 'One in three replies goes missing and nobody tries again.'}`
  }),
  breaker: () => ({
    rate: 3, h: 250, nw: 88, okMs: 2500, legend: '<span><i style="background:var(--wait)"></i>Quick "try later" reply</span>',
    nodes: { c: { ...C0, x: 0, y: .5 }, s: { label: 'Your app', sub: '6 workers', x: .45, y: .5, ms: 200, workers: 6, queue: 8 }, x: { label: 'SMS partner', sub: 'outside company', x: 1, y: .5, ms: 150, workers: 20, queue: 0 } },
    edges: [['c', 's'], ['s', 'x']], init: s => { s.data.brk = false; s.data.bad = false; },
    tick: s => { s.n('s').ms = s.data.bad && !s.data.brk ? 5000 : 200; s.n('x').label = s.data.bad ? 'Hanging' : 'SMS partner'; },
    route: (p, at, s) => at === 'c' ? 's' : at === 's' ? ((s.data.bad && s.data.brk) ? (p.flag = true, null) : 'x') : null,
    controls: [rateCtl(3, 8, 'Requests per second'), { k: 'btn', label: 'Partner stops answering', do: s => s.data.bad = !s.data.bad }, { k: 'toggle', label: 'Circuit breaker', val: false, set: (s, v) => s.data.brk = v }],
    say: s => !s.data.bad ? 'All good. Press the button to make the partner hang.' : s.data.brk ? 'Breaker tripped. The app stops calling the partner and answers instantly.' : 'Every worker is stuck waiting on the partner, so your whole app freezes.'
  }),
};
