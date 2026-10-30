/* ============================================================
   拾光小栈 · 站点脚本（零依赖）
   主题切换 / 全局搜索 / 霓虹装饰层 / 页面渲染 / 文章增强
   ============================================================ */
"use strict";

/* ---------------- 站点配置 ---------------- */
const SITE = {
  name: "拾光小栈",
  motto: "记录、思考与热爱",
  author: "拾光",
  github: "https://github.com/cxjcom",
  email: "hello@example.com", // 换成你自己的邮箱
  rss: "feed.xml",
  // giscus 评论：配置已填好，只差在 https://github.com/apps/giscus 安装 App 到本仓库
  giscus: {
    repo: "cxjcom/myblog",
    repoId: "R_kgDOVVxvMw",
    category: "Announcements",
    categoryId: "DIC_kwDOVVxvM84DJnb_",
  },
};

/* ---------------- 基础工具 ---------------- */
const IN_POSTS_DIR = /\/posts\//.test(location.pathname);
const postUrl = (slug) => (IN_POSTS_DIR ? `${slug}.html` : `posts/${slug}.html`);
const rootUrl = (page) => (IN_POSTS_DIR ? `../${page}` : page);
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const escapeHTML = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const ICONS = {
  search:
    '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  sun: '<svg viewBox="0 0 24 24" class="icon-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" class="icon-moon"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  arrowUp: '<svg viewBox="0 0 24 24"><path d="M12 19V5m-7 7 7-7 7 7"/></svg>',
  heart:
    '<svg viewBox="0 0 24 24"><path d="M19 14c1.5-1.5 2.3-3.2 2.3-5A5.3 5.3 0 0 0 16 3.8c-1.6 0-3 .7-4 2a5.4 5.4 0 0 0-4-2A5.3 5.3 0 0 0 2.7 9c0 1.8.8 3.5 2.3 5l7 7 7-7Z"/></svg>',
  github:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.9 10.9c.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17.3 4.9 18.3 5.2 18.3 5.2c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.6.8.5A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z"/></svg>',
  rss: '<svg viewBox="0 0 24 24"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1" fill="currentColor"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
};

/* ---------------- 装饰层注入 ---------------- */
function initDecor() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div class="cursor-glow" aria-hidden="true"></div>
    <button class="back-top" aria-label="返回顶部" title="返回顶部">${ICONS.arrowUp}</button>
    <div class="search-overlay" role="dialog" aria-modal="true" aria-label="全站搜索">
      <div class="search-panel">
        <div class="search-panel-head">
          ${ICONS.search}
          <input type="text" placeholder="搜索文章标题、摘要、标签…" aria-label="搜索文章"/>
          <span class="kbd">Esc</span>
        </div>
        <div class="search-results"></div>
        <div class="search-foot">
          <span><span class="kbd">↑</span> <span class="kbd">↓</span> 选择</span>
          <span><span class="kbd">Enter</span> 打开</span>
          <span><span class="kbd">Ctrl</span> + <span class="kbd">K</span> 随时唤起</span>
        </div>
      </div>
    </div>`
  );
  initBackdrop();
}

/* ---------------- 霓虹装饰层 ----------------
   固定背景：暗夜网格 + 双色光晕 + 扫描光线，纯 CSS 动效 */
function initBackdrop() {
  $$(".neon-scene").forEach((el) => el.remove());
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="neon-scene" aria-hidden="true">
      <div class="neon-grid"></div>
      <div class="glow-orb o1"></div>
      <div class="glow-orb o2"></div>
      <div class="neon-scan"></div>
    </div>`
  );
}

