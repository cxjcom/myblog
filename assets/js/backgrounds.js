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
const BG_VER = "1.5.0";

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
function makeCover(file) {
  const img = new Image();
  let ok = false, failed = false, alpha = REDUCE_BG ? 1 : 0;
  img.onload = () => { ok = true; };
  img.onerror = () => { failed = true; };
  img.src = `${BG_ROOT}assets/img/bg/${file}?v=${BG_VER}`;
  return {
    draw(ctx, w, h, t) {
      if (!ok) return;
      if (!REDUCE_BG) alpha = Math.min(1, alpha + 0.02);
      const z = REDUCE_BG ? 1.02 : 1.02 + 0.015 * Math.sin(t * 0.0022);
      const scale = Math.max(w / img.width, h / img.height) * z;
      const dw = img.width * scale, dh = img.height * scale;
      const dx = (w - dw) / 2 + (REDUCE_BG ? 0 : Math.sin(t * 0.0014) * w * 0.007);
      const dy = (h - dh) / 2 + (REDUCE_BG ? 0 : Math.cos(t * 0.0011) * h * 0.007);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    },
    get ready() { return ok; },
    get failed() { return failed; },
  };
}
/* 亮星十字星芒 */



/* ---------------- 主题清单（主题页数据源） ---------------- */
window.BG_THEMES = [
  { id: "aurora",  cat: "默认", name: "极光 · 极夜之光", desc: "国际空间站实拍：极光洒在地球夜面上", swatch: "linear-gradient(135deg,#1a2a4a,#4a7a5a)" },
  { id: "nebula",  cat: "深空", name: "星云 · 恒星摇篮", desc: "哈勃望远镜实拍：猎户座星云的红外色彩", swatch: "linear-gradient(135deg,#3a1a2a,#7a4a3a)" },
  { id: "planet",  cat: "深空", name: "巨行星 · 朱诺号视角", desc: "朱诺号实拍：木星暗面与高层大气辉光", swatch: "linear-gradient(135deg,#2a1a0a,#7a5a2a)" },
  { id: "galaxy",  cat: "深空", name: "银河 · 万星之心", desc: "NASA 实拍：银心尘埃在红外波段发光", swatch: "linear-gradient(135deg,#2a1a0a,#8a4a1a)" },
  { id: "earth",   cat: "深空", name: "蓝星 · 家园俯瞰", desc: "空间站实拍：从 400 公里高空俯瞰地球", swatch: "linear-gradient(135deg,#0a1a2a,#2a6a8a)" },
  { id: "forest",  cat: "自然", name: "雾林 · 晨雾湖畔", desc: "实景摄影：晨雾漫过森林与静谧湖面", swatch: "linear-gradient(135deg,#4a5a6a,#8a9aaa)" },
  { id: "clouds",  cat: "自然", name: "云海 · 山巅之上", desc: "实景摄影：立于山巅，云海在脚下流动", swatch: "linear-gradient(135deg,#8aa4ba,#dfe8f0)" },
  { id: "valley",  cat: "自然", name: "山谷 · 光之峡谷", desc: "实景摄影：光与雾在峡谷间层层晕染", swatch: "linear-gradient(135deg,#6a7a9a,#c8b0c8)" },
  { id: "autumn",  cat: "自然", name: "秋湖 · 一叶知秋", desc: "实景摄影：秋叶飘落在宁静湖面", swatch: "linear-gradient(135deg,#4a5a3a,#9a8a4a)" },
  { id: "drops",   cat: "微距", name: "水珠 · 雨后微光", desc: "微距摄影：雨后水珠里的光", swatch: "linear-gradient(135deg,#3a4a5a,#7a8a9a)" },
];

window.BG_PRESETS = {
  aurora: { canvas: "aurora" },
  nebula: { canvas: "nebula" },
  planet: { canvas: "planet" },
  galaxy: { canvas: "galaxy" },
  earth: { canvas: "earth" },
  forest: { canvas: "mist", strength: 0.09 },
  clouds: { canvas: "mist", strength: 0.15 },
  valley: { canvas: "mist", strength: 0.05 },
  drops: { canvas: "glow" },
  autumn: { canvas: "leaves" },
};

