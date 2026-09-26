// The whole board: every dollar yield we track plus the T-bill benchmark. CDN-cached for 10 minutes.
const {board} = require("../lib/rates");

module.exports = async (req, res) => {
  try {
    const b = await board();
    res.setHeader("cache-control", "public, s-maxage=600, stale-while-revalidate=3600");
    res.status(200).json(b);
  } catch (e) {
    res.setHeader("cache-control", "no-store");
    res.status(502).json({error: String(e.message || e)});
  }
};
