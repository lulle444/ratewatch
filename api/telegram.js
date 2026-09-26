// Telegram webhook for the rate alerts bot.
const B = require("../brand.json");
const {send, tg, esc, webhookSecret} = require("../lib/telegram");
const {board: getBoard} = require("../lib/rates");
const A = require("../lib/alerts");

const num = x => parseFloat(String(x || "").replace(",", ".").replace("%", ""));
const round = v => Math.round(v * 4) / 4;   // quarter points, so the buttons read cleanly
// what to type to reach this exact row again: a lending market needs its project and chain too
const hint = r => r.cat === "lending" ? `${r.symbol} ${r.name} ${r.chains[0]}`.toLowerCase() : r.symbol;

async function rateCard(chat, q){
  const board = await getBoard(), r = A.findRow(board, q);
  if (!r) return send(chat, `I couldn’t find that yield. Try <code>/alert sUSDe</code> or pick one on ${A.SITE}`);
  const h = await A.rememberShort(r.key), tb = board.tbill && board.tbill.rate;
  const up = [round(r.apy + 0.5), round(r.apy + 1)], down = [round(r.apy - 0.5), round(r.apy - 1)].filter(v => v > 0);
  return send(chat, `<b>${esc(A.label(r))}</b>\nToday <b>${A.pct(r.apy)}</b> · 30-day average ${A.pct(r.apy30)}` +
    (tb != null ? ` · T-bill ${A.pct(tb)}` : "") + `\n${A.usd(r.tvl)} deposits\n\n` +
    `Ping me when its rate crosses a level. Tap one, or send <code>/alert ${esc(hint(r))} ${round(r.apy + 1)}</code> (add <code>below</code> for a drop).`,
    {reply_markup: {inline_keyboard: [
      up.map(v => ({text: `🔺 above ${v}%`, callback_data: `a|${h}|${v}|above`})),
      down.map(v => ({text: `🔻 below ${v}%`, callback_data: `a|${h}|${v}|below`})),
      [{text: `See ${r.symbol} on ${B.name}`, url: `${A.SITE}/y/${r.slug}`}],
    ].filter(row => row.length)}});
}

async function createRate(chat, q, thr, dir){
  if (!(thr > 0 && thr <= 40)) return send(chat, "Pick a level between 0% and 40%, like <code>/alert sUSDe 6</code>.");
  const board = await getBoard(), r = A.findRow(board, q);
  if (!r) return send(chat, `I couldn’t find that yield. Pick one on ${A.SITE}`);
  if (!dir) dir = r.apy != null && thr < r.apy ? "below" : "above";
  const already = r.apy != null && (dir === "below" ? r.apy <= thr : r.apy >= thr);
  const res = await A.addAlert(chat, {kind: "rate", key: r.key, label: A.label(r), thr, dir, armed: !already});
  if (res.error) return send(chat, res.error);
  return send(chat, `${res.dup ? "You already have this one" : "Done"}. I’ll message you when <b>${esc(A.label(r))}</b> ${dir === "below" ? "falls to" : "rises to"} <b>${A.pct(thr)}</b> or ${dir === "below" ? "lower" : "higher"} (today ${A.pct(r.apy)}).` +
    (already ? `\n\nIt’s already ${dir} that level, so I’ll wait until it has moved back ${A.REARM} pts and crosses again.` : "") +
    `\nChecked every 15 minutes. See all your alerts with /list.`);
}

async function createTbill(chat, thr){
  if (!(thr >= 0.05 && thr <= 2)) return send(chat, "Pick a move between 0.05 and 2 points, like <code>/tbill 0.1</code>.");
  const board = await getBoard(), now = board.tbill && board.tbill.rate;
  if (now == null) return send(chat, "The T-bill rate isn’t available right now. Please try again in a minute.");
  const res = await A.addAlert(chat, {kind: "tbill", key: "tbill", label: "3-month T-bill rate", thr, last: now});
  if (res.error) return send(chat, res.error);
  return send(chat, `${res.dup ? "You already have this one" : "Done"}. I’ll message you when the 3-month T-bill rate moves <b>${thr.toFixed(2)} pts</b> from <b>${A.pct(now)}</b>. It updates once a day on US business days.\n\nSee all your alerts with /list.`);
}

async function list(chat){
  const alerts = await A.listAlerts(chat);
  const lines = alerts.map((a, i) => `${i + 1}. ${esc(a.label)}: ${a.kind === "tbill" ? `moves ${a.thr.toFixed(2)} pts` : `${a.dir} ${A.pct(a.thr)}`}`);
  const rows = alerts.map((a, i) => [{text: `Remove ${i + 1}`, callback_data: `d|${a.id}`}]);
  rows.push([{text: `Open ${B.name}`, url: A.SITE}]);
  return send(chat, lines.length ? "<b>Your alerts</b>\n" + lines.join("\n") : `You have no alerts yet. Send <code>/alert sUSDe</code>, or tap 🔔 under any yield on ${A.SITE}.`,
    {reply_markup: {inline_keyboard: rows}});
}

