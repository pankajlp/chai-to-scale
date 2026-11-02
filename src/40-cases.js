/* Real-app walkthroughs. Figures are rounded public numbers; designs are the usual textbook shape. */
const CASES = [
{ id: 'shortlink', name: 'Short links', tag: 'Starter', hook: 'Turn a long web address into a tiny one, like bit.ly. It looks small, and it teaches almost every basic idea.',
  nums: [['10 crore', 'links made per month, as a practice target'], ['100 to 1', 'more clicks than new links'], ['7 letters', 'gives 3.5 lakh crore possible codes']],
  nodes: { c: { kind: 'client', label: 'User', x: 0, y: .5 }, l: { kind: 'lb', label: 'Balancer', x: .25, y: .5 }, a: { label: 'App servers', x: .5, y: .5 }, k: { kind: 'cache', label: 'Cache', x: .75, y: .05 }, g: { label: 'Code maker', x: .75, y: .95 }, d: { kind: 'db', label: 'Database', x: 1, y: .5 } },
  edges: [['c', 'l'], ['l', 'a'], ['a', 'k'], ['a', 'g'], ['a', 'd'], ['k', 'd'], ['g', 'd']],
  steps: [['You paste a long link. The balancer picks a free app server.', ['c', 'l', 'a']], ['The code maker creates a unique short code such as x7Kp2q.', ['a', 'g']], ['Code and long link are saved as a pair in the database.', ['g', 'd']], ['Someone clicks the short link. The app checks the cache first, since a few links get most clicks.', ['c', 'l', 'a', 'k']], ['On a cache miss, it reads the database, then saves the answer in the cache.', ['a', 'd', 'k']], ['The browser is told to jump to the long address.', ['a', 'l', 'c']]],
  fixes: [['Two links get the same code', 'Use a counter or a block of reserved numbers, and turn that number into letters.', 'database'], ['Reads hugely outnumber writes', 'Cache popular links and add read copies.', 'cache'], ['Bots create millions of links', 'Rate limit per user.', 'gateway']] },
{ id: 'irctc', name: 'IRCTC Tatkal', tag: 'Spike', hook: 'At 10 am sharp, lakhs of people fight for a few seats. Two people must never get the same seat.',
  nums: [['25,000+', 'tickets a minute at peak, as reported'], ['10:00 am', 'almost all demand arrives at once'], ['0', 'double bookings allowed']],
  nodes: { c: { kind: 'client', label: 'Lakhs of users', x: 0, y: .5 }, g: { kind: 'lb', label: 'Gatekeeper', sub: 'stops bots', x: .25, y: .5 }, w: { kind: 'queue', label: 'Waiting room', x: .5, y: .05 }, b: { label: 'Booking', x: .5, y: .95 }, s: { kind: 'db', label: 'Seat database', x: .78, y: .95 }, p: { label: 'Payment', x: 1, y: .4 } },
  edges: [['c', 'g'], ['g', 'w'], ['w', 'b'], ['g', 'b'], ['b', 's'], ['b', 'p']],
  steps: [['Everyone arrives at 10:00. The gatekeeper checks logins and blocks bots.', ['c', 'g']], ['A waiting room lets people in at a safe speed, so servers are not crushed.', ['g', 'w', 'b']], ['Booking locks the seat in the database. One row, one winner.', ['b', 's']], ['You get a few minutes to pay. The seat stays held for you.', ['b', 'p']], ['Payment and confirmed seat are saved as one transaction. If payment fails, the seat is released.', ['p', 'b', 's']]],
  fixes: [['Crowd arrives in one second', 'Autoscaling is too slow. Add servers before 10 am and use a waiting room.', 'autoscale'], ['Two people pick one seat', 'Lock the row, and let the database pick one winner.', 'transactions'], ['Agents use bots', 'Rate limits, captcha and login checks at the gate.', 'gateway'], ['Availability page is overloaded', 'Serve seat counts from a cache that is a few seconds old.', 'stale']] },
{ id: 'whatsapp', name: 'WhatsApp', tag: 'Real-time', hook: 'Your message reaches a friend in under a second, even if the friend is offline right now.',
  nums: [['200 crore+', 'users worldwide'], ['10,000 crore+', 'messages a day, as reported'], ['Under 1 sec', 'delivery target']],
  nodes: { a: { kind: 'client', label: 'You', x: 0, y: .15 }, g: { label: 'Chat server A', x: .3, y: .15 }, r: { kind: 'cache', label: 'Who is online', x: .55, y: .55 }, h: { label: 'Chat server B', x: .72, y: .15 }, b: { kind: 'client', label: 'Friend', x: 1, y: .15 }, q: { kind: 'db', label: 'Message store', x: .3, y: .95 }, n: { label: 'Push alert', x: 1, y: .95 } },
  edges: [['a', 'g'], ['g', 'r'], ['g', 'h'], ['h', 'b'], ['g', 'q'], ['q', 'n'], ['n', 'b']],
  steps: [['Your phone keeps one open line to a chat server, like a phone call that never ends.', ['a', 'g']], ['The server saves the message, then you see one tick.', ['g', 'q']], ['It asks: which server is your friend connected to?', ['g', 'r']], ['Friend online: message goes across the two servers, and you see two ticks.', ['g', 'h', 'b']], ['Friend offline: it waits in the store and a push alert goes out.', ['q', 'n', 'b']]],
  fixes: [['Normal requests are too slow for chat', 'Keep a permanent two-way line open, known as a WebSocket.', 'client'], ['Friend is offline', 'Store the message safely, and deliver later.', 'queue'], ['Messages arrive in the wrong order', 'Give each chat its own sequence numbers.', 'sharding'], ['Group of 1,000 people', 'One message fans out to every member with a queue.', 'pubsub']] },
{ id: 'hotstar', name: 'Hotstar IPL', tag: 'Live video', hook: 'A crore-plus people watch the same ball at the same second. Then a wicket falls and everyone opens the app.',
  nums: [['5.9 crore', 'people watching at once, reported peak in 2023'], ['Seconds', 'for a crowd to surge after a wicket'], ['Many Tbps', 'video traffic']],
  nodes: { s: { kind: 'client', label: 'Stadium camera', x: 0, y: .15 }, e: { label: 'Video cutter', sub: 'small chunks', x: .3, y: .15 }, o: { kind: 'db', label: 'Origin', x: .6, y: .15 }, c: { kind: 'cache', label: 'CDN edges', x: .6, y: .9 }, u: { kind: 'client', label: 'Viewers', x: 1, y: .9 }, a: { label: 'App + login', x: 1, y: .15 } },
  edges: [['s', 'e'], ['e', 'o'], ['o', 'c'], ['c', 'u'], ['u', 'a']],
  steps: [['Video from the ground arrives at the encoders.', ['s', 'e']], ['It is cut into chunks of a few seconds, each at several quality levels.', ['e', 'o']], ['CDN servers across India pull chunks from the origin once.', ['o', 'c']], ['Your phone fetches each chunk from a nearby CDN server. Slow network? It picks lower quality.', ['c', 'u']], ['Separately, app and login servers take the crowd surge. Extra features are switched off first.', ['u', 'a']]],
  fixes: [['Traffic jumps on key moments', 'Add capacity well before the match. Autoscaling alone is too late.', 'autoscale'], ['Origin cannot serve crores', 'CDN carries nearly all video.', 'cdn'], ['Backend overloaded', 'Turn off extras like recommendations, and keep video running.', 'breaker'], ['Everyone reconnects at once', 'Retries with random delay.', 'retries']] },
{ id: 'upi', name: 'UPI payment', tag: 'Money', hook: 'Scan, pay, done. Money moves between two banks in seconds, and it must never get lost.',
  nums: [['2,000 crore+', 'payments a month'], ['Seconds', 'for a normal payment'], ['Zero', 'rupees allowed to vanish']],
  nodes: { c: { kind: 'client', label: 'Your app', x: 0, y: .5 }, p: { label: 'App provider', x: .25, y: .5 }, n: { kind: 'lb', label: 'NPCI switch', x: .5, y: .5 }, a: { kind: 'db', label: 'Your bank', x: .85, y: .05 }, b: { kind: 'db', label: 'Shop\'s bank', x: .85, y: .95 } },
  edges: [['c', 'p'], ['p', 'n'], ['n', 'a'], ['n', 'b']],
  steps: [['You enter your PIN. The app creates a unique transaction ID.', ['c', 'p']], ['The request goes to the NPCI switch, the central router between banks.', ['p', 'n']], ['Your bank checks the PIN and balance, then debits you.', ['n', 'a']], ['The shop\'s bank credits the shop.', ['n', 'b']], ['Success returns to both phones. If the credit fails, the debit is reversed.', ['b', 'n', 'p', 'c']], ['Each night, banks compare records to catch anything that went wrong. This is reconciliation.', ['a', 'n', 'b']]],
  fixes: [['Reply lost, did it work?', 'Check status using the transaction ID. Do not blindly pay again.', 'retries'], ['Money left but did not arrive', 'Each step has an undo, and nightly checks catch the rest.', 'transactions'], ['One bank is down', 'That bank\'s users see errors, but others are unaffected.', 'breaker'], ['Festival spike', 'Many copies of the switch, across data centres.', 'spof']] },
{ id: 'swiggy', name: 'Swiggy delivery', tag: 'Location', hook: 'Find the best nearby rider, in seconds, while thousands of riders keep moving.',
  nums: [['Lakhs', 'of orders at peak dinner time'], ['Every few sec', 'each rider sends location'], ['Under 30 min', 'delivery promise']],
  nodes: { c: { kind: 'client', label: 'Customer', x: 0, y: .15 }, o: { label: 'Order service', x: .33, y: .15 }, b: { kind: 'queue', label: 'Events', x: .66, y: .15 }, r: { label: 'Restaurant', x: 1, y: .15 }, m: { label: 'Matcher', x: .66, y: .95 }, g: { kind: 'cache', label: 'Live locations', x: .33, y: .95 }, d: { kind: 'client', label: 'Riders', x: 0, y: .95 } },
  edges: [['c', 'o'], ['o', 'b'], ['b', 'r'], ['b', 'm'], ['m', 'g'], ['g', 'd'], ['m', 'd']],
  steps: [['You place an order and pay.', ['c', 'o']], ['An "order placed" event goes on the board.', ['o', 'b']], ['The restaurant gets it and confirms a cooking time.', ['b', 'r']], ['The matcher wakes up too.', ['b', 'm']], ['Riders send location every few seconds, stored in fast memory by map square.', ['d', 'g']], ['The matcher checks nearby squares, scores riders and offers the job.', ['m', 'g', 'd']]],
  fixes: [['Searching all riders is too slow', 'Divide the map into squares, then look at nearby squares only.', 'index'], ['Location updates flood the database', 'Keep them in fast memory, and save samples.', 'cache'], ['Dinner rush', 'Queues take the spike, and matching scales alone.', 'queue'], ['Restaurant tablet offline', 'Fall back to a phone call.', 'breaker']] },
{ id: 'instagram', name: 'Instagram feed', tag: 'Advanced', hook: 'Open the app and see fresh posts from all the people you follow, instantly. A celebrity posts to crores at once.',
  nums: [['200 crore+', 'monthly users'], ['Under 1 sec', 'to open the feed'], ['Crores', 'of followers for top accounts']],
  nodes: { u: { kind: 'client', label: 'Creator', x: 0, y: .15 }, p: { label: 'Post service', x: .28, y: .15 }, m: { kind: 'db', label: 'Photo store', x: .28, y: .95 }, b: { kind: 'queue', label: 'Fan-out', x: .6, y: .15 }, f: { kind: 'cache', label: 'Ready feeds', x: .6, y: .95 }, v: { kind: 'client', label: 'Followers', x: 1, y: .5 } },
  edges: [['u', 'p'], ['p', 'm'], ['p', 'b'], ['b', 'f'], ['f', 'v'], ['m', 'v']],
  steps: [['A creator uploads a photo. It goes to storage, and a CDN serves it worldwide.', ['u', 'p', 'm']], ['A "new post" event goes in the queue.', ['p', 'b']], ['Workers add the post ID to a ready-made feed for each follower.', ['b', 'f']], ['When you open the app, your feed is already waiting.', ['f', 'v']], ['Photos load from the nearest CDN server.', ['m', 'v']]],
  fixes: [['Celebrity has crores of followers', 'Do not fan out. Mix their posts in when followers open the app.', 'pubsub'], ['Building a feed live is slow', 'Prepare feeds ahead of time, in a cache.', 'cache'], ['Billions of photos', 'Use object storage and a CDN.', 'cdn'], ['Post table is too large', 'Shard by user ID.', 'sharding']] },
];