/* ---------------- 导航悬停：小人接话 ---------------- */
const NAV_REPLIES = {
  home: "欢迎来到我的小站！",
  blog: "这是我的博客文章",
  archive: "这是我的时光机",
  projects: "这是我的项目库",
  links: "这是我的导航收藏",
  about: "这是关于我的故事",
  album: "这是我的相册库",
  music: "这是我的音乐库",
  guestbook: "来给我留言吧！",
  me: "这是我的个人主页",
};
function initNavReply() {
  const say = $("#scSay");
  const sayText = $("#scSayText");
  if (!say || !sayText) return;
  $$(".site-header .nav-links a").forEach((a) => {
    const msg = NAV_REPLIES[a.dataset.page];
    if (!msg) return;
    const show = () => {
      sayText.textContent = msg;
      say.classList.add("is-reply");
    };
    const hide = () => say.classList.remove("is-reply");
    a.addEventListener("mouseenter", show);
    a.addEventListener("mouseleave", hide);
    a.addEventListener("focus", show);
    a.addEventListener("blur", hide);
  });
}

/* ---------------- 主题 ---------------- */
function initTheme() {
  $$(".js-toggle-theme").forEach((btn) =>
    btn.addEventListener("click", () => {
      const dark = document.documentElement.dataset.theme === "dark";
      setTheme(dark ? "light" : "dark");
    })
  );
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {}
}

/* ---------------- 导航 ---------------- */
function initNav() {
  const page = document.body.dataset.page;
  $$(".nav-links a").forEach((a) => {
    if (a.dataset.page === page) a.classList.add("active");
    const href = a.getAttribute("href");
    if (IN_POSTS_DIR && !href.startsWith("../")) a.setAttribute("href", "../" + href);
  });
  const burger = $(".js-toggle-menu");
  const links = $(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", () => links.classList.toggle("open"));
    links.addEventListener("click", (e) => {
      if (e.target.tagName === "A") links.classList.remove("open");
    });
  }
  const year = $("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
}

/* ---------------- 全局搜索 ---------------- */
let searchSelected = -1;
function initSearch() {
  const overlay = $(".search-overlay");
  if (!overlay) return;
  const input = $("input", overlay);
  const resultsBox = $(".search-results", overlay);

  const open = () => {
    overlay.classList.add("open");
    input.value = "";
    renderResults("");
    setTimeout(() => input.focus(), 60);
  };
  const close = () => {
    overlay.classList.remove("open");
    input.blur();
  };

  $$(".js-open-search").forEach((btn) => btn.addEventListener("click", open));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      overlay.classList.contains("open") ? close() : open();
    } else if (e.key === "/" && !typing && !overlay.classList.contains("open")) {
      e.preventDefault();
      open();
    } else if (e.key === "Escape") {
      close();
    }
  });

  input.addEventListener("input", () => renderResults(input.value.trim()));
  input.addEventListener("keydown", (e) => {
    const items = $$(".search-item", resultsBox);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      searchSelected =
        (searchSelected + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle("selected", i === searchSelected));
      items[searchSelected].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && items[searchSelected]) {
      location.href = items[searchSelected].getAttribute("href");
    }
  });

  function renderResults(q) {
    searchSelected = -1;
    const query = q.toLowerCase();
    if (!window.POSTS) return;
    const list = query
      ? window.POSTS.filter(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.summary.toLowerCase().includes(query) ||
            p.tags.some((t) => t.toLowerCase().includes(query)) ||
            (p.keywords || "").toLowerCase().includes(query)
        )
      : [...window.POSTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

    if (!list.length) {
      resultsBox.innerHTML = `<div class="search-empty">没有找到与「${escapeHTML(q)}」相关的文章 🙈</div>`;
      return;
    }
    const label = query ? `共 ${list.length} 条结果` : "最近文章";
    resultsBox.innerHTML =
      `<div class="search-empty" style="padding:10px 14px;text-align:left">${label}</div>` +
      list
        .map((p) => {
          const title = highlight(p.title, q);
          const summary = highlight(p.summary, q);
          return `<a class="search-item" href="${postUrl(p.slug)}">
            <h4>${title}</h4>
            <p>${summary}</p>
            <span class="search-tags">${p.date} · ${p.tags.map(escapeHTML).join(" / ")}</span>
          </a>`;
        })
        .join("");
  }

  function highlight(text, q) {
    const safe = escapeHTML(text);
    if (!q) return safe;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return safe;
    return (
      escapeHTML(text.slice(0, idx)) +
      "<mark>" +
      escapeHTML(text.slice(idx, idx + q.length)) +
      "</mark>" +
      escapeHTML(text.slice(idx + q.length))
    );
  }
}

