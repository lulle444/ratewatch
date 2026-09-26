// One page per dollar yield: /y/ethena-susde (rewritten here by vercel.json). Fills templates/yield.html, written by
// build.py, with the yield's numbers, where it pays, what pays it and similar yields, so the page reads fully before
// any script runs; app.js only draws the history chart. /sitemap-yields.xml lists every yield page.
const fs = require("fs"), path = require("path");
const B = require("../brand.json");
const {board: getBoard} = require("../lib/rates");
const FUNDS = require("../lib/funds");

const SITE = "https://" + B.domain;
const BOT = String(B.telegram || "").replace(/^@/, "");
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
let TPL, NOTFOUND;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const pct = v => v == null || !isFinite(v) ? "–" : v.toFixed(2) + "%";
const pts = v => v == null ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(2) + " pts";
const usd = v => v == null ? "–" : v >= 1e9 ? "$" + (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + "B" : v >= 1e6 ? "$" + (v / 1e6).toFixed(v >= 1e8 ? 0 : 1) + "M" : "$" + Math.round(v / 1e3) + "k";
const list = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
const overCls = v => v == null ? "flat" : v > 0.25 ? "pos" : v < -0.25 ? "neg" : "flat";
const day = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"});

// "Aave USDC on Base (Prime)": the name people know it by, with the chain when it only pays on one
const label = r => `${r.name} ${r.symbol}` + (r.cat === "lending" ? ` on ${r.chains[0]}` : "") + (r.meta ? ` (${r.meta})` : "");
const where = r => r.chains.length === 1 ? `on ${r.chains[0]}` : r.chains.length <= 4 ? `across ${list(r.chains)}` : `across ${r.chains.length} chains`;

function summary(r, tb){
  const vs = tb == null || r.apy30 == null ? "" : Math.abs(r.over) < 0.005 ? `, level with the 3-month T-bill rate of ${pct(tb.rate)}`
    : `, ${Math.abs(r.over).toFixed(2)} points ${r.over > 0 ? "above" : "below"} the 3-month T-bill rate of ${pct(tb.rate)}`;
  return `${label(r)} has paid ${pct(r.apy30)} on average over the past 30 days${vs}. ${usd(r.tvl)} is deposited ${where(r)}.`;
}

const fundOf = r => {
  const m = FUNDS.BY_META.find(([rx]) => rx.test(r.meta || "") || rx.test(r.symbol)), sym = r.symbol.toUpperCase();
  return FUNDS.FUNDS[m ? m[1] : FUNDS.ALIAS[sym] || sym];
};

const stat = (v, cap, cls = "") => `<div class="panel ystat"><b class="num ${cls}">${v}</b><span>${cap}</span></div>`;

function hold(f){
  if (!f) return "";
  const rows = [["Issuer", f.issuer], ["What you hold", f.what], ["Who can buy", f.who], ["US persons", f.us], ["Minimum", f.minimum],
    ["Redeeming", f.redeem], ["Moving it", f.transfer], ["How the yield is paid", f.yield], ["Fee", f.fee]].filter(([, v]) => v && !/^not stated$/i.test(v));
  const src = (f.sources || []).map(u => { try { return `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(new URL(u).hostname.replace(/^www\./, ""))}</a>`; } catch (e) { return ""; } }).filter(Boolean);
  return `<section class="panel yhold" aria-labelledby="holdH">
    <div class="sectionhead"><div><h2 id="holdH">Who can hold it</h2><p class="sub">From the issuer’s own documents, checked ${esc(day(FUNDS.CHECKED))}. Terms change, so read them before you buy.</p></div></div>
    <dl class="facts2">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    ${src.length ? `<p class="fine">Sources: ${src.join(", ")}</p>` : ""}
  </section>`;
}

function main(r, board){
  const tb = board.tbill, cat = board.cats.find(c => c.id === r.cat) || {name: r.cat, about: ""};
  const url = `${SITE}/y/${r.slug}`;
  const share = `${label(r)} pays ${pct(r.apy30)} on chain (30-day average)` + (tb && r.over != null ? `, ${pts(r.over)} vs the 3-month T-bill rate.` : ".");
  const xurl = `https://x.com/intent/post?text=${encodeURIComponent(share)}&url=${encodeURIComponent(url)}` + (B.x ? `&via=${encodeURIComponent(B.x)}` : "");
  const similar = board.rows.filter(x => x !== r && x.cat === r.cat && x.apy30 != null)
    .sort((a, b) => Math.abs(a.apy30 - r.apy30) - Math.abs(b.apy30 - r.apy30) || b.tvl - a.tvl).slice(0, 6)
    .sort((a, b) => b.apy30 - a.apy30);
  const bigger = board.rows.filter(x => x !== r && x.cat !== r.cat && x.tvl >= 1e9 && x.apy30 != null).sort((a, b) => b.tvl - a.tvl).slice(0, 4);
  const link = x => `<a class="panel ylink" href="/y/${esc(x.slug)}" style="--c:var(--b-cat-${x.cat})">
      <span class="tok"><b>${esc(x.name)} <span class="muted">${esc(x.symbol)}</span></b><small>${esc(x.cat === "lending" ? x.chains[0] + (x.meta ? " · " + x.meta : "") : x.chains.length === 1 ? x.chains[0] : x.chains.length + " chains")} · ${usd(x.tvl)}</small></span>
      <span class="r"><span class="apy">${pct(x.apy30)}</span><span class="over ${overCls(x.over)}">${pts(x.over)}</span></span></a>`;
  const reward = r.reward ? `<p>${pct(r.reward)} of today’s rate is paid in reward tokens, which can end or lose value.</p>` : "";
  const moving = r.apy != null && r.apy30 != null && Math.abs(r.apy - r.apy30) >= 0.5
    ? `<p>Today’s rate (${pct(r.apy)}) is ${Math.abs(r.apy - r.apy30).toFixed(2)} points ${r.apy > r.apy30 ? "above" : "below"} its 30-day average, so it is moving.</p>` : "";
  return `  <section class="yhead">
    <p class="crumbs"><a href="/">Rates</a> <span>/</span> <span class="type"><span class="sw" style="--c:var(--b-cat-${r.cat})"></span>${esc(cat.name)}${r.cat === "lending" ? " · " + esc(r.chains[0]) + (r.meta ? " · " + esc(r.meta) : "") : ""}</span></p>
    <h1>${esc(r.name)} <em>${esc(r.symbol)}</em></h1>
    <p class="lede">${esc(summary(r, tb))}</p>
    <p class="yact">${BOT ? `<a class="btn primary" href="https://t.me/${BOT}?start=a_${encodeURIComponent(r.key)}" target="_blank" rel="noopener">🔔 Alert me when it moves</a>` : ""}
      <a class="btn" href="${esc(xurl)}" target="_blank" rel="noopener">Share on X</a></p>
  </section>

  <section class="ystats" aria-label="The numbers">
    ${stat(pct(r.apy30), "30-day average APY")}
    ${stat(pct(r.apy), "today")}
    ${stat(tb ? pts(r.over) : "–", tb ? `vs the T-bill rate (${pct(tb.rate)})` : "vs the T-bill rate", "over " + overCls(r.over))}
    ${stat(usd(r.tvl), r.chains.length === 1 ? "deposited on " + esc(r.chains[0]) : `deposited on ${r.chains.length} chains`)}
  </section>

  <section class="panel ychart" aria-labelledby="chartH">
    <div class="sectionhead">
      <div><h2 id="chartH">Its rate against the T-bill line</h2><p class="sub">Daily APY from DefiLlama next to the 3-month US T-bill rate. The gap between the two lines is what the extra risk pays.</p></div>
      <div class="seg" role="group" aria-label="Time range"><button data-days="90">3M</button><button data-days="180" aria-pressed="true">6M</button><button data-days="365">1Y</button></div>
    </div>
    <div class="legend"><span><i style="--c:var(--b-cat-${r.cat})"></i>${esc(r.symbol)} APY</span><span><i class="dash"></i>3-month T-bill</span></div>
    <div class="dchart" id="ychart" data-pool="${esc(r.id)}" data-symbol="${esc(r.symbol)}" data-cat="${esc(r.cat)}"><p class="empty">Loading history…</p></div>
  </section>

  <section class="twocol">
    <article class="panel note" style="--c:var(--b-cat-${r.cat})">
      <h3>What pays the yield</h3>
      <p><b>${esc(cat.name)}.</b> ${esc(cat.about)}</p>${reward}${moving}
    </article>
    <article class="panel note">
      <h3>Where it pays</h3>
      <ul class="pl">${r.pools.slice(0, 8).map(p => `<li><a href="https://defillama.com/yields/pool/${esc(p.pool)}" target="_blank" rel="noopener">${esc(p.chain)}</a><span class="num">${pct(p.apy30 ?? p.apy)}</span><span class="num muted">${usd(p.tvl)}</span></li>`).join("")}</ul>
      <p class="fine">30-day APY and deposits per chain. Each links to the pool on DefiLlama.</p>
    </article>
  </section>
${hold(r.cat === "tbill" && fundOf(r))}
  <section class="yrel" aria-labelledby="simH">
    <h2 id="simH">Other ${esc(cat.name.replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase()))} near its rate</h2>
    <div class="ylinks">${similar.map(link).join("") || '<p class="empty">No other yield of this type right now.</p>'}</div>
    ${bigger.length ? `<h2 class="h2b">The biggest dollar yields of other types</h2><div class="ylinks">${bigger.map(link).join("")}</div>` : ""}
    <p class="block"><a class="btn" href="/">See every dollar yield</a></p>
  </section>
`;
}

function page(r, board){
  const sum = summary(r, board.tbill);
  const t = `${label(r)}: APY and history vs T-bills · ${B.name}`;
  const ld = JSON.stringify({"@context": "https://schema.org", "@type": "WebPage", name: `${label(r)} yield`, url: `${SITE}/y/${r.slug}`,
    description: sum, isPartOf: {"@type": "WebSite", name: B.name, url: SITE + "/"}}).replace(/</g, "\\u003c");
  return TPL
    .replace(/__TITLE__/g, () => esc(t))
    .replace(/__DESC__/g, () => esc(sum))
    .replace(/__SLUG__/g, () => esc(r.slug))
    .replace("__MAIN__", () => main(r, board))
    .replace("</head>", () => `<script type="application/ld+json">${ld}</script>\n</head>`);
}

module.exports = async function handler(req, res){
  const q = req.query || {};
  TPL = TPL || read("templates/yield.html");
  let board = null;
  try { board = await getBoard(); } catch (e) { console.error("yield board:", e); }
  const rows = (board && board.rows) || [];

  if (q.sitemap){
    if (!rows.length){ res.setHeader("Cache-Control", "no-store"); return res.status(503).send("board unavailable"); }
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      rows.map(r => `  <url><loc>${SITE}/y/${esc(r.slug)}</loc></url>\n`).join("") + "</urlset>\n");
  }

  const want = String(q.s || "").slice(0, 100), low = want.toLowerCase();
  // the slug, or a row key or DefiLlama pool id (what alert links carry), which redirect to the slug
  const r = rows.find(x => x.slug === low) || rows.find(x => x.key.toLowerCase() === low || x.id === low || x.pools.some(p => p.pool === low));
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!r){
    if (!rows.length){   // the data is down, not the page: try again soon rather than tell search engines it's gone
      res.setHeader("Cache-Control", "no-store");
      return res.status(503).send(read("404.html").replace("The link may be old or mistyped.", "Rates are unavailable right now. Please try again in a minute."));
    }
    NOTFOUND = NOTFOUND || read("404.html");
    res.setHeader("Cache-Control", "public, s-maxage=600");
    return res.status(404).send(NOTFOUND.replace("The link may be old or mistyped.", "We don’t track that yield, or it has dropped below our size limits."));
  }
  if (r.slug !== want){
    res.setHeader("Cache-Control", "public, s-maxage=3600");
    return res.redirect(301, "/y/" + r.slug);
  }
  res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=86400");
  res.status(200).send(page(r, board));
};
