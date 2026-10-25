/* ============================================================
   拾光小栈 · 背景主题库 v2（全场景封面）
   每套背景自绘整幅天幕：渐变天空、景深层次、辉光与暗角，
   亮/暗模式各有一套配色，光标会轻微影响部分场景。
   applyBackground(id) 全局可用；主题页 themes.html 调用。
   ============================================================ */
"use strict";

const REDUCE_BG = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- 共享光标 ---------------- */
const BG_MOUSE = { x: -99999, y: -99999 };
addEventListener("mousemove", (e) => { BG_MOUSE.x = e.clientX; BG_MOUSE.y = e.clientY; }, { passive: true });
addEventListener("mouseout", (e) => { if (!e.relatedTarget) { BG_MOUSE.x = -99999; } }, { passive: true });

/* ---------------- 工具 ---------------- */
function bgSize(canvas) {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
}
const isDarkBg = () => document.documentElement.dataset.theme === "dark";
function countByArea(w, h, min, max, divisor) {
  return Math.max(min, Math.min(max, Math.round((w * h) / divisor)));
}
function rand(a, b) { return a + Math.random() * (b - a); }
function ptr(canvas) {
  const r = canvas.getBoundingClientRect();
  return { x: BG_MOUSE.x - r.left, y: BG_MOUSE.y - r.top, ok: BG_MOUSE.x > -999 };
}
/* 静态层缓存：天幕/剪影只在尺寸或明暗变化时重绘 */
function backdrop(paint) {
  const c = document.createElement("canvas");
  const x = c.getContext("2d");
  let key = "";
  return {
    draw(ctx, w, h, dark, ...rest) {
      const k = w + "x" + h + (dark ? "d" : "l");
      if (k !== key) { key = k; c.width = w; c.height = h; paint(x, w, h, dark, ...rest); }
      ctx.drawImage(c, 0, 0);
    },
  };
}
function vignette(x, w, h, strength) {
  const g = x.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.4, w / 2, h * 0.46, Math.hypot(w, h) * 0.6);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
}
function glowDot(x, px, py, r, color, alpha) {
  const g = x.createRadialGradient(px, py, 0, px, py, r);
  g.addColorStop(0, `rgba(${color},${alpha})`);
  g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g;
  x.beginPath();
  x.arc(px, py, r, 0, 7);
  x.fill();
}
function fillSky(x, w, h, stops) {
  const g = x.createLinearGradient(0, 0, 0, h);
  for (const [p, c] of stops) g.addColorStop(p, c);
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
}
/* 星星（供多个场景复用） */
function makeStars(w, h, n) {
  return Array.from({ length: n }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    r: 0.3 + Math.random() * 1.1,
    ph: Math.random() * Math.PI * 2, sp: 0.5 + Math.random() * 1.6,
  }));
}
function drawStars(x, stars, t, dark, alphaScale = 1) {
  for (const s of stars) {
    const a = (dark ? 0.35 : 0.3) + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.02 * s.sp + s.ph));
    x.fillStyle = dark
      ? `rgba(226, 232, 240, ${a * alphaScale})`
      : `rgba(71, 85, 105, ${a * 0.55 * alphaScale})`;
    x.beginPath();
    x.arc(s.x, s.y, s.r, 0, 7);
    x.fill();
  }
}
/* 亮星的十字星芒 */
function flare(x, px, py, r, color, a) {
  x.strokeStyle = `rgba(${color},${a})`;
  x.lineWidth = 1;
  x.beginPath();
  x.moveTo(px - r, py); x.lineTo(px + r, py);
  x.moveTo(px, py - r); x.lineTo(px, py + r);
  x.stroke();
  glowDot(x, px, py, r * 0.9, color, a * 0.5);
}

/* ---------------- 主题清单（主题页数据源） ---------------- */
window.BG_THEMES = [
  { id: "aurora",    cat: "默认",     name: "极光",       desc: "流光溢彩的极光帘幕与星尘，随光标轻拂", swatch: "linear-gradient(135deg,#312e81,#0e7490 55%,#a21caf)" },
  { id: "matrix",    cat: "科技未来", name: "数字雨",     desc: "双层字符瀑布，代码流过整面天幕",       swatch: "linear-gradient(160deg,#010f08,#14532d 70%,#22c55e)" },
  { id: "synth",     cat: "科技未来", name: "霓虹地平线", desc: "条纹落日、群山剪影与无尽滚动的网格",   swatch: "linear-gradient(180deg,#1e1b4b,#7c3aed 42%,#ec4899 62%,#111827 62.5%)" },
  { id: "circuit",   cat: "科技未来", name: "电路脉冲",   desc: "整块电路板上光信号沿走线疾驰",         swatch: "linear-gradient(135deg,#020c1b,#0f2a4a 60%,#38bdf8)" },
  { id: "sakura",    cat: "自然",     name: "樱花雨",     desc: "枝头花影与两层飘落的春日花瓣",         swatch: "linear-gradient(135deg,#fff1f5,#f9a8d4 60%,#fb7185)" },
  { id: "fireflies", cat: "自然",     name: "萤火虫",     desc: "夏夜草浪间的光点，会朝光标聚拢",       swatch: "linear-gradient(135deg,#02120a,#14532d 55%,#a3e635)" },
  { id: "clouds",    cat: "自然",     name: "云海",       desc: "两层云团缓缓流过天空，偶有飞鸟",       swatch: "linear-gradient(135deg,#7dd3fc,#e0f2fe 60%,#f8fafc)" },
  { id: "stars",     cat: "宇宙",     name: "星野",       desc: "银河斜挂，北斗七星隐现，流星 Regular", swatch: "linear-gradient(135deg,#010409,#0f1c3f 60%,#475569)" },
  { id: "nebula",    cat: "宇宙",     name: "星云",       desc: "五色星云缓缓呼吸，亮星闪烁星芒",       swatch: "linear-gradient(135deg,#1e1b4b,#7c3aed 45%,#db2777 80%,#020617)" },
  { id: "planet",    cat: "宇宙",     name: "深空行星",   desc: "带环气态巨行星与绕行的小月亮",         swatch: "linear-gradient(135deg,#010409,#1d4ed8 88%,#93c5fd)" },
];

