/* ============================================================
   文章数据 —— 唯一数据源
   新增文章步骤：
   1. 在 posts/ 目录新建 <slug>.html（可复制 posts/_template.html）
   2. 在下方 POSTS 数组最前面加一条元数据
   列表、搜索、归档、RSS 都会自动更新（RSS 需手动同步 feed.xml）。
   ============================================================ */
window.POSTS = [
  {
    slug: "build-log-2026",
    title: "建站日志：这个博客是怎么长出来的",
    date: "2026-10-26",
    tags: ["随笔", "工具"],
    cover: "g1",
    featured: true,
    minutes: 6,
    words: 1700,
    summary: "三周、53 次提交、32 个版本标签：从一行 HTML 到相册音乐空间与自动部署的完整记录，含翻车与回滚实录。",
    keywords: "建站 博客 git 回滚 github pages 静态站",
  },
  {
    slug: "hello-world",
    title: "你好，世界：我的博客正式开张",
    date: "2026-10-24",
    tags: ["随笔"],
    cover: "g1",
    featured: true,
    minutes: 4,
    words: 1500,
    summary: "搭建这座小站的过程与心情，以及我为什么想在互联网上拥有一个完全属于自己的角落。",
    keywords: "建站 开张 上线 github pages 静态博客",
  },
  {
    slug: "why-i-write",
    title: "为什么我要开始写博客",
    date: "2026-10-18",
    tags: ["随笔", "思考"],
    cover: "g5",
    featured: true,
    minutes: 5,
    words: 1900,
    summary: "写作是思考的显影液。聊聊输出如何倒逼输入，以及我希望坚持写作能带来的三个变化。",
    keywords: "写作 输出 思考 复利 记录",
  },
  {
    slug: "frontend-roadmap",
    title: "2026 前端学习路线（个人重制版）",
    date: "2026-10-10",
    tags: ["技术"],
    cover: "g2",
    featured: false,
    minutes: 7,
    words: 2600,
    summary: "从 HTML/CSS 基础到工程化与 AI 辅助开发，一份我亲测有效、持续更新的前端学习路线图。",
    keywords: "前端 javascript css react 学习路线 入门 教程",
  },
  {
    slug: "productivity-tools",
    title: "我的效率工具箱（2026 版）",
    date: "2026-09-28",
    tags: ["工具"],
    cover: "g4",
    featured: false,
    minutes: 6,
    words: 2100,
    summary: "覆盖笔记、任务、终端与自动化的个人工具清单，以及我挑选工具时遵循的三条原则。",
    keywords: "效率 工具 软件 清单 obsidian vs code 终端",
  },
  {
    slug: "reading-notes",
    title: "秋日读书笔记：最近读完的三本书",
    date: "2026-09-15",
    tags: ["读书"],
    cover: "g3",
    featured: false,
    minutes: 5,
    words: 1800,
    summary: "《置身事内》《夜晚的潜水艇》《纳瓦尔宝典》——三本气质迥异的书，带来三种不同的收获。",
    keywords: "读书 书评 笔记 摘抄",
  },
  {
    slug: "letter-to-future",
    title: "写给一年后的自己",
    date: "2026-09-01",
    tags: ["生活"],
    cover: "g6",
    featured: false,
    minutes: 3,
    words: 1200,
    summary: "一封慢递信：关于健康、创作与勇气的几个约定，明年今日拆封对账。",
    keywords: "目标 计划 年度 慢递 信",
  },
];

/* ============================================================
   自定义文章：仓库 data/posts.json（所有人可见）+ 本机草稿覆盖
   ============================================================ */
const POSTS_ROOT = /\/posts\//.test(location.pathname) ? "../" : "./";
const POSTS_ADDED_KEY = "posts.added.v1";     // 本机未同步的新文章
const POSTS_DELETED_KEY = "posts.deleted.v1"; // 本机删除的仓库文章 slug

function postsLocalAdded() {
  try {
    const arr = JSON.parse(localStorage.getItem(POSTS_ADDED_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function postsLocalDeleted() {
  try {
    const arr = JSON.parse(localStorage.getItem(POSTS_DELETED_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function postsSaveLocal(added, deleted) {
  try { localStorage.setItem(POSTS_ADDED_KEY, JSON.stringify(added)); } catch (e) {}
  try { localStorage.setItem(POSTS_DELETED_KEY, JSON.stringify(deleted)); } catch (e) {}
}
function customPostUrl(slug) {
  return POSTS_ROOT + "post.html?slug=" + encodeURIComponent(slug);
}

/* 把仓库文章与本机覆盖合并进 window.POSTS；列表页等待 POSTS_READY 后再渲染 */
window.POSTS_READY = (async () => {
  let repoPosts = [];
  try {
    const r = await fetch(POSTS_ROOT + "data/posts.json?v=" + Date.now(), { cache: "no-store" });
    if (r.ok) repoPosts = await r.json();
  } catch (e) {}
  /* 防御：缺 slug/title/date 的脏数据直接丢弃，避免排序/渲染报错 */
  window.REPO_POSTS = (Array.isArray(repoPosts) ? repoPosts : []).filter(
    (p) => p && p.slug && p.title && p.date
  );
  const repoSlugs = new Set(window.REPO_POSTS.map((p) => p.slug));
  const deleted = new Set(postsLocalDeleted());
  /* 本机新文章：仓库里已有同 slug 的视为已同步，不再本地叠加 */
  const added = postsLocalAdded().filter((p) => !repoSlugs.has(p.slug));
  const customs = [
    ...added.map((p) => ({ ...p, local: true })),
    ...window.REPO_POSTS.filter((p) => !deleted.has(p.slug)),
  ].map((p) => ({ ...p, custom: true, url: customPostUrl(p.slug) }));
  const byDate = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));
  window.POSTS = [...customs, ...window.POSTS].sort(byDate);
  document.dispatchEvent(new CustomEvent("postsready"));
  return window.POSTS;
})();

/* 站主发布/删除：把完整自定义文章列表推送到仓库（需本地 dev_server） */
async function syncPostsRepo(list) {
  try {
    const r = await fetch(POSTS_ROOT + "api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list),
    });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok && d.ok !== false, pushed: !!d.pushed, message: d.message || "" };
  } catch (e) {
    return { ok: false, pushed: false, message: "" };
  }
}
