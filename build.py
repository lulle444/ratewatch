"""Builds every page, brand.css, the logo, sitemap.xml and robots.txt from brand.json.

To rename or recolor the site: edit brand.json, run  python3 build.py  and commit the result.
Page text says the brand name through {{name}}, so nothing else needs to change.
"""
import json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
B = json.load(open(os.path.join(ROOT, "brand.json"), encoding="utf-8"))
C, F = B["colors"], B["fonts"]
SITE = "https://" + B["domain"]
W1, W2 = B["wordmark"]


def fill(s):
    for k, v in {"name": B["name"], "tagline": B["tagline"], "site": SITE, "w1": W1, "w2": W2}.items():
        s = s.replace("{{" + k + "}}", v)
    return s


# ---------- brand.css: the only place colors and fonts are set ----------
css = [":root{"] + [f"  --b-{k.replace('_', '-')}:{v};" for k, v in C.items()] + [f'  --f-{k}:"{v}";' for k, v in F.items()] + ["}"]
open(os.path.join(ROOT, "brand.css"), "w").write("/* Written by build.py from brand.json. Edit brand.json instead. */\n" + "\n".join(css) + "\n")
FONTS = ("https://fonts.googleapis.com/css2?family=" + F["display"].replace(" ", "+") + ":ital,opsz,wght@0,9..144,400..700;1,9..144,400..600"
         + "&family=" + F["body"].replace(" ", "+") + ":wght@400;500;600&family=" + F["mono"].replace(" ", "+") + ":wght@400;500&display=swap")

# ---------- logo mark: a rate dial, its needle just past the benchmark tick ----------
LOGO = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="15" fill="{C['ink']}"/>
  <path d="M14 42a18 18 0 1 1 36 0" fill="none" stroke="{C['bg']}" stroke-opacity=".28" stroke-width="5" stroke-linecap="round"/>
  <path d="M14 42a18 18 0 0 1 27.6-15.2" fill="none" stroke="{C['bg']}" stroke-width="5" stroke-linecap="round"/>
  <path d="M32 18.5v6" stroke="{C['bg']}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1.6 3"/>
  <path d="M32 42 44.5 27.5" stroke="#6FD3A4" stroke-width="4.2" stroke-linecap="round"/>
  <circle cx="32" cy="42" r="4.6" fill="#6FD3A4"/>
</svg>
"""
open(os.path.join(ROOT, "assets", "logo-mark.svg"), "w").write(LOGO)

# the coins with a page of their own (lib/coins.js decides which yields belong to each)
COINS = [("usdc", "USDC"), ("usdt", "USDT"), ("usds", "USDS"), ("dai", "DAI"), ("usde", "USDe"), ("pyusd", "PYUSD"), ("usdg", "USDG"), ("gho", "GHO"), ("rlusd", "RLUSD"), ("usd1", "USD1")]
NAV = [("/", "Rates"), ("/funds", "Funds"), ("/chains", "Chains"), ("/calculator", "Calculator"), ("/alerts", "Alerts"), ("/learn", "Learn"), ("/about", "About")]
BOT = str(B.get("telegram") or "").lstrip("@")
XLINK = f'<a class="navx" href="https://x.com/{B["x"]}" target="_blank" rel="noopener me" aria-label="Follow {{{{name}}}} on X">X</a>' if B.get("x") else ""


def page(path, title, desc, body, og="/api/og?p=home", kind=None):
    cur = ' aria-current="page"'
    nav = "".join(f'<a href="{h}"{cur if h == path or h != "/" and path.startswith(h + "/") else ""}>{t}</a>' for h, t in NAV)
    return fill(f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{{{{site}}}}{path}">
<link rel="icon" type="image/svg+xml" href="/assets/logo-mark.svg">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{{{{site}}}}{path}">
<meta property="og:image" content="{{{{site}}}}{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{{{{site}}}}{og}">{f'<meta name="twitter:site" content="@{B["x"]}">' if B.get("x") else ""}
<meta name="theme-color" content="{C['bg']}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/brand.css">
</head>
<body data-page="{kind or path.strip('/') or 'home'}" data-bot="{BOT}">
<canvas id="tape" aria-hidden="true"></canvas>
<div class="wrap">
  <header class="nav">
    <a class="logo" href="/" aria-label="{{{{name}}}} home"><img src="/assets/logo-mark.svg" alt="" width="34" height="34"><span class="word">{{{{w1}}}}<i>{{{{w2}}}}</i></span></a>
    <nav class="navlinks" aria-label="Main">{nav}</nav>
    <div class="navright">{XLINK}<span class="bench-pill" id="benchPill" title="3-month US T-bill rate"><small>T-bill</small> <b class="num" id="benchPillRate">–</b></span></div>
  </header>
{body}
  <footer class="foot">
    <div><a class="logo small" href="/"><img src="/assets/logo-mark.svg" alt="" width="24" height="24"><span class="word">{{{{w1}}}}<i>{{{{w2}}}}</i></span></a>
      <p>{{{{tagline}}}}</p></div>
    <nav aria-label="Footer">{"".join(f'<a href="{h}">{t}</a>' for h, t in NAV[:3] + [("/premium", "Risk premium")] + NAV[3:])}</nav>
    <nav class="coinnav" aria-label="Yields by coin"><span>By coin</span>{"".join(f'<a href="/{c}">{n}</a>' for c, n in COINS)}</nav>
    <p class="fine">Yields from <a href="https://defillama.com/yields" target="_blank" rel="noopener">DefiLlama</a>. The T-bill rate from <a href="https://fred.stlouisfed.org/series/DGS3MO" target="_blank" rel="noopener">FRED</a> and the <a href="https://home.treasury.gov/resource-center/data-chart-center/interest-rates" target="_blank" rel="noopener">US Treasury</a>. No paid placements. Not financial advice. Sister sites: <a href="https://tidewatch-olive.vercel.app" target="_blank" rel="noopener">Tidewatch</a> and <a href="https://usepegwatch.vercel.app" target="_blank" rel="noopener">Pegwatch</a>.</p>
  </footer>
</div>
<script src="/bg.js" defer></script>
<script src="/app.js" defer></script>
</body>
</html>
""")


