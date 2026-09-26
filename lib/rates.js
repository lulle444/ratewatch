// What a dollar earns on chain: every yield-bearing dollar token and deep stablecoin market, grouped by what pays the
// yield, next to the rate the US government pays on 3-month T-bills. Yields come from DefiLlama's public pools API,
// the T-bill rate from FRED (US Treasury as backup). No keys needed.
const UA = "Mozilla/5.0 (compatible; RatewatchBot/1.0)";
const POOLS = "https://yields.llama.fi/pools";

async function get(url, type = "json", timeout = 15000){
  const r = await fetch(url, {headers: {"user-agent": UA, accept: type === "json" ? "application/json" : "text/csv,text/plain"}, signal: AbortSignal.timeout(timeout)});
  if (!r.ok) throw new Error(`${url.split("?")[0]} → HTTP ${r.status}`);
  return type === "json" ? r.json() : r.text();
}
const num = v => { const n = typeof v === "number" ? v : parseFloat(v); return isFinite(n) ? n : null; };

/* ---------- what pays the yield ---------- */
// Tested in this order; the first match wins. A pool that matches none is left out.
const PLAIN = /^(USDC|USDT|USDT0|USDC\.E|USDS|DAI|PYUSD|USDG|RLUSD|FDUSD|GHO|USD1|FRXUSD|CRVUSD|USDE|USDA|LUSD|BOLD|USDB|AUSD|USDX|USD₮0)$/i;
const LEND = /aave|compound|morpho|maple|sparklend|spark$|fluid|euler|kamino|jupiter|venus|silo|centrifuge|justlend|benqi|moonwell|dolomite|gearbox|marginfi|drift|^save$|solend|hyperlend|felix|hypurrfi|lista|radiant|notional|clearpool|goldfinch|wildcat|avalon|summer|ipor|term-finance|termmax|3jane|pareto|sentora|gauntlet|curvance|credix|blend-pools|navi-lending|tydro|llamalend/;
const CATS = [
  {id: "tbill", name: "T-bill funds", short: "T-bills",
    about: "Tokenized money-market and T-bill funds. The yield is the interest on short US government debt, minus the fund’s fee. Most are only open to verified or institutional investors.",
    test: p => /buidl|usyc|hashnote|ustb|superstate|benji|franklin|openeden-t|ondo-yield|ousg|wisdomtree|janus|anemoy|spiko|mountain|matrixdock|vaneck|fidelity|libeara|tbill|treasur/.test(p.project) ||
      // a stablecoin pool that feeds one fund, like Centrifuge's USDS pool into the Janus Henderson Treasury Fund
      /treasury fund|^m?tbill$/i.test(p.meta) ||
      (!LEND.test(p.project) && /^(BUIDL|USYC|USTB|BENJI|IBENJI|TBILL|OUSG|USDY|RUSDY|WTGXX|JTRSY|USTBL|STBT|MTBILL|EUTBL|FOBXX|USDM|WUSDM|VBILL)$/i.test(p.symbol))},
  {id: "lending", name: "Lending", short: "Lending",
    about: "Lending dollars to borrowers on a DeFi market or a credit fund. The rate floats with borrowing demand, and the risk is the borrowers and the collateral behind them.",
    test: p => LEND.test(p.project), min: 50e6},
  {id: "synthetic", name: "Synthetic dollars", short: "Synthetic",
    about: "Dollars backed by trading strategies, such as a crypto position hedged with a short on futures. The yield comes from funding rates and strategy returns, so it rises and falls with the market.",
    test: p => /ethena|usual|resolv|falcon|elixir|level-|usd-ai|usdai|^re$|infinifi|reservoir|strata|avant|yield-fi|yieldfi|syntetika|noon|fx-protocol|^cap$|cap-|openeden-usdo|apyx|bitwise-uscc|mainstreet|saturn|yuzu|unitas|aegis|^axis$|tori-finance|liminal/.test(p.project) ||
      /^(SUSDE|SUSDF|STUSR|USD0\+\+|BUSD0|SUSDAI|REUSD|SAVUSD|SRUSD|SDEUSD|SIUSD|SNUSD|YUSD|STCUSD)$/i.test(p.symbol)},
  {id: "savings", name: "Savings rates", short: "Savings",
    about: "The rate a stablecoin protocol pays holders for parking dollars with it, like sUSDS from Sky. The protocol earns it from loans and reserves and sets the rate itself.",
    test: p => /savings|^sky|maker-dsr|^frax$|scrvusd|^crvusd$/.test(p.project) ||
      /^(SUSDS|SDAI|SFRXUSD|SCRVUSD|STUSDS|SGHO|STKGHO|SBOLD)$/i.test(p.symbol)},
];
// Fixed-rate and yield-trading markets (Pendle and the like) price a token's future yield rather than pay it, and a few
// projects repeat another's pool (the "sdai" listing is Sky's sDAI again).
const SKIP = /pendle|spectra|exponent|napier|convex|curve-dex|uniswap|balancer|^sdai$|stake-dao|beefy|yearn/;
// DefiLlama also flags euro, franc and pound stablecoins; this site is about dollars.
const NOT_USD = /EUR|EUTBL|GBP|CHF|JPY|CAD|AUD|BRL|MXN|SGD|TRY|XAU|GOLD|ZAR|IDR|KRW|CNH|HKD/i;
const MIN_TVL = 5e6;       // smaller pools are left out
const MAX_APY = 40;        // above this is almost always a short-lived reward or broken data
const MIN_APY = 0.5;       // below this a pool is idle or winding down, not a place to earn

