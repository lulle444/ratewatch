// One-off after adding TELEGRAM_BOT_TOKEN: points the bot's webhook at this site and sets its command menu.
// Harmless to call again. It only acts for the bot named in brand.json, so a sister site's token (Tidewatch's or
// Pegwatch's) can never have its webhook taken over.
const B = require("../brand.json");
const {tg, webhookSecret} = require("../lib/telegram");
const {SITE, BOT} = require("../lib/alerts");

module.exports = async function handler(req, res){
  try {
    const me = await tg("getMe", {});
    if (!BOT || me.username.toLowerCase() !== BOT.toLowerCase())
      return res.status(409).json({ok: false, error: `TELEGRAM_BOT_TOKEN belongs to @${me.username}, but brand.json names @${BOT || "(none)"}. Nothing was changed.`});
    await tg("setWebhook", {url: SITE + "/api/telegram", secret_token: webhookSecret(), allowed_updates: ["message", "callback_query"], drop_pending_updates: true});
    await tg("setMyCommands", {commands: [
      {command: "alert", description: "Rate alert, e.g. /alert sUSDe 6"},
      {command: "tbill", description: "When the T-bill rate moves, e.g. /tbill 0.1"},
      {command: "weekly", description: "Every Monday: the week in dollar rates"},
      {command: "top", description: "Highest-paying big dollar yields now"},
      {command: "list", description: "See or remove your alerts"},
      {command: "stop", description: "Remove all alerts and the digest"},
      {command: "start", description: `How ${B.name} works`},
    ]});
    await tg("setMyDescription", {description: `What a dollar earns on chain, held against the T-bill rate. Get a message when a dollar yield crosses your level, and a weekly digest. From ${B.name}.`}).catch(() => {});
    res.status(200).json({ok: true, bot: "@" + me.username, webhook: SITE + "/api/telegram"});
  } catch (e) {
    res.status(500).json({ok: false, error: String(e.message || e)});
  }
};
