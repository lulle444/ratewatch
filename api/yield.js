// One page per dollar yield: /y/ethena-susde (rewritten here by vercel.json). Fills templates/yield.html, written by
// build.py, with the yield's numbers, where it pays, what pays it and similar yields, so the page reads fully before
// any script runs; app.js only draws the history chart. /sitemap-yields.xml lists every yield page.
const fs = require("fs"), path = require("path");
const B = require("../brand.json");
const {board: getBoard} = require("../lib/rates");
const FUNDS = require("../lib/funds");
const COINS = require("../lib/coins");
const CHAINS = require("../lib/chains");

const SITE = "https://" + B.domain;
const BOT = String(B.telegram || "").replace(/^@/, "");
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
let TPL, FTPL, CTPL, HTPL, KTPL, NOTFOUND;

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
  const url = `${SITE}/y/${r.slug}`, coin = COINS.coinOf(r);
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
    <p class="block"><a class="btn" href="/">See every dollar yield</a>${coin ? ` <a class="btn" href="/${coin.id}">Every ${esc(coin.name)} yield</a>` : ""}</p>
  </section>
`;
}

// /funds: every tokenized T-bill fund side by side, live rate next to who may buy it. Funds whose pools DefiLlama
// splits in two (BUIDL, JTRSY) are added up; funds DefiLlama doesn't track still show their terms.
function fundsMain(board){
  const tb = board.tbill, by = {}, loose = [];
  for (const r of board.rows.filter(x => x.cat === "tbill")) {
    const f = fundOf(r), k = f && Object.keys(FUNDS.FUNDS).find(k => FUNDS.FUNDS[k] === f);
    if (!k) { loose.push(r); continue; }
    (by[k] = by[k] || []).push(r);
  }
  const items = Object.keys(FUNDS.FUNDS).map(k => {
    const rs = (by[k] || []).sort((a, b) => b.tvl - a.tvl), tvl = rs.reduce((t, r) => t + r.tvl, 0);
    const w = rs.filter(r => r.apy30 != null), wt = w.reduce((t, r) => t + r.tvl, 0);
    const apy30 = w.length ? w.reduce((t, r) => t + r.apy30 * r.tvl, 0) / (wt || 1) : null;
    return {k, f: FUNDS.FUNDS[k], s: FUNDS.SHORT[k], main: rs[0], tvl, apy30, over: apy30 != null && tb ? apy30 - tb.rate : null,
      chains: [...new Set(rs.flatMap(r => r.chains))]};
  }).sort((a, b) => b.tvl - a.tvl || a.s.min - b.s.min);
  const tracked = items.filter(i => i.main), open = items.filter(i => i.s.us === "yes");
  const typical = (() => { const v = tracked.map(i => i.apy30).filter(x => x != null).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : null; })();
  const who = {yes: "pos", limited: "mid", no: "neg"};
  const row = i => {
    const name = esc(i.f.name.replace(/\s*\(.*?\)|\s*\/.*$|,.*$/g, ""));
    const tick = esc(i.k === "MTBILL" ? "mTBILL" : i.k);
    const title = i.main ? `<a href="/y/${esc(i.main.slug)}">${tick}</a>` : tick;
    return `<tr data-us="${i.s.us}" data-min="${i.s.min}">
      <td data-l="Fund"><span class="tok"><b>${title}</b><small>${name}</small></span></td>
      <td class="r" data-l="30-day APY">${i.main ? `<span class="apy">${pct(i.apy30)}</span>` : '<span class="muted small">Not on DefiLlama</span>'}</td>
      <td class="r" data-l="vs T-bill">${i.main ? `<span class="over ${overCls(i.over)}">${pts(i.over)}</span>` : ""}</td>
      <td class="r" data-l="Deposits">${i.main ? `<span class="num">${usd(i.tvl)}</span>` : ""}</td>
      <td data-l="Who can buy">${esc(i.s.buyers)}</td>
      <td data-l="US persons"><span class="who ${who[i.s.us]}">${esc(i.s.usText)}</span></td>
      <td data-l="Minimum" class="num">${esc(i.s.minText)}</td>
      <td data-l="Getting out">${esc(i.s.out)}</td>
      <td data-l="Fee">${esc(i.s.fee)}</td>
    </tr>`;
  };
  const words = [
    ["Accredited investor", "A US test of wealth: over $1M net worth without your home, or over $200k income ($300k with a spouse) in each of the last two years."],
    ["Qualified purchaser", "A stricter US test: at least $5M in investments for a person, $25M for most companies. Funds that only take them can skip SEC fund registration."],
    ["Professional investor", "The non-US version, set by each country. In the BVI and the EU it usually means large portfolios, big companies or regulated firms."],
    ["KYC and allowlists", "Every fund checks who you are first. Most also only let the token move between wallets they have approved, so you can’t just buy it on a DEX."],
  ];
  return `  <section class="pagehead hasart">
    <div>
    <p class="eyebrow">Tokenized T-bill funds</p>
    <h1>Who can buy which <em>T-bill fund?</em></h1>
    <p class="lede">Every tokenized T-bill fund we track, side by side: what it pays against the T-bill rate, who is allowed to buy it, how much you need and how you get your dollars back. Terms come from each issuer’s own documents, checked ${esc(day(FUNDS.CHECKED))}.</p>
    </div>
    <figure class="art">
      <img src="/assets/brand/chain-1100.webp" srcset="/assets/brand/chain-640.webp 640w, /assets/brand/chain-1100.webp 1100w" sizes="(max-width:860px) 100vw, 520px" width="1100" height="705" alt="Three chain links on a plinth beside two stacks of green coins" fetchpriority="high">
    </figure>
  </section>

  <section class="ystats" aria-label="The funds in numbers">
    ${stat(String(items.length), "funds compared")}
    ${stat(usd(tracked.reduce((t, i) => t + i.tvl, 0)), "deposited on chain")}
    ${stat(pct(typical), tb ? `typical 30-day APY (T-bill ${pct(tb.rate)})` : "typical 30-day APY")}
    ${stat(String(open.length), `open to US retail (${esc(list(open.map(i => i.k)))})`)}
  </section>

  <section class="panel board fundsbox" aria-labelledby="fundsH">
    <div class="sectionhead"><div><h2 id="fundsH">The funds</h2><p class="sub">Largest first. Rates are 30-day averages from DefiLlama; tap a fund for its chart and full terms.</p></div></div>
    <div class="chips" id="fundChips">
      <button class="chip" data-f="all" aria-pressed="true">All funds</button>
      <button class="chip" data-f="us" aria-pressed="false">Open to US retail</button>
      <button class="chip" data-f="small" aria-pressed="false">Start under $1,000</button>
    </div>
    <div class="tablebox"><table class="rt ft">
      <thead><tr><th>Fund</th><th class="r">30-day APY</th><th class="r">vs T-bill</th><th class="r">Deposits</th><th>Who can buy</th><th>US persons</th><th>Minimum</th><th>Getting out</th><th>Fee</th></tr></thead>
      <tbody>${items.map(row).join("")}</tbody>
    </table></div>
    <p class="empty" id="fundsNone" hidden>No fund matches that.</p>
    ${loose.length ? `<p class="fine">Also on the rate board, terms not checked yet: ${loose.map(r => `<a href="/y/${esc(r.slug)}">${esc(r.name + " " + r.symbol)}</a>`).join(", ")}.</p>` : ""}
  </section>

  <section class="panel yhold" aria-labelledby="wordsH">
    <div class="sectionhead"><div><h2 id="wordsH">The words that decide who can buy</h2><p class="sub">Most of these funds are securities, so the law limits who may hold them.</p></div></div>
    <dl class="facts2">${words.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    <p class="fine">A summary, not legal advice. The fund’s own documents decide, and terms change.</p>
  </section>

  <p class="block"><a class="btn" href="/">See every dollar yield</a></p>
`;
}

// /usdc, /usdt …: every yield paid in one dollar coin, highest first, next to the T-bill rate.
function coinMain(coin, rows, board){
  const tb = board.tbill, top = rows[0], tvl = rows.reduce((t, r) => t + r.tvl, 0);
  const v = rows.map(r => r.apy30).filter(x => x != null).sort((a, b) => a - b), typical = v.length ? v[v.length >> 1] : null;
  const catName = id => (board.cats.find(c => c.id === id) || {short: id}).short || id;
  const where = r => r.cat === "lending" ? r.chains[0] + (r.meta ? " · " + r.meta : "") : r.chains.length === 1 ? r.chains[0] : r.chains.length + " chains";
  const others = COINS.COINS.filter(c => c.id !== coin.id && COINS.rowsOf(board.rows, c.id).length);
  const over = tb ? rows.filter(r => r.over != null && r.over > 0).length : null;
  return `  <section class="pagehead">
    <p class="eyebrow">${esc(coin.name)} yields</p>
    <h1>Where does <em>${esc(coin.name)}</em> earn the most?</h1>
    <p class="lede">${esc(coin.about)} Here is every place we track that pays you in ${esc(coin.name)}, from lending markets to savings tokens and vaults, held against the 3-month T-bill rate${tb ? ` of ${pct(tb.rate)}` : ""}.${over != null ? ` ${over} of ${rows.length} pay more than T-bills, and that extra is paid for with risk.` : ""}</p>
    <p class="yact"><a class="btn" href="${esc(`https://x.com/intent/post?text=${encodeURIComponent(`The best ${coin.name} yield on chain right now: ${top.name} ${top.symbol} at ${pct(top.apy30)} (30-day average)` + (tb ? `, vs ${pct(tb.rate)} for T-bills.` : "."))}&url=${encodeURIComponent(SITE + "/" + coin.id)}` + (B.x ? `&via=${encodeURIComponent(B.x)}` : ""))}" target="_blank" rel="noopener">Share on X</a></p>
  </section>

  <section class="ystats" aria-label="${esc(coin.name)} in numbers">
    ${stat(pct(top.apy30), `highest 30-day APY (${esc(top.name + " " + top.symbol)})`)}
    ${stat(pct(typical), tb ? `typical 30-day APY (T-bill ${pct(tb.rate)})` : "typical 30-day APY")}
    ${stat(usd(tvl), "deposited")}
    ${stat(String(rows.length), rows.length === 1 ? "yield tracked" : "yields tracked")}
  </section>

  <section class="panel board" aria-labelledby="coinH">
    <div class="sectionhead"><div><h2 id="coinH">Every ${esc(coin.name)} yield</h2><p class="sub">Highest 30-day average first. Tap one for its history, what pays it and where.</p></div></div>
    <div class="tablebox"><table class="rt ct">
      <thead><tr><th scope="col">${esc(coin.name)} yield</th><th scope="col" class="hm">Type</th><th scope="col" class="r">30-day APY</th><th scope="col" class="r">vs T-bill</th><th scope="col" class="r hs">Deposits</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td><a class="tok rowlink" href="/y/${esc(r.slug)}"><b>${esc(r.name)} <span class="muted">${esc(r.symbol)}</span></b><small>${esc(where(r))}</small></a></td>
        <td class="hm"><span class="type"><span class="sw" style="--c:var(--b-cat-${r.cat})"></span>${esc(catName(r.cat))}</span></td>
        <td class="r"><span class="apy">${pct(r.apy30)}</span></td>
        <td class="r"><span class="over ${overCls(r.over)}">${pts(r.over)}</span></td>
        <td class="r hs num">${usd(r.tvl)}</td></tr>`).join("")}</tbody>
    </table></div>
    <p class="fine">30-day APY is DefiLlama’s 30-day average. Rates that pay part of their yield in reward tokens count those too; the yield’s own page says how much.</p>
  </section>
${others.length ? `
  <section class="yrel" aria-labelledby="otherH">
    <h2 id="otherH">Other dollars</h2>
    <div class="chips coinchips">${others.map(c => `<a class="chip" href="/${c.id}">${esc(c.name)}</a>`).join("")}<a class="chip" href="/funds">T-bill funds</a></div>
  </section>` : ""}
  <p class="block"><a class="btn" href="/">See every dollar yield</a></p>
`;
}