function classify(p){
  if (p.exposure !== "single" || p.outlier) return null;
  const apy = num(p.apy) ?? num(p.apyMean30d), tvl = num(p.tvlUsd);
  if (apy == null || apy < MIN_APY || apy > MAX_APY || !(tvl >= MIN_TVL)) return null;
  const q = {project: String(p.project || "").toLowerCase(), symbol: String(p.symbol || ""), meta: String(p.poolMeta || "")};
  if (NOT_USD.test(q.symbol) || SKIP.test(q.project)) return null;
  // DefiLlama doesn't count fund shares (OUSG, VBILL, TBILL) as stablecoins, so T-bill funds skip that test
  if (p.stablecoin !== true && !CATS[0].test(q)) return null;
  // a pool that pays only in reward tokens is a farm, not a dollar yield
  if ((num(p.apyBase) ?? 0) < MIN_APY && num(p.apyReward) > 0) return null;
  for (const c of CATS){
    if (!c.test(q)) continue;
    if (c.id === "lending" && !PLAIN.test(q.symbol) && !/usd|dai|gho/i.test(q.symbol)) return null;
    if (c.min && tvl < c.min) return null;
    return c.id;
  }
  return null;
}

// DefiLlama project slugs → readable names; anything else is title-cased.
const NAMES = {"ondo-yield-assets": "Ondo", "blackrock-buidl": "BlackRock", "circle-usyc": "Circle", "sky-lending": "Sky",
  "aave-v3": "Aave", "compound-v3": "Compound", "morpho-blue": "Morpho", "maple": "Maple", "ethena-usde": "Ethena", "usual-usd0": "Usual",
  "spark-savings": "Spark Savings", "sparklend": "SparkLend", "fluid-lending": "Fluid", "euler-v2": "Euler", "kamino-lend": "Kamino",
  "jupiter-lend": "Jupiter Lend", "re": "Re", "franklin-templeton": "Franklin Templeton", "superstate-ustb": "Superstate", "openeden-tbill": "OpenEden",
  "centrifuge": "Centrifuge", "centrifuge-protocol": "Centrifuge", "midas-rwa": "Midas", "vaneck-treasury-fund": "VanEck", "resolv": "Resolv", "falcon-finance": "Falcon", "usd-ai": "USD.AI", "invesco-ustb": "Invesco",
  "bitwise-uscc": "Bitwise", "justlend": "JustLend", "apyx-protocol": "Apyx"};