/* ---------------- 鼠标光晕 ---------------- */
function initCursorGlow() {
  if (reduceMotion || !matchMedia("(pointer: fine)").matches) return;
  const glow = $(".cursor-glow");
  if (!glow) return;
  let x = innerWidth / 2,
    y = innerHeight / 2,
    tx = x,
    ty = y;
  addEventListener("mousemove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
    document.body.classList.add("cursor-ready");
  });
  (function loop() {
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    glow.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(loop);
  })();
}

/* ---------------- 滚动显现 ---------------- */
let revealIO = null;
function observeReveals() {
  if (!revealIO) return;
  $$(".reveal:not(.visible)").forEach((el) => revealIO.observe(el));
}
function initReveal() {
  if (reduceMotion || !("IntersectionObserver" in window)) {
    $$(".reveal").forEach((el) => el.classList.add("visible"));
    return;
  }
  revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("visible");
          revealIO.unobserve(en.target);
        }
      });
    },
    { threshold: 0.08 }
  );
  observeReveals();
}

/* ---------------- 返回顶部 ---------------- */
function initBackTop() {
  const btn = $(".back-top");
  if (!btn) return;
  addEventListener("scroll", () => btn.classList.toggle("show", scrollY > 600), {
    passive: true,
  });
  btn.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
}

/* ---------------- 一言 ---------------- */
const LOCAL_QUOTES = [
  ["把日子过成诗，把代码写成歌。", "拾光"],
  ["种一棵树最好的时间是十年前，其次是现在。", "谚语"],
  ["慢慢来，比较快。", "佚名"],
  ["保持好奇，保持热爱。", "拾光"],
  ["凡是过往，皆为序章。", "莎士比亚"],
  ["热爱可抵岁月漫长。", "佚名"],
];
function initHitokoto() {
  const el = $("#hitokoto");
  if (!el) return;
  const fill = (q) =>
    (el.innerHTML = `<p>${escapeHTML(q[0])}</p><footer>—— ${escapeHTML(q[1])}</footer>`);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  fetch("https://v1.hitokoto.cn/?encode=json", { signal: ctrl.signal })
    .then((r) => r.json())
    .then((d) => {
      clearTimeout(timer);
      fill([d.hitokoto, d.from || "一言"]);
    })
    .catch(() => fill(LOCAL_QUOTES[Math.floor(Math.random() * LOCAL_QUOTES.length)]));
}

/* ---------------- 打字机 ---------------- */
function initTyped() {
  const el = $("#typed");
  if (!el || reduceMotion) {
    if (el && el.dataset.phrases) el.textContent = el.dataset.phrases.split("|")[0];
    return;
  }
  const phrases = (el.dataset.phrases || "").split("|").filter(Boolean);
  if (!phrases.length) return;
  let pi = 0,
    ci = 0,
    deleting = false;
  (function tick() {
    const word = phrases[pi];
    el.textContent = word.slice(0, ci);
    let delay = deleting ? 60 : 130;
    if (!deleting && ci === word.length) {
      delay = 1600;
      deleting = true;
    } else if (deleting && ci === 0) {
      deleting = false;
      pi = (pi + 1) % phrases.length;
      delay = 350;
    } else {
      ci += deleting ? -1 : 1;
    }
    setTimeout(tick, delay);
  })();
}