# Louise's renders (assets/brand, cropped to the objects on the right of each banner). alt text says what they show.
ART = {
    "gauge": "A rate dial with its needle in the green, beside stacks of green coins",
    "chain": "Three chain links on a plinth beside two stacks of green coins",
    "steps": "Stacks of coins on rising steps, the taller ones past a line",
}


def art(name, extra="", priority=False):
    return f"""<figure class="art">
      <img src="/assets/brand/{name}-1100.webp" srcset="/assets/brand/{name}-640.webp 640w, /assets/brand/{name}-1100.webp 1100w" sizes="(max-width:860px) 100vw, 520px" width="1100" height="705" alt="{ART[name]}"{' fetchpriority="high"' if priority else ' loading="lazy"'}>{extra}
    </figure>"""


def head(eyebrow, h1, lede, pic=None):
    return f"""  <section class="pagehead{' hasart' if pic else ''}">
    <div>
    <p class="eyebrow">{eyebrow}</p>
    <h1>{h1}</h1>
    <p class="lede">{lede}</p>
    </div>{art(pic, priority=True) if pic else ""}
  </section>"""


HOME = """  <section class="hero">
    <div>
      <p class="eyebrow">Dollar yields on every chain</p>
      <h1>What does a dollar <em>earn on chain?</em></h1>
      <p class="lede">Every tokenized T-bill fund, savings rate, synthetic dollar and deep lending market, held against the rate the US government pays. Anything above that line is paid for with risk.</p>
    </div>
""" + art("gauge", """
      <aside class="bench panel" aria-live="polite">
        <p class="eyebrow">The line to beat</p>
        <p class="bench-rate"><span class="num" id="benchRate">–</span><small>%</small></p>
        <p class="bench-name">3-month US T-bill</p>
        <p class="bench-sub" id="benchSub">Loading…</p>
      </aside>""", priority=True) + """
  </section>

  <section class="cats" id="cats" aria-label="What pays the yield"></section>
  <p class="catsmore"><a href="/premium">What has each type paid over T-bills this past year? →</a></p>

  <section class="panel ladder" aria-labelledby="ladderH">
    <div class="sectionhead"><div><h2 id="ladderH">The yield ladder</h2><p class="sub" id="ladderSub">Each dot is one dollar yield, placed at its 30-day average APY. The dashed line is the T-bill rate.</p></div></div>
    <div class="ladderbox" id="ladder" role="img" aria-label="Dot plot of 30-day APY by type, against the T-bill rate"></div>
  </section>

  <section class="panel board" aria-labelledby="boardH">
    <div class="sectionhead">
      <div><h2 id="boardH">Every dollar yield</h2><p class="sub" id="boardSub">Loading rates…</p></div>
      <div class="filters">
        <label class="search"><span class="visually-hidden">Search</span><input id="q" type="search" placeholder="Search USDC, BUIDL, Aave…" autocomplete="off"></label>
        <label class="select"><span class="visually-hidden">Chain</span><select id="chain"><option value="all">All chains</option></select></label>
      </div>
    </div>
    <div class="chips" id="chips" role="group" aria-label="Type"></div>
    <div class="tablebox">
      <table class="rt">
        <thead><tr>
          <th scope="col">Dollar yield</th>
          <th scope="col" class="hm">Type</th>
          <th scope="col" class="r"><button data-sort="apy30">30-day APY</button></th>
          <th scope="col" class="r hs"><button data-sort="apy">Today</button></th>
          <th scope="col" class="r"><button data-sort="over">vs T-bill</button></th>
          <th scope="col" class="r hs"><button data-sort="tvl">Deposits</button></th>
        </tr></thead>
        <tbody id="rows"><tr><td colspan="6" class="empty">Loading rates…</td></tr></tbody>
      </table>
    </div>
    <p class="more"><button class="btn" id="showMore" hidden>Show more</button></p>
    <p class="fine">30-day APY is DefiLlama’s 30-day average, the fairer number when rates jump around. “vs T-bill” is that average minus the 3-month T-bill rate. We leave out pools under $5M, lending markets under $50M, liquidity-pool tokens, farms paid only in reward tokens and rates above 40%.</p>
  </section>
"""