const title = s => NAMES[s] || s.replace(/-v\d+$/, "").split("-").map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(" ");
// DefiLlama upper-cases symbols; staked and savings tokens read better in their own spelling (SUSDE → sUSDe).
const STABLE = {USD: "USD", USDE: "USDe", USDS: "USDS", DAI: "DAI", FRXUSD: "frxUSD", CRVUSD: "crvUSD", USDAI: "USDai", USDF: "USDf", USR: "USR", USDC: "USDC", USDT: "USDT", USDG: "USDG", USD0: "USD0", GHO: "GHO", BOLD: "BOLD", PYUSD: "PYUSD", RLUSD: "RLUSD", USD1: "USD1", USDX: "USDX", USDU: "USDu"};
// Lending vaults are named curator + dollar + flavour: SENPYUSDPRIMEV2 → senPYUSD Prime v2 (Sentora's PYUSD vault),
// SENRLUSDV2 → senRLUSD v2, GTUSDCP → gtUSDCp.
const VAULT = /^(STEAK|GT|SPARK|SIRLOIN|SEN|SKYMONEY|RE7|BB|MEV|SMOKEHOUSE|HYPERITHM|K3|YO|KPK|AVANTGARDE|TAC)(USDC|USDT|USDS|USDE|USDG|DAI|GHO|PYUSD|RLUSD|USD1|FRXUSD|CRVUSD|USD0|USD)(.*)$/;
function prettySym(s){
  const u = String(s).toUpperCase(), m = u.match(/^(ST|S|RE|B|W|STEAK|GT|SPARK|SIRLOIN)(USD[A-Z0-9]*|USR|DAI|GHO|BOLD|FRXUSD|CRVUSD)$/);
  if (m && STABLE[m[2]]) return m[1].toLowerCase() + STABLE[m[2]];
  const v = u.match(VAULT);
  if (v && v[2] in STABLE){
    const rest = v[3].replace(/V(\d+)$/, " v$1").trim();
    const tail = !rest ? "" : /^v\d+$/.test(rest) ? " " + rest : rest.length <= 2 ? rest.toLowerCase() : " " + rest.replace(/^[A-Z]+/, w => w[0] + w.slice(1).toLowerCase());
    return v[1].toLowerCase() + STABLE[v[2]] + tail;
  }
  // a short lower-case prefix on a plain dollar (SAVUSD → savUSD, SYZUSD → syzUSD); uppercase tickers like FDUSD stay
  const p = u === s && u.match(/^([A-Z]{2,4})USD$/);
  if (p && !STABLE[u] && !UPPER.has(u)) return p[1].toLowerCase() + "USD";
  return s;
}
const UPPER = new Set(["FDUSD", "PYUSD", "RLUSD", "EURUSD", "USTB", "USCC"]);
const CHAIN_NAMES = {Robinhood: "Robinhood Chain", BSC: "BNB Chain", Hyperliquid: "HyperEVM"};
const chainName = c => CHAIN_NAMES[c] || c;

