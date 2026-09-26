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
const NOT_USD = /EUR|GBP|CHF|JPY|CAD|AUD|BRL|MXN|SGD|TRY|XAU|GOLD|ZAR|IDR|KRW|CNH|HKD/i;
const MIN_TVL = 5e6;       // smaller pools are left out
const MAX_APY = 40;        // above this is almost always a short-lived reward or broken data

function classify(p){
  if (p.stablecoin !== true || p.exposure !== "single" || p.outlier) return null;
  const apy = num(p.apy) ?? num(p.apyMean30d), tvl = num(p.tvlUsd);
  if (apy == null || apy <= 0 || apy > MAX_APY || !(tvl >= MIN_TVL)) return null;
  const q = {project: String(p.project || "").toLowerCase(), symbol: String(p.symbol || "")};
  if (NOT_USD.test(q.symbol) || SKIP.test(q.project)) return null;
  for (const c of CATS){
    if (!c.test(q)) continue;
    if (c.id === "lending" && !PLAIN.test(q.symbol) && !/usd|dai|gho/i.test(q.symbol)) return null;
    if (c.min && tvl < c.min) return null;
    return c.id;
  }
  return null;
}

// DefiLlama project slugs → readable names; anything else is title-cased.
const NAMES = {"ondo-yield-assets": "Ondo", "blackrock-buidl": "BlackRock BUIDL", "circle-usyc": "Circle", "sky-lending": "Sky",
  "aave-v3": "Aave", "compound-v3": "Compound", "morpho-blue": "Morpho", "maple": "Maple", "ethena-usde": "Ethena", "usual-usd0": "Usual",
  "spark-savings": "Spark Savings", "sparklend": "SparkLend", "fluid-lending": "Fluid", "euler-v2": "Euler", "kamino-lend": "Kamino",
  "jupiter-lend": "Jupiter Lend", "re": "Re", "franklin-templeton": "Franklin Templeton", "superstate-ustb": "Superstate", "openeden-tbill": "OpenEden",
  "centrifuge": "Centrifuge", "resolv": "Resolv", "falcon-finance": "Falcon", "usd-ai": "USD.AI", "invesco-ustb": "Invesco"};
const title = s => NAMES[s] || s.replace(/-v\d+$/, "").split("-").map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(" ");
// DefiLlama upper-cases symbols; staked and savings tokens read better in their own spelling (SUSDE → sUSDe).
const STABLE = {USD: "USD", USDE: "USDe", USDS: "USDS", DAI: "DAI", FRXUSD: "frxUSD", CRVUSD: "crvUSD", USDAI: "USDai", USDF: "USDf", USR: "USR", USDC: "USDC", USDT: "USDT", USDG: "USDG", USD0: "USD0", GHO: "GHO", BOLD: "BOLD"};
function prettySym(s){
  const u = String(s).toUpperCase(), m = u.match(/^(ST|S|RE|B|W|STEAK|GT|SPARK|SIRLOIN|SENPY)(USD[A-Z0-9]*|USR|DAI|GHO|BOLD|FRXUSD|CRVUSD)$/);
  if (m && STABLE[m[2]]) return m[1].toLowerCase() + STABLE[m[2]];
  return s;
}
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
    const key = p.cat === "lending" ? p.pool : `${p.project}|${p.symbol.toUpperCase()}`;
    if (!rows.has(key)) rows.set(key, {cat: p.cat, project: p.project, name: title(p.project), symbol: prettySym(p.symbol), pools: []});
    rows.get(key).pools.push({pool: p.pool, chain: chainName(p.chain), tvl: num(p.tvlUsd), apy: num(p.apy), apy30: num(p.apyMean30d), base: num(p.apyBase), reward: num(p.apyReward)});
  }
  const wavg = (ps, k) => { let s = 0, w = 0; for (const x of ps) if (x[k] != null){ s += x[k] * x.tvl; w += x.tvl; } return w ? s / w : null; };
  return [...rows.values()].map(r => {
    r.pools.sort((a, b) => b.tvl - a.tvl);
    const tvl = r.pools.reduce((s, x) => s + x.tvl, 0);
    return {...r, id: r.pools[0].pool, chains: r.pools.map(x => x.chain), tvl, apy: wavg(r.pools, "apy"), apy30: wavg(r.pools, "apy30"),
      reward: wavg(r.pools, "reward")};
  });
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

module.exports = {board, history, tbill, classify, CATS};
