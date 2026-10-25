/* ============================================================
   拾光小栈 · 背景主题库 v3（AI 壁纸 + 动态层）
   每套主题 = 大模型生成的实景壁纸（缓慢推拉的 Ken Burns 镜头 +
   淡入过渡）+ 程序绘制的动态层（花瓣 / 萤火虫 / 流星 / 脉冲…）。
   壁纸加载失败时自动回退到程序绘制的渐变天幕。
   applyBackground(id) 全局可用；主题页 themes.html 调用。
   ============================================================ */
"use strict";

const REDUCE_BG = matchMedia("(prefers-reduced-motion: reduce)").matches;
const BG_ROOT = /\/posts\//.test(location.pathname) ? "../" : "./";
const BG_VER = "1.6.0";

/* ---------------- 共享光标 ---------------- */
const BG_MOUSE = { x: -99999, y: -99999 };
addEventListener("mousemove", (e) => { BG_MOUSE.x = e.clientX; BG_MOUSE.y = e.clientY; }, { passive: true });
addEventListener("mouseout", (e) => { if (!e.relatedTarget) { BG_MOUSE.x = -99999; } }, { passive: true });

/* ---------------- 工具 ---------------- */
/* 固定定位的整页画布直接用视口尺寸，不依赖布局时序；
   主题页卡片里的小画布按自身元素测量 */