/* Build Lab */
const LAB = { cost: { server: 8000, lb: 3000, db: 10000, cache: 5000, replica: 10000, queue: 4000, cdn: 6000 } };
const MISSIONS = [
 { id: 'm1', name: 'Morning rush', text: 'Office crowd, 10 customers a sec. One server cannot cope.', rate: 10, mix: [.4, .5, .1], budget: 30000, hint: 'One server handles about 6.6 a second. How many do you need?', pass: { servers: 2 } },
 { id: 'm2', name: 'Diwali sale', text: '24 a sec, and 60% just want product photos.', rate: 24, mix: [.6, .3, .1], budget: 42000, hint: 'Do not pay servers to send photos. Popular product reads can be cached too.', pass: { servers: 2, cdn: true, cache: true } },
 { id: 'm3', name: 'Server dies at sec 5', text: '8 a sec. One server crashes during the test.', rate: 8, mix: [.4, .5, .1], budget: 38000, kill: 5000, hint: 'Count what remains after the crash.', pass: { servers: 3 } },
 { id: 'm4', name: 'Breaking news', text: '20 a sec, almost all reading the same story.', rate: 20, mix: [0, .95, .05], budget: 52000, hint: 'Same story for everyone. Why ask the database each time?', pass: { servers: 4, cache: true } },
 { id: 'm5', name: 'Flash orders', text: '14 a sec, 90% placing orders. The database is slow to write.', rate: 14, mix: [0, .1, .9], budget: 42000, hint: 'Read copies do not help with writing. Give customers a token instead.', pass: { servers: 3, queue: true } },
];
function labCost(L) {
  const c = LAB.cost; return L.servers * c.server + (L.servers > 1 ? c.lb : 0) + c.db + (L.cache ? c.cache : 0) + L.replicas * c.replica + (L.queue ? c.queue : 0) + (L.cdn ? c.cdn : 0);
}
function labCfg(L) {
  const sids = ['s1', 's2', 's3', 's4', 's5'], nodes = {
    c: { kind: 'client', label: 'Customers', x: 0, y: .5 }, e: { kind: 'cache', label: 'CDN', x: .2, y: .03, ms: 30, workers: 40, queue: 20, hop: 150 }, lb: { kind: 'lb', label: 'Balancer', x: .2, y: .5 },
    k: { kind: 'cache', label: 'Cache', x: .72, y: .03, ms: 25, workers: 30, queue: 20 }, q: { kind: 'queue', label: 'Queue', x: .72, y: .97, ms: 300, workers: 2, queue: 200, ack: true },
    d: { kind: 'db', label: 'Database', x: 1, y: .22, ms: 350, workers: 3, queue: 8 }, r1: { kind: 'db', label: 'Read copy', x: 1, y: .6, ms: 350, workers: 3, queue: 8 }, r2: { kind: 'db', label: 'Read copy', x: 1, y: .97, ms: 350, workers: 3, queue: 8 }
  };
  sids.forEach((id, i) => nodes[id] = { label: 'Server ' + (i + 1), x: .46, y: i / 4, ms: 300, workers: 2, queue: 6 });
  const servers = s => sids.slice(0, L.servers), read = s => leastBusy(s, ['d', 'r1', 'r2'].slice(0, 1 + L.replicas));
  const cfg = {
    key: 'lab', h: 340, nw: 72, nh: 36, hop: 220, okMs: 2500, patience: 6000, nodes, edges: [], rate: 6, data: {},
    tag: s => { const m = s.data.mix || [.4, .5, .1], r = Math.random(); return { t: r < m[0] ? 'img' : r < m[0] + m[1] ? 'read' : 'write' }; },
    route: (p, at, s) => {
      const t = p.tag.t;
      if (at === 'c') { if (t === 'img' && L.cdn) return 'e'; return L.servers > 1 ? 'lb' : 's1'; }
      if (at === 'lb') return leastBusy(s, servers(s));
      if (at === 'e' || at === 'd' || at === 'r1' || at === 'r2') return null;
      if (at === 'k') return p.tag.hit ? null : read(s);
      if (at === 'q') return 'd';
      if (t === 'img') return null;
      if (t === 'read') { if (L.cache) { p.tag.hit = Math.random() < .8; return 'k'; } return read(s); }
      return L.queue ? 'q' : 'd';
    },
    say: s => s.data.line || 'Add parts on the right and watch the system change.'
  };
  return cfg;
}
function labApply(s, L) {
  const n = s.nodes; ['s1', 's2', 's3', 's4', 's5'].forEach((id, i) => { n[id].off = i >= L.servers; n[id].y = L.servers === 1 ? .5 : i / (L.servers - 1); });
  n.lb.off = L.servers < 2; n.e.off = !L.cdn; n.k.off = !L.cache; n.q.off = !L.queue; n.r1.off = L.replicas < 1; n.r2.off = L.replicas < 2;
  const e = [['c', L.servers > 1 ? 'lb' : 's1'], ['c', 'e'], ['q', 'd'], ['k', 'd']];
  ['s1', 's2', 's3', 's4', 's5'].forEach(a => { if (L.servers > 1) e.push(['lb', a]); e.push([a, 'k'], [a, 'q'], [a, 'd'], [a, 'r1'], [a, 'r2']); });
  s.edges = e;
}
function labVerdict(s, m, L) {
  const t = s.total, n = t.ok + t.lost, lost = n ? t.lost / n : 1, wait = t.ok ? t.ms / t.ok / 1000 : 99, cost = labCost(L);
  const why = []; if (lost > .03) why.push(`${Math.round(lost * 100)}% of customers were lost (limit 3%)`);
  if (wait > 2.5) why.push(`average wait was ${wait.toFixed(1)} sec (limit 2.5)`); if (cost > m.budget) why.push(`cost ₹${cost.toLocaleString('en-IN')} is over the budget`);
  return { pass: !why.length, why, lost, wait, cost };
}
function labHeadless(m, L) {
  const s = new Sim(labCfg(L)); labApply(s, L); s.data.mix = m.mix; s.rate = m.rate;
  for (let t = 0; t < 15000; t += 16) { if (m.kill && t >= m.kill && !s.n('s1').down) s.setDown('s1', true); s.step(16); }
  return labVerdict(s, m, L);
}
