// The dollar coins that get a page of their own (/usdc, /usdt …): every yield that pays out in that coin, from
// lending markets to savings tokens and vaults. A yield belongs to the first coin whose pattern its symbol matches,
// so PYUSD and RLUSD are tried before the plain USD… ones. T-bill funds are left out: they pay in fund shares.
const COINS = [
  {id: "pyusd", name: "PYUSD", rx: /PYUSD/i, about: "PayPal’s dollar stablecoin, issued by Paxos."},
  {id: "rlusd", name: "RLUSD", rx: /RLUSD/i, about: "Ripple’s dollar stablecoin, issued by a New York-chartered trust company."},
  {id: "usdc", name: "USDC", rx: /USDC/i, about: "Circle’s dollar stablecoin, backed by cash and short-term US Treasuries."},
  {id: "usdt", name: "USDT", rx: /USDT/i, about: "Tether’s dollar stablecoin, the largest by supply."},
  {id: "usds", name: "USDS", rx: /USDS/i, about: "Sky’s dollar stablecoin (Sky was MakerDAO). Saved in the Sky Savings Rate it becomes sUSDS."},
  {id: "dai", name: "DAI", rx: /DAI$/, about: "The original MakerDAO stablecoin, now part of Sky. sDAI earns the DAI Savings Rate."},
  {id: "usde", name: "USDe", rx: /USDE/i, about: "Ethena’s synthetic dollar, backed by crypto hedged with short futures. Staked, it becomes sUSDe."},
  {id: "usdg", name: "USDG", rx: /USDG/i, about: "Global Dollar, issued by Paxos under Singapore’s stablecoin rules."},
  {id: "gho", name: "GHO", rx: /GHO/i, about: "Aave’s own stablecoin, minted against collateral on Aave. sGHO is its savings version."},
  {id: "usd1", name: "USD1", rx: /USD1\b/i, about: "World Liberty Financial’s dollar stablecoin."},
];

const coinOf = r => r.cat === "tbill" ? null : COINS.find(c => c.rx.test(r.symbol)) || null;
const rowsOf = (rows, id) => rows.filter(r => { const c = coinOf(r); return c && c.id === id; });

module.exports = {COINS, coinOf, rowsOf};