/* ---------- the benchmark: 3-month US T-bill ---------- */
// FRED's DGS3MO is the 3-month Treasury yield on an investment (not discount) basis, the fair line to hold APYs against.
async function tbill(){
  try {
    const csv = await get("https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS3MO&cosd=" + new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10), "text");
    const hist = csv.trim().split(/\r?\n/).slice(1).map(l => l.split(",")).map(([d, v]) => [d, num(v)]).filter(([, v]) => v != null);
    if (hist.length) return {rate: hist[hist.length - 1][1], date: hist[hist.length - 1][0], source: "FRED DGS3MO", history: hist};
  } catch (e) { console.warn("FRED:", e.message); }
  // Backup: the Treasury's own daily bill rates, 13-week coupon equivalent.
  const y = new Date().getUTCFullYear(), hist = [];
  for (const yr of [y - 1, y]){
    try {
      const csv = await get(`https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${yr}/all?type=daily_treasury_bill_rates&field_tdr_date_value=${yr}&page&_format=csv`, "text");
      const rows = csv.trim().split(/\r?\n/).map(l => l.split(",").map(s => s.replace(/"/g, "")));
      const col = rows[0].findIndex(h => /13 weeks coupon equivalent/i.test(h));
      if (col < 0) continue;
      for (const r of rows.slice(1)){
        const [m, d, yy] = r[0].split("/"), v = num(r[col]);
        if (v != null && yy) hist.push([`${yy}-${m}-${d}`, v]);
      }
    } catch (e) { console.warn("Treasury:", e.message); }
  }
  hist.sort((a, b) => a[0] < b[0] ? -1 : 1);
  if (!hist.length) return null;
  return {rate: hist[hist.length - 1][1], date: hist[hist.length - 1][0], source: "US Treasury", history: hist};
}

/* ---------- the board ---------- */
function group(pools){
  // T-bill funds, savings and synthetic dollars pay the same rate on every chain, so they are one row with chain tags.
  // Lending rates differ per chain and market, so each lending pool is its own row.
  const rows = new Map();
  for (const p of pools){
    // DefiLlama's note tells apart two markets of the same token (Aave's Core and Prime markets, Midas's funds)
    const meta = p.poolMeta ? String(p.poolMeta).slice(0, 40) : null;
    const key = p.cat === "lending" ? p.pool : `${p.project}|${p.symbol.toUpperCase()}|${meta || ""}`;
    // a pool whose note names the fund token it buys (Midas's mTBILL) is shown as that token
    // some T-bill funds sit under a generic symbol and name the fund only in poolMeta; show the fund's own ticker
    const fundSym = p.cat === "tbill" && meta && (/^m?tbill$/i.test(meta) ? meta : /janus henderson/i.test(meta) ? "JTRSY" : null);
    if (!rows.has(key)) rows.set(key, {cat: p.cat, project: p.project, name: title(p.project), symbol: fundSym || prettySym(p.symbol), meta: fundSym ? null : meta, pools: []});
    rows.get(key).pools.push({pool: p.pool, chain: chainName(p.chain), tvl: num(p.tvlUsd), apy: num(p.apy), apy30: num(p.apyMean30d), base: num(p.apyBase), reward: num(p.apyReward)});
  }
  const wavg = (ps, k) => { let s = 0, w = 0; for (const x of ps) if (x[k] != null){ s += x[k] * x.tvl; w += x.tvl; } return w ? s / w : null; };
  return [...rows.values()].map(r => {
    r.pools.sort((a, b) => b.tvl - a.tvl);
    const tvl = r.pools.reduce((s, x) => s + x.tvl, 0);
    // a stable id for alerts and Telegram links (letters, digits, _ and - only): the pool for a lending market,
    // project and symbol for a token that pays the same on every chain
    const key = (r.cat === "lending" ? r.pools[0].pool : `${r.project}__${r.symbol.toUpperCase()}` + (r.meta ? "__" + r.meta : "")).replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 60);
    return {...r, key, id: r.pools[0].pool, chains: [...new Set(r.pools.map(x => x.chain))], tvl, apy: wavg(r.pools, "apy"), apy30: wavg(r.pools, "apy30"),
      reward: wavg(r.pools, "reward")};
  });
}

// A readable address per row for its page, /y/ethena-susde or /y/aave-usdc-base. A lending market adds its chain (and
// its market's note when one chain has two); a clash left after that gets a piece of the pool id, which never changes.
const slugify = s => String(s).toLowerCase().replace(/\+/g, "-plus").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function slugs(rows){
  const base = r => [...new Set(slugify([r.name, r.symbol, ...(r.cat === "lending" ? [r.chains[0], r.meta || ""] : [])].join(" ")).split("-"))].join("-").slice(0, 70);
  // rows come largest first, so the largest keeps the plain slug; the others add their chain, or failing that an id
  const taken = new Set();
  for (const r of rows) {
    const b = base(r), alt = r.chains.length === 1 ? [...new Set((b + "-" + slugify(r.chains[0])).split("-"))].join("-") : null;
    r.slug = !taken.has(b) ? b : alt && !taken.has(alt) ? alt : b + "-" + r.id.slice(0, 4);
    taken.add(r.slug);
  }
}

const median = xs => { const s = xs.filter(x => x != null).sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };

let memo = null;
async function board(){
  if (memo && Date.now() - memo.at < 10 * 60e3) return memo.v;
  const t0 = Date.now();
  const [j, tb] = await Promise.all([get(POOLS, "json", 25000), tbill().catch(() => null)]);
  const pools = [];
  for (const p of j.data || []){ const cat = classify(p); if (cat) pools.push({...p, cat}); }
  const rows = group(pools).sort((a, b) => b.tvl - a.tvl);
  slugs(rows);
  const bench = tb ? tb.rate : null;
  for (const r of rows) r.over = bench != null && r.apy30 != null ? r.apy30 - bench : null;
  // shown from the safest kind of yield to the riskiest
  const cats = ["tbill", "savings", "synthetic", "lending"].map(k => CATS.find(c => c.id === k)).map(({id, name, short, about}) => {
    const rs = rows.filter(r => r.cat === id);
    return {id, name, short, about, count: rs.length, tvl: rs.reduce((s, r) => s + r.tvl, 0), median: median(rs.map(r => r.apy30)),
      top: rs.slice().sort((a, b) => b.apy30 - a.apy30).slice(0, 3).map(r => ({name: r.name, symbol: r.symbol, apy30: r.apy30}))};
  });
  const chains = [...new Set(rows.flatMap(r => r.chains))].sort((a, b) =>
    rows.filter(r => r.chains.includes(b)).reduce((s, r) => s + r.tvl, 0) - rows.filter(r => r.chains.includes(a)).reduce((s, r) => s + r.tvl, 0));
  const v = {updated: new Date().toISOString(), ms: Date.now() - t0,
    tbill: tb ? {rate: tb.rate, date: tb.date, source: tb.source} : null,
    cats, chains, rows, tvl: rows.reduce((s, r) => s + r.tvl, 0)};
  memo = {at: Date.now(), v, tb};
  return v;
}

// One row's daily APY history from DefiLlama, with the T-bill rate on the same days.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function history(pool, days = 180){
  if (!UUID.test(pool)) throw new Error("bad pool id");
  const [j, tb] = await Promise.all([get("https://yields.llama.fi/chart/" + pool), memo && memo.tb ? memo.tb : tbill().catch(() => null)]);
  const since = Date.now() - days * 864e5;
  const pts = (j.data || []).map(x => ({d: String(x.timestamp).slice(0, 10), apy: num(x.apy), tvl: num(x.tvlUsd)}))
    .filter(x => x.apy != null && Date.parse(x.d) >= since);
  // bills don't trade on weekends and holidays: carry the last rate forward
  const hist = tb ? tb.history : [];
  let k = 0, last = null;
  for (const p of pts){
    while (k < hist.length && hist[k][0] <= p.d) last = hist[k++][1];
    p.tbill = last;
  }
  return {pool, points: pts};
}