/* ---------------- 卡片渲染 ---------------- */
function postCard(p, delay = 0, manage = false) {
  const link = p.url || postUrl(p.slug);
  const inner = `
    <div class="post-card-body">
      <div class="post-card-top">
        <span class="chip">${escapeHTML(p.tags[0] || "博文")}</span>
        <time class="post-date" datetime="${p.date}">${p.date}</time>
      </div>
      <h3>${escapeHTML(p.title)}</h3>
      <p class="post-summary">${escapeHTML(p.summary)}</p>
      <div class="post-meta">
        <span>约 ${p.minutes} 分钟</span><span class="dot">·</span><span>${p.words} 字</span>
      </div>
    </div>`;
  if (!manage) {
    return `<a class="post-card reveal" style="--d:${delay}s" href="${link}">${inner}</a>`;
  }
  /* 本机自定义文章：卡片下方带编辑/删除 */
  return `<div class="post-card reveal post-card--manage" style="--d:${delay}s" data-slug="${escapeHTML(p.slug)}">
    <a class="post-card-link" href="${link}">${inner}</a>
    <div class="post-manage">
      <button type="button" class="post-edit" data-edit="${escapeHTML(p.slug)}">编辑</button>
      <button type="button" class="post-del" data-del="${escapeHTML(p.slug)}">删除</button>
    </div>
  </div>`;
}
const byDateDesc = (a, b) => b.date.localeCompare(a.date);

/* ---------------- 首页 ---------------- */
function initHome() {
  if (!window.POSTS) return;
  const featured = $("#featuredGrid");
  if (featured) {
    const feats = window.POSTS.filter((p) => p.featured).slice(0, 2);
    featured.innerHTML = feats.map((p, i) => postCard(p, i * 0.1)).join("");
  }
  const latest = $("#latestGrid");
  if (latest) {
    latest.innerHTML = [...window.POSTS]
      .sort(byDateDesc)
      .slice(0, 3)
      .map((p, i) => postCard(p, i * 0.08))
      .join("");
  }
  const sp = $("#statPosts"), st = $("#statTags"), sw = $("#statWords");
  if (sp) sp.textContent = window.POSTS.length;
  if (st) st.textContent = new Set(window.POSTS.flatMap((p) => p.tags)).size;
  if (sw)
    sw.textContent =
      window.POSTS.reduce((s, p) => s + p.words, 0) >= 10000
        ? (window.POSTS.reduce((s, p) => s + p.words, 0) / 10000).toFixed(1) + "w"
        : window.POSTS.reduce((s, p) => s + p.words, 0);
  observeReveals();
}

