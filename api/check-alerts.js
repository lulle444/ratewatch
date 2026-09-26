// Scheduled check (the "Warm rates" GitHub Action calls it every 15 minutes): saves one snapshot of the big yields a
// day, compares the board with every alert and pings Telegram on a crossing, and sends the weekly digest on Monday
// morning. Safe to call publicly: a lock allows one run per window, and every send is deduplicated.
const {send} = require("../lib/telegram");
const {redis} = require("../lib/store");
const {board: getBoard} = require("../lib/rates");
const A = require("../lib/alerts");

const DIGEST_HOUR = 8;   // Monday 08:00 UTC, 10:00 in Denmark

module.exports = async function handler(req, res){
  if (!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL))
    return res.status(200).json({skipped: "database not connected yet"});
  try {
    if (!(await redis("SET", A.K.lock, String(Date.now()), "NX", "EX", 600)))
      return res.status(200).json({skipped: "ran recently"});
    const board = await getBoard(), out = {rows: board.rows.length};
    out.snapshot = !!(await A.snapshot(board));
    if (!process.env.TELEGRAM_BOT_TOKEN) return res.status(200).json({...out, skipped: "no bot token yet"});

    // alerts
    let sent = 0, gone = 0;
    for (const a of await A.allAlerts()){
      const before = JSON.stringify(a), msg = A.check(a, board);
      if (msg){
        try { await send(a.chat, msg); sent++; }
        catch (e) { if (/blocked|chat not found|deactivated/i.test(e.message)){ await A.removeAlert(a.chat, a.id); gone++; continue; } throw e; }
      }
      if (JSON.stringify(a) !== before) await A.saveAlert(a);
    }
    out.alerts = {sent, removed: gone};

    // Monday digest, once per week
    const now = new Date();
    if (now.getUTCDay() === 1 && now.getUTCHours() >= DIGEST_HOUR && await redis("SET", A.K.sent(A.today()), "1", "NX", "EX", String(8 * 86400))){
      const text = A.digest(board, await A.weekAgo()), subs = await redis("SMEMBERS", A.K.weekly) || [];
      let n = 0;
      for (const chat of subs){
        try { await send(chat, text); n++; }
        catch (e) { if (/blocked|chat not found|deactivated/i.test(e.message)) await A.unsubscribe(chat); }
      }
      out.digest = n;
    }
    res.status(200).json(out);
  } catch (e) {
    console.error("check-alerts:", e);
    res.status(500).json({error: String(e.message || e)});
  }
};
