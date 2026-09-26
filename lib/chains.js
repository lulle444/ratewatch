// Dollar yields per chain, for /chains and /chains/<slug>. A token that pays on several chains (sUSDS, BUIDL) counts
// on each chain with that chain's own deposits and 30-day rate, so a chain's numbers only hold what is deposited there.
const MIN_PAGE = 2;   // a chain needs this many yields for a page and a row of its own

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Short notes on the chains people ask about; others get a sentence built from their numbers only.
const ABOUT = {
  "Ethereum": "The chain where most dollar yield started: the Sky savings rate, most tokenized T-bill funds and the largest lending markets.",
  "Base": "Coinbase’s Ethereum layer 2.",
  "Arbitrum": "An Ethereum layer 2.",
  "OP Mainnet": "Optimism’s Ethereum layer 2.",
  "Solana": "A fast layer 1 chain with lending markets of its own.",
  "BNB Chain": "The chain started by Binance.",
  "Robinhood Chain": "Robinhood’s own chain, an Arbitrum-based layer 2 built for tokenized stocks and other real-world assets.",
  "Avalanche": "A layer 1 chain with lending markets of its own.",
  "Polygon": "An Ethereum scaling chain.",
  "HyperEVM": "Hyperliquid’s EVM chain.",
  "Plasma": "A chain built for stablecoin payments.",
  "XRPL": "The XRP Ledger.",
};

function byChain(board){
  const tb = board.tbill && board.tbill.rate, m = new Map();
  for (const r of board.rows) for (const p of r.pools) {
    const apy30 = p.apy30 != null ? p.apy30 : r.apy30;
    if (apy30 == null || !(p.tvl > 0)) continue;
    let c = m.get(p.chain);
    if (!c) m.set(p.chain, c = {name: p.chain, slug: slug(p.chain), entries: []});
    const e = c.entries.find(x => x.r === r);   // two pools of one row on the same chain are added up
    if (e) { e.apy30 = (e.apy30 * e.tvl + apy30 * p.tvl) / (e.tvl + p.tvl); e.tvl += p.tvl; }
    else c.entries.push({r, pool: p.pool, apy30, tvl: p.tvl});
  }
  const out = [...m.values()].map(c => {
    c.entries.sort((a, b) => b.apy30 - a.apy30 || b.tvl - a.tvl);
    c.tvl = c.entries.reduce((s, e) => s + e.tvl, 0);
    c.count = c.entries.length;
    // what the average deposited dollar on this chain earns
    c.avg = c.entries.reduce((s, e) => s + e.apy30 * e.tvl, 0) / c.tvl;
    c.over = tb == null ? null : c.avg - tb;
    c.above = tb == null ? null : c.entries.filter(e => e.apy30 > tb).length;
    c.best = c.entries[0];
    c.mix = {};
    for (const e of c.entries) c.mix[e.r.cat] = (c.mix[e.r.cat] || 0) + e.tvl;
    c.about = ABOUT[c.name] || "";
    c.page = c.count >= MIN_PAGE;
    return c;
  });
  return out.sort((a, b) => b.tvl - a.tvl);
}

module.exports = {byChain, slug, MIN_PAGE};
