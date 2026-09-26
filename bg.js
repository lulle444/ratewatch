/* Rate tape: the page background. Four faint yield lines in the category colors are drawn live from the right, like a
   chart being printed, and weave around the dashed T-bill line. Once /api/rates has loaded (app.js sends "rw:data")
   the lines drift to today's typical rate for each type and the dashed line sits at today's T-bill rate. Lines bend
   away from the pointer. Reduced-motion users get one still frame; nothing runs while the tab is hidden. */
(function(){
"use strict";
const c = document.getElementById("tape");
const ctx = c && c.getContext("2d");
if (!ctx) return;
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const css = getComputedStyle(document.documentElement);
const color = k => css.getPropertyValue("--b-" + k).trim() || "#16211B";

const STEP = 14, SPEED = 16;   // px between points, px per second
let bench = 3.9;
// each type gets two lines: its typical rate, and a thinner one for the highest rate of that type
const LINES = [
  {id: "tbill", lvl: 3.5, vol: .08}, {id: "tbill", lvl: 3.8, vol: .1, top: 1},
  {id: "savings", lvl: 3.6, vol: .12}, {id: "savings", lvl: 5.3, vol: .2, top: 1},
  {id: "lending", lvl: 4.6, vol: .3}, {id: "lending", lvl: 7.8, vol: .45, top: 1},
  {id: "synthetic", lvl: 7, vol: .5}, {id: "synthetic", lvl: 12, vol: .7, top: 1},
];
let w = 0, h = 0, head = 0, off = 0, last = 0, raf = 0, shown = 0;
const ptr = {y: -1e4, sy: -1e4};

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.4;
const next = (L, v) => v + (L.lvl - v) * .05 + gauss() * L.vol * .45;
// distance from the T-bill line grows like the square root of the gap (softened near zero), so small gaps still show,
// big ones fit and lines near the T-bill line don't jitter
const yOf = v => { const d = v - bench; return Math.max(h * .07, Math.min(h * .95, h * .55 - Math.sign(d) * (Math.sqrt(Math.abs(d) + .25) - .5) * h * .17)); };

function fill(){
  const n = Math.ceil(head / STEP) + 3;
  for (const L of LINES){
    if (!L.v) L.v = [L.lvl];
    while (L.v.length < n) L.v.push(next(L, L.v[L.v.length - 1]));
    if (L.v.length > n) L.v.splice(0, L.v.length - n);
  }
}

function size(){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = c.clientWidth; h = c.clientHeight;
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  head = w * (w < 700 ? .9 : .86);
  fill();
}

function draw(){
  ctx.clearRect(0, 0, w, h);
  const lift = -Math.min(window.scrollY || 0, 4000) * .04;
  // the T-bill line: dashed, full width, with its rate at the right edge
  const by = yOf(bench) + lift;
  ctx.save();
  ctx.globalAlpha = .34; ctx.strokeStyle = color("bench"); ctx.lineWidth = 1.2; ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(w, by); ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = .45; ctx.fillStyle = color("bench");
  ctx.font = "500 10.5px " + (css.getPropertyValue("--f-mono").trim() || "monospace") + ", monospace";
  ctx.textAlign = "right"; ctx.fillText("T-BILL " + bench.toFixed(2) + "%", w - 14, by - 7);
  ctx.restore();

  for (const L of LINES){
    const pts = L.v.map((v, i) => {
      const x = head - (L.v.length - 1 - i) * STEP + (STEP - off);
      let y = yOf(v) + lift;
      const d = y - ptr.sy, f = Math.exp(-(d * d) / 9000);   // lean away from the pointer
      y += (d >= 0 ? 1 : -1) * 22 * f;
      return [x, y];
    });
    ctx.strokeStyle = color("cat-" + L.id); ctx.lineWidth = L.top ? 1.1 : 1.7; ctx.globalAlpha = L.top ? .2 : .3; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++){
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const [hx, hy] = pts[pts.length - 1];
    ctx.lineTo(hx, hy); ctx.stroke();
    // the pen: a dot with a slow pulse where the line is being drawn
    ctx.fillStyle = color("cat-" + L.id);
    ctx.globalAlpha = .5; ctx.beginPath(); ctx.arc(hx, hy, 3, 0, 7); ctx.fill();
    const p = (last / 1600 + LINES.indexOf(L) * .25) % 1;
    ctx.globalAlpha = .28 * (1 - p); ctx.beginPath(); ctx.arc(hx, hy, 3 + p * 10, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function frame(t){
  const dt = Math.min(.1, (t - (last || t)) / 1000);
  last = t;
  off += SPEED * dt;
  while (off >= STEP){ off -= STEP; for (const L of LINES){ L.v.shift(); L.v.push(next(L, L.v[L.v.length - 1])); } }
  ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 5);
  draw();
  raf = requestAnimationFrame(frame);
}

function start(){
  cancelAnimationFrame(raf);
  if (reduce.matches || document.hidden){ draw(); return; }
  last = 0; raf = requestAnimationFrame(frame);
}

size(); start();
if (!shown){ shown = 1; requestAnimationFrame(() => c.classList.add("on")); }
addEventListener("resize", () => { size(); draw(); });
addEventListener("pointermove", e => { ptr.y = e.clientY; if (ptr.sy < -1e3) ptr.sy = e.clientY; }, {passive: true});
document.addEventListener("pointerleave", () => { ptr.y = -1e4; });
addEventListener("scroll", () => { if (reduce.matches) draw(); }, {passive: true});
document.addEventListener("visibilitychange", start);
reduce.addEventListener?.("change", start);
// today's numbers from app.js: the lines ease over to them on their own
document.addEventListener("rw:data", e => {
  const d = e.detail || {};
  if (d.tbill && isFinite(d.tbill.rate)) bench = d.tbill.rate;
  for (const cat of d.cats || []) for (const L of LINES.filter(l => l.id === cat.id)) {
    const v = L.top ? cat.top && cat.top[0] && cat.top[0].apy30 : cat.median;
    if (isFinite(v)) L.lvl = v;
  }
  if (reduce.matches){ for (const L of LINES) L.v = null; fill(); draw(); }
});
})();
