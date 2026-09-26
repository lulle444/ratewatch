// One pool's daily APY with the T-bill rate on the same days: /api/history?pool=<DefiLlama pool id>&days=180
// /api/history?p=premium: the past year of each type's rate against the T-bill rate (for /premium).
const {history, premium} = require("../lib/rates");

module.exports = async (req, res) => {
  if (req.query.p === "premium") {
    try {
      const v = await premium();
      res.setHeader("cache-control", v.points.length > 30 ? "public, s-maxage=21600, stale-while-revalidate=86400" : "no-store");
      return res.status(200).json(v);
    } catch (e) {
      res.setHeader("cache-control", "no-store");
      return res.status(502).json({error: String(e.message || e)});
    }
  }
  const days = Math.min(365, Math.max(30, parseInt(req.query.days, 10) || 180));
  try {
    const h = await history(String(req.query.pool || ""), days);
    res.setHeader("cache-control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json(h);
  } catch (e) {
    res.setHeader("cache-control", "no-store");
    res.status(/bad pool/.test(e.message) ? 400 : 502).json({error: String(e.message || e)});
  }
};