CALC = head("Calculator", "What would <em>your dollars</em> earn?",
            "Pick an amount and a time. We show what the top dollar yields of each type would pay at their 30-day average, next to parking it in T-bills.", pic="steps") + """
  <section class="panel calc" aria-label="Calculator">
    <div class="calcform">
      <label><span>Amount (USD)</span><input id="cAmt" type="number" inputmode="decimal" min="0" step="100" value="10000"></label>
      <label><span>For how long</span><select id="cMonths"><option value="1">1 month</option><option value="3" selected>3 months</option><option value="6">6 months</option><option value="12">1 year</option></select></label>
      <label><span>Type</span><select id="cCat"><option value="all">Every type</option></select></label>
    </div>
    <div class="calcres" id="calcRes"><p class="empty">Loading rates…</p></div>
    <p class="fine">At today’s 30-day average rate, compounded daily, before gas, fees to get in and out, and tax. Rates move every day, so treat this as a rough guide.</p>
  </section>
"""

LEARN = head("Learn", "Where dollar yield <em>comes from.</em>",
             "Every dollar yield on chain is paid by someone. Here is who pays it, and what you take on to earn it.") + """
  <section class="learn" id="learnCats"></section>
  <section class="twocol">
    <article class="panel note">
      <h3>Why hold everything against T-bills?</h3>
      <p>Three-month US Treasury bills are as close to a risk-free dollar rate as markets have. A token that pays about the T-bill rate is mostly passing that interest on. Every point above it has to come from somewhere: borrowers who might not pay back, a trading strategy that can lose, or rewards that end.</p>
    </article>
    <article class="panel note">
      <h3>Today’s rate or the 30-day average?</h3>
      <p>Lending rates can spike for an hour when borrowing demand jumps. The 30-day average smooths that out, so we rank by it and show today’s rate next to it. A big gap between the two means the rate is moving.</p>
    </article>
    <article class="panel note">
      <h3>Can I hold it?</h3>
      <p>Most tokenized T-bill funds only open to verified or institutional investors, often with a minimum. Lending markets and savings tokens are usually open to any wallet. Check the issuer’s terms before you deposit.</p>
    </article>
    <article class="panel note">
      <h3>What we leave out</h3>
      <p>Pools under $5M, lending markets under $50M, liquidity-pool positions that mix two tokens, farms that pay only in reward tokens, rates above 40% and pools DefiLlama flags as outliers. Those rarely reflect what a normal deposit would earn.</p>
    </article>
  </section>
"""