// The share of each type in a chain's deposits, as one thin stacked bar (a 2px gap between types), safest type first.
const CAT_ORDER = ["tbill", "savings", "synthetic", "lending"];
function mixBar(c, board, cls = ""){
  const name = id => (board.cats.find(x => x.id === id) || {name: id}).name;
  const parts = CAT_ORDER.filter(k => c.mix[k] > 0).map(k => ({k, share: c.mix[k] / c.tvl}));
  return `<span class="mix ${cls}" role="img" aria-label="${esc(parts.map(p => `${name(p.k)} ${Math.round(p.share * 100)}%`).join(", "))}">${parts.map(p =>
    `<i style="--c:var(--b-cat-${p.k});flex-grow:${p.share.toFixed(4)}" title="${esc(name(p.k))}: ${Math.round(p.share * 100)}% (${usd(c.mix[p.k])})"></i>`).join("")}</span>`;
}
const catLegend = board => `<div class="legend catlegend">${CAT_ORDER.map(k => `<span><span class="sw" style="--c:var(--b-cat-${k})"></span>${esc((board.cats.find(x => x.id === k) || {name: k}).name)}</span>`).join("")}</div>`;
const xLink = (text, url) => `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` + (B.x ? `&via=${encodeURIComponent(B.x)}` : "");