/* ---------------- 首页：星系动态（星核呼吸 / 内外双环：彗星·星尘·星体） ---------------- */
function initGalaxyHalo() {
  const host = document.querySelector(".galaxy-float");
  if (!host || reduceMotion) return;
  /* 两条环带轨迹参数均由照片实测：[0] 内环 [1] 外环 */
  const RINGS = [
    { CX: 0.462, CY: 0.489, A: 0.162, B: 0.111, TILT: (38 * Math.PI) / 180 },
    { CX: 0.505, CY: 0.512, A: 0.442, B: 0.333, TILT: (32 * Math.PI) / 180 },
  ].map((r) => ({ ...r, cosT: Math.cos(r.TILT), sinT: Math.sin(r.TILT) }));
  const W = () => host.clientWidth;

  /* 星核呼吸光晕 */
  const glow = document.createElement("span");
  glow.className = "galaxy-core-glow";
  host.appendChild(glow);

  /* 环带彗星：外环金色 / 内环青色，头 + 7 节渐隐拖尾 */
  const comets = [];
  [
    { ring: 1, color: "gold", loop: 92000, phase: 0 },
    { ring: 0, color: "cyan", loop: 52000, phase: 0.42 },
  ].forEach((c) => {
    const parts = [];
    for (let k = 0; k < 8; k++) {
      const s = document.createElement("span");
      s.className = "halo-comet halo-comet--" + c.color;
      host.appendChild(s);
      parts.push(s);
    }
    comets.push({ ring: c.ring, color: c.color, loop: c.loop, phase: c.phase, parts });
  });

  /* 环带星尘：两条环带上各撒 6 颗，按各自节奏闪烁 */
  const TINTS = ["#ffffff", "#ffe6b8", "#bcd9ff", "#e6c9ff"];
  RINGS.forEach((R, ri) => {
    for (let i = 0; i < 6; i++) {
      const s = document.createElement("span");
      const th = (i / 6) * Math.PI * 2 + 0.35 + ri * 0.5;
      const rs = 0.9 + 0.2 * ((i * 7919 + ri * 37) % 100) / 100;
      const x = R.A * rs * Math.cos(th), y = R.B * rs * Math.sin(th);
      s.className = "halo-star" + ((i + ri) % 4 === 0 ? " halo-star--flare" : "");
      s.style.left = (R.CX * W() + x * R.cosT - y * R.sinT).toFixed(1) + "px";
      s.style.top = (R.CY * host.clientHeight + x * R.sinT + y * R.cosT).toFixed(1) + "px";
      s.style.setProperty("--dur", (2.6 + ((i * 13 + ri * 5) % 30) / 10).toFixed(2) + "s");
      s.style.setProperty("--delay", (-((i * 7 + ri * 3) % 40) / 10).toFixed(2) + "s");
      s.style.setProperty("--tint", TINTS[(i + ri) % 4]);
      host.appendChild(s);
    }
  });

  /* 环带星体：外环 4 颗 + 内环 3 颗，绕行时前后遮挡模拟立体轨道 */
  const PLANETS = [
    { ring: 1, cls: "halo-planet--terra",   loop: 105000, phase: 0.10 },
    { ring: 1, cls: "halo-planet--azure",   loop: 128000, phase: 0.50 },
    { ring: 1, cls: "halo-planet--emerald", loop: 152000, phase: 0.80 },
    { ring: 1, cls: "halo-planet--luna",    loop: 180000, phase: 0.30 },
    { ring: 0, cls: "halo-planet--rose",    loop: 46000,  phase: 0.20 },
    { ring: 0, cls: "halo-planet--amber",   loop: 58000,  phase: 0.60 },
    { ring: 0, cls: "halo-planet--ice",     loop: 71000,  phase: 0.85 },
  ];
  const planets = PLANETS.map((p) => {
    const el = document.createElement("span");
    el.className = "halo-planet " + p.cls;
    host.appendChild(el);
    return { ...p, el };
  });

  const t0 = performance.now();
  function frame(t) {
    const w = W(), hgt = host.clientHeight;
    const geo = RINGS.map((R) => ({
      cx: R.CX * w, cy: R.CY * hgt, a: R.A * w, b: R.B * w, cosT: R.cosT, sinT: R.sinT,
    }));
    comets.forEach((c) => {
      const g = geo[c.ring];
      const th = ((t - t0) / c.loop + c.phase) * Math.PI * 2;
      const depth = 0.5 + 0.5 * Math.sin(th);
      c.parts.forEach((el, k) => {
        const tt = th - k * 0.05;
        const x = g.a * Math.cos(tt), y = g.b * Math.sin(tt);
        el.style.transform =
          "translate(" + (g.cx + x * g.cosT - y * g.sinT).toFixed(1) + "px," +
          (g.cy + x * g.sinT + y * g.cosT).toFixed(1) + "px) scale(" + (1 - k * 0.09).toFixed(2) + ")";
        el.style.opacity = ((1 - k / c.parts.length) * (0.3 + 0.7 * depth)).toFixed(2);
      });
    });
    planets.forEach((p) => {
      const g = geo[p.ring];
      const th = ((t - t0) / p.loop + p.phase) * Math.PI * 2;
      const x = g.a * Math.cos(th), y = g.b * Math.sin(th);
      const depth = 0.5 + 0.5 * Math.sin(th);
      p.el.style.transform =
        "translate(" + (g.cx + x * g.cosT - y * g.sinT).toFixed(1) + "px," +
        (g.cy + x * g.sinT + y * g.cosT).toFixed(1) + "px) translate(-50%, -50%) scale(" +
        (0.78 + 0.34 * depth).toFixed(2) + ")";
      p.el.style.opacity = (0.55 + 0.45 * depth).toFixed(2);
      /* 远端从星系背后穿过，近端从星系前面经过 */
      p.el.style.zIndex = depth > 0.5 ? "3" : "-1";
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------------- 博客列表页 ---------------- */
function initBlog() {
  const grid = $("#postGrid");
  if (!grid || !window.POSTS) return;
  const chipsBox = $("#tagChips");
  const searchInput = $("#blogSearch");
  const countEl = $("#postCount");
  const emptyEl = $("#emptyState");
  let activeTag = "全部";

  const tags = ["全部", ...new Set(window.POSTS.flatMap((p) => p.tags))];
  chipsBox.innerHTML = tags
    .map((t) => {
      const n = t === "全部" ? window.POSTS.length : window.POSTS.filter((p) => p.tags.includes(t)).length;
      return `<button class="chip ${t === activeTag ? "active" : ""}" data-tag="${escapeHTML(t)}">${escapeHTML(t)} <span class="chip-count">${n}</span></button>`;
    })
    .join("");

  chipsBox.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tag]");
    if (!btn) return;
    activeTag = btn.dataset.tag;
    $$("button", chipsBox).forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
  if (searchInput) searchInput.addEventListener("input", render);

  function render() {
    const q = (searchInput ? searchInput.value.trim().toLowerCase() : "");
    const list = window.POSTS.filter((p) => {
      const tagOk = activeTag === "全部" || p.tags.includes(activeTag);
      const qOk =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return tagOk && qOk;
    }).sort(byDateDesc);
    grid.innerHTML = list.map((p, i) => postCard(p, i * 0.06, !!p.custom)).join("");
    if (countEl) countEl.textContent = `共 ${list.length} 篇`;
    if (emptyEl) emptyEl.hidden = list.length > 0;
    observeReveals();
  }
  render();

  /* 本机自定义文章：编辑 / 删除 */
  grid.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-del]");
    if (!editBtn && !delBtn) return;
    e.preventDefault();
    e.stopPropagation();
    const slug = (editBtn || delBtn).dataset.edit || (delBtn || editBtn).dataset.del;
    if (editBtn) {
      location.href = rootUrl("write.html") + "?slug=" + encodeURIComponent(slug);
      return;
    }
    const p = window.POSTS.find((x) => x.slug === slug);
    if (!p || !confirm(`删除《${p.title}》？${p.local ? "" : "将同步到仓库，所有人可见的版本会移除。"}`)) return;
    /* 仓库文章：从合并列表中移除并推送；本机草稿：仅本地移除 */
    const deleted = new Set(postsLocalDeleted());
    const added = postsLocalAdded();
    const addedIdx = added.findIndex((x) => x.slug === slug);
    if (addedIdx > -1) added.splice(addedIdx, 1);
    if (!p.local) deleted.add(slug);
    postsSaveLocal(added, [...deleted]);
    if (!p.local) {
      const r = await syncPostsRepo((window.REPO_POSTS || []).filter((x) => x.slug !== slug));
      if (!r.ok) return showToast("已在本机删除；同步到仓库失败（需本地 dev_server.py）", true);
      /* 同步成功：清除对应的本机删除记录（仓库里已不存在） */
      postsSaveLocal(postsLocalAdded(), postsLocalDeleted().filter((s) => s !== slug));
      showToast("✅ 已删除并同步到仓库");
    }
    window.POSTS = window.POSTS.filter((x) => x.slug !== slug);
    render();
  });
}

