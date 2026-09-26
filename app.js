/* Ratewatch: every page reads /api/rates once, then renders what it has room for. */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const pct = (v, d = 2) => v == null ? "–" : v.toFixed(d) + "%";
const signed = v => v == null ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(2) + " pts";
const usd = v => v == null ? "–" : v >= 1e9 ? "$" + (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + "B" : v >= 1e6 ? "$" + (v / 1e6).toFixed(v >= 1e8 ? 0 : 1) + "M" : "$" + Math.round(v / 1e3) + "k";
const money = v => "$" + v.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const catColor = id => `var(--b-cat-${id})`;
const PAGE = 25;

const S = {data: null, cat: "all", chain: "all", q: "", sort: "tvl", dir: -1, limit: PAGE, open: null, hist: new Map()};
const catOf = id => (S.data.cats.find(c => c.id === id) || {name: id, short: id});
const overCls = v => v == null ? "flat" : v > 0.25 ? "pos" : v < -0.25 ? "neg" : "flat";

fetch("/api/rates").then(r => r.ok ? r.json() : Promise.reject(r.status)).then(d => { S.data = d; render(); })
  .catch(() => {
    const msg = "Rates couldn’t be loaded right now. Please try again in a minute.";
    if ($("rows")) $("rows").innerHTML = `<tr><td colspan="6" class="empty">${msg}</td></tr>`;
    if ($("benchSub")) $("benchSub").textContent = msg;
    if ($("calcRes")) $("calcRes").innerHTML = `<p class="empty">${msg}</p>`;
  });

function render(){
  const d = S.data, tb = d.tbill;
  if ($("benchPillRate")) $("benchPillRate").textContent = tb ? pct(tb.rate) : "–";
  if ($("benchRate")){
    $("benchRate").textContent = tb ? tb.rate.toFixed(2) : "–";
    $("benchSub").textContent = tb ? `${tb.source}, ${new Date(tb.date + "T12:00:00Z").toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"})}` : "The T-bill rate is unavailable right now.";
  }
  if ($("cats")) renderCats();
  if ($("ladder")) renderLadder();
  if ($("rows")) renderBoard();
  if ($("calcRes")) initCalc();
  if ($("learnCats")) renderLearn();
}

/* ---------- type cards ---------- */
function renderCats(){
  const tb = S.data.tbill;
  $("cats").innerHTML = S.data.cats.map(c => `<button class="panel cat" style="--c:${catColor(c.id)}" data-cat="${c.id}" aria-pressed="${S.cat === c.id}">
      <h3><span class="sw"></span>${esc(c.name)}</h3>
      <p class="big num">${c.median == null ? "–" : c.median.toFixed(2)}<small>%</small></p>
      <p>typical 30-day APY · ${c.count} yield${c.count === 1 ? "" : "s"} · ${usd(c.tvl)}</p>
      ${tb && c.median != null ? `<p class="over">${signed(c.median - tb.rate)} vs T-bill</p>` : ""}
    </button>`).join("");
}

/* ---------- the yield ladder: one dot per yield, by type, against the T-bill line ---------- */
function renderLadder(){
  const d = S.data, box = $("ladder"), tb = d.tbill;
  const rows = d.rows.filter(r => r.apy30 != null && (S.chain === "all" || r.chains.includes(S.chain)));
  const vals = rows.map(r => r.apy30).sort((a, b) => a - b);
  const cap = Math.max(tb ? tb.rate + 2 : 6, Math.ceil((vals[Math.floor(vals.length * 0.97)] || 8) + 0.5));
  const W = Math.max(320, box.clientWidth || 900), mob = W < 560, L = mob ? 84 : 138, R = 16, lane = mob ? 46 : 52, T = 26;
  const cats = d.cats.filter(c => c.count);
  const H = T + lane * cats.length + 26;
  const x = v => L + Math.min(v, cap) / cap * (W - L - R);
  const step = cap > 16 ? 4 : cap > 8 ? 2 : 1;
  let g = "";
  for (let v = 0; v <= cap + 1e-9; v += step) g += `<line class="grid" x1="${x(v)}" x2="${x(v)}" y1="${T - 6}" y2="${H - 22}"/><text class="tick" x="${x(v)}" y="${H - 6}" text-anchor="middle">${v}%</text>`;
  cats.forEach((c, i) => {
    const y = T + lane * i + lane / 2;
    g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" opacity=".5"/><text class="lane" x="0" y="${y + 4}">${esc(mob ? c.short : c.name)}</text>`;
  });
  if (tb) g += `<line class="benchline" x1="${x(tb.rate)}" x2="${x(tb.rate)}" y1="${T - 14}" y2="${H - 22}"/><text class="benchlab" x="${x(tb.rate) + 6}" y="${T - 10}">T-bill ${tb.rate.toFixed(2)}%</text>`;
  const dots = [];
  cats.forEach((c, i) => {
    const y0 = T + lane * i + lane / 2;
    rows.filter(r => r.cat === c.id).sort((a, b) => a.apy30 - b.apy30).forEach((r, k, arr) => {
      // spread dots that sit close together over a few rows inside the lane, so none hides another
      const prev = arr.slice(Math.max(0, k - 3), k).filter(p => Math.abs(x(p.apy30) - x(r.apy30)) < 10).length;
      const y = y0 + [0, -12, 12, -6][prev % 4];
      dots.push(`<circle class="dot" data-id="${esc(r.id)}" cx="${x(r.apy30).toFixed(1)}" cy="${y}" r="5.5" fill="${catColor(c.id)}"${S.cat !== "all" && S.cat !== c.id ? ' opacity=".18"' : ""}/>`);
    });
  });
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${g}${dots.join("")}</svg><div class="tip" id="ltip" hidden></div>`;
  const over = rows.filter(r => r.over != null && r.over > 0.25).length;
  $("ladderSub").textContent = `${rows.length} dollar yields, each at its 30-day average APY. ${over} pay more than the T-bill line, and every point above it comes from taking on risk.`;
  const tip = $("ltip"), byId = new Map(rows.map(r => [r.id, r]));
  box.onmousemove = e => {
    const dot = e.target.closest(".dot");
    if (!dot){ tip.hidden = true; return; }
    const r = byId.get(dot.dataset.id), bb = box.getBoundingClientRect();
    tip.innerHTML = `<b>${esc(r.name)} ${esc(r.symbol)}</b> <span>${esc(r.chains.slice(0, 3).join(", "))}${r.chains.length > 3 ? "…" : ""}</span><br>${pct(r.apy30)} 30-day · ${usd(r.tvl)} deposits${r.apy30 > cap ? " · off the scale" : ""}`;
    tip.style.left = (e.clientX - bb.left) + "px"; tip.style.top = (e.clientY - bb.top) + "px"; tip.hidden = false;
  };
  box.onmouseleave = () => { tip.hidden = true; };
  box.onclick = e => {
    const dot = e.target.closest(".dot");
    if (!dot) return;
    S.open = dot.dataset.id; S.cat = "all"; S.q = ""; if ($("q")) $("q").value = "";
    const i = sorted(filtered()).findIndex(r => r.id === S.open);
    if (i >= S.limit) S.limit = Math.ceil((i + 1) / PAGE) * PAGE;
    renderCats(); renderBoard();
    document.querySelector(`tr.row[data-id="${CSS.escape(S.open)}"]`)?.scrollIntoView({block: "center", behavior: "smooth"});
  };
}
let rz;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (S.data && $("ladder")) renderLadder(); }, 150); });

/* ---------- the board ---------- */
function filtered(){
  const q = S.q.trim().toLowerCase();
  return S.data.rows.filter(r => (S.cat === "all" || r.cat === S.cat) && (S.chain === "all" || r.chains.includes(S.chain)) &&
    (!q || [r.name, r.symbol, r.project, ...r.chains].some(s => String(s).toLowerCase().includes(q))));
}
const sorted = rs => rs.slice().sort((a, b) => ((a[S.sort] ?? -1e9) - (b[S.sort] ?? -1e9)) * S.dir);

function renderBoard(){
  const d = S.data;
  const chainSel = $("chain");
  if (chainSel.options.length < 2) chainSel.innerHTML += d.chains.map(c => `<option>${esc(c)}</option>`).join("");
  $("chips").innerHTML = `<button class="chip" data-cat="all" aria-pressed="${S.cat === "all"}">All types</button>` +
    d.cats.map(c => `<button class="chip" data-cat="${c.id}" aria-pressed="${S.cat === c.id}"><span class="sw" style="--c:${catColor(c.id)}"></span>${esc(c.name)}</button>`).join("");
  document.querySelectorAll(".rt th button").forEach(b => { if (b.dataset.sort === S.sort) b.setAttribute("aria-sort", S.dir < 0 ? "descending" : "ascending"); else b.removeAttribute("aria-sort"); });
  const list = sorted(filtered()), shown = list.slice(0, S.limit);
  $("boardSub").textContent = `${list.length} of ${d.rows.length} dollar yields, ${usd(list.reduce((s, r) => s + r.tvl, 0))} in deposits. Tap a row for its history against the T-bill rate.`;
  $("rows").innerHTML = shown.length ? shown.map(r => {
    const c = catOf(r.cat), open = S.open === r.id;
    return `<tr class="row" data-id="${esc(r.id)}" aria-expanded="${open}" tabindex="0">
      <td><div class="tok"><b>${esc(r.name)} <span class="muted">${esc(r.symbol)}</span></b>
        <span class="chains">${r.chains.slice(0, 4).map(ch => `<span class="ch${/^Robinhood/.test(ch) ? " rh" : ""}">${esc(ch)}</span>`).join("")}${r.chains.length > 4 ? `<span class="ch">+${r.chains.length - 4}</span>` : ""}</span></div></td>
      <td class="hm"><span class="type"><span class="sw" style="--c:${catColor(r.cat)}"></span>${esc(c.short)}</span></td>
      <td class="r"><span class="apy">${pct(r.apy30)}</span></td>
      <td class="r hs num muted">${pct(r.apy)}</td>
      <td class="r"><span class="over ${overCls(r.over)}">${signed(r.over)}</span></td>
      <td class="r hs num">${usd(r.tvl)}</td>
    </tr>${open ? detailRow(r) : ""}`;
  }).join("") : `<tr><td colspan="6" class="empty">No dollar yield matches these filters.</td></tr>`;
  $("showMore").hidden = list.length <= S.limit;
  if (S.open && shown.some(r => r.id === S.open)) loadHistory(S.data.rows.find(r => r.id === S.open));
}

function detailRow(r){
  const c = catOf(r.cat);
  return `<tr class="detail"><td colspan="6"><div class="dbox">
    <div><div class="legend"><span><i style="--c:${catColor(r.cat)}"></i>${esc(r.symbol)} APY</span><span><i class="dash"></i>3-month T-bill</span></div>
      <div class="dchart" id="dchart"><p class="empty">Loading 6 months of history…</p></div></div>
    <div class="dside">
      <h4>${esc(c.name)}</h4><p>${esc(c.about)}</p>
      <h4>Where it pays</h4>
      <ul class="pl">${r.pools.slice(0, 6).map(p => `<li><a href="https://defillama.com/yields/pool/${esc(p.pool)}" target="_blank" rel="noopener">${esc(p.chain)}</a><span class="num">${pct(p.apy30 ?? p.apy)}</span><span class="num muted">${usd(p.tvl)}</span></li>`).join("")}</ul>
      ${r.reward ? `<p>${pct(r.reward)} of today’s rate is paid in reward tokens, which can end or lose value.</p>` : ""}
    </div></div></td></tr>`;
}

function loadHistory(r){
  const draw = h => { if (S.open === r.id && $("dchart")) drawHistory($("dchart"), h, r); };
  if (S.hist.has(r.id)) return draw(S.hist.get(r.id));
  fetch("/api/history?pool=" + encodeURIComponent(r.id)).then(x => x.ok ? x.json() : Promise.reject())
    .then(h => { S.hist.set(r.id, h); draw(h); })
    .catch(() => { if ($("dchart")) $("dchart").innerHTML = '<p class="empty">History couldn’t be loaded right now.</p>'; });
}

function drawHistory(box, h, r){
  const pts = h.points || [];
  if (pts.length < 3){ box.innerHTML = '<p class="empty">Not enough history yet.</p>'; return; }
  const W = Math.max(300, box.clientWidth || 600), H = 200, L = 38, R = 10, T = 10, B = 24;
  const hi = Math.max(...pts.map(p => Math.max(p.apy, p.tbill || 0))), top = Math.ceil(hi * 1.1) || 1;
  const x = i => L + i / (pts.length - 1) * (W - L - R), y = v => T + (1 - v / top) * (H - T - B);
  const step = top > 16 ? 4 : top > 8 ? 2 : 1;
  let g = "";
  for (let v = 0; v <= top; v += step) g += `<line class="gr" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`;
  const mfmt = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {month: "short", timeZone: "UTC"});
  let lastM = "";
  pts.forEach((p, i) => { const m = mfmt(p.d); if (m !== lastM && p.d.slice(8) <= "07"){ g += `<text class="ax" x="${x(i)}" y="${H - 6}" text-anchor="middle">${m}</text>`; } lastM = m; });
  const line = k => pts.map((p, i) => p[k] == null ? null : `${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).filter(Boolean).join(" ");
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${g}<polyline class="bl" points="${line("tbill")}"/><polyline class="ln" style="stroke:${catColor(r.cat)}" points="${line("apy")}"/><line class="hair" id="hair" y1="${T}" y2="${H - B}" visibility="hidden"/></svg><div class="tip" hidden></div>`;
  const tip = box.querySelector(".tip"), hair = box.querySelector("#hair"), svg = box.querySelector("svg");
  const move = e => {
    const bb = svg.getBoundingClientRect(), px = (e.clientX - bb.left) / bb.width * W;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round((px - L) / (W - L - R) * (pts.length - 1)))), p = pts[i];
    hair.setAttribute("x1", x(i)); hair.setAttribute("x2", x(i)); hair.setAttribute("visibility", "visible");
    tip.innerHTML = `<b>${new Date(p.d + "T12:00:00Z").toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"})}</b><br>${esc(r.symbol)} ${pct(p.apy)}${p.tbill != null ? ` · T-bill ${pct(p.tbill)}` : ""}`;
    tip.style.left = (x(i) / W * bb.width) + "px"; tip.style.top = (y(p.apy) / H * bb.height) + "px"; tip.hidden = false;
  };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerleave", () => { tip.hidden = true; hair.setAttribute("visibility", "hidden"); });
}

if ($("rows")){
  document.addEventListener("click", e => {
    const cat = e.target.closest("[data-cat]");
    if (cat && S.data){ S.cat = S.cat === cat.dataset.cat && cat.classList.contains("cat") ? "all" : cat.dataset.cat; S.limit = PAGE; renderCats(); renderLadder(); renderBoard(); return; }
    const sb = e.target.closest("th button[data-sort]");
    if (sb && S.data){ S.dir = S.sort === sb.dataset.sort ? -S.dir : -1; S.sort = sb.dataset.sort; renderBoard(); return; }
    const row = e.target.closest("tr.row");
    if (row && S.data){ S.open = S.open === row.dataset.id ? null : row.dataset.id; renderBoard(); return; }
    if (e.target.id === "showMore"){ S.limit += PAGE; renderBoard(); }
  });
  document.addEventListener("keydown", e => { const row = e.target.closest?.("tr.row"); if (row && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); row.click(); } });
  $("q").addEventListener("input", e => { S.q = e.target.value; S.limit = PAGE; if (S.data) renderBoard(); });
  $("chain").addEventListener("change", e => { S.chain = e.target.value; S.limit = PAGE; if (S.data){ renderLadder(); renderBoard(); } });
}