ABOUT = head("About", "{{name}}, in one line.",
             "What a dollar earns on chain, held against the T-bill rate.") + """
  <section class="twocol">
    <article class="panel note">
      <h3>What it is</h3>
      <p>{{name}} lists every dollar yield on chain that is big enough to matter: tokenized T-bill funds, stablecoin savings rates, synthetic dollars and deep lending markets. Each one is held against the 3-month US T-bill rate, so you can see how much extra it pays and what kind of risk pays for it.</p>
    </article>
    <article class="panel note">
      <h3>Where the numbers come from</h3>
      <p>Yields, deposits and history come from DefiLlama’s public yields data, refreshed every 10 minutes. The T-bill rate is the 3-month Treasury yield from FRED, with the US Treasury’s own daily rates as backup.</p>
    </article>
    <article class="panel note">
      <h3>No paid placements</h3>
      <p>Nobody pays to be listed or ranked. Rows are sorted by the numbers only.</p>
    </article>
    <article class="panel note">
      <h3>Not financial advice</h3>
      <p>A token is not a bank deposit. It can lose its peg, its issuer can freeze it, and smart contracts can fail. Read each issuer’s terms before you deposit.</p>
    </article>
  </section>
"""

ALERTS_ON = head("Alerts", "Know when a rate <em>moves.</em>",
                 "Free Telegram messages when a dollar yield crosses your level, when the T-bill rate moves, and every Monday the week in dollar rates.") + f"""
  <section class="twocol">
    <article class="panel note">
      <h3>Rate alerts</h3>
      <p>Send <code>/alert sUSDe 6</code> and get a message when sUSDe pays 6% or more. Add <code>below</code> for a drop, like <code>/alert USDY 3 below</code>. Or open any yield on the <a href="/">rates board</a> and tap 🔔.</p>
      <p><a class="btn primary" href="https://t.me/{BOT}" target="_blank" rel="noopener">Open @{BOT}</a></p>
    </article>
    <article class="panel note">
      <h3>The T-bill line</h3>
      <p>Every rate here is held against the 3-month US T-bill rate. Send <code>/tbill 0.1</code> to hear when it moves a tenth of a point.</p>
      <p><a class="btn" href="https://t.me/{BOT}?start=tb" target="_blank" rel="noopener">Alert me when it moves</a></p>
    </article>
    <article class="panel note">
      <h3>Monday digest</h3>
      <p>Every Monday morning: the T-bill rate, the typical rate of each kind of dollar yield, the highest-paying big ones and the week’s biggest moves.</p>
      <p><a class="btn" href="https://t.me/{BOT}?start=wk" target="_blank" rel="noopener">Get the Monday digest</a></p>
    </article>
    <article class="panel note">
      <h3>How it works</h3>
      <p>We check every 15 minutes. An alert fires once when the rate crosses your level, then waits until the rate has moved back 0.2 points before it can fire again, so a rate hovering at your level doesn’t flood you. Send <code>/list</code> to see or remove alerts, and <code>/stop</code> to remove everything.</p>
    </article>
  </section>
"""
ALERTS_SOON = head("Alerts", "Know when a rate <em>moves.</em>",
                   "Soon: free Telegram messages when a dollar yield crosses your level, when the T-bill rate moves, and every Monday the week in dollar rates.") + """
  <p class="block"><a class="btn primary" href="/">See every dollar yield</a></p>
"""

NOTFOUND = head("404", "That page <em>isn’t here.</em>", "The link may be old or mistyped.") + """
  <p class="block"><a class="btn primary" href="/">See every dollar yield</a></p>
"""

PREMIUM = head("Risk premium", "What has risk <em>paid?</em>",
            "Every dollar yield above the T-bill rate is paid for with risk. Here is how much extra each type of yield has paid over the 3-month US T-bill rate for the past year, day by day. Below zero, you took on more risk for less than the government pays.") + """
  <section class="cats premcats" id="premTiles" aria-label="Extra over T-bills by type"><p class="empty">Loading a year of rates…</p></section>

  <section class="panel ychart" aria-labelledby="premH">
    <div class="sectionhead">
      <div><h2 id="premH">Extra yield over the T-bill rate</h2><p class="sub">Each line is one type of dollar yield minus the 3-month T-bill rate, in percentage points. The dashed line at zero is the T-bill rate itself.</p></div>
      <div class="seg" role="group" aria-label="Time range"><button data-pdays="90">3M</button><button data-pdays="180">6M</button><button data-pdays="365" aria-pressed="true">1Y</button></div>
    </div>
    <div class="legend" id="premLegend"></div>
    <div class="dchart" id="premChart"><p class="empty">Loading a year of rates…</p></div>
    <p class="fine" id="premHow">Each type’s line is the deposit-weighted APY of its largest yields, averaged over 7 days, from DefiLlama’s daily history. The T-bill rate is FRED’s 3-month series.</p>
  </section>

  <section class="twocol">
    <article class="panel note"><h3>Why the extra exists</h3><p>Nobody pays more than the US government without a reason. Lending carries the risk that borrowers’ collateral falls faster than it can be sold. Synthetic dollars depend on futures funding rates that can turn negative. Savings rates are set by protocols that can change them. T-bill funds usually sit just below the line because of their fees.</p></article>
    <article class="panel note"><h3>How to read it</h3><p>A line well above zero means that type is paying a lot for its risk right now, often because demand to borrow is high. A line close to zero means you are taking the risk for little extra. The gap moves with crypto markets, not with the Fed.</p></article>
  </section>
  <p class="block"><a class="btn" href="/">See every dollar yield</a> <a class="btn" href="/learn">Where the yield comes from</a></p>
"""