/* ---------------- 归档页 ---------------- */
function initArchive() {
  const box = $("#timeline");
  if (!box || !window.POSTS) return;
  const sorted = [...window.POSTS].sort(byDateDesc);

  /* 写作热力图：最近 26 周，每天一格 */
  const heat = $("#heatMap");
  if (heat) {
    const byDay = {};
    window.POSTS.forEach((p) => (byDay[p.date] = (byDay[p.date] || 0) + 1));
    const cells = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (26 * 7 - 1 + ((start.getDay() + 6) % 7)));
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const c = byDay[key] || 0;
      cells.push(
        `<span class="heat-cell lv${Math.min(c, 3)}" title="${key}${c ? " · " + c + " 篇" : ""}"></span>`
      );
    }
    heat.innerHTML = cells.join("");
    const totalDays = Object.keys(byDay).length;
    const label = $("#heatLabel");
    if (label) label.textContent = `最近半年 · ${totalDays} 个写作日`;
  }

  const years = {};
  for (const p of sorted) {
    const y = p.date.slice(0, 4);
    (years[y] = years[y] || []).push(p);
  }
  box.innerHTML = Object.entries(years)
    .map(
      ([y, posts]) => `
      <div class="timeline-year">${y} · ${posts.length} 篇</div>
      ${posts
        .map(
          (p) => `<div class="timeline-item">
            <time>${p.date.slice(5).replace("-", " 月 ")} 日</time>
            <a href="${postUrl(p.slug)}">${escapeHTML(p.title)}</a>
            <span class="tl-tags">${p.tags.map((t) => `<span class="chip">${escapeHTML(t)}</span>`).join("")}</span>
          </div>`
        )
        .join("")}`
    )
    .join("");
  const total = sorted.reduce((s, p) => s + p.words, 0);
  const el = $("#archiveStats");
  if (el)
    el.innerHTML = `
      <div class="stat"><b>${sorted.length}</b><span>篇文章</span></div>
      <div class="stat"><b>${(total / 10000).toFixed(1)}w</b><span>累计字数</span></div>
      <div class="stat"><b>${new Set(sorted.flatMap((p) => p.tags)).size}</b><span>个标签</span>`;
}

