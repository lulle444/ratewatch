// Rate alerts, the weekly rate digest and daily snapshots, shared by the bot webhook and the scheduled check.
//   rate   one dollar yield's APY rising above or falling below a level ("sUSDe above 6%")
//   tbill  the 3-month T-bill rate moving a set number of points from where it last was
const crypto = require("crypto");
const B = require("../brand.json");
const {redis, pipeline} = require("./store");
const {esc} = require("./telegram");

const SITE = "https://" + B.domain;
const BOT = String(B.telegram || "").replace(/^@/, "");
const K = {
  alerts: "rw:alerts",                 // hash: alert id -> JSON
  chat: c => `rw:chat:${c}`,           // set of alert ids per chat
  short: "rw:short",                   // hash: 8-char hash -> row key (Telegram buttons carry 64 bytes at most)
  weekly: "rw:weekly:subs",            // chats that get the Monday digest
  sent: w => `rw:weekly:sent:${w}`,
  snap: d => `rw:snap:${d}`,           // one small snapshot of every big yield per day, for "this week" moves
  lock: "rw:lock",
};
const MAX_PER_CHAT = 20;
const REARM = 0.2;                     // points back across the level before an alert can fire again
const BIG = 100e6;                     // "big" yields for the digest and /top

const pct = v => v == null || !isFinite(v) ? "–" : (+v).toFixed(2) + "%";
const pts = v => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(2) + " pts";
const usd = v => v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${Math.round(v / 1e6)}M` : `$${Math.round((v || 0) / 1e3)}k`;
const label = r => `${r.name} ${r.symbol}` + (r.chains.length === 1 ? ` on ${r.chains[0]}` : "") + (r.meta ? ` (${r.meta})` : "");
const short = key => crypto.createHash("sha1").update(key).digest("base64url").slice(0, 8);
const today = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

// "susde", "sUSDe ethena", "aave usdc base", a row key or a short hash -> the best-matching row (deepest first)
function findRow(board, q){
  const s = String(q || "").trim().toLowerCase();
  if (!s) return null;
  const byKey = board.rows.find(r => r.key.toLowerCase() === s);
  if (byKey) return byKey;
  const words = s.split(/\s+/);
  const hay = r => [r.name, r.symbol, r.project, ...r.chains, r.meta || ""].join(" ").toLowerCase();
  const exact = board.rows.filter(r => r.symbol.toLowerCase() === words[0] && words.slice(1).every(w => hay(r).includes(w)));
  const loose = board.rows.filter(r => words.every(w => hay(r).includes(w)));
  return (exact.length ? exact : loose).sort((a, b) => b.tvl - a.tvl)[0] || null;
}
async function rememberShort(key){ const h = short(key); await redis("HSET", K.short, h, key); return h; }
const keyOfShort = h => redis("HGET", K.short, h);

async function listAlerts(chat){
  const ids = await redis("SMEMBERS", K.chat(chat)) || [];
  if (!ids.length) return [];
  return (await redis("HMGET", K.alerts, ...ids) || []).filter(Boolean).map(v => JSON.parse(v));
}
async function addAlert(chat, fields){
  const existing = await listAlerts(chat);
  const dup = existing.find(a => a.kind === fields.kind && a.key === fields.key && a.thr === fields.thr && a.dir === fields.dir);
  if (dup) return {alert: dup, dup: true};
  if (existing.length >= MAX_PER_CHAT) return {error: `You can have up to ${MAX_PER_CHAT} alerts. Remove one with /list first.`};
  const alert = {id: crypto.randomBytes(5).toString("hex"), chat, ...fields, created: Date.now()};
  await pipeline([["HSET", K.alerts, alert.id, JSON.stringify(alert)], ["SADD", K.chat(chat), alert.id]]);
  return {alert};
}
const saveAlert = a => redis("HSET", K.alerts, a.id, JSON.stringify(a));
const removeAlert = (chat, id) => pipeline([["HDEL", K.alerts, id], ["SREM", K.chat(chat), id]]);
async function removeAll(chat){
  const ids = await redis("SMEMBERS", K.chat(chat)) || [];
  await pipeline([["DEL", K.chat(chat)], ...(ids.length ? [["HDEL", K.alerts, ...ids]] : [])]);
  return ids.length;
}
async function allAlerts(){
  const raw = await redis("HGETALL", K.alerts) || [];
  const out = [];
  for (let i = 1; i < raw.length; i += 2) out.push(JSON.parse(raw[i]));
  return out;
}

// A rate alert fires once when the APY crosses its level, then waits until the APY is back REARM points on the
// other side. A T-bill alert fires when the rate has moved thr points from the last rate it reported.
function check(a, board){
  if (a.kind === "tbill"){
    const now = board.tbill && board.tbill.rate;
    if (now == null || Math.abs(now - a.last) < a.thr - 1e-9) return null;
    const msg = `🏛 <b>The 3-month T-bill rate moved</b>: <b>${pct(now)}</b>, ${pts(now - a.last)} since ${pct(a.last)}.\n` +
      `Every dollar yield on ${esc(B.name)} is measured against it.\n\n${SITE}`;
    a.last = now;
    return msg;
  }
  const r = board.rows.find(x => x.key === a.key);
  if (!r || r.apy == null) return null;
  const hit = a.dir === "below" ? r.apy <= a.thr : r.apy >= a.thr;
  const back = a.dir === "below" ? r.apy >= a.thr + REARM : r.apy <= a.thr - REARM;
  if (a.armed === false){ if (back) a.armed = true; return null; }
  if (!hit) return null;
  a.armed = false;
  const tb = board.tbill && board.tbill.rate;
  return `${a.dir === "below" ? "🔻" : "🔺"} <b>${esc(label(r))}</b> is paying <b>${pct(r.apy)}</b>, ${a.dir === "below" ? "down to" : "up past"} your ${pct(a.thr)} level.\n` +
    `30-day average ${pct(r.apy30)}` + (tb != null ? ` · T-bill ${pct(tb)} (${pts(r.apy - tb)})` : "") + ` · ${usd(r.tvl)} deposits\n\n` +
    `I’ll tell you again once it has moved back ${REARM} pts and crosses again. /list to change your alerts.\n${SITE}/y/${r.slug}`;
}

/* ---------- daily snapshots and the weekly digest ---------- */
async function snapshot(board, t = Date.now()){
  const r = {};
  for (const x of board.rows) if (x.tvl >= 50e6) r[x.key] = [x.apy == null ? null : +x.apy.toFixed(3), x.apy30 == null ? null : +x.apy30.toFixed(3)];
  return redis("SET", K.snap(today(t)), JSON.stringify({t, tbill: board.tbill && board.tbill.rate, r}), "NX", "EX", String(40 * 86400));
}
async function weekAgo(t = Date.now()){
  for (const d of [7, 6, 8]){
    const v = await redis("GET", K.snap(today(t - d * 864e5)));
    if (v) return JSON.parse(v);
  }
  return null;
}

const topLines = (board, n = 5) => board.rows.filter(r => r.tvl >= BIG && r.apy30 != null).sort((a, b) => b.apy30 - a.apy30).slice(0, n)
  .map((r, i) => `${i + 1}. ${esc(label(r))}: <b>${pct(r.apy30)}</b> · ${usd(r.tvl)}`);

function digest(board, prev){
  const tb = board.tbill && board.tbill.rate;
  const cats = board.cats.filter(c => c.count).map(c => `${esc(c.short)} ${pct(c.median)}`).join(" · ");
  let moves = "";
  if (prev){
    const ch = board.rows.filter(r => r.tvl >= BIG && prev.r[r.key] && prev.r[r.key][1] != null && r.apy30 != null)
      .map(r => ({r, d: r.apy30 - prev.r[r.key][1]})).filter(x => Math.abs(x.d) >= 0.1).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 4);
    if (ch.length) moves = `\n\n<b>Biggest moves this week</b> (30-day APY)\n` + ch.map(({r, d}) => `${d > 0 ? "▲" : "▼"} ${esc(label(r))}: ${pct(r.apy30)} (${pts(d)})`).join("\n");
  }
  return `📬 <b>Dollar rates this week</b>\n\n` +
    (tb != null ? `3-month T-bill: <b>${pct(tb)}</b>` + (prev && prev.tbill != null ? ` (${pts(tb - prev.tbill)} on the week)` : "") + "\n" : "") +
    `Typical 30-day APY: ${cats}\n\n<b>Highest paying over $100M</b>\n${topLines(board).join("\n")}` + moves +
    `\n\nAnything above the T-bill rate is paid for with risk. ${SITE}`;
}

const subscribe = chat => redis("SADD", K.weekly, String(chat));
const unsubscribe = chat => redis("SREM", K.weekly, String(chat));

module.exports = {K, SITE, BOT, REARM, BIG, pct, pts, usd, label, today, findRow, rememberShort, keyOfShort,
  listAlerts, addAlert, saveAlert, removeAlert, removeAll, allAlerts, check, snapshot, weekAgo, topLines, digest, subscribe, unsubscribe};