function bgSize(canvas) {
  let w, h;
  if (getComputedStyle(canvas).position === "fixed") {
    w = innerWidth;
    h = innerHeight;
  } else {
    const rect = canvas.getBoundingClientRect();
    w = Math.round(rect.width) || canvas.width || innerWidth;
    h = Math.round(rect.height) || canvas.height || innerHeight;
  }
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
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
function fillSky(x, w, h, stops) {
  const g = x.createLinearGradient(0, 0, 0, h);
  for (const [p, c] of stops) g.addColorStop(p, c);
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
function vignette(x, w, h, strength) {
  const g = x.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.4, w / 2, h * 0.46, Math.hypot(w, h) * 0.6);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
}
function flare(x, px, py, r, color, a) {
  x.strokeStyle = `rgba(${color},${a})`;
  x.lineWidth = 1;
  x.beginPath();
  x.moveTo(px - r, py); x.lineTo(px + r, py);
  x.moveTo(px, py - r); x.lineTo(px, py + r);
  x.stroke();
  glowDot(x, px, py, r * 0.9, color, a * 0.5);
}

/* ---------------- AI 壁纸层：加载 / 淡入 / Ken Burns 缓推 ---------------- */
function makeCover(file, flow) {
  flow = flow || { amp: 0, bands: 64, speed: 1, freq: 1 };
  const img = new Image();
  let ok = false, failed = false, alpha = REDUCE_BG ? 1 : 0;
  img.onload = () => { ok = true; };
  img.onerror = () => { failed = true; };
  img.src = `${BG_ROOT}assets/img/bg/${file}?v=${BG_VER}`;
  return {
    draw(ctx, w, h, t) {
      if (!ok) return;
      if (!REDUCE_BG) alpha = Math.min(1, alpha + 0.02);
      const z = REDUCE_BG ? 1.01 : 1.015 + 0.008 * Math.sin(t * 0.0022);
      const scale = Math.max(w / img.width, h / img.height) * z;
      const ampPx = (flow.amp || 0) * Math.min(2, devicePixelRatio || 1);
      const dw = img.width * scale + ampPx * 2;
      const dh = img.height * scale;
      const dx = (w - dw) / 2 + (REDUCE_BG ? 0 : Math.sin(t * 0.0014) * w * 0.006);
      const dy = (h - dh) / 2 + (REDUCE_BG ? 0 : Math.cos(t * 0.0011) * h * 0.005);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (REDUCE_BG || !ampPx) {
        ctx.drawImage(img, dx, dy, dw, dh);
      } else {
        /* 分条带流场位移：整幅场景随风轻拂（Plotagraph 式） */
        const bands = flow.bands || 64;
        const bh = dh / bands;
        const destX = dx - ampPx;
        const destW = dw + ampPx * 2;
        for (let i = 0; i < bands; i++) {
          const yy = dy + i * bh;
          const off =
            Math.sin(t * 0.006 * flow.speed + (i / bands) * flow.freq * 6.28) * ampPx +
            Math.sin(t * 0.0037 * flow.speed + i * 0.9) * ampPx * 0.45;
          const sy = Math.max(0, (yy - dy) / scale);
          const sh = bh / scale + 0.9;
          ctx.drawImage(img, 0, sy, img.width, Math.min(img.height - sy, sh), destX + off, yy, destW, bh + 0.9);
        }
      }
      ctx.restore();
    },
    get ready() { return ok; },
    get failed() { return failed; },
  };
}

/* 亮星十字星芒 */



/* ---------------- 主题清单（主题页数据源） ---------------- */
window.BG_THEMES = [
  { id: "aurora",    cat: "默认",     name: "极光",       desc: "冰岛镜面湖上的极光实景，星尘随光标轻拂", swatch: "linear-gradient(135deg,#0f172a,#134e4a 55%,#a21caf)" },
  { id: "matrix",    cat: "科技未来", name: "数字雨",     desc: "代码瀑布实景 + 双层字符流持续下落",     swatch: "linear-gradient(160deg,#010f08,#14532d 70%,#22c55e)" },
  { id: "synth",     cat: "科技未来", name: "霓虹地平线", desc: "条纹落日壁纸之上，网格地面持续流动",   swatch: "linear-gradient(180deg,#1e1b4b,#7c3aed 42%,#ec4899 62%,#111827 62.5%)" },
  { id: "circuit",   cat: "科技未来", name: "电路脉冲",   desc: "电路板微距实景，光信号沿走线疾驰",     swatch: "linear-gradient(135deg,#020c1b,#0f2a4a 60%,#38bdf8)" },
  { id: "sakura",    cat: "自然",     name: "樱花雨",     desc: "春樱实景，两层花瓣翻滚飘落",           swatch: "linear-gradient(135deg,#fff1f5,#f9a8d4 60%,#fb7185)" },
  { id: "fireflies", cat: "自然",     name: "萤火虫",     desc: "夏夜森林实景，光点呼吸明灭、聚向光标", swatch: "linear-gradient(135deg,#02120a,#14532d 55%,#a3e635)" },
  { id: "clouds",    cat: "自然",     name: "云海",       desc: "日出云海全景缓推，偶有飞鸟掠过",       swatch: "linear-gradient(135deg,#7dd3fc,#e0f2fe 60%,#f8fafc)" },
  { id: "stars",     cat: "宇宙",     name: "星野",       desc: "银河夜景壁纸，亮星闪耀、流星 Regular", swatch: "linear-gradient(135deg,#010409,#0f1c3f 60%,#475569)" },
  { id: "nebula",    cat: "宇宙",     name: "星云",       desc: "深空星云壁纸，云气呼吸、亮星星芒",     swatch: "linear-gradient(135deg,#1e1b4b,#7c3aed 45%,#db2777 80%,#020617)" },
  { id: "planet",    cat: "宇宙",     name: "深空行星",   desc: "带环行星壁纸，一颗小月亮缓缓绕行",     swatch: "linear-gradient(135deg,#010409,#1d4ed8 88%,#93c5fd)" },
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

/* ---------------- 画师们：壁纸底层 + 动态层 ---------------- */
window.BG_PAINTERS = {
  /* —— 极光：实景壁纸 + 星尘连线（受光标扰动） —— */
  aurora(canvas, ctx) {
    let w, h, raf, t = 0, dots = [];
    const cover = makeCover("aurora.jpg", { amp: 10, bands: 56, speed: 1.2, freq: 1.1 });
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark
        ? [[0, "#0a0e24"], [0.55, "#141a3a"], [1, "#1b1f4a"]]
        : [[0, "#eef3ff"], [0.6, "#f6f0ff"], [1, "#fdeffb"]]);
    });
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; };
    const seed = () => {
      dots = Array.from({ length: countByArea(w, h, 12, 44, 34000) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: 0, vy: 0, bvx: (Math.random() - 0.5) * 0.3, bvy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      cover.draw(ctx, w, h, t);
      vignette(ctx, w, h, dark ? 0.34 : 0.14);
      const p = ptr(canvas);
      const tone = dark ? "226, 232, 240" : "255, 255, 255";
      for (const d of dots) {
        if (p.ok) {
          const dx = d.x - p.x, dy = d.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 140 && dist > 0.1) { d.vx += (dx / dist) * 0.03; d.vy += (dy / dist) * 0.03; }
        }
        d.vx = d.vx * 0.985 + d.bvx;
        d.vy = d.vy * 0.985 + d.bvy;
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = w; else if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h; else if (d.y > h) d.y = 0;
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dist = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
          if (dist < 100) {
            ctx.strokeStyle = `rgba(${tone}, ${0.18 * (1 - dist / 100)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
        glowDot(ctx, dots[i].x, dots[i].y, dots[i].r * 4, "165, 243, 252", dark ? 0.5 : 0.55);
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", () => { resize(); seed(); });
    resize(); seed();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 数字雨：壁纸 + 持续下落的近景字符流 —— */
  matrix(canvas, ctx) {
    const FONT = 15, TRAIL = 12;
    const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789<>/{}[]=+*#";
    let w, h, raf, tick = 0, cols = [];
    const cover = makeCover("matrix.jpg", { amp: 4, bands: 48, speed: 1.6, freq: 1.6 });
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark
        ? [[0, "#010a04"], [0.6, "#03170b"], [1, "#05240f"]]
        : [[0, "#f0fbf3"], [0.6, "#e2f6e9"], [1, "#d5f0de"]]);
    });
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      const n = Math.ceil(w / (FONT + 6) / 1.6);
      cols = Array.from({ length: n }, (_, i) => ({
        x: i * (FONT + 6) * 1.6 + 6, y: rand(-h, h), v: rand(1.8, 4), trail: [],
      }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      tick++;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      cover.draw(ctx, w, h, t);
      ctx.font = `${FONT}px ui-monospace, Consolas, monospace`;
      const headA = dark ? 0.9 : 0.55;
      if (tick % 2 === 0) {
        for (const col of cols) {
          col.trail.push({ y: col.y, ch: GLYPHS[(Math.random() * GLYPHS.length) | 0] });
          while (col.trail.length > TRAIL) col.trail.shift();
          col.y += col.v * 3;
          if (col.y > h + TRAIL * FONT) { col.y = rand(-300, -20); col.trail = []; col.v = rand(1.8, 4); }
        }
      }
      for (const col of cols) {
        const n = col.trail.length;
        for (let i = 0; i < n; i++) {
          const g = col.trail[i];
          ctx.fillStyle = `rgba(134, 239, 172, ${((i + 1) / n) ** 1.5 * (dark ? 0.4 : 0.3)})`;
          ctx.fillText(g.ch, col.x, g.y);
        }
        if (n) {
          const head = col.trail[n - 1];
          glowDot(ctx, col.x + FONT / 2, head.y - FONT / 2, FONT * 1.5, "134, 239, 172", headA * 0.4);
          ctx.fillStyle = `rgba(${dark ? "220, 252, 231" : "22, 128, 61"}, ${headA})`;
          ctx.fillText(head.ch, col.x, head.y);
        }
      }
      vignette(ctx, w, h, dark ? 0.3 : 0.1);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 霓虹地平线：壁纸 + 流动的网格扫描线 —— */
  synth(canvas, ctx) {
    let w, h, raf, t = 0;
    const cover = makeCover("synth.jpg", { amp: 7, bands: 56, speed: 0.8, freq: 1.0 });
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark
        ? [[0, "#050112"], [0.45, "#2d0a52"], [0.62, "#7a1a5e"], [0.6201, "#12051f"], [1, "#1c0a2e"]]
        : [[0, "#ffe9f3"], [0.45, "#ffd0e4"], [0.62, "#ffb3c8"], [0.6201, "#fbe6f2"], [1, "#f3d9ee"]]);
    });
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      cover.draw(ctx, w, h, t);
      const hy = h * 0.62;
      /* 地平线辉光呼吸 */
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      glowDot(ctx, w / 2, hy, w * 0.3, "236, 72, 153", (dark ? 0.14 : 0.1) * (0.75 + 0.25 * Math.sin(t * 0.02)));
      ctx.restore();
      /* 网格地面上的流动扫描线（让壁纸的地面「动」起来） */
      const lineA = dark ? 0.4 : 0.3;
      for (let i = 0; i < 12; i++) {
        const p = ((i + t / 52) % 12) / 12;
        const y = hy + Math.pow(p, 2.3) * (h - hy);
        ctx.strokeStyle = `rgba(240, 171, 252, ${lineA * (0.15 + p * 0.85)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      vignette(ctx, w, h, dark ? 0.34 : 0.12);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", () => { bgSize(canvas); w = canvas.width; h = canvas.height; });
    bgSize(canvas); w = canvas.width; h = canvas.height;
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 电路脉冲：壁纸 + 沿走线疾驰的光信号 —— */
  circuit(canvas, ctx) {
    let w, h, raf, t = 0, paths = [], pulses = [], blinks = [];
    const cover = makeCover("circuit.jpg", { amp: 3, bands: 64, speed: 1.8, freq: 2.2 });
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark ? [[0, "#020c1b"], [1, "#07182e"]] : [[0, "#eef5fc"], [1, "#ddeafc"]]);
    });
    const genPaths = () => {
      const list = [];
      const GAP = 26;
      for (let i = 0; i < 26; i++) {
        let px = Math.round(rand(0, w) / GAP) * GAP + 13;
        let py = Math.round(rand(0, h) / GAP) * GAP + 13;
        let ang = Math.random() < 0.5 ? 0 : Math.PI / 2;
        const pts = [[px, py]];
        const segs = 2 + (Math.random() * 3 | 0);
        for (let sgi = 0; sgi < segs; sgi++) {
          const len = GAP * (2 + (Math.random() * 5 | 0)) * (Math.random() < 0.5 ? 1 : -1);
          if (ang === 0) px += len; else py += len;
          pts.push([px, py]);
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
      bd.draw(ctx, w, h, dark);
      cover.draw(ctx, w, h, t);
      const tone = dark ? "56, 189, 248" : "2, 132, 199";
      for (const b of blinks) {
        const a = 0.25 + 0.3 * Math.sin(t * 0.03 + b.ph);
        const [ex, ey] = b.p.pts[b.p.pts.length - 1];
        glowDot(ctx, ex, ey, 10, tone, dark ? a : a * 0.7);
      }
      for (const pu of pulses) {
        const L = pathLen(pu.p.pts);
        pu.d += pu.v;
        if (pu.d > L + 30) pu.d = -10;
        if (pu.d < 0 || pu.d > L) continue;
        const [hx, hy] = pointAt(pu.p.pts, pu.d);
        for (let k = 1; k <= 4; k++) {
          const [tx2, ty2] = pointAt(pu.p.pts, Math.max(0, pu.d - k * 9));
          ctx.fillStyle = `rgba(${tone}, ${(0.5 - k * 0.11) * (dark ? 1 : 0.8)})`;
          ctx.beginPath(); ctx.arc(tx2, ty2, 2.2 - k * 0.3, 0, 7); ctx.fill();
        }
        glowDot(ctx, hx, hy, 13, tone, dark ? 0.9 : 0.7);
      }
      vignette(ctx, w, h, dark ? 0.3 : 0.1);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 樱花雨：壁纸 + 两层翻滚花瓣 —— */
  sakura(canvas, ctx) {
    let w, h, raf, t = 0, near = [], far = [];
    const cover = makeCover("sakura.jpg", { amp: 8, bands: 60, speed: 0.9, freq: 1.3 });
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark
        ? [[0, "#241426"], [0.6, "#3d1f38"], [1, "#5c2a44"]]
        : [[0, "#fff7f8"], [0.55, "#ffeaf0"], [1, "#fdeee6"]]);
    });
    const petal = (s) => ({
      x: Math.random() * w, y: Math.random() * h, s,
      rot: rand(0, 6.28), vr: rand(-0.03, 0.03),
      vy: rand(0.35, 0.9) * (s / 7), ph: rand(0, 6.28), amp: rand(0.4, 1),
      fs: rand(0.02, 0.05),
    });
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      near = Array.from({ length: countByArea(w, h, 8, 26, 50000) }, () => petal(rand(5, 9)));
      far = Array.from({ length: countByArea(w, h, 6, 20, 70000) }, () => petal(rand(2.5, 4)));
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
      ctx.fillStyle = `rgba(255, 214, 231, ${alpha})`;
      ctx.fill();
      ctx.restore();
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      cover.draw(ctx, w, h, t);
      for (const p of far) {
        p.y += p.vy * 0.55; p.x += Math.sin(t * 0.008 * p.amp + p.ph) * 0.4;
        if (p.y > h + 12) { p.y = -12; p.x = Math.random() * w; }
        drawPetal(p, dark ? 0.5 : 0.65);
      }
      for (const p of near) {
        p.y += p.vy; p.x += Math.sin(t * 0.01 * p.amp + p.ph) * 0.7;
        p.rot += p.vr;
        if (p.y > h + 16) { p.y = -16; p.x = Math.random() * w; }
        drawPetal(p, dark ? 0.85 : 0.9);
      }
      vignette(ctx, w, h, dark ? 0.34 : 0.1);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 萤火虫：壁纸 + 呼吸明灭、聚向光标的光点 —— */
  fireflies(canvas, ctx) {
    let w, h, raf, t = 0, flies = [], blur = [];
    const cover = makeCover("fireflies.jpg", { amp: 7, bands: 56, speed: 0.7, freq: 1.0 });
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark ? [[0, "#050d05"], [1, "#0f2409"]] : [[0, "#f3f8e8"], [1, "#d5e6c3"]]);
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
      cover.draw(ctx, w, h, t);
      const p = ptr(canvas);
      const step = (f, size, base) => {
        if (p.ok) {
          const dx = p.x - f.x, dy = p.y - f.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 260 && dist > 40) f.ang += Math.atan2(dy, dx) * 0.002 * (1 - dist / 260);
        }
        f.ang += rand(-0.06, 0.06);
        f.x += Math.cos(f.ang) * f.sp;
        f.y += Math.sin(f.ang) * f.sp * 0.7;
        if (f.x < -20) f.x = w + 20; else if (f.x > w + 20) f.x = -20;
        if (f.y < -20) f.y = h + 20; else if (f.y > h * 0.96) f.y = -20;
        const a = base + (dark ? 0.55 : 0.45) * Math.abs(Math.sin(t * f.bl + f.ph));
        glowDot(ctx, f.x, f.y, size * 2.8, "250, 204, 21", a * 0.55);
        ctx.fillStyle = `rgba(254, 249, 195, ${Math.min(1, a + 0.2)})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, size * 0.26, 0, 7); ctx.fill();
      };
      for (const f of blur) step(f, 7, 0.12);
      for (const f of flies) step(f, 3.4, 0.2);
      vignette(ctx, w, h, dark ? 0.34 : 0.12);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 云海：壁纸缓推 + 掠过的飞鸟 —— */
  clouds(canvas, ctx) {
    let w, h, raf, t = 0, birds = [];
    const cover = makeCover("clouds.jpg", { amp: 14, bands: 48, speed: 0.6, freq: 0.7 });
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark ? [[0, "#0d1730"], [1, "#1d2c4d"]] : [[0, "#8ecdf8"], [1, "#f2fafe"]]);
    });
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      birds = Array.from({ length: 3 }, () => ({ x: rand(0, w), y: rand(h * 0.12, h * 0.38), v: rand(0.5, 0.9), ph: rand(0, 6.28), s: rand(4, 7) }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      cover.draw(ctx, w, h, t);
      for (const b of birds) {
        b.x += b.v;
        if (b.x > w + 30) { b.x = -30; b.y = rand(h * 0.12, h * 0.38); }
        const flap = Math.abs(Math.sin(t * 0.09 + b.ph));
        ctx.strokeStyle = dark ? "rgba(15, 23, 42, 0.8)" : "rgba(51, 65, 85, 0.7)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(b.x - b.s, b.y + flap * b.s * 0.5);
        ctx.quadraticCurveTo(b.x, b.y - flap * b.s * 0.6, b.x + b.s, b.y + flap * b.s * 0.5);
        ctx.stroke();
      }
      vignette(ctx, w, h, dark ? 0.32 : 0.1);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 星野：壁纸 + 亮星星芒 + 流星 —— */
  stars(canvas, ctx) {
    let w, h, raf, t = 0, bright = [], meteor = { m: null, next: 60 };
    const cover = makeCover("stars.jpg", { amp: 5, bands: 56, speed: 0.5, freq: 0.9 });
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark ? [[0, "#010309"], [1, "#12204a"]] : [[0, "#c9dcff"], [1, "#f6f9ff"]]);
    });
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      bright = Array.from({ length: 6 }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.7, r: rand(1.6, 2.6), ph: rand(0, 6.28) }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      cover.draw(ctx, w, h, t);
      for (const b of bright) {
        const a = 0.35 + 0.5 * Math.abs(Math.sin(t * 0.015 + b.ph));
        flare(ctx, b.x, b.y, b.r * 4, "224, 242, 254", a * (dark ? 0.85 : 0.5));
      }
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
      vignette(ctx, w, h, dark ? 0.3 : 0.1);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 星云：壁纸 + 呼吸云气 + 星芒 —— */
  nebula(canvas, ctx) {
    let w, h, raf, t = 0, bright = [];
    const cover = makeCover("nebula.jpg", { amp: 8, bands: 48, speed: 0.5, freq: 0.7 });
    const blobs = [
      { c: "124, 58, 237", bx: 0.28, by: 0.32, r: 0.36, sp: 0.9, ph: 0 },
      { c: "219, 39, 119", bx: 0.68, by: 0.4, r: 0.32, sp: 0.7, ph: 1.8 },
      { c: "34, 211, 238", bx: 0.5, by: 0.66, r: 0.3, sp: 0.8, ph: 3.1 },
    ];
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark ? [[0, "#040210"], [1, "#0b0620"]] : [[0, "#f6efff"], [1, "#fdeef7"]]);
    });
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      bright = Array.from({ length: 6 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: rand(1.8, 3), ph: rand(0, 6.28) }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      cover.draw(ctx, w, h, t);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        const breath = 1 + 0.14 * Math.sin(t * 0.004 * b.sp + b.ph);
        const px = w * b.bx + Math.sin(t * 0.0016 * b.sp + b.ph) * w * 0.04;
        const py = h * b.by + Math.cos(t * 0.0013 * b.sp + b.ph) * h * 0.04;
        glowDot(ctx, px, py, Math.min(w, h) * b.r * breath, b.c, (dark ? 0.16 : 0.1) * (0.75 + 0.25 * Math.sin(t * 0.005 * b.sp + b.ph)));
      }
      ctx.restore();
      for (const b of bright) {
        const a = 0.35 + 0.5 * Math.abs(Math.sin(t * 0.016 + b.ph));
        flare(ctx, b.x, b.y, b.r * 4.2, "224, 242, 254", a * (dark ? 0.85 : 0.55));
      }
      vignette(ctx, w, h, dark ? 0.32 : 0.1);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 深空行星：壁纸 + 绕行的小月亮 —— */
  planet(canvas, ctx) {
    let w, h, raf, t = 0;
    const cover = makeCover("planet.jpg", { amp: 4, bands: 56, speed: 0.4, freq: 0.8 });
    const bd = backdrop((x, W, H, dark) => {
      fillSky(x, W, H, dark ? [[0, "#010309"], [1, "#0a1533"]] : [[0, "#bcd7ff"], [1, "#fdf3e3"]]);
    });
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      bd.draw(ctx, w, h, dark);
      cover.draw(ctx, w, h, t);
      const ma = t * 0.011;
      const px0 = w * 0.72, py0 = h * 0.62;
      const mx = px0 + Math.cos(ma) * w * 0.34;
      const my = py0 + Math.sin(ma) * h * 0.2;
      glowDot(ctx, mx, my, 16, "226, 232, 240", dark ? 0.9 : 0.7);
      ctx.fillStyle = dark ? "#e8edf4" : "#64748b";
      ctx.beginPath(); ctx.arc(mx, my, 5, 0, 7); ctx.fill();
      vignette(ctx, w, h, dark ? 0.32 : 0.12);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },
};