// /chains: what the average deposited dollar earns on each chain, with the mix of yield types behind it.
function chainsMain(board){
  const tb = board.tbill, all = CHAINS.byChain(board), shown = all.filter(c => c.page), small = all.filter(c => !c.page);
  const total = all.reduce((s, c) => s + c.tvl, 0), first = all[0];
  const byAvg = shown.slice().sort((a, b) => b.avg - a.avg), topAvg = byAvg[0];
  const max = Math.max(...byAvg.map(c => c.avg), tb ? tb.rate : 0) * 1.1;
  const bar = (c, i) => `<a class="cb-name" style="grid-row:${i + 1}" href="/chains/${c.slug}">${esc(c.name)}</a>
      <span class="cb-track" style="grid-row:${i + 1}" title="${esc(c.name)}: the average deposited dollar earns ${pct(c.avg)} across ${c.count} yields, ${usd(c.tvl)} deposited"><i style="width:${(c.avg / max * 100).toFixed(2)}%"></i></span>
      <span class="cb-val num" style="grid-row:${i + 1}">${pct(c.avg)}</span>`;
  const row = c => `<tr>
        <td><a class="tok rowlink" href="/chains/${c.slug}"><b>${esc(c.name)}</b><small>${c.count} yields · best ${esc(c.best.r.symbol)} ${pct(c.best.apy30)}</small></a>${mixBar(c, board)}</td>
        <td class="r"><span class="apy">${pct(c.avg)}</span></td>
        <td class="r"><span class="over ${overCls(c.over)}">${pts(c.over)}</span></td>
        <td class="r hs num">${usd(c.tvl)}</td></tr>`;
  const share = topAvg ? `Where a dollar earns most on chain: ${topAvg.name}, where the average deposited dollar gets ${pct(topAvg.avg)}` + (tb ? ` vs ${pct(tb.rate)} for T-bills.` : ".") : "";
  return `  <section class="pagehead">
    <p class="eyebrow">Dollar yields by chain</p>
    <h1>What does a dollar earn on <em>each chain?</em></h1>
    <p class="lede">Every dollar yield we track, added up chain by chain: how much is deposited, what the average deposited dollar earns there against the 3-month T-bill rate${tb ? ` of ${pct(tb.rate)}` : ""}, and what kind of yield pays it.</p>
    <p class="yact"><a class="btn" href="${esc(xLink(share, SITE + "/chains"))}" target="_blank" rel="noopener">Share on X</a></p>
  </section>

  <section class="ystats" aria-label="Chains in numbers">
    ${stat(String(all.length), "chains with dollar yield")}
    ${stat(usd(total), "deposited in the yields we track")}
    ${stat(Math.round(first.tvl / total * 100) + "%", `of it on ${esc(first.name)}`)}
    ${stat(pct(topAvg.avg), `highest average, on ${esc(topAvg.name)}`)}
  </section>

  <section class="panel cbox" aria-labelledby="cbH">
    <div class="sectionhead"><div><h2 id="cbH">What the average dollar earns</h2><p class="sub">The 30-day APY of every dollar yield on the chain, weighted by how much is deposited in each. The dashed line is the T-bill rate.</p></div></div>
    <div class="cbars" style="--tb:${tb ? (tb.rate / max * 100).toFixed(2) : -10}%">
      ${byAvg.map(bar).join("\n      ")}
      ${tb ? `<span class="cb-line" style="grid-row:1 / ${byAvg.length + 1}" aria-hidden="true"><b>T-bill ${pct(tb.rate)}</b></span>` : ""}
    </div>
    <p class="fine">A chain full of T-bill funds sits near the line; one where most dollars are lent out sits above it, and so does its risk.</p>
  </section>

  <section class="panel board" aria-labelledby="chH">
    <div class="sectionhead"><div><h2 id="chH">Every chain</h2><p class="sub">Most deposits first. The bar under each chain shows which types of yield its deposits sit in.</p></div></div>
    ${catLegend(board)}
    <div class="tablebox"><table class="rt ct cht">
      <thead><tr><th scope="col">Chain</th><th scope="col" class="r">Average APY</th><th scope="col" class="r">vs T-bill</th><th scope="col" class="r hs">Deposits</th></tr></thead>
      <tbody>${shown.map(row).join("")}</tbody>
    </table></div>
    ${small.length ? `<p class="fine">Also tracked, one yield each: ${small.map(c => `${esc(c.name)} (<a href="/y/${esc(c.best.r.slug)}">${esc(c.best.r.name + " " + c.best.r.symbol)}</a>, ${pct(c.best.apy30)})`).join(", ")}.</p>` : ""}
  </section>

  <section class="twocol">
    <article class="panel note"><h3>Why the same dollar earns more on one chain</h3><p>Lending rates are set by each market’s own borrowers, so a chain where many people borrow dollars to trade pays more. A chain whose deposits sit mostly in T-bill funds or savings rates stays close to the T-bill line. More yield still means more risk, not a better chain.</p></article>
    <article class="panel note"><h3>Same token, many chains</h3><p>T-bill funds, savings rates and synthetic dollars usually pay the same on every chain they live on. We count each chain’s own deposits, so a token on four chains adds to all four. Moving between chains through a bridge adds its own risk.</p></article>
  </section>
  <p class="block"><a class="btn" href="/">See every dollar yield</a> <a class="btn" href="/premium">What risk has paid</a></p>
`;
}