window.BG_PRESETS = {
  aurora: { canvas: "aurora" },
  matrix: { canvas: "matrix" },
  synth: { canvas: "synth" },
  circuit: { canvas: "circuit" },
  sakura: { canvas: "sakura" },
  fireflies: { canvas: "fireflies" },
  clouds: { canvas: "clouds" },
  stars: { canvas: "stars" },
  nebula: { canvas: "nebula" },
  planet: { canvas: "planet" },
};

/* ---------------- 画师们：传入 canvas/ctx，返回 stop() ---------------- */
window.BG_PAINTERS = {
  /* —— 极光：辉光云 + 帘幕 + 可被光标扰动的星尘 —— */
  aurora(canvas, ctx) {
    let w, h, raf, t = 0, dots = [], lastDark = null;
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark
        ? [[0, "#0a0e24"], [0.55, "#141a3a"], [1, "#1b1f4a"]]
        : [[0, "#eef3ff"], [0.6, "#f6f0ff"], [1, "#fdeffb"]]);
      vignette(x, W, H, dark ? 0.4 : 0.1);
    });
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; };
    const blobs = [
      { c: "99, 102, 241", bx: 0.24, by: 0.3, r: 0.52, sp: 0.11, ph: 0 },
      { c: "34, 211, 238", bx: 0.78, by: 0.24, r: 0.46, sp: 0.14, ph: 2 },
      { c: "217, 70, 239", bx: 0.5, by: 0.85, r: 0.44, sp: 0.09, ph: 4 },
    ];
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      if (dark !== lastDark) lastDark = dark;
      bd.draw(ctx, w, h, dark);
      ctx.save();
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (const b of blobs) {
        const px = w * b.bx + Math.sin(t * 0.004 * b.sp * 10 + b.ph) * w * 0.06;
        const py = h * b.by + Math.cos(t * 0.003 * b.sp * 10 + b.ph) * h * 0.05;
        glowDot(ctx, px, py, Math.min(w, h) * b.r, b.c, dark ? 0.16 : 0.22);
      }
      /* 两道极光帘幕 */
      const curtains = [
        { c: "20, 184, 166", base: 0.16, ph: 0, f: 0.011 },
        { c: "139, 92, 246", base: 0.24, ph: 2.2, f: 0.008 },
      ];
      for (const cur of curtains) {
        const stepX = Math.max(26, w / 46);
        for (let px = 0; px <= w; px += stepX) {
          const yTop = h * cur.base + Math.sin(px * cur.f + t * 0.012 + cur.ph) * h * 0.055;
          const len = h * (0.2 + 0.06 * Math.sin(px * 0.02 - t * 0.01 + cur.ph));
          const fade = 0.5 + 0.5 * Math.sin(px * 0.006 - t * 0.008 + cur.ph * 2);
          const a = (dark ? 0.14 : 0.11) * (0.35 + fade);
          const g = ctx.createLinearGradient(px, yTop, px, yTop + len);
          g.addColorStop(0, `rgba(${cur.c},0)`);
          g.addColorStop(0.35, `rgba(${cur.c},${a})`);
          g.addColorStop(1, `rgba(${cur.c},0)`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 20;
          ctx.beginPath();
          ctx.moveTo(px, yTop);
          ctx.lineTo(px, yTop + len);
          ctx.stroke();
        }
      }
      ctx.restore();
      /* 星尘（受光标轻微排斥） */
      const p = ptr(canvas);
      const tone = dark ? "226, 232, 240" : "99, 102, 241";
      for (const d of dots) {
        if (p.ok) {
          const dx = d.x - p.x, dy = d.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 140 && dist > 0.1) {
            d.vx += (dx / dist) * 0.03;
            d.vy += (dy / dist) * 0.03;
          }
        }
        d.vx *= 0.985; d.vy *= 0.985;
        d.vx += d.bvx; d.vy += d.bvy;
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = w; else if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h; else if (d.y > h) d.y = 0;
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dist = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
          if (dist < 110) {
            ctx.strokeStyle = `rgba(${tone}, ${0.15 * (1 - dist / 110)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = `rgba(${tone}, ${dark ? 0.7 : 0.5})`;
        ctx.beginPath();
        ctx.arc(dots[i].x, dots[i].y, dots[i].r, 0, 7);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    const seed = () => {
      dots = Array.from({ length: countByArea(w, h, 14, 64, 26000) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: 0, vy: 0, bvx: (Math.random() - 0.5) * 0.35, bvy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.7 + 0.6,
      }));
    };
    addEventListener("resize", () => { resize(); seed(); });
    resize(); seed();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 数字雨：双层字符瀑布 —— */
  matrix(canvas, ctx) {
    const FONT = 15, TRAIL = 15;
    const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789<>/{}[]=+*#";
    let w, h, raf, tick = 0, cols = [], far = [];
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark
        ? [[0, "#010a04"], [0.6, "#03170b"], [1, "#05240f"]]
        : [[0, "#f0fbf3"], [0.6, "#e2f6e9"], [1, "#d5f0de"]]);
      vignette(x, W, H, dark ? 0.5 : 0.12);
    });
    const buildCol = () => ({
      x: 0, y: rand(-h, 0), v: rand(1.6, 4.2), trail: [],
    });
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      const n = Math.ceil(w / (FONT + 6));
      cols = Array.from({ length: n }, (_, i) => ({ ...buildCol(), x: i * (FONT + 6) + 4, y: rand(-h, h) }));
      far = Array.from({ length: Math.ceil(n * 0.7) }, (_, i) => ({ ...buildCol(), x: i * (FONT + 6) * 1.9 + 10, y: rand(-h, h) }));
    };
    function drawCol(col, font, trailN, headA, tailA, headGlow) {
      ctx.font = `${font}px ui-monospace, Consolas, monospace`;
      const tone = isDarkBg() ? "34, 197, 94" : "16, 98, 46";
      const n = col.trail.length;
      for (let i = 0; i < n; i++) {
        const g = col.trail[i];
        const a = ((i + 1) / n) ** 1.4 * tailA;
        ctx.fillStyle = `rgba(${tone}, ${a})`;
        ctx.fillText(g.ch, col.x, g.y);
      }
      if (n) {
        const head = col.trail[n - 1];
        if (headGlow) glowDot(ctx, col.x + font / 2, head.y - font / 2, font * 1.6, "134, 239, 172", headA * 0.5);
        ctx.fillStyle = `rgba(${headGlow ? (isDarkBg() ? "190, 242, 200" : "22, 128, 61") : tone}, ${headA})`;
        ctx.fillText(head.ch, col.x, head.y);
      }
    }
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      tick++;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      const tailA = dark ? 0.55 : 0.3;
      if (tick % 2 === 0) {
        for (const col of [...far, ...cols]) {
          col.trail.push({ y: col.y, ch: GLYPHS[(Math.random() * GLYPHS.length) | 0] });
          while (col.trail.length > TRAIL) col.trail.shift();
          col.y += col.v * 3;
          if (col.y > h + TRAIL * FONT) { col.y = rand(-300, -20); col.trail = []; col.v = rand(1.6, 4.2); }
        }
      }
      for (const col of far) drawCol(col, 11, TRAIL, dark ? 0.5 : 0.35, tailA * 0.45, false);
      for (const col of cols) drawCol(col, FONT, TRAIL, dark ? 0.95 : 0.7, tailA, true);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 霓虹地平线：条纹落日 + 群山 + 滚动网格 —— */
  synth(canvas, ctx) {
    let w, h, raf, t = 0, stars = [];
    const bd = backdrop((x, W, H, dark) => {
      const hy = H * 0.62;
      fillSky(x, W, H, dark
        ? [[0, "#050112"], [0.45, "#2d0a52"], [0.62, "#7a1a5e"], [0.6201, "#12051f"], [1, "#1c0a2e"]]
        : [[0, "#ffe9f3"], [0.45, "#ffd0e4"], [0.62, "#ffb3c8"], [0.6201, "#fbe6f2"], [1, "#f3d9ee"]]);
      /* 条纹落日 */
      const R = Math.min(W, H) * 0.23, cx = W / 2, cy = hy - R * 0.18;
      const sun = x.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
      sun.addColorStop(0, dark ? "#ffe08a" : "#fff3c4");
      sun.addColorStop(0.55, dark ? "#ff5e8a" : "#ff9ebc");
      sun.addColorStop(1, dark ? "#c026d3" : "#f472b6");
      x.save();
      x.beginPath(); x.arc(cx, cy, R, 0, 7); x.clip();
      x.fillStyle = sun; x.fillRect(cx - R, cy - R, R * 2, R * 2);
      x.globalCompositeOperation = "destination-out";
      let gap = 2;
      for (let yy = cy; yy < cy + R; yy += gap + 7) {
        x.fillRect(cx - R, yy, R * 2, gap);
        gap *= 1.35;
      }
      x.restore();
      /* 群山剪影 */
      const ridge = (baseY, amp, color, seedOff) => {
        x.fillStyle = color;
        x.beginPath();
        x.moveTo(0, H);
        let y = baseY;
        for (let px = 0; px <= W + 40; px += 40) {
          y = baseY - Math.abs(Math.sin(px * 0.013 + seedOff) * amp + Math.sin(px * 0.005 + seedOff * 2) * amp * 0.7);
          x.lineTo(px, y);
        }
        x.lineTo(W, H);
        x.closePath();
        x.fill();
      };
      ridge(hy + 6, H * 0.09, dark ? "#2b0f45" : "#c48fb8", 1.7);
      ridge(hy + 10, H * 0.06, dark ? "#1a0733" : "#a86e9e", 4.2);
      vignette(x, W, H, dark ? 0.42 : 0.1);
    });
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; stars = makeStars(w, h * 0.55, countByArea(w, h, 20, 90, 22000)); };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      const hy = h * 0.62;
      if (dark) drawStars(ctx, stars, t, true, 0.7);
      /* 落日辉光呼吸 */
      const R = Math.min(w, h) * 0.23;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      glowDot(ctx, w / 2, hy - R * 0.2, R * 1.7, "236, 72, 153", (dark ? 0.16 : 0.12) * (0.8 + 0.2 * Math.sin(t * 0.02)));
      ctx.restore();
      /* 地平线 */
      ctx.strokeStyle = dark ? "rgba(34, 211, 238, 0.9)" : "rgba(8, 145, 178, 0.6)";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(w, hy); ctx.stroke();
      /* 网格地面 */
      const lineA = dark ? 0.55 : 0.32;
      ctx.strokeStyle = `rgba(232, 121, 249, ${lineA})`;
      ctx.lineWidth = 1;
      for (let i = -14; i <= 14; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + i * w * 0.013, hy);
        ctx.lineTo(w / 2 + i * w * 0.11, h);
        ctx.stroke();
      }
      for (let i = 0; i < 13; i++) {
        const p = ((i + t / 52) % 13) / 13;
        const y = hy + Math.pow(p, 2.3) * (h - hy);
        ctx.strokeStyle = `rgba(232, 121, 249, ${lineA * (0.2 + p * 0.8)})`;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 电路脉冲：PCB 走线 + 光信号 —— */
  circuit(canvas, ctx) {
    let w, h, raf, t = 0, paths = [], pulses = [], blinks = [];
    const bd = backdrop((x, W, H, dark, pathsData) => {
      fillSky(x, W, H, dark
        ? [[0, "#020c1b"], [1, "#07182e"]]
        : [[0, "#eef5fc"], [1, "#ddeafc"]]);
      /* 焊点网格 */
      x.fillStyle = dark ? "rgba(56, 189, 248, 0.08)" : "rgba(30, 64, 120, 0.1)";
      for (let gx = 13; gx < W; gx += 26)
        for (let gy = 13; gy < H; gy += 26) {
          x.beginPath(); x.arc(gx, gy, 1, 0, 7); x.fill();
        }
      /* 走线 */
      const trace = dark ? "rgba(56, 189, 248, 0.2)" : "rgba(30, 100, 180, 0.22)";
      x.strokeStyle = trace;
      x.lineWidth = 2;
      x.lineCap = "round";
      x.lineJoin = "round";
      for (const path of pathsData) {
        x.beginPath();
        x.moveTo(path.pts[0][0], path.pts[0][1]);
        for (let i = 1; i < path.pts.length; i++) x.lineTo(path.pts[i][0], path.pts[i][1]);
        x.stroke();
        for (const [ex, ey] of [path.pts[0], path.pts[path.pts.length - 1]]) {
          x.beginPath(); x.arc(ex, ey, 3.5, 0, 7); x.stroke();
        }
      }
      vignette(x, W, H, dark ? 0.45 : 0.1);
    });
    const genPaths = () => {
      const list = [];
      const GAP = 26;
      for (let i = 0; i < 30; i++) {
        let px = Math.round(rand(0, w) / GAP) * GAP + 13;
        let py = Math.round(rand(0, h) / GAP) * GAP + 13;
        let ang = Math.random() < 0.5 ? 0 : Math.PI / 2;
        const pts = [[px, py]];
        const segs = 2 + (Math.random() * 3 | 0);
        for (let sgi = 0; sgi < segs; sgi++) {
          const len = GAP * (2 + (Math.random() * 5 | 0)) * (Math.random() < 0.5 ? 1 : -1);
          if (ang === 0) px += len; else py += len;
          pts.push([px, py]);
          ang += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 4;
          const snapLen = GAP * (1 + (Math.random() * 3 | 0));
          px += Math.cos(ang) * snapLen * 0.414;
          py += Math.sin(ang) * snapLen * 0.414;
          px = Math.round(px / GAP) * GAP + 13;
          py = Math.round(py / GAP) * GAP + 13;
          pts.push([px, py]);
          ang = Math.random() < 0.5 ? 0 : Math.PI / 2;
        }
        list.push({ pts });
      }
      return list;
    };
    const pathLen = (pts) => {
      let L = 0;
      for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      return L;
    };
    const pointAt = (pts, dist) => {
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (acc + sl >= dist) {
          const k = (dist - acc) / sl;
          return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
        }
        acc += sl;
      }
      return pts[pts.length - 1];
    };
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      paths = genPaths();
      pulses = Array.from({ length: 12 }, () => ({ p: paths[(Math.random() * paths.length) | 0], d: rand(0, 400), v: rand(1.4, 3.2) }));
      blinks = paths.filter(() => Math.random() < 0.4).map((p) => ({ p, ph: rand(0, 6.28) }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark, paths);
      const tone = dark ? "56, 189, 248" : "2, 132, 199";
      for (const b of blinks) {
        const a = 0.3 + 0.3 * Math.sin(t * 0.03 + b.ph);
        const [ex, ey] = b.p.pts[b.p.pts.length - 1];
        glowDot(ctx, ex, ey, 10, tone, dark ? a : a * 0.7);
      }
      for (const pu of pulses) {
        const L = pathLen(pu.p.pts);
        pu.d += pu.v;
        if (pu.d > L + 30) { pu.d = -10; }
        if (pu.d < 0 || pu.d > L) continue;
        const [hx, hy] = pointAt(pu.p.pts, pu.d);
        for (let k = 1; k <= 4; k++) {
          const [tx2, ty2] = pointAt(pu.p.pts, Math.max(0, pu.d - k * 9));
          ctx.fillStyle = `rgba(${tone}, ${(0.5 - k * 0.11) * (dark ? 1 : 0.8)})`;
          ctx.beginPath(); ctx.arc(tx2, ty2, 2.2 - k * 0.3, 0, 7); ctx.fill();
        }
        glowDot(ctx, hx, hy, 13, tone, dark ? 0.9 : 0.7);
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 樱花雨：枝头花影 + 两层花瓣 —— */
  sakura(canvas, ctx) {
    let w, h, raf, t = 0, near = [], far = [];
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark
        ? [[0, "#241426"], [0.6, "#3d1f38"], [1, "#5c2a44"]]
        : [[0, "#fff7f8"], [0.55, "#ffeaf0"], [1, "#fdeee6"]]);
      glowDot(x, W * 0.82, H * 0.14, Math.min(W, H) * 0.5, dark ? "244, 114, 182" : "255, 228, 238", dark ? 0.2 : 0.55);
      /* 伸进画面的枝条 */
      x.strokeStyle = dark ? "#120812" : "#5b3a29";
      x.lineCap = "round";
      x.lineWidth = Math.min(W, H) * 0.014;
      x.beginPath();
      x.moveTo(-10, H * 0.06);
      x.bezierCurveTo(W * 0.09, H * 0.1, W * 0.16, H * 0.05, W * 0.26, H * 0.13);
      x.stroke();
      x.lineWidth = Math.min(W, H) * 0.007;
      x.beginPath();
      x.moveTo(W * 0.11, H * 0.085);
      x.bezierCurveTo(W * 0.15, H * 0.14, W * 0.2, H * 0.15, W * 0.24, H * 0.2);
      x.stroke();
      const blossom = (bx, by, s, c1, c2) => {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          glowDot(x, bx + Math.cos(a) * s, by + Math.sin(a) * s, s * 1.6, c1, 0.8);
        }
        glowDot(x, bx, by, s, c2, 0.9);
      };
      const B = [[0.26, 0.13], [0.24, 0.2], [0.15, 0.11], [0.1, 0.08], [0.2, 0.06]];
      for (const [bx, by] of B)
        blossom(W * bx, H * by, Math.min(W, H) * 0.012, dark ? "219, 39, 119" : "f9a8d4", dark ? "244, 114, 182" : "fbcfe8");
      vignette(x, W, H, dark ? 0.4 : 0.08);
    });
    const petal = (s) => ({
      x: Math.random() * w, y: Math.random() * h, s,
      rot: rand(0, 6.28), vr: rand(-0.03, 0.03),
      vy: rand(0.35, 0.9) * (s / 7), ph: rand(0, 6.28), amp: rand(0.4, 1),
      fs: rand(0.02, 0.05),
    });
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      near = Array.from({ length: countByArea(w, h, 8, 30, 42000) }, () => petal(rand(5, 9)));
      far = Array.from({ length: countByArea(w, h, 8, 24, 60000) }, () => petal(rand(2.5, 4)));
    };
    const drawPetal = (p, alpha) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(Math.max(0.15, Math.abs(Math.sin(t * p.fs + p.ph))), 1);
      ctx.beginPath();
      ctx.moveTo(0, -p.s);
      ctx.bezierCurveTo(p.s * 0.9, -p.s * 0.4, p.s * 0.7, p.s * 0.7, 0, p.s);
      ctx.bezierCurveTo(-p.s * 0.7, p.s * 0.7, -p.s * 0.9, -p.s * 0.4, 0, -p.s);
      ctx.fillStyle = `rgba(249, 168, 212, ${alpha})`;
      ctx.fill();
      ctx.restore();
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      for (const p of far) {
        p.y += p.vy * 0.55; p.x += Math.sin(t * 0.008 * p.amp + p.ph) * 0.4;
        if (p.y > h + 12) { p.y = -12; p.x = Math.random() * w; }
        drawPetal(p, dark ? 0.4 : 0.5);
      }
      for (const p of near) {
        p.y += p.vy; p.x += Math.sin(t * 0.01 * p.amp + p.ph) * 0.7;
        p.rot += p.vr;
        if (p.y > h + 16) { p.y = -16; p.x = Math.random() * w; }
        drawPetal(p, dark ? 0.75 : 0.85);
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 萤火虫：草浪剪影 + 会聚向光标的光点 —— */
  fireflies(canvas, ctx) {
    let w, h, raf, t = 0, flies = [], blur = [];
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark
        ? [[0, "#050d05"], [0.6, "#0a1a08"], [1, "#0f2409"]]
        : [[0, "#f3f8e8"], [0.6, "#e6f0d8"], [1, "#d5e6c3"]]);
      /* 远处树影 */
      x.fillStyle = dark ? "rgba(2, 8, 2, 0.7)" : "rgba(120, 150, 100, 0.35)";
      for (let i = 0; i < 7; i++) {
        const tx = (i / 6) * W + rand(-30, 30);
        const tw = rand(W * 0.012, W * 0.03);
        x.fillRect(tx, H * rand(0.3, 0.5), tw, H);
      }
      /* 草浪 */
      x.strokeStyle = dark ? "rgba(3, 12, 4, 0.9)" : "rgba(90, 125, 70, 0.55)";
      x.lineWidth = 2;
      for (let gx = -10; gx < W + 10; gx += 9) {
        const gh = rand(H * 0.03, H * 0.11);
        x.beginPath();
        x.moveTo(gx, H);
        x.quadraticCurveTo(gx + rand(-6, 6), H - gh * 0.6, gx + rand(-10, 10), H - gh);
        x.stroke();
      }
      vignette(x, W, H, dark ? 0.5 : 0.12);
    });
    const mkFly = () => ({
      x: Math.random() * w, y: Math.random() * h * 0.9,
      ang: rand(0, 6.28), sp: rand(0.15, 0.45),
      ph: rand(0, 6.28), bl: rand(0.015, 0.045),
    });
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      flies = Array.from({ length: countByArea(w, h, 8, 20, 50000) }, mkFly);
      blur = Array.from({ length: countByArea(w, h, 5, 10, 90000) }, mkFly);
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      const p = ptr(canvas);
      const step = (f, size, base) => {
        if (p.ok) {
          const dx = p.x - f.x, dy = p.y - f.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 260 && dist > 40) { f.ang += Math.atan2(dy, dx) * 0.002 * (1 - dist / 260); }
        }
        f.ang += rand(-0.06, 0.06);
        f.x += Math.cos(f.ang) * f.sp;
        f.y += Math.sin(f.ang) * f.sp * 0.7;
        if (f.x < -20) f.x = w + 20; else if (f.x > w + 20) f.x = -20;
        if (f.y < -20) f.y = h + 20; else if (f.y > h * 0.96) f.y = -20;
        const a = base + (dark ? 0.5 : 0.4) * Math.abs(Math.sin(t * f.bl + f.ph));
        glowDot(ctx, f.x, f.y, size * 2.6, "250, 204, 21", a * 0.5);
        ctx.fillStyle = `rgba(254, 249, 195, ${Math.min(1, a + 0.2)})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, size * 0.28, 0, 7); ctx.fill();
      };
      for (const f of blur) step(f, 7, 0.1);
      for (const f of flies) step(f, 3.4, 0.18);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 云海：两层云团 + 飞鸟 —— */
  clouds(canvas, ctx) {
    let w, h, raf, t = 0, back = [], front = [], birds = [];
    const mkCloud = (layer) => {
      const cx = rand(-100, w + 100);
      const cy = rand(h * 0.08, h * 0.62);
      const s = layer === 1 ? rand(0.5, 0.9) : rand(0.9, 1.5);
      const puffs = Array.from({ length: 7 }, () => ({
        dx: rand(-60, 60) * s, dy: rand(-14, 10) * s, r: rand(24, 52) * s,
      }));
      return { cx, cy, s, v: (layer === 1 ? rand(0.12, 0.25) : rand(0.3, 0.55)) * (Math.random() < 0.5 ? 1 : 1), puffs };
    };
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      back = Array.from({ length: 5 }, () => mkCloud(1));
      front = Array.from({ length: 5 }, () => mkCloud(2));
      birds = Array.from({ length: 3 }, () => ({ x: rand(0, w), y: rand(h * 0.12, h * 0.4), v: rand(0.5, 0.9), ph: rand(0, 6.28), s: rand(4, 7) }));
    };
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark
        ? [[0, "#0d1730"], [0.6, "#16233f"], [1, "#1d2c4d"]]
        : [[0, "#8ecdf8"], [0.55, "#c8e7fb"], [1, "#f2fafe"]]);
      glowDot(x, W * 0.84, H * 0.12, Math.min(W, H) * 0.3, dark ? "226, 232, 240" : "255, 251, 235", dark ? 0.35 : 0.85);
      if (dark) {
        const ms = makeStars(W, H * 0.5, countByArea(W, H, 30, 110, 16000));
        drawStars(x, ms, 40, true, 0.8);
      }
    });
    const drawCloud = (c, alpha) => {
      const dark = isDarkBg();
      for (const pf of c.puffs) {
        const px = c.cx + pf.dx, py = c.cy + pf.dy;
        const g = ctx.createRadialGradient(px, py - pf.r * 0.25, pf.r * 0.1, px, py, pf.r);
        g.addColorStop(0, dark ? `rgba(203, 213, 225, ${alpha})` : `rgba(255, 255, 255, ${alpha})`);
        g.addColorStop(1, dark ? `rgba(100, 116, 139, 0)` : `rgba(219, 234, 254, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, pf.r, 0, 7); ctx.fill();
      }
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      for (const c of back) {
        c.cx += c.v;
        if (c.cx > w + 140) c.cx = -140;
        drawCloud(c, dark ? 0.22 : 0.5);
      }
      for (const b of birds) {
        b.x += b.v;
        if (b.x > w + 30) { b.x = -30; b.y = rand(h * 0.12, h * 0.4); }
        const flap = Math.abs(Math.sin(t * 0.09 + b.ph));
        ctx.strokeStyle = dark ? "rgba(15, 23, 42, 0.85)" : "rgba(51, 65, 85, 0.75)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(b.x - b.s, b.y + flap * b.s * 0.5);
        ctx.quadraticCurveTo(b.x, b.y - flap * b.s * 0.6, b.x + b.s, b.y + flap * b.s * 0.5);
        ctx.stroke();
      }
      for (const c of front) {
        c.cx += c.v;
        if (c.cx > w + 160) c.cx = -160;
        drawCloud(c, dark ? 0.3 : 0.8);
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 星野：银河 + 北斗七星隐现 + 流星 —— */
  stars(canvas, ctx) {
    let w, h, raf, t = 0, stars = [], bright = [], meteor = { m: null, next: 60 };
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark
        ? [[0, "#010309"], [0.7, "#071026"], [1, "#12204a"]]
        : [[0, "#c9dcff"], [0.7, "#e6eeff"], [1, "#f6f9ff"]]);
      if (dark) {
        /* 银河斜带 */
        x.save();
        x.translate(W * 0.5, H * 0.45);
        x.rotate(-0.55);
        for (let i = 0; i < 4; i++) {
          const g = x.createRadialGradient(0, i * 46 - 70, 0, 0, i * 46 - 70, W * 0.55);
          g.addColorStop(0, `rgba(165, 180, 252, ${0.07 - i * 0.012})`);
          g.addColorStop(1, "rgba(165, 180, 252, 0)");
          x.fillStyle = g;
          x.fillRect(-W, -H, W * 2, H * 2);
        }
        x.restore();
        for (let i = 0; i < countByArea(W, H, 60, 220, 9000); i++) {
          const along = rand(-0.2, 1.2);
          const px = along * W;
          const py = H * 0.45 + Math.tan(-0.55) * (px - W * 0.5) + rand(-H * 0.14, H * 0.14);
          x.fillStyle = `rgba(226, 232, 240, ${rand(0.1, 0.5)})`;
          x.fillRect(px, py, 1, 1);
        }
      }
      vignette(x, W, H, dark ? 0.4 : 0.08);
    });
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      stars = makeStars(w, h, countByArea(w, h, 60, 170, 11000));
      bright = Array.from({ length: 7 }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.7, r: rand(1.6, 2.6), ph: rand(0, 6.28) }));
    };
    const DIPPER = [[0.16, 0.34], [0.24, 0.31], [0.32, 0.33], [0.4, 0.31], [0.5, 0.24], [0.56, 0.32], [0.65, 0.28]];
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      drawStars(ctx, stars, t, dark, 0.9);
      /* 北斗七星：周期性隐现 */
      const cA = Math.max(0, Math.sin(t * 0.006)) * (dark ? 0.4 : 0.3);
      if (cA > 0.01) {
        const pts = DIPPER.map(([rx, ry]) => [rx * w, ry * h]);
        ctx.strokeStyle = dark ? `rgba(191, 219, 254, ${cA})` : `rgba(30, 58, 138, ${cA * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.stroke();
        for (const [px, py] of pts) glowDot(ctx, px, py, 7, dark ? "191, 219, 254" : "30, 64, 175", cA);
      }
      for (const b of bright) {
        const a = 0.4 + 0.5 * Math.abs(Math.sin(t * 0.015 + b.ph));
        flare(ctx, b.x, b.y, b.r * 4, dark ? "224, 242, 254" : "30, 58, 138", a * (dark ? 0.9 : 0.5));
      }
      /* 流星 */
      if (!meteor.m && --meteor.next <= 0) {
        meteor.m = { x: w * 0.2 + Math.random() * w * 0.6, y: Math.random() * h * 0.28, vx: -(4.5 + Math.random() * 3), vy: 2 + Math.random() * 1.6, life: 42 };
        meteor.next = rand(150, 400);
      }
      if (meteor.m) {
        const m = meteor.m;
        const tx = m.x - m.vx * 10, ty = m.y - m.vy * 10;
        const g = ctx.createLinearGradient(tx, ty, m.x, m.y);
        g.addColorStop(0, "rgba(224, 242, 254, 0)");
        g.addColorStop(1, `rgba(224, 242, 254, ${dark ? 0.9 : 0.6})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.7;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(m.x, m.y); ctx.stroke();
        m.x += m.vx; m.y += m.vy;
        if (--meteor.life <= 0) meteor.m = null;
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 星云：五色云气呼吸 + 星芒 —— */
  nebula(canvas, ctx) {
    let w, h, raf, t = 0, stars = [], bright = [];
    const blobs = [
      { c: "124, 58, 237", bx: 0.28, by: 0.32, r: 0.42, sp: 0.9, ph: 0 },
      { c: "219, 39, 119", bx: 0.68, by: 0.4, r: 0.38, sp: 0.7, ph: 1.8 },
      { c: "34, 211, 238", bx: 0.5, by: 0.66, r: 0.34, sp: 0.8, ph: 3.1 },
      { c: "79, 70, 229", bx: 0.16, by: 0.72, r: 0.3, sp: 0.6, ph: 4.4 },
      { c: "244, 114, 182", bx: 0.84, by: 0.7, r: 0.28, sp: 1, ph: 5.2 },
    ];
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark
        ? [[0, "#040210"], [1, "#0b0620"]]
        : [[0, "#f6efff"], [1, "#fdeef7"]]);
      vignette(x, W, H, dark ? 0.45 : 0.08);
    });
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      stars = makeStars(w, h, countByArea(w, h, 60, 160, 10000));
      bright = Array.from({ length: 6 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: rand(1.8, 3), ph: rand(0, 6.28) }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      ctx.save();
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (const b of blobs) {
        const breath = 1 + 0.14 * Math.sin(t * 0.004 * b.sp + b.ph);
        const px = w * b.bx + Math.sin(t * 0.0016 * b.sp + b.ph) * w * 0.04;
        const py = h * b.by + Math.cos(t * 0.0013 * b.sp + b.ph) * h * 0.04;
        glowDot(ctx, px, py, Math.min(w, h) * b.r * breath, b.c, (dark ? 0.22 : 0.16) * (0.75 + 0.25 * Math.sin(t * 0.005 * b.sp + b.ph)));
      }
      ctx.restore();
      drawStars(ctx, stars, t, dark, 0.9);
      for (const b of bright) {
        const a = 0.35 + 0.5 * Math.abs(Math.sin(t * 0.016 + b.ph));
        flare(ctx, b.x, b.y, b.r * 4.2, dark ? "224, 242, 254" : "91, 33, 182", a * (dark ? 0.9 : 0.55));
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 深空行星：带环气态巨行星 + 绕行月亮 —— */
  planet(canvas, ctx) {
    let w, h, raf, t = 0, stars = [];
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark
        ? [[0, "#010309"], [0.65, "#050b1e"], [1, "#0a1533"]]
        : [[0, "#bcd7ff"], [0.7, "#e6f0ff"], [1, "#fdf3e3"]]);
      vignette(x, W, H, dark ? 0.45 : 0.1);
    });
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      stars = makeStars(w, h, countByArea(w, h, 50, 140, 12000));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      drawStars(ctx, stars, t, dark, 0.9);
      const R = Math.min(w, h) * 0.26;
      const cx = w * 0.74, cy = h * 0.88;
      const ringTilt = -0.32;
      const drawRing = (frontHalf) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ringTilt);
        const bands = [
          { rx: R * 1.45, ry: R * 0.34, lw: R * 0.16, a: dark ? 0.75 : 0.5 },
          { rx: R * 1.72, ry: R * 0.4, lw: R * 0.1, a: dark ? 0.55 : 0.38 },
          { rx: R * 1.92, ry: R * 0.46, lw: R * 0.05, a: dark ? 0.4 : 0.28 },
        ];
        for (const b of bands) {
          ctx.beginPath();
          ctx.ellipse(0, 0, b.rx, b.ry, 0, frontHalf ? 0 : Math.PI, frontHalf ? Math.PI : Math.PI * 2);
          const g = ctx.createLinearGradient(-b.rx, 0, b.rx, 0);
          const col = dark ? "196, 181, 253" : "124, 58, 237";
          g.addColorStop(0, `rgba(${col}, 0)`);
          g.addColorStop(0.5, `rgba(${col}, ${b.a})`);
          g.addColorStop(1, `rgba(${col}, 0)`);
          ctx.strokeStyle = g;
          ctx.lineWidth = b.lw;
          ctx.stroke();
        }
        ctx.restore();
      };
      /* 月亮 */
      const ma = t * 0.011;
      const mRx = R * 2.6, mRy = R * 0.9;
      const mx = cx + Math.cos(ma) * mRx;
      const my = cy + Math.sin(ma) * mRy - R * 0.1;
      const moonBehind = Math.sin(ma) < 0;
      /* 大气辉光 */
      glowDot(ctx, cx, cy, R * 1.5, "96, 165, 250", dark ? 0.35 : 0.3);
      if (moonBehind) {
        glowDot(ctx, mx, my, 14, "226, 232, 240", dark ? 0.8 : 0.6);
        ctx.fillStyle = dark ? "#dbe3ee" : "#94a3b8";
        ctx.beginPath(); ctx.arc(mx, my, 5, 0, 7); ctx.fill();
      }
      drawRing(false);
      /* 行星本体 */
      const body = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.5, R * 0.12, cx, cy, R);
      body.addColorStop(0, dark ? "#7dd3fc" : "#bfdbfe");
      body.addColorStop(0.5, dark ? "#1d4ed8" : "#60a5fa");
      body.addColorStop(1, dark ? "#0b1c4d" : "#3b5fa8");
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
      ctx.fillStyle = body;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      /* 自转条纹 */
      const bandCol = dark ? ["125, 211, 252", "30, 64, 175"] : ["224, 242, 254", "59, 130, 246"];
      for (let k = 0; k < 7; k++) {
        const by = cy - R + ((k * R * 0.42 + t * 0.12) % (R * 2.6)) - R * 0.3;
        const bh = R * 0.065 + R * 0.05 * Math.sin(k * 3.3);
        ctx.fillStyle = `rgba(${bandCol[k % 2]}, 0.2)`;
        ctx.beginPath();
        ctx.ellipse(cx, by, R * 1.05, bh, 0, 0, 7);
        ctx.fill();
      }
      /* 晨昏线 */
      const shade = ctx.createRadialGradient(cx - R * 0.55, cy - R * 0.6, R * 0.3, cx, cy, R * 1.15);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, dark ? "rgba(1, 4, 12, 0.92)" : "rgba(30, 41, 82, 0.55)");
      ctx.fillStyle = shade;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.restore();
      drawRing(true);
      if (!moonBehind) {
        glowDot(ctx, mx, my, 16, "226, 232, 240", dark ? 0.9 : 0.7);
        ctx.fillStyle = dark ? "#e8edf4" : "#64748b";
        ctx.beginPath(); ctx.arc(mx, my, 5.5, 0, 7); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },
};