/* ---------------- 文章页增强 ---------------- */
function initPostPage() {
  const body = $(".post-body");
  if (!body || !window.POSTS) return;
  const meta = window.POSTS.find((p) => p.slug === document.body.dataset.slug);
  const sorted = [...window.POSTS].sort(byDateDesc);
  const idx = sorted.findIndex((p) => p.slug === (meta && meta.slug));

  /* 阅读进度条 */
  const bar = document.createElement("div");
  bar.className = "progress-bar";
  document.body.prepend(bar);
  const updateBar = () => {
    const total = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (total > 0 ? (scrollY / total) * 100 : 0) + "%";
  };
  addEventListener("scroll", updateBar, { passive: true });
  updateBar();

  /* 上一篇 / 下一篇 */
  const nav = $("#prevNext");
  if (nav) {
    const prev = sorted[idx + 1];
    const next = sorted[idx - 1];
    nav.innerHTML = `
      <a href="${prev ? postUrl(prev.slug) : "javascript:void(0)"}" ${prev ? "" : 'aria-disabled="true" style="opacity:.45;pointer-events:none"'}>
        <span class="label">← 上一篇</span><span class="title">${prev ? escapeHTML(prev.title) : "已经是最新一篇啦"}</span>
      </a>
      <a class="next" href="${next ? postUrl(next.slug) : "javascript:void(0)"}" ${next ? "" : 'aria-disabled="true" style="opacity:.45;pointer-events:none"'}>
        <span class="label">下一篇 →</span><span class="title">${next ? escapeHTML(next.title) : "没有更早的文章了"}</span>
      </a>`;
  }

  /* 相关文章（按标签重合度） */
  const rel = $("#relatedGrid");
  if (rel && meta) {
    const related = window.POSTS.filter((p) => p.slug !== meta.slug)
      .map((p) => ({ p, score: p.tags.filter((t) => meta.tags.includes(t)).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || byDateDesc(a.p, b.p))
      .slice(0, 3);
    rel.innerHTML = related.length
      ? related.map((x, i) => postCard(x.p, i * 0.08)).join("")
      : "";
    const wrap = $("#relatedSection");
    if (wrap && !related.length) wrap.hidden = true;
  }

  /* 目录 TOC */
  const toc = $("#toc");
  if (toc) {
    const heads = $$("h2, h3", body);
    if (heads.length < 2) {
      toc.closest(".post-toc").hidden = true;
    } else {
      heads.forEach((h, i) => {
        if (!h.id) h.id = "sec-" + i;
        const a = document.createElement("a");
        a.href = "#" + h.id;
        a.textContent = h.textContent;
        if (h.tagName === "H3") a.classList.add("lv3");
        toc.appendChild(a);
        h.insertAdjacentHTML(
          "beforeend",
          '<a class="h-anchor" href="#' + h.id + '" aria-label="跳转到此节">#</a>'
        );
      });
      const links = $$("a", toc);
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id));
            }
          });
        },
        { rootMargin: "-80px 0px -70% 0px" }
      );
      heads.forEach((h) => io.observe(h));
    }
  }

  /* 代码块：语言标签 + 复制按钮 */
  $$("pre", body).forEach((pre) => {
    const code = $("code", pre);
    const raw = code ? code.innerText : pre.innerText;
    const cls = (code && code.className) || pre.className || "";
    const m = cls.match(/language-([\w+#-]+)/);
    const lang = m ? m[1] : "code";
    const head = document.createElement("div");
    head.className = "code-head";
    head.innerHTML = `<span class="code-lang">${lang}</span><button class="copy-btn" type="button">复制</button>`;
    pre.prepend(head);
    $(".copy-btn", head).addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      try {
        await navigator.clipboard.writeText(raw);
      } catch (err) {
        const ta = document.createElement("textarea");
        ta.value = raw;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      btn.textContent = "已复制 ✓";
      btn.classList.add("done");
      setTimeout(() => {
        btn.textContent = "复制";
        btn.classList.remove("done");
      }, 1800);
    });
  });

  /* 点赞（本地收藏） */
  const like = $(".js-like");
  if (like && meta) {
    const key = "like:" + meta.slug;
    let liked = false;
    try {
      liked = localStorage.getItem(key) === "1";
    } catch (e) {}
    const paint = () => {
      like.classList.toggle("liked", liked);
      like.querySelector("span").textContent = liked ? "已收藏喜欢" : "喜欢这篇";
    };
    paint();
    like.addEventListener("click", () => {
      liked = !liked;
      try {
        liked ? localStorage.setItem(key, "1") : localStorage.removeItem(key);
      } catch (e) {}
      paint();
    });
  }

  /* 分享（复制链接） */
  const share = $(".js-share");
  if (share) {
    share.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        const span = share.querySelector("span");
        const old = span.textContent;
        span.textContent = "链接已复制 ✓";
        setTimeout(() => (span.textContent = old), 1800);
      } catch (e) {}
    });
  }

  /* Giscus 评论区：任意带 #giscusBox 的页面（文章页/留言板）由启动序列统一加载 */
}

