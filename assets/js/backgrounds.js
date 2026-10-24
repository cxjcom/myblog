/* ============================================================
   拾光小栈 · 背景主题库（零依赖，纯 Canvas/CSS 绘制）
   applyBackground(id) 全局可用；主题页 themes.html 调用。
   ============================================================ */
"use strict";

const REDUCE_BG = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- 主题清单（主题页的数据源） ---------------- */
window.BG_THEMES = [
  { id: "aurora",    cat: "默认",     name: "极光",       desc: "流动的极光与连线粒子，本站默认", swatch: "linear-gradient(135deg,#8b5cf6,#06b6d4 60%,#d946ef)" },
  { id: "matrix",    cat: "科技未来", name: "数字雨",     desc: "下落的字符流，黑客帝国的味道",   swatch: "linear-gradient(160deg,#022c22,#16a34a 70%,#4ade80)" },
  { id: "synth",     cat: "科技未来", name: "霓虹地平线", desc: "合成波透视网格，赛博落日",       swatch: "linear-gradient(180deg,#312e81,#7c3aed 45%,#ec4899 62%,#111827 62.5%)" },
  { id: "circuit",   cat: "科技未来", name: "电路脉冲",   desc: "电路板网格上穿行的光信号",       swatch: "linear-gradient(135deg,#0f172a,#334155 60%,#38bdf8)" },
  { id: "sakura",    cat: "自然",     name: "樱花雨",     desc: "春日花瓣随风飘落",               swatch: "linear-gradient(135deg,#fce7f3,#f9a8d4 55%,#fb7185)" },
  { id: "fireflies", cat: "自然",     name: "萤火虫",     desc: "夏夜林间明明灭灭的光点",         swatch: "linear-gradient(135deg,#052e16,#166534 60%,#facc15)" },
  { id: "clouds",    cat: "自然",     name: "云海",       desc: "缓慢流动的柔软云层",             swatch: "linear-gradient(135deg,#e0f2fe,#bae6fd 55%,#f0f9ff)" },
  { id: "stars",     cat: "宇宙",     name: "星野",       desc: "静谧星空，偶有流星划过",         swatch: "linear-gradient(135deg,#020617,#1e293b 60%,#94a3b8)" },
  { id: "nebula",    cat: "宇宙",     name: "星云",       desc: "深空彩色星云与繁星",             swatch: "linear-gradient(135deg,#4c1d95,#7c3aed 45%,#db2777 80%,#0f172a)" },
  { id: "planet",    cat: "宇宙",     name: "深空行星",   desc: "地平线外升起一颗蓝色行星",       swatch: "linear-gradient(135deg,#020617 45%,#1d4ed8 88%,#93c5fd)" },
];

/* 预设 = CSS 层（极光容器变体）+ Canvas 画师 */
window.BG_PRESETS = {
  aurora:    { css: "",               canvas: "particles" },
  clouds:    { css: "aurora--clouds" },
  nebula:    { css: "aurora--nebula", canvas: "stars" },
  matrix:    { canvas: "matrix" },
  synth:     { canvas: "synth" },
  circuit:   { canvas: "circuit" },
  sakura:    { canvas: "sakura" },
  fireflies: { canvas: "fireflies" },
  stars:     { canvas: "stars" },
  planet:    { canvas: "planet" },
};

/* ---------------- 工具 ---------------- */
/* 画布尺寸跟随自身元素（全屏画布与主题页小预览卡共用同一套画师） */
function bgSize(canvas) {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
}
const isDarkBg = () => document.documentElement.dataset.theme === "dark";
/* 按面积伸缩的粒子数量：全屏与迷你预览都合适 */
function countByArea(w, h, min, max, divisor) {
  return Math.max(min, Math.min(max, Math.round((w * h) / divisor)));
}