async function weekly(chat){
  await A.subscribe(chat);
  return send(chat, `📬 <b>You’re in for the weekly digest.</b> Every Monday morning I’ll send the T-bill rate, the typical rate of each kind of dollar yield, the highest-paying big ones and the week’s biggest moves.`,
    {reply_markup: {inline_keyboard: [[{text: "Stop the weekly digest", callback_data: "w|off"}]]}});
}
const weeklyOff = chat => A.unsubscribe(chat).then(() => send(chat, "Weekly digest stopped. Send /weekly to start it again."));

async function top(chat){
  const board = await getBoard(), tb = board.tbill && board.tbill.rate;
  return send(chat, `<b>Highest-paying dollar yields over $100M</b> (30-day APY)\n${A.topLines(board, 8).join("\n")}\n\n` +
    (tb != null ? `3-month T-bill: <b>${A.pct(tb)}</b>. Anything above it is paid for with risk.\n` : "") + A.SITE);
}

const WELCOME = `<b>${esc(B.name)}</b>: what a dollar earns on chain, held against the T-bill rate.\n\n` +
  `• <code>/alert sUSDe 6</code>: when a yield rises to 6% or more (add <code>below</code> for a drop).\n` +
  `• <code>/tbill 0.1</code>: when the 3-month T-bill rate moves 0.1 points.\n` +
  `• /weekly: every Monday, the week in dollar rates.\n` +
  `• /top: the highest-paying big dollar yields right now.\n` +
  `• /list to see or remove your alerts, /stop to remove everything.\n\n` +
  `Or tap 🔔 under any yield on ${A.SITE}. Not financial advice.`;

async function onMessage(m){
  const chat = m.chat.id, text = String(m.text || "").trim();
  const [cmd, ...args] = text.split(/\s+/), c = cmd.toLowerCase().replace(/@\w+$/, "");
  if (c === "/start"){
    const pl = args[0] || "";
    if (/^a_[A-Za-z0-9_-]{1,60}$/.test(pl)) return rateCard(chat, pl.slice(2));
    if (pl === "wk") return weekly(chat);
    if (pl === "tb") return createTbill(chat, 0.1);
    return send(chat, WELCOME, {reply_markup: {inline_keyboard: [[{text: `Open ${B.name}`, url: A.SITE}]]}});
  }
  if (c === "/alert"){
    // "/alert sUSDe", "/alert aave usdc base 5", "/alert sUSDe 4 below"
    const dir = /^(above|below)$/i.test(args[args.length - 1] || "") ? args.pop().toLowerCase() : null;
    const n = args.length && !isNaN(num(args[args.length - 1])) ? num(args.pop()) : null;
    if (!args.length) return send(chat, "Tell me which yield, like <code>/alert sUSDe 6</code>.");
    return n == null ? rateCard(chat, args.join(" ")) : createRate(chat, args.join(" "), n, dir);
  }
  if (c === "/tbill") return createTbill(chat, args[0] ? num(args[0]) : 0.1);
  if (c === "/weekly") return args[0] && /^(off|stop)$/i.test(args[0]) ? weeklyOff(chat) : weekly(chat);
  if (c === "/top") return top(chat);
  if (c === "/list") return list(chat);
  if (c === "/stop"){
    const [n] = await Promise.all([A.removeAll(chat), A.unsubscribe(chat)]);
    return send(chat, `Removed ${n} alert${n === 1 ? "" : "s"} and stopped the weekly digest.`);
  }
  return send(chat, WELCOME);
}

async function onCallback(q){
  const chat = q.message && q.message.chat.id, [kind, a, b, c] = String(q.data || "").split("|");
  await tg("answerCallbackQuery", {callback_query_id: q.id}).catch(() => {});
  if (!chat) return;
  if (kind === "a"){
    const key = await A.keyOfShort(a);
    return key ? createRate(chat, key, parseFloat(b), c === "below" ? "below" : "above") : send(chat, "That button has expired. Send /alert with the yield’s name.");
  }
  if (kind === "d"){ await A.removeAlert(chat, a); return list(chat); }
  if (kind === "w" && a === "off") return weeklyOff(chat);
}

module.exports = async function handler(req, res){
  if (req.method !== "POST" || req.headers["x-telegram-bot-api-secret-token"] !== webhookSecret())
    return res.status(401).json({error: "unauthorized"});
  try {
    const u = req.body || {};
    if (u.message && u.message.chat && u.message.chat.type === "private") await onMessage(u.message);
    else if (u.callback_query) await onCallback(u.callback_query);
  } catch (e) {
    console.error("telegram webhook:", e);
  }
  res.status(200).json({ok: true});   // always 200 so Telegram doesn't retry a failing update forever
};