/* ---------------- Giscus 评论（文章页 + 留言板共用） ---------------- */
function initGiscus() {
  const box = $("#giscusBox");
  if (!box) return;
  const g = SITE.giscus;
  if (!(g.repo && g.repoId && g.categoryId)) return;
  box.innerHTML = "";
  const s = document.createElement("script");
  s.src = "https://giscus.app/client.js";
  s.setAttribute("data-repo", g.repo);
  s.setAttribute("data-repo-id", g.repoId);
  s.setAttribute("data-category", g.category);
  s.setAttribute("data-category-id", g.categoryId);
  s.setAttribute("data-mapping", "pathname");
  s.setAttribute("data-strict", "0");
  s.setAttribute("data-reactions-enabled", "1");
  s.setAttribute("data-emit-metadata", "0");
  s.setAttribute("data-input-position", "top");
  s.setAttribute("data-theme", "preferred_color_scheme");
  s.setAttribute("data-lang", "zh-CN");
  s.crossOrigin = "anonymous";
  s.async = true;
  box.appendChild(s);
}

/* ---------------- 手气不错：随机读一篇 ---------------- */
function initRandomPost() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-random-post");
    if (!btn || !window.POSTS || !window.POSTS.length) return;
    const p = window.POSTS[Math.floor(Math.random() * window.POSTS.length)];
    location.href = postUrl(p.slug);
  });
}

/* ---------------- 启动 ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initDecor();
  initTheme();
  initNav();
  initSearch();
  initCursorGlow();
  initReveal();
  initBackTop();
  initHitokoto();
  initTyped();
  initGalaxyHalo();
  initPostPage();
  initGiscus();
  initRandomPost();
  initNavReply();
  observeReveals();
  /* 文章列表等待仓库文章合并完成后渲染 */
  (window.POSTS_READY || Promise.resolve()).then(() => {
    initHome();
    initBlog();
    initArchive();
  });
});