// /chains/base …: every dollar yield on one chain, with that chain's own deposits and rates.
function chainMain(c, board, all){
  const tb = board.tbill, catName = id => (board.cats.find(x => x.id === id) || {short: id}).short || id;
  const others = all.filter(x => x.page && x !== c);
  const best = c.best, big = c.entries.slice().sort((a, b) => b.tvl - a.tvl)[0];
  const lede = `${c.about ? c.about + " " : ""}We track ${c.count} dollar yields here with ${usd(c.tvl)} deposited. The average deposited dollar earns ${pct(c.avg)}` +
    (tb ? `, ${Math.abs(c.over) < 0.005 ? "level with" : `${Math.abs(c.over).toFixed(2)} points ${c.over > 0 ? "above" : "below"}`} the 3-month T-bill rate of ${pct(tb.rate)}.` : ".") +
    ` The biggest is ${big.r.name} ${big.r.symbol} with ${usd(big.tvl)}.`;
  const share = `What a dollar earns on ${c.name}: ${pct(c.avg)} on average, up to ${pct(best.apy30)} in ${best.r.name} ${best.r.symbol}` + (tb ? `. T-bills pay ${pct(tb.rate)}.` : ".");
  const parts = CAT_ORDER.filter(k => c.mix[k] > 0);
  const tide = c.name === "Robinhood Chain" ? `<p class="fine">Want every Robinhood Chain pool, not only dollar yields? Our sister site <a href="https://tidewatch-olive.vercel.app/yields" target="_blank" rel="noopener">Tidewatch</a> tracks them all.</p>` : "";
  const where = e => e.r.chains.length > 1 ? `also on ${e.r.chains.length - 1} other chain${e.r.chains.length > 2 ? "s" : ""}` : e.r.cat === "lending" ? (e.r.meta || "") : `only on ${c.name}`;
  return `  <section class="pagehead">
    <p class="crumbs"><a href="/chains">Chains</a> <span>/</span> <span>${esc(c.name)}</span></p>
    <h1>What does a dollar earn on <em>${esc(c.name)}?</em></h1>
    <p class="lede">${esc(lede)}</p>
    <p class="yact"><a class="btn" href="${esc(xLink(share, SITE + "/chains/" + c.slug))}" target="_blank" rel="noopener">Share on X</a></p>
    ${tide}
  </section>

  <section class="ystats" aria-label="${esc(c.name)} in numbers">
    ${stat(pct(c.avg), tb ? `average deposited dollar (T-bill ${pct(tb.rate)})` : "average deposited dollar", "")}
    ${stat(pct(best.apy30), `highest (${esc(best.r.name + " " + best.r.symbol)})`)}
    ${stat(usd(c.tvl), "deposited")}
    ${stat(tb ? `${c.above} of ${c.count}` : String(c.count), tb ? "pay more than T-bills" : "yields tracked")}
  </section>

  <section class="panel cbox" aria-labelledby="mixH">
    <div class="sectionhead"><div><h2 id="mixH">What pays the yield on ${esc(c.name)}</h2><p class="sub">Where its deposits sit, by type of yield.</p></div></div>
    ${mixBar(c, board, "big")}
    <div class="legend catlegend mixlegend">${parts.map(k => `<span><span class="sw" style="--c:var(--b-cat-${k})"></span>${esc((board.cats.find(x => x.id === k) || {name: k}).name)} <b class="num">${Math.round(c.mix[k] / c.tvl * 100)}%</b> <span class="num">${usd(c.mix[k])}</span></span>`).join("")}</div>
  </section>

  <section class="panel board" aria-labelledby="chyH">
    <div class="sectionhead"><div><h2 id="chyH">Every dollar yield on ${esc(c.name)}</h2><p class="sub">Highest 30-day average first, with the deposits on ${esc(c.name)} only. Tap one for its history, what pays it and where else it pays.</p></div></div>
    <div class="tablebox"><table class="rt ct">
      <thead><tr><th scope="col">Dollar yield</th><th scope="col" class="hm">Type</th><th scope="col" class="r">30-day APY</th><th scope="col" class="r">vs T-bill</th><th scope="col" class="r hs">Deposits here</th></tr></thead>
      <tbody>${c.entries.map(e => `<tr>
        <td><a class="tok rowlink" href="/y/${esc(e.r.slug)}"><b>${esc(e.r.name)} <span class="muted">${esc(e.r.symbol)}</span></b>${where(e) ? `<small>${esc(where(e))}</small>` : ""}</a></td>
        <td class="hm"><span class="type"><span class="sw" style="--c:var(--b-cat-${e.r.cat})"></span>${esc(catName(e.r.cat))}</span></td>
        <td class="r"><span class="apy">${pct(e.apy30)}</span></td>
        <td class="r"><span class="over ${overCls(tb ? e.apy30 - tb.rate : null)}">${tb ? pts(e.apy30 - tb.rate) : "–"}</span></td>
        <td class="r hs num">${usd(e.tvl)}</td></tr>`).join("")}</tbody>
    </table></div>
    <p class="fine">30-day APY is DefiLlama’s 30-day average for the pool on ${esc(c.name)}. Rates that pay part of their yield in reward tokens count those too.</p>
  </section>
${others.length ? `
  <section class="yrel" aria-labelledby="otherH">
    <h2 id="otherH">Other chains</h2>
    <div class="chips coinchips">${others.map(x => `<a class="chip" href="/chains/${x.slug}">${esc(x.name)}</a>`).join("")}</div>
  </section>` : ""}
  <p class="block"><a class="btn" href="/chains">Compare every chain</a> <a class="btn" href="/">See every dollar yield</a></p>
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
      COINS.COINS.filter(c => COINS.rowsOf(rows, c.id).length).map(c => `  <url><loc>${SITE}/${c.id}</loc></url>\n`).join("") +
      CHAINS.byChain(board).filter(c => c.page).map(c => `  <url><loc>${SITE}/chains/${c.slug}</loc></url>\n`).join("") +
      rows.map(r => `  <url><loc>${SITE}/y/${esc(r.slug)}</loc></url>\n`).join("") + "</urlset>\n");
  }

  if (q.p === "coin"){
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (!rows.length){ res.setHeader("Cache-Control", "no-store"); return res.status(503).send(read("404.html").replace("The link may be old or mistyped.", "Rates are unavailable right now. Please try again in a minute.")); }
    const coin = COINS.COINS.find(c => c.id === String(q.c || "").toLowerCase());
    const list = coin ? COINS.rowsOf(rows, coin.id).filter(r => r.apy30 != null).sort((a, b) => b.apy30 - a.apy30) : [];
    if (!list.length){ res.setHeader("Cache-Control", "public, s-maxage=600"); return res.status(404).send(read("404.html")); }
    CTPL = CTPL || read("templates/coin.html");
    const tb = board.tbill, desc = `Every ${coin.name} yield on chain, highest first: ${list[0].name} ${list[0].symbol} leads at ${pct(list[0].apy30)} (30-day average)${tb ? `, against the ${pct(tb.rate)} T-bill rate` : ""}.`;
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=86400");
    return res.status(200).send(CTPL
      .replace(/__COIN__/g, () => coin.id).replace(/__NAME__/g, () => esc(coin.name)).replace(/__DESC__/g, () => esc(desc))
      .replace("__MAIN__", () => coinMain(coin, list, board)));
  }

  if (q.p === "chains" || q.p === "chain"){
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (!rows.length){ res.setHeader("Cache-Control", "no-store"); return res.status(503).send(read("404.html").replace("The link may be old or mistyped.", "Rates are unavailable right now. Please try again in a minute.")); }
    const all = CHAINS.byChain(board);
    if (q.p === "chains"){
      HTPL = HTPL || read("templates/chains.html");
      res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=86400");
      return res.status(200).send(HTPL.replace("__MAIN__", () => chainsMain(board)));
    }
    const c = all.find(x => x.page && x.slug === String(q.c || "").toLowerCase());
    if (!c){ res.setHeader("Cache-Control", "public, s-maxage=600"); return res.status(404).send(read("404.html").replace("The link may be old or mistyped.", "We don’t track enough dollar yields on that chain for a page of its own.")); }
    KTPL = KTPL || read("templates/chain.html");
    const tb = board.tbill, desc = `What a dollar earns on ${c.name}: ${c.count} dollar yields, ${usd(c.tvl)} deposited, ${pct(c.avg)} for the average deposited dollar${tb ? ` against the ${pct(tb.rate)} T-bill rate` : ""}. Highest: ${c.best.r.name} ${c.best.r.symbol} at ${pct(c.best.apy30)}.`;
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=86400");
    return res.status(200).send(KTPL
      .replace(/__CHAIN__/g, () => c.slug).replace(/__NAME__/g, () => esc(c.name)).replace(/__DESC__/g, () => esc(desc))
      .replace("__MAIN__", () => chainMain(c, board, all)));
  }

  if (q.p === "funds"){
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (!rows.length){ res.setHeader("Cache-Control", "no-store"); return res.status(503).send(read("404.html").replace("The link may be old or mistyped.", "Rates are unavailable right now. Please try again in a minute.")); }
    FTPL = FTPL || read("templates/funds.html");
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=86400");
    return res.status(200).send(FTPL.replace("__MAIN__", () => fundsMain(board)));
  }

  const want = String(q.s || "").slice(0, 100), low = want.toLowerCase();
  // the slug, or a row key or DefiLlama pool id (what alert links carry), which redirect to the slug
  const r = rows.find(x => x.slug === low) || rows.find(x => x.key.toLowerCase() === low || x.id === low || x.pools.some(p => p.pool === low)) ||
    rows.find(x => low.endsWith("-" + x.id.slice(0, 4)) && low.startsWith(x.slug.split("-")[0] + "-"));
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