/* ---------- calculator ---------- */
function initCalc(){
  const sel = $("cCat");
  if (sel.options.length < 2) sel.innerHTML += S.data.cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  ["cAmt", "cMonths", "cCat"].forEach(id => $(id).addEventListener("input", calc));
  calc();
}
function calc(){
  const amt = Math.max(0, parseFloat($("cAmt").value) || 0), months = +$("cMonths").value, cat = $("cCat").value, tb = S.data.tbill;
  const earn = apy => amt * (Math.pow(1 + apy / 100 / 365, 365 * months / 12) - 1);
  const pick = S.data.rows.filter(r => r.apy30 != null && (cat === "all" || r.cat === cat));
  // the 8 highest 30-day rates among yields with over $50M in deposits
  const big = pick.filter(r => r.tvl >= 50e6).sort((a, b) => b.apy30 - a.apy30).slice(0, 8);
  const base = tb ? earn(tb.rate) : null;
  const rows = big.map(r => `<div class="cr"><div class="tok"><b>${esc(r.name)} <span class="muted">${esc(r.symbol)}</span></b><small><span class="sw" style="--c:${catColor(r.cat)}"></span> ${esc(catOf(r.cat).short)} · ${pct(r.apy30)} · ${usd(r.tvl)} deposits</small></div>
      <span class="earn">${money(earn(r.apy30))}</span><span class="extra ${overCls(r.over)} over">${base == null ? "" : (earn(r.apy30) >= base ? "+" : "−") + money(Math.abs(earn(r.apy30) - base))}</span></div>`);
  $("calcRes").innerHTML = `<div class="cr calchead"><span>Dollar yield</span><span>You’d earn</span><span>Extra</span></div>` +
    (tb ? `<div class="cr benchrow"><div class="tok"><b>3-month US T-bills</b><small>The risk-free line · ${pct(tb.rate)}</small></div><span class="earn">${money(base)}</span><span class="extra muted">–</span></div>` : "") +
    (rows.join("") || '<p class="empty">No yield over $50M of this type right now.</p>');
}

/* ---------- learn ---------- */
function renderLearn(){
  const tb = S.data.tbill;
  $("learnCats").innerHTML = S.data.cats.map(c => `<article class="panel lcat" style="--c:${catColor(c.id)}">
      <h3>${esc(c.name)}</h3><p>${esc(c.about)}</p>
      <div class="facts"><span><b class="num">${pct(c.median)}</b>typical 30-day APY</span><span><b>${tb && c.median != null ? signed(c.median - tb.rate) : "–"}</b>vs T-bill</span><span><b>${c.count}</b>tracked</span><span><b>${usd(c.tvl)}</b>deposits</span></div>
      ${c.top.length ? `<p>Highest right now: ${c.top.map(t => `${esc(t.name)} ${esc(t.symbol)} (${pct(t.apy30)})`).join(", ")}.</p>` : ""}
    </article>`).join("");
}