/* ---------------- 画师们：传入 canvas/ctx，返回 stop() ---------------- */
window.BG_PAINTERS = {
  /* 连线粒子（默认极光的伙伴） */
  particles(canvas, ctx) {
    let w, h, dots = [], raf;
    const seed = () => {
      const n = countByArea(w, h, 12, 64, 26000);
      dots = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.6,
      }));
    };
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; seed(); };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      const tone = isDarkBg() ? "148, 163, 184" : "99, 102, 241";
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${tone}, ${isDarkBg() ? 0.5 : 0.45})`;
        ctx.fill();
      }
      for (let i = 0; i < dots.length; i++)
        for (let j = i + 1; j < dots.length; j++) {
          const dist = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(${tone}, ${0.16 * (1 - dist / 120)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* 数字雨 */
  matrix(canvas, ctx) {
    const FONT = 14, TRAIL = 14;
    const GLYPHS = "アイウエオカキクケコサシスセソタチツテト0123456789<>/{}[]=+*";
    let w, h, cols = [], raf, tick = 0;
    const resize = () => {
      bgSize(canvas); w = canvas.width; h = canvas.height;
      const n = Math.ceil(w / (FONT + 6));
      cols = Array.from({ length: n }, (_, i) => ({
        x: i * (FONT + 6) + 4,
        y: Math.random() * h,
        v: 1.2 + Math.random() * 2,
        trail: [],
      }));
    };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      tick++;
      const dark = isDarkBg();
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${FONT}px ui-monospace, Consolas, monospace`;
      for (const col of cols) {
        if (tick % 2 === 0) {
          col.trail.push({ y: col.y, ch: GLYPHS[(Math.random() * GLYPHS.length) | 0] });
          if (col.trail.length > TRAIL) col.trail.shift();
          col.y += col.v * 2.4;
          if (col.y > h + TRAIL * FONT) { col.y = -Math.random() * 300; col.trail = []; }
        }
        col.trail.forEach((g, i) => {
          const a = (i + 1) / col.trail.length;
          ctx.fillStyle = dark
            ? `rgba(74, 222, 128, ${0.06 + a * 0.3})`
            : `rgba(22, 128, 61, ${0.05 + a * 0.2})`;
          ctx.fillText(g.ch, col.x, g.y);
        });
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) { ctx.font = `${FONT}px monospace`; ctx.fillStyle = "rgba(22,128,61,.25)"; for (let i = 0; i < 60; i++) ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], Math.random() * canvas.width, Math.random() * canvas.height); }
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* 霓虹地平线（合成波网格） */
  synth(canvas, ctx) {
    let w, h, raf, t = 0;
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 0.55;
      const dark = isDarkBg();
      ctx.clearRect(0, 0, w, h);
      const hy = h * 0.62, vx = w / 2;
      const baseA = dark ? 0.4 : 0.22;
      const glow = ctx.createLinearGradient(0, hy - 46, 0, hy + 6);
      glow.addColorStop(0, "rgba(236, 72, 153, 0)");
      glow.addColorStop(1, dark ? "rgba(236, 72, 153, 0.4)" : "rgba(219, 39, 119, 0.22)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, hy - 46, w, 52);
      ctx.strokeStyle = dark ? "rgba(34, 211, 238, 0.85)" : "rgba(8, 145, 178, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(w, hy); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(168, 85, 247, ${baseA})`;
      for (let i = -14; i <= 14; i++) {
        ctx.beginPath();
        ctx.moveTo(vx + i * w * 0.012, hy);
        ctx.lineTo(vx + i * w * 0.1, h);
        ctx.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const p = ((i + t / 46) % 12) / 12;
        const y = hy + Math.pow(p, 2.2) * (h - hy);
        ctx.strokeStyle = `rgba(168, 85, 247, ${baseA * (0.25 + p * 0.75)})`;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) { t = 0; frame(); cancelAnimationFrame(raf); }
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* 电路脉冲 */
  circuit(canvas, ctx) {
    const GAP = 52;
    let w, h, raf, pulses = [];
    const spawn = () => ({
      horiz: Math.random() < 0.5,
      k: Math.floor(Math.random() * 24),
      pos: Math.random() * Math.max(w, h),
      v: (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 1.3),
      life: 240 + Math.random() * 320,
    });
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      const dark = isDarkBg();
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = dark ? "rgba(148, 163, 184, 0.1)" : "rgba(100, 116, 139, 0.12)";
      ctx.lineWidth = 1;
      for (let x = GAP / 2; x < w; x += GAP) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = GAP / 2; y < h; y += GAP) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      const tone = dark ? "56, 189, 248" : "14, 165, 233";
      for (let i = 0; i < pulses.length; i++) {
        const p = pulses[i];
        p.pos += p.v; p.life--;
        const max = p.horiz ? w : h;
        if (p.life <= 0 || p.pos < -40 || p.pos > max + 40) { pulses[i] = spawn(); continue; }
        const x1 = p.horiz ? p.pos : p.k * GAP + GAP / 2;
        const y1 = p.horiz ? p.k * GAP + GAP / 2 : p.pos;
        const tl = 26;
        const x2 = p.horiz ? p.pos - p.v * tl : x1;
        const y2 = p.horiz ? y1 : p.pos - p.v * tl;
        const grad = ctx.createLinearGradient(x2, y2, x1, y1);
        grad.addColorStop(0, `rgba(${tone}, 0)`);
        grad.addColorStop(1, `rgba(${tone}, 0.7)`);
        ctx.strokeStyle = grad; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1); ctx.stroke();
        const g = ctx.createRadialGradient(x1, y1, 0, x1, y1, 9);
        g.addColorStop(0, `rgba(${tone}, 0.85)`);
        g.addColorStop(1, `rgba(${tone}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x1, y1, 9, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    pulses = Array.from({ length: 10 }, spawn);
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* 樱花雨 */
  sakura(canvas, ctx) {
    let w, h, raf, t = 0, petals = [];
    const seed = () => {
      petals = Array.from({ length: countByArea(w, h, 8, 30, 40000) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        s: 4 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.04,
        vy: 0.4 + Math.random() * 0.9,
        ph: Math.random() * Math.PI * 2, amp: 0.4 + Math.random() * 0.9,
        tone: Math.random() < 0.5 ? "249, 168, 212" : "251, 113, 133",
      }));
    };
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; seed(); };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (const p of petals) {
        p.y += p.vy;
        p.x += Math.sin(t * p.amp + p.ph) * 0.6;
        p.rot += p.vr;
        if (p.y > h + 24) { p.y = -24; p.x = Math.random() * w; }
        if (p.x > w + 24) p.x = -24; else if (p.x < -24) p.x = w + 24;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(0, -p.s);
        ctx.bezierCurveTo(p.s * 0.9, -p.s * 0.4, p.s * 0.7, p.s * 0.7, 0, p.s);
        ctx.bezierCurveTo(-p.s * 0.7, p.s * 0.7, -p.s * 0.9, -p.s * 0.4, 0, -p.s);
        ctx.fillStyle = `rgba(${p.tone}, 0.5)`;
        ctx.fill();
        ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* 萤火虫 */
  fireflies(canvas, ctx) {
    let w, h, raf, t = 0, flies = [];
    const seed = () => {
      flies = Array.from({ length: countByArea(w, h, 8, 22, 45000) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        ang: Math.random() * Math.PI * 2, sp: 0.15 + Math.random() * 0.3,
        ph: Math.random() * Math.PI * 2, bl: 0.02 + Math.random() * 0.03,
      }));
    };
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; seed(); };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t++;
      ctx.clearRect(0, 0, w, h);
      for (const f of flies) {
        f.ang += (Math.random() - 0.5) * 0.12;
        f.x += Math.cos(f.ang) * f.sp;
        f.y += Math.sin(f.ang) * f.sp;
        if (f.x < -20) f.x = w + 20; else if (f.x > w + 20) f.x = -20;
        if (f.y < -20) f.y = h + 20; else if (f.y > h + 20) f.y = -20;
        const a = 0.12 + 0.6 * Math.abs(Math.sin(t * f.bl + f.ph));
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 12);
        g.addColorStop(0, `rgba(250, 204, 21, ${a})`);
        g.addColorStop(1, "rgba(250, 204, 21, 0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, f.y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(254, 240, 138, ${Math.min(1, a + 0.25)})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* 星野（可带流星），也供星云主题复用 */
  stars(canvas, ctx, withShooting = true) {
    let w, h, raf, t = 0, stars = [], meteor = null, next = 240;
    const seed = () => {
      stars = Array.from({ length: countByArea(w, h, 40, 150, 7000) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.3 + Math.random() * 1.2,
        ph: Math.random() * Math.PI * 2, sp: 0.5 + Math.random() * 1.6,
      }));
    };
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; seed(); };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t++;
      ctx.clearRect(0, 0, w, h);
      const dark = isDarkBg();
      for (const s of stars) {
        const a = (dark ? 0.35 : 0.3) + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.02 * s.sp + s.ph));
        ctx.fillStyle = dark ? `rgba(226, 232, 240, ${a})` : `rgba(71, 85, 105, ${a * 0.7})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      if (withShooting) {
        if (!meteor && --next <= 0) {
          meteor = { x: w * 0.2 + Math.random() * w * 0.6, y: Math.random() * h * 0.3, vx: -(4 + Math.random() * 3), vy: 2 + Math.random() * 1.6, life: 42 };
          next = 320 + Math.random() * 420;
        }
        if (meteor) {
          const tailX = meteor.x - meteor.vx * 9, tailY = meteor.y - meteor.vy * 9;
          const g = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
          const ma = dark ? 0.85 : 0.5;
          g.addColorStop(0, "rgba(226, 232, 240, 0)");
          g.addColorStop(1, `rgba(226, 232, 240, ${ma})`);
          ctx.strokeStyle = g; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(meteor.x, meteor.y); ctx.stroke();
          meteor.x += meteor.vx; meteor.y += meteor.vy;
          if (--meteor.life <= 0) meteor = null;
        }
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },

  /* 深空行星 */
  planet(canvas, ctx) {
    let w, h, raf, t = 0, stars = [];
    const seed = () => {
      stars = Array.from({ length: countByArea(w, h, 30, 130, 9000) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.3 + Math.random() * 1.1, ph: Math.random() * Math.PI * 2, sp: 0.5 + Math.random() * 1.4,
      }));
    };
    const resize = () => { bgSize(canvas); w = canvas.width; h = canvas.height; seed(); };
    function frame() {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      t++;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const a = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.02 * s.sp + s.ph));
        ctx.fillStyle = `rgba(226, 232, 240, ${a})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      const R = Math.min(w, h) * 0.24;
      const cx = w * 0.76, cy = h * 0.92;
      const atmo = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.28);
      atmo.addColorStop(0, "rgba(96, 165, 250, 0.5)");
      atmo.addColorStop(1, "rgba(96, 165, 250, 0)");
      ctx.fillStyle = atmo;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2); ctx.fill();
      const body = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.5, R * 0.1, cx, cy, R);
      body.addColorStop(0, "rgba(147, 197, 253, 0.9)");
      body.addColorStop(0.45, "rgba(59, 130, 246, 0.85)");
      body.addColorStop(1, "rgba(23, 37, 84, 0.95)");
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (REDUCE_BG) frame(), cancelAnimationFrame(raf);
    else frame();
    return () => cancelAnimationFrame(raf);
  },
};

/* stars 画师支持参数：预置两个实例名 */
window.BG_PAINTERS.starsShooting = (c, x) => window.BG_PAINTERS.stars(c, x, true);
window.BG_PRESETS.stars.canvas = "starsShooting";
window.BG_PRESETS.nebula.canvas = "starsPlain";
window.BG_PAINTERS.starsPlain = (c, x) => window.BG_PAINTERS.stars(c, x, false);
