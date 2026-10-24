/* ============================================================
   拾光小栈 · 站点脚本（零依赖）
   主题切换 / 全站搜索 / 列表渲染 / 文章增强
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
  // 在 https://giscus.app 生成配置后填入，评论区即自动开启
  giscus: {
    repo: "", // 例如 "cxjcom/myblog"
    repoId: "",
    category: "Announcements",
    categoryId: "",
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
const byDateDesc = (a, b) => b.date.localeCompare(a.date);

const ICONS = {
  arrowUp: '<svg viewBox="0 0 24 24"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>',
};

/* ---------------- 公共层注入（返回顶部 / 搜索弹层） ---------------- */
function initDecor() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <button class="back-top" aria-label="返回顶部" title="返回顶部">${ICONS.arrowUp}</button>
    <div class="search-overlay" role="dialog" aria-modal="true" aria-label="全站搜索">
      <div class="search-panel">
        <div class="search-panel-head">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" placeholder="搜索文章标题、摘要、标签…" aria-label="搜索文章"/>
          <span class="kbd">Esc</span>
        </div>
        <div class="search-results"></div>
        <div class="search-foot">
          <span><span class="kbd">↑</span> <span class="kbd">↓</span> 选择</span>
          <span><span class="kbd">Enter</span> 打开</span>
          <span><span class="kbd">Ctrl</span> + <span class="kbd">K</span> 唤起</span>
        </div>
      </div>
    </div>`
  );
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
      : [...window.POSTS].sort(byDateDesc).slice(0, 5);

    if (!list.length) {
      resultsBox.innerHTML = `<div class="search-empty">没有找到与「${escapeHTML(q)}」相关的文章</div>`;
      return;
    }
    const label = query ? `共 ${list.length} 条结果` : "最近文章";
    resultsBox.innerHTML =
      `<div class="search-empty" style="padding:10px 12px;text-align:left">${label}</div>` +
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
    (el.innerHTML = `<p>「${escapeHTML(q[0])}」</p><footer>—— ${escapeHTML(q[1])}</footer>`);
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

/* ---------------- 行式文章渲染 ---------------- */
function postRow(p) {
  return `<li class="row">
    <time datetime="${p.date}">${p.date}</time>
    <div class="row-main">
      <a class="row-title" href="${postUrl(p.slug)}">${escapeHTML(p.title)}</a>
      <p class="row-summary">${escapeHTML(p.summary)}</p>
      <p class="row-meta">${p.tags.map(escapeHTML).join(" · ")} · 约 ${p.minutes} 分钟</p>
    </div>
  </li>`;
}

/* ---------------- 首页 ---------------- */
function initHome() {
  if (!window.POSTS) return;
  const list = $("#recentList");
  if (list) {
    list.innerHTML = [...window.POSTS].sort(byDateDesc).map(postRow).join("");
  }
  const stats = $("#siteStats");
  if (stats) {
    const total = window.POSTS.reduce((s, p) => s + p.words, 0);
    const words = total >= 10000 ? `${(total / 10000).toFixed(1)} 万字` : `${total} 字`;
    const first = [...window.POSTS].sort((a, b) => a.date.localeCompare(b.date))[0];
    stats.textContent = `目前有 ${window.POSTS.length} 篇文章，约 ${words}，从 ${first.date} 写起。`;
  }
}

/* ---------------- 博客列表页 ---------------- */
function initBlog() {
  const grid = $("#postList");
  if (!grid || !window.POSTS) return;
  const filterBox = $("#tagFilter");
  const searchInput = $("#blogSearch");
  const countEl = $("#postCount");
  const emptyEl = $("#emptyState");
  let activeTag = "全部";

  const tags = ["全部", ...new Set(window.POSTS.flatMap((p) => p.tags))];
  filterBox.innerHTML = tags
    .map(
      (t) =>
        `<button type="button" class="${t === activeTag ? "active" : ""}" data-tag="${escapeHTML(t)}">${escapeHTML(t)}</button>`
    )
    .join("");

  filterBox.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tag]");
    if (!btn) return;
    activeTag = btn.dataset.tag;
    $$("button", filterBox).forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
  if (searchInput) searchInput.addEventListener("input", render);

  function render() {
    const q = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const list = window.POSTS.filter((p) => {
      const tagOk = activeTag === "全部" || p.tags.includes(activeTag);
      const qOk =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return tagOk && qOk;
    }).sort(byDateDesc);
    grid.innerHTML = list.map(postRow).join("");
    if (countEl) countEl.textContent = `${list.length} 篇`;
    if (emptyEl) emptyEl.hidden = list.length > 0;
  }
  render();
}

/* ---------------- 归档页 ---------------- */
function initArchive() {
  const box = $("#timeline");
  if (!box || !window.POSTS) return;
  const sorted = [...window.POSTS].sort(byDateDesc);
  const years = {};
  for (const p of sorted) {
    const y = p.date.slice(0, 4);
    (years[y] = years[y] || []).push(p);
  }
  box.innerHTML = Object.entries(years)
    .map(([y, posts]) => {
      const total = posts.reduce((s, p) => s + p.words, 0);
      return `<h2 class="section-title">${y} 年 · ${posts.length} 篇 · 约 ${total} 字</h2>
        <ul class="row-list">${posts
          .map(
            (p) => `<li class="row">
              <time datetime="${p.date}">${p.date.slice(5).replace("-", "-")}</time>
              <div class="row-main">
                <a class="row-title" href="${postUrl(p.slug)}">${escapeHTML(p.title)}</a>
                <p class="row-meta">${p.tags.map(escapeHTML).join(" · ")}</p>
              </div>
            </li>`
          )
          .join("")}</ul>`;
    })
    .join("");
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
      <a href="${prev ? postUrl(prev.slug) : "javascript:void(0)"}" ${prev ? "" : 'aria-disabled="true"'}>
        <span class="label">← 上一篇</span><span class="title">${prev ? escapeHTML(prev.title) : "已经是最新一篇了"}</span>
      </a>
      <a class="next" href="${next ? postUrl(next.slug) : "javascript:void(0)"}" ${next ? "" : 'aria-disabled="true"'}>
        <span class="label">下一篇 →</span><span class="title">${next ? escapeHTML(next.title) : "没有更早的文章了"}</span>
      </a>`;
  }

  /* 相关文章（按标签重合度） */
  const rel = $("#relatedList");
  if (rel && meta) {
    const related = window.POSTS.filter((p) => p.slug !== meta.slug)
      .map((p) => ({ p, score: p.tags.filter((t) => meta.tags.includes(t)).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || byDateDesc(a.p, b.p))
      .slice(0, 3);
    rel.innerHTML = related.length ? `<ul class="row-list">${related.map((x) => postRow(x.p)).join("")}</ul>` : "";
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
      btn.textContent = "已复制";
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
      like.querySelector("span").textContent = liked ? "已收藏" : "喜欢这篇";
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
        span.textContent = "链接已复制";
        setTimeout(() => (span.textContent = old), 1800);
      } catch (e) {}
    });
  }

  /* Giscus 评论区 */
  const box = $("#giscusBox");
  if (box) {
    const g = SITE.giscus;
    if (g.repo && g.repoId && g.categoryId) {
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
    /* 未配置时保留占位提示，不做任何伪装 */
  }
}

/* ---------------- 启动 ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initDecor();
  initTheme();
  initNav();
  initSearch();
  initBackTop();
  initHitokoto();
  initHome();
  initBlog();
  initArchive();
  initPostPage();
});
