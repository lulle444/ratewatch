// Share-preview images (1200×630 PNG) with today's numbers. Pages point their og:image here, and X fetches it when a
// link is shared: /api/og?p=home for the front page, /api/og?p=y&s=ethena-susde for one yield's page.
// Name, colors and fonts come from brand.json. Anything that fails falls back to the static assets/og.png.
const fs = require("fs"), path = require("path");
const B = require("../brand.json");
const {board: getBoard} = require("../lib/rates");

const K = B.colors, F = B.fonts;
const CAT = {tbill: K.cat_tbill, savings: K.cat_savings, synthetic: K.cat_synthetic, lending: K.cat_lending};
let logo;
const logoUri = () => logo || (logo = "data:image/svg+xml;base64," + fs.readFileSync(path.join(__dirname, "..", "assets", "logo-mark.svg")).toString("base64"));

const pct = v => v == null || !isFinite(v) ? "–" : v.toFixed(2) + "%";
const pts = v => v == null ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(2) + " pts";
const usd = v => v >= 1e9 ? "$" + (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + "B" : v >= 1e6 ? "$" + (v / 1e6).toFixed(v >= 1e8 ? 0 : 1) + "M" : "$" + Math.round((v || 0) / 1e3) + "k";

// tiny element builder for @vercel/og (it takes React-shaped objects)
const h = (style, ...children) => ({type: "div", props: {style: {display: "flex", ...style}, children: children.flat().filter(c => c != null && c !== false)}});

let fonts;
async function loadFonts(){
  if (fonts) return fonts;
  const want = [[F.display, 500], [F.display, 600], [F.body, 500], [F.mono, 500]];
  const out = [];
  await Promise.all(want.map(async ([name, weight]) => {
    try {
      // without a browser user agent Google Fonts answers with TTF, which the renderer can read
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${name.replace(/ /g, "+")}:wght@${weight}`, {signal: AbortSignal.timeout(5000)})).text();
      const url = (css.match(/src: url\((.+?)\) format\('(truetype|opentype|woff)'\)/) || [])[1];
      if (!url) return;
      out.push({name, weight, style: "normal", data: await (await fetch(url, {signal: AbortSignal.timeout(5000)})).arrayBuffer()});
    } catch (e) {}
  }));
  fonts = out;
  return fonts;
}

const label = r => r.cat === "lending" ? `${r.name} on ${r.chains[0]}${r.meta ? " · " + r.meta : ""}` : `${r.name} · ${r.chains.length === 1 ? r.chains[0] : r.chains.length + " chains"}`;

// The frame every card shares: the ruled paper, the wordmark, an eyebrow, and a footer with the address.
function frame(eyebrow, path, ...body){
  const [w1, w2] = B.wordmark;
  return h({width: 1200, height: 630, flexDirection: "column", padding: "52px 64px 40px", fontFamily: F.body, color: K.ink,
      backgroundColor: K.bg, backgroundImage: `linear-gradient(${K.line}99 1px, transparent 1px)`, backgroundSize: "100% 36px"},
    h({alignItems: "center", justifyContent: "space-between"},
      h({alignItems: "center"},
        {type: "img", props: {src: logoUri(), width: 50, height: 50, style: {marginRight: 16}}},
        h({fontFamily: F.display, fontWeight: 600, fontSize: 36, letterSpacing: -0.5}, w1, h({color: K.accent}, w2))),
      h({fontFamily: F.mono, fontWeight: 500, fontSize: 19, letterSpacing: 2.5, color: K.accent, textTransform: "uppercase"}, eyebrow)),
    h({flexDirection: "column", flex: 1}, ...body),
    h({fontSize: 19, color: K.muted, justifyContent: "space-between", borderTop: `1.5px solid ${K.ink}`, paddingTop: 14},
      h({fontFamily: F.mono, fontWeight: 500}, B.domain + path), h({}, (B.x ? "@" + B.x + " · " : "") + (path.length > 28 ? "" : "Live on-chain data · ") + "Not financial advice")));
}

// Two bars on one scale: the yield, and the T-bill rate it is held against.
function bars(items){
  const top = Math.max(...items.map(i => i.v || 0)) * 1.08 || 1;
  return h({flexDirection: "column", width: 470, gap: 26},
    ...items.map(i => h({flexDirection: "column"},
      h({justifyContent: "space-between", fontSize: 22, color: K.muted, marginBottom: 8},
        h({fontWeight: 500, color: K.ink}, i.name), h({fontFamily: F.mono, fontWeight: 500, color: K.ink}, pct(i.v))),
      h({height: 30, width: 470, backgroundColor: K.bg2, borderRadius: 6},
        h({height: 30, width: Math.max(8, Math.round(470 * (i.v || 0) / top)), backgroundColor: i.color, borderRadius: 6})))));
}

const tile = (v, cap, sub, color) => h({flexDirection: "column", flex: 1, padding: "16px 20px", backgroundColor: K.panel, border: `1px solid ${K.line}`, borderRadius: 12,
    borderTop: `5px solid ${color}`},
  h({fontFamily: F.mono, fontWeight: 500, fontSize: 32, color: K.ink}, v),
  h({fontSize: 19, color: K.ink, marginTop: 4}, cap),
  sub ? h({fontFamily: F.mono, fontWeight: 500, fontSize: 17, color: K.muted, marginTop: 2}, sub) : null);

const CARDS = {
  async home(){
    const b = await getBoard(), tb = b.tbill && b.tbill.rate;
    const over = tb == null ? null : b.rows.filter(r => r.over != null && r.over > 0.25).length;
    return frame("Dollar yields on chain", "",
      h({alignItems: "flex-end", justifyContent: "space-between", marginTop: 34},
        h({flexDirection: "column", maxWidth: 640},
          h({fontFamily: F.display, fontWeight: 500, fontSize: 64, lineHeight: 1.04, letterSpacing: -1.5}, "What does a dollar earn on chain?"),
          h({fontSize: 25, color: K.muted, marginTop: 16, lineHeight: 1.3},
            over == null ? `${b.rows.length} dollar yields, compared live.` : `${over} of ${b.rows.length} dollar yields pay more than T-bills. Every point above the line is paid for with risk.`)),
        tb == null ? null : h({flexDirection: "column", alignItems: "flex-end"},
          h({fontFamily: F.mono, fontWeight: 500, fontSize: 18, letterSpacing: 2, color: K.bench, textTransform: "uppercase"}, "3-month T-bill"),
          h({fontFamily: F.display, fontWeight: 600, fontSize: 104, lineHeight: 1, color: K.ink, letterSpacing: -3, marginTop: 6}, tb.toFixed(2) + "%"))),
      h({gap: 16, marginTop: "auto", marginBottom: 24},
        ...b.cats.filter(c => c.count).map(c => tile(pct(c.median), c.name, tb != null && c.median != null ? pts(c.median - tb) + " vs T-bill" : null, CAT[c.id]))));
  },
  async y(q){
    const b = await getBoard(), s = String(q.s || "").toLowerCase(), r = s && b.rows.find(x => x.slug === s);
    if (!r) return null;
    const cat = b.cats.find(c => c.id === r.cat), tb = b.tbill && b.tbill.rate;
    return frame(cat ? cat.name : "Dollar yield", "/y/" + r.slug,
      h({justifyContent: "space-between", alignItems: "center", marginTop: 30, flex: 1},
        h({flexDirection: "column", maxWidth: 560},
          h({fontFamily: F.display, fontWeight: 600, fontSize: r.symbol.length > 10 ? 56 : 72, lineHeight: 1, letterSpacing: -1.5}, r.symbol),
          h({fontSize: 24, color: K.muted, marginTop: 10}, label(r)),
          h({fontFamily: F.display, fontWeight: 600, fontSize: 132, lineHeight: 1, color: CAT[r.cat] || K.accent, letterSpacing: -4, marginTop: 26}, pct(r.apy30)),
          h({fontSize: 22, color: K.muted, marginTop: 8}, "30-day average APY")),
        h({flexDirection: "column"},
          bars([{name: r.symbol, v: r.apy30, color: CAT[r.cat] || K.accent}, ...(tb == null ? [] : [{name: "3-month T-bill", v: tb, color: K.bench}])]),
          tb == null || r.over == null ? null : h({marginTop: 26, fontSize: 24, color: K.muted},
            h({fontFamily: F.mono, fontWeight: 500, color: r.over > 0.25 ? K.up : r.over < -0.25 ? K.down : K.ink, marginRight: 10}, pts(r.over)),
            r.over > 0 ? "paid for with risk" : "vs T-bills"),
          h({marginTop: 18, fontSize: 21, color: K.muted}, `${usd(r.tvl)} deposited · today ${pct(r.apy)}`))),
      h({height: 20}));
  },
};

module.exports = async function handler(req, res){
  const q = req.query || {}, p = String(q.p || "home");
  const fallback = () => { res.setHeader("Cache-Control", "public, s-maxage=600"); res.redirect(302, "/assets/og.png"); };
  if (!CARDS[p]) return fallback();
  try {
    const [c, f, {ImageResponse}] = await Promise.all([CARDS[p](q), loadFonts(), import("@vercel/og")]);
    if (!c) return fallback();
    const img = new ImageResponse(c, {width: 1200, height: 630, fonts: f.length ? f : undefined});
    const buf = Buffer.from(await img.arrayBuffer());
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).end(buf);
  } catch (e) {
    console.error("og", p, e);
    fallback();
  }
};