/* ---------------- 画师们：壁纸底层 + 动态层 ---------------- */
window.BG_PAINTERS = {
  /* —— 极光：星尘粒子，随光标轻拂 —— */
  aurora(canvas, ctx) {
    let w, h, raf, dots = [];
    const cover = makeCover("aurora.jpg");
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; };
    const seed = () => {
      dots = Array.from({ length: countByArea(w, h, 12, 46, 32000) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: 0, vy: 0, bvx: (Math.random() - 0.5) * 0.3, bvy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      const dark = isDarkBg();
      cover.draw(ctx, w, h, 0);
      const p = ptr(canvas);
      const tone = dark ? "214, 226, 240" : "255, 255, 255";
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
            ctx.strokeStyle = `rgba(${tone}, ${0.16 * (1 - dist / 100)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
        glowDot(ctx, dots[i].x, dots[i].y, dots[i].r * 4, tone, dark ? 0.5 : 0.5);
      }
      vignette(ctx, w, h, dark ? 0.32 : 0.1);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", () => { resize(); seed(); });
    resize(); seed();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 星云：亮星星芒 + 缓慢流光 —— */
  nebula(canvas, ctx) {
    let w, h, raf, t = 0, bright = [];
    const cover = makeCover("nebula.jpg");
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      bright = Array.from({ length: 6 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 1.8 + Math.random() * 1.2, ph: rand(0, 6.28) }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      cover.draw(ctx, w, h, 0);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 2; i++) {
        const px = w * (0.3 + i * 0.4) + Math.sin(t * 0.002 + i * 2.5) * w * 0.05;
        const py = h * (0.4 + i * 0.2) + Math.cos(t * 0.0016 + i * 1.8) * h * 0.04;
        glowDot(ctx, px, py, Math.min(w, h) * 0.22, "255, 230, 240", (dark ? 0.08 : 0.05) * (0.7 + 0.3 * Math.sin(t * 0.004 + i)));
      }
      ctx.restore();
      for (const b of bright) {
        const a = 0.3 + 0.45 * Math.abs(Math.sin(t * 0.014 + b.ph));
        flare(ctx, b.x, b.y, b.r * 4, "255, 245, 230", a * (dark ? 0.8 : 0.55));
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

  /* —— 行星：静谧星光微闪 —— */
  planet(canvas, ctx) {
    let w, h, raf, t = 0, stars = [];
    const cover = makeCover("planet.jpg");
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      stars = Array.from({ length: countByArea(w, h, 20, 70, 30000) }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: 0.4 + Math.random() * 1, ph: rand(0, 6.28), sp: rand(0.5, 1.4),
      }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      cover.draw(ctx, w, h, 0);
      for (const s of stars) {
        const a = 0.15 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.02 * s.sp + s.ph));
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
      }
      vignette(ctx, w, h, dark ? 0.28 : 0.1);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 银河：流星划过 —— */
  galaxy(canvas, ctx) {
    let w, h, raf, meteor = { m: null, next: 90 };
    const cover = makeCover("galaxy.jpg");
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      const dark = isDarkBg();
      cover.draw(ctx, w, h, 0);
      if (!meteor.m && --meteor.next <= 0) {
        meteor.m = { x: w * 0.2 + Math.random() * w * 0.6, y: Math.random() * h * 0.3, vx: -(4 + Math.random() * 3), vy: 2 + Math.random() * 1.4, life: 40 };
        meteor.next = 180 + Math.random() * 240;
      }
      if (meteor.m) {
        const m = meteor.m;
        const tx = m.x - m.vx * 10, ty = m.y - m.vy * 10;
        const g = ctx.createLinearGradient(tx, ty, m.x, m.y);
        g.addColorStop(0, "rgba(255, 250, 240, 0)");
        g.addColorStop(1, `rgba(255, 250, 240, ${dark ? 0.85 : 0.5})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
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

  /* —— 蓝星：细小星光微闪 —— */
  earth(canvas, ctx) {
    let w, h, raf, t = 0, stars = [];
    const cover = makeCover("earth.jpg");
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      stars = Array.from({ length: countByArea(w, h, 16, 56, 34000) }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: 0.3 + Math.random() * 0.9, ph: rand(0, 6.28), sp: 0.5 + Math.random() * 1.4,
      }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      cover.draw(ctx, w, h, 0);
      for (const s of stars) {
        const a = 0.12 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.02 * s.sp + s.ph));
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
      }
      vignette(ctx, w, h, 0.24);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 雾气漂移（雾林 / 云海 / 山谷共用，强度由预设控制） —— */
  mist(canvas, ctx, preset) {
    const strength = (preset && preset.strength) || 0.09;
    let w, h, raf, t = 0, blobs = [];
    const cover = makeCover(currentId() + ".jpg");
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      blobs = Array.from({ length: 8 }, () => ({
        x: Math.random() * w, y: rand(h * 0.15, h * 0.95),
        r: rand(Math.min(w, h) * 0.16, Math.min(w, h) * 0.3),
        v: rand(0.12, 0.3), ph: rand(0, 6.28),
      }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      cover.draw(ctx, w, h, 0);
      const tone = dark ? "180, 195, 215" : "255, 255, 255";
      for (const b of blobs) {
        b.x += b.v;
        if (b.x - b.r > w) b.x = -b.r;
        const a = strength * (0.7 + 0.3 * Math.sin(t * 0.004 + b.ph));
        glowDot(ctx, b.x, b.y + Math.sin(t * 0.003 + b.ph) * 12, b.r, tone, a);
      }
      vignette(ctx, w, h, dark ? 0.3 : 0.08);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 水珠：光斑呼吸 —— */
  glow(canvas, ctx) {
    let w, h, raf, t = 0, spots = [];
    const cover = makeCover("drops.jpg");
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      spots = Array.from({ length: 7 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: rand(30, 70), ph: rand(0, 6.28), sp: rand(0.006, 0.012),
      }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      cover.draw(ctx, w, h, 0);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const s of spots) {
        const a = (dark ? 0.12 : 0.09) * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        glowDot(ctx, s.x, s.y, s.r, "220, 235, 250", a);
      }
      ctx.restore();
      vignette(ctx, w, h, dark ? 0.28 : 0.08);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* —— 秋叶：金色落叶飘落 —— */
  leaves(canvas, ctx) {
    let w, h, raf, t = 0, leaves = [];
    const cover = makeCover("autumn.jpg");
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      leaves = Array.from({ length: countByArea(w, h, 8, 22, 55000) }, () => ({
        x: Math.random() * w, y: Math.random() * h, s: rand(3, 6.5),
        rot: rand(0, 6.28), vr: rand(-0.02, 0.02), vy: rand(0.3, 0.7),
        ph: rand(0, 6.28), amp: rand(0.4, 0.9), fs: rand(0.015, 0.04),
      }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 1;
      const dark = isDarkBg();
      cover.draw(ctx, w, h, 0);
      for (const p of leaves) {
        p.y += p.vy;
        p.x += Math.sin(t * 0.008 * p.amp + p.ph) * 0.6;
        p.rot += p.vr;
        if (p.y > h + 14) { p.y = -14; p.x = Math.random() * w; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(Math.max(0.2, Math.abs(Math.sin(t * p.fs + p.ph))), 1);
        ctx.beginPath();
        ctx.moveTo(0, -p.s * 1.4);
        ctx.bezierCurveTo(p.s, -p.s * 0.5, p.s * 0.7, p.s, 0, p.s * 1.2);
        ctx.bezierCurveTo(-p.s * 0.7, p.s, -p.s, -p.s * 0.5, 0, -p.s * 1.4);
        ctx.fillStyle = `rgba(222, 184, 100, ${dark ? 0.6 : 0.65})`;
        ctx.fill();
        ctx.restore();
      }
      vignette(ctx, w, h, dark ? 0.28 : 0.08);
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },
};

/* 当前主题 id（雾气画师按主题读对应壁纸） */
function currentId() {
  return document.documentElement.dataset.bg || "aurora";
}