// What risk has paid: for each type, the deposit-weighted daily APY of its largest yields over the past year, next to the
// T-bill rate on the same day. Daily APYs jump around, so each type's line is a 7-day average, and a day needs at least
// two of a type's yields reporting. Fetches about 30 pool histories, so the result is kept for six hours.
let premMemo = null;
async function premium(){
  if (premMemo && Date.now() - premMemo.at < 6 * 3600e3) return premMemo.v;
  const b = await board(), since = Date.now() - 372 * 864e5, PER = 8;
  const picks = [];
  for (const c of b.cats) picks.push(...b.rows.filter(r => r.cat === c.id).sort((x, y) => y.tvl - x.tvl).slice(0, PER));
  const charts = await Promise.all(picks.map(r => get("https://yields.llama.fi/chart/" + r.id).then(j => ({r, data: j.data || []})).catch(() => null)));
  const acc = new Map();   // day -> {cat: [apy × tvl, tvl, count]}
  for (const x of charts) {
    if (!x) continue;
    for (const p of x.data) {
      const d = String(p.timestamp).slice(0, 10), apy = num(p.apy), tvl = num(p.tvlUsd);
      if (Date.parse(d) < since || apy == null || !(tvl > 0) || apy > 60) continue;
      const day = acc.get(d) || acc.set(d, {}).get(d), a = day[x.r.cat] || (day[x.r.cat] = [0, 0, 0]);
      a[0] += apy * tvl; a[1] += tvl; a[2]++;
    }
  }
  const days = [...acc.keys()].sort();
  const tb = (memo && memo.tb) || await tbill().catch(() => null), hist = tb ? tb.history : [];
  let k = 0, last = null;
  const raw = days.map(d => {
    while (k < hist.length && hist[k][0] <= d) last = hist[k++][1];
    const o = {d, bench: last};   // "bench" is the T-bill rate; "tbill" is the T-bill funds' line
    for (const c of b.cats) { const a = acc.get(d)[c.id]; o[c.id] = a && a[2] >= 2 ? a[0] / a[1] : null; }
    return o;
  });
  // 7-day average per type
  const pts = raw.map((o, i) => {
    const out = {d: o.d, bench: o.bench};
    for (const c of b.cats) {
      const w = raw.slice(Math.max(0, i - 6), i + 1).map(x => x[c.id]).filter(v => v != null);
      out[c.id] = w.length >= 4 ? +(w.reduce((s, v) => s + v, 0) / w.length).toFixed(3) : null;
    }
    return out;
  }).filter(o => Date.parse(o.d) >= Date.now() - 365 * 864e5 && o.bench != null);
  const v = {updated: new Date().toISOString(), tbill: b.tbill ? {rate: b.tbill.rate, date: b.tbill.date} : null,
    cats: b.cats.map(({id, name, short}) => ({id, name, short, yields: picks.filter(r => r.cat === id).map(r => `${r.name} ${r.symbol}`)})), points: pts};
  if (pts.length > 30) premMemo = {at: Date.now(), v};
  return v;
}

module.exports = {board, history, premium, tbill, classify, CATS, slugify};
