# Ratewatch

What a dollar earns on chain, held against the T-bill rate. Every tokenized T-bill fund, stablecoin savings rate,
synthetic dollar and deep lending market, grouped by what pays the yield and compared with the 3-month US T-bill rate.

- Static pages (`index.html`, `calculator.html`, `learn.html`, `about.html`, `404.html`), `brand.css`, the logo,
  `sitemap.xml` and `robots.txt` are written by `python3 build.py` from `brand.json`. To rename or recolor the site,
  edit `brand.json`, run the build and commit the result.
- `app.js` renders every page from `/api/rates`.
- `lib/rates.js` reads DefiLlama's public pools (`yields.llama.fi/pools`), keeps single-asset stablecoin pools over $5M
  (lending over $50M, APY up to 40%, no outliers), sorts them into T-bill funds, savings rates, synthetic dollars and
  lending, and groups non-lending tokens across chains. The benchmark is FRED's 3-month Treasury yield (DGS3MO), with the
  US Treasury's daily bill rates as backup. No API keys.
- `/api/rates` serves the board (CDN-cached 10 minutes). `/api/history?pool=<id>` serves one pool's daily APY with the
  T-bill rate on the same days.
- `.github/workflows/warm.yml` refreshes the cache every 15 minutes and prints a summary in its log. Set the repo
  variable `SITE_URL` to the live address. `probe.yml` (manual) lists which DefiLlama projects look like dollar yields.
- `/y/<slug>` is one page per yield (`api/yield.js` fills `templates/yield.html`, which build.py writes), and
  `/sitemap-yields.xml` lists them. T-bill funds show "Who can hold it" from `lib/funds.js`.
- `/api/og?p=home` and `/api/og?p=y&s=<slug>` draw share images with live numbers (@vercel/og). `assets/og.png` is the
  static fallback, with no numbers in it.

Not financial advice. No paid placements.