PAGES = [
    ("index.html", "/", "{{name}}: what a dollar earns on chain", B["description"], HOME),
    ("calculator.html", "/calculator", "Dollar yield calculator · {{name}}", "What your dollars would earn in tokenized T-bills, savings rates, synthetic dollars and lending, next to the T-bill rate.", CALC),
    ("alerts.html", "/alerts", "Rate alerts · {{name}}", "Free Telegram alerts when a dollar yield on chain crosses your level or the T-bill rate moves, plus a weekly digest.", ALERTS_ON if BOT else ALERTS_SOON),
    ("premium.html", "/premium", "Risk premium: what dollar yields paid over T-bills this year · {{name}}", "How much extra T-bill funds, savings rates, synthetic dollars and lending have paid over the 3-month T-bill rate, day by day for the past year.", PREMIUM, "/api/og?p=premium"),
    ("learn.html", "/learn", "Where dollar yield comes from · {{name}}", "T-bill funds, savings rates, synthetic dollars and lending: who pays the yield, and what you take on to earn it.", LEARN),
    ("about.html", "/about", "About · {{name}}", "What {{name}} is and where its numbers come from.", ABOUT),
    ("404.html", "/404", "Not found · {{name}}", "That page isn’t here.", NOTFOUND),
]
for f, path, title, desc, body, *og in PAGES:
    open(os.path.join(ROOT, f), "w").write(page(path, fill(title), fill(desc), fill(body), og=og[0] if og else "/api/og?p=home" if path == "/" else "/assets/og.png"))

# One page per dollar yield, /y/ethena-susde: api/yield.js fills the __KEYS__ in this template with the yield's numbers.
os.makedirs(os.path.join(ROOT, "templates"), exist_ok=True)
open(os.path.join(ROOT, "templates", "funds.html"), "w").write(page("/funds", "Tokenized T-bill funds compared: who can buy, minimums and yields · {{name}}",
    "Every tokenized T-bill fund side by side: its yield against the T-bill rate, who is allowed to buy it, the minimum, fees and how you get your dollars back.",
    "__MAIN__", og="/api/og?p=funds", kind="funds"))
open(os.path.join(ROOT, "templates", "coin.html"), "w").write(page("/__COIN__", "Best __NAME__ yields on chain, vs the T-bill rate · {{name}}", "__DESC__",
    "__MAIN__", og="/api/og?p=coin&amp;c=__COIN__", kind="coin"))
open(os.path.join(ROOT, "templates", "chains.html"), "w").write(page("/chains", "Dollar yields by chain: what a dollar earns on each chain · {{name}}",
    "What the average deposited dollar earns on Ethereum, Base, Solana, Arbitrum and every other chain, against the 3-month T-bill rate, and what kind of yield pays it.",
    "__MAIN__", og="/api/og?p=chains", kind="chains"))
open(os.path.join(ROOT, "templates", "chain.html"), "w").write(page("/chains/__CHAIN__", "What a dollar earns on __NAME__: every dollar yield vs T-bills · {{name}}", "__DESC__",
    "__MAIN__", og="/api/og?p=chain&amp;c=__CHAIN__", kind="chain"))
open(os.path.join(ROOT, "templates", "yield.html"), "w").write(page("/y/__SLUG__", "__TITLE__", "__DESC__", "__MAIN__", og="/api/og?p=y&amp;s=__SLUG__", kind="yield"))

open(os.path.join(ROOT, "sitemap.xml"), "w").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    "".join(f"  <url><loc>{SITE}{p if p != '/' else ''}</loc></url>\n" for _, p, *_ in PAGES if p != "/404") + f"  <url><loc>{SITE}/funds</loc></url>\n  <url><loc>{SITE}/chains</loc></url>\n</urlset>\n")
open(os.path.join(ROOT, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\nSitemap: {SITE}/sitemap-yields.xml\n")
print("built", ", ".join(p[0] for p in PAGES))
