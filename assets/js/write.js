/* ============================================================
   写文章：富文本编辑器（文字排版 / 配图 / 视频）+ 草稿 + 发布
   ============================================================ */
"use strict";

/* v1.14.4 的 profile.js 没有 toast，这里兜底一个 */
if (typeof window.showToast !== "function") {
  window.showToast = function (msg, sticky) {
    let box = document.getElementById("siteToast");
    if (!box) {
      box = document.createElement("div");
      box.id = "siteToast";
      document.body.appendChild(box);
    }
    box.textContent = msg;
    box.classList.add("show");
    clearTimeout(window.showToast._t);
    if (!sticky) window.showToast._t = setTimeout(() => box.classList.remove("show"), 3200);
  };
}

const WRITE_DRAFT_KEY = "write.draft.v1";
const WRITE_IMG_MAX = 1280; /* 配图最长边，自动压缩 */

function writeWords(text) {
  return (text || "").replace(/\s/g, "").length;
}

/* 图片压缩为 dataURL */
function writeCompressImage(file, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, WRITE_IMG_MAX / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", 0.82));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

/* 视频链接解析：B站 / YouTube / mp4 直链 → 嵌入 HTML */
function writeParseVideo(raw) {
  const s = String(raw).trim();
  let m;
  if ((m = s.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/i))) {
    return `<div class="post-video"><iframe src="https://player.bilibili.com/player.html?bvid=${m[1]}&autoplay=0&high_quality=1&danmaku=0" scrolling="no" frameborder="no" allowfullscreen loading="lazy"></iframe></div>`;
  }
  if ((m = s.match(/b23\.tv\/([a-zA-Z0-9]+)/i))) {
    return `<div class="post-video"><iframe src="https://player.bilibili.com/player.html?bvid=${m[1]}&autoplay=0&high_quality=1&danmaku=0" scrolling="no" frameborder="no" allowfullscreen loading="lazy"></iframe></div>`;
  }
  if ((m = s.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i)) || (m = s.match(/youtu\.be\/([a-zA-Z0-9_-]+)/i))) {
    return `<div class="post-video"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" frameborder="no" allowfullscreen loading="lazy"></iframe></div>`;
  }
  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(s)) {
    return `<div class="post-video"><video controls preload="metadata" src="${s}"></video></div>`;
  }
  return null;
}

function initWritePage() {
  document.body.dataset.writeInit = "start";
  try {
    initWritePageInner();
    document.body.dataset.writeInit = "done";
  } catch (e) {
    document.body.dataset.writeInit = "ERR:" + e.message;
  }
}

function initWritePageInner() {
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const titleEl = $("#wTitle"), tagsEl = $("#wTags"), dateEl = $("#wDate"),
    summaryEl = $("#wSummary"), bodyEl = $("#wBody"), countEl = $("#wCount"),
    noteEl = $("#wNote"), delBtn = $("#wDelete");

  const params = new URLSearchParams(location.search);
  const editSlug = params.get("slug"); /* 有值 = 编辑已有文章 */
  let currentPost = null;

  dateEl.value = new Date().toISOString().slice(0, 10);

  /* ---------- 工具栏 ---------- */
  function exec(cmd, val) {
    bodyEl.focus();
    if (cmd === "h2" || cmd === "p" || cmd === "blockquote") {
      document.execCommand("formatBlock", false, cmd);
    } else if (cmd === "pre") {
      document.execCommand("formatBlock", false, "pre");
    } else if (cmd === "hr") {
      document.execCommand("insertHorizontalRule");
    } else {
      document.execCommand(cmd, false, val);
    }
    saveDraftSoon();
  }
  $("#wToolbar").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-cmd]");
    if (!b) return;
    const cmd = b.dataset.cmd;
    if (cmd === "image") return $("#wImgFile").click();
    if (cmd === "video") {
      const link = prompt("粘贴视频链接（B站视频页 / YouTube / mp4 直链）：");
      if (!link) return;
      const html = writeParseVideo(link);
      if (!html) return showToast("没有识别出视频链接：支持 B站视频页、YouTube、mp4 直链", true);
      bodyEl.focus();
      document.execCommand("insertHTML", false, html + "<p><br></p>");
      saveDraftSoon();
      return;
    }
    exec(cmd);
  });
  $("#wImgFile").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    writeCompressImage(file, (dataURL) => {
      bodyEl.focus();
      document.execCommand("insertHTML", false, `<img src="${dataURL}" alt="配图"><p><br></p>`);
      saveDraftSoon();
    });
    e.target.value = "";
  });

  /* ---------- 草稿 ---------- */
  let draftTimer = null;
  function saveDraftSoon() {
    updateCount();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      try {
        localStorage.setItem(WRITE_DRAFT_KEY, JSON.stringify(draftData()));
      } catch (e) {}
    }, 500);
  }
  function draftData() {
    return {
      editSlug: editSlug || "",
      title: titleEl.value, tags: tagsEl.value, date: dateEl.value,
      summary: summaryEl.value, body: bodyEl.innerHTML,
      savedAt: Date.now(),
    };
  }
  [titleEl, tagsEl, summaryEl].forEach((el) => el.addEventListener("input", saveDraftSoon));
  dateEl.addEventListener("change", saveDraftSoon);
  bodyEl.addEventListener("input", saveDraftSoon);
  function updateCount() {
    countEl.textContent = writeWords(bodyEl.innerText) + " 字";
  }

  /* ---------- 初始化：编辑已有文章 或 恢复草稿 ---------- */
  (async () => {
    await window.POSTS_READY;
    if (editSlug) {
      const p = (window.POSTS || []).find((x) => x.slug === editSlug);
      if (!p || !p.body) {
        showToast("没有找到这篇自定义文章（内置文章请在仓库里修改）", true);
        setTimeout(() => { location.href = "blog.html"; }, 1200);
        return;
      }
      currentPost = p;
      titleEl.value = p.title;
      tagsEl.value = (p.tags || []).join(", ");
      dateEl.value = p.date;
      summaryEl.value = p.summary || "";
      bodyEl.innerHTML = p.body || "";
      delBtn.hidden = false;
      $("#wPublish").textContent = "保存修改";
      noteEl.textContent = "正在编辑已发布的文章：保存后会同步到仓库，线上所有访客即刻看到新版。";
      localStorage.removeItem(WRITE_DRAFT_KEY); /* 编辑模式下不恢复草稿 */
    } else {
      try {
        const draft = JSON.parse(localStorage.getItem(WRITE_DRAFT_KEY) || "null");
        if (draft && (draft.title || draft.body)) {
          titleEl.value = draft.title || "";
          tagsEl.value = draft.tags || "";
          dateEl.value = draft.date || new Date().toISOString().slice(0, 10);
          summaryEl.value = draft.summary || "";
          bodyEl.innerHTML = draft.body || "";
          noteEl.textContent = "已恢复上次未发布的草稿（" +
            new Date(draft.savedAt).toLocaleString("zh-CN") + "）。";
        }
      } catch (e) {}
    }
    updateCount();
  })();

  /* ---------- 删除 ---------- */
  delBtn.addEventListener("click", async () => {
    if (!currentPost) return;
    if (!confirm(`删除《${currentPost.title}》？此操作不可恢复。`)) return;
    const added = postsLocalAdded();
    const idx = added.findIndex((x) => x.slug === currentPost.slug);
    if (idx > -1) added.splice(idx, 1);
    const deleted = postsLocalDeleted();
    if (!currentPost.local) deleted.push(currentPost.slug);
    postsSaveLocal(added, [...new Set(deleted)]);
    localStorage.removeItem(WRITE_DRAFT_KEY);
    if (!currentPost.local) {
      const list = (window.REPO_POSTS || []).filter((x) => x.slug !== currentPost.slug);
      const r = await syncPostsRepo(list);
      if (!r.ok) return showToast("已在本机删除；同步到仓库失败（需本地 dev_server.py）", true);
      showToast("✅ 已删除并同步到仓库");
    } else {
      showToast("已删除本机草稿");
    }
    setTimeout(() => { location.href = "blog.html"; }, 800);
  });

  /* ---------- 发布 ---------- */
  $("#wBack").addEventListener("click", () => { location.href = "blog.html"; });

  $("#wPublish").addEventListener("click", async () => {
    const title = titleEl.value.trim();
    const body = bodyEl.innerHTML.replace(/<div><br><\/div>$/, "").trim();
    if (!title) return showToast("先写个标题吧", true);
    if (!writeWords(bodyEl.innerText)) return showToast("正文还没有内容", true);

    const tags = tagsEl.value.split(/[,，、]/).map((t) => t.trim()).filter(Boolean).slice(0, 6);
    const words = writeWords(bodyEl.innerText);
    const summary = summaryEl.value.trim() ||
      bodyEl.innerText.replace(/\s+/g, " ").trim().slice(0, 62) + "…";

    const slug = (currentPost && currentPost.slug) ||
      "post-" + (dateEl.value || new Date().toISOString().slice(0, 10)).replaceAll("-", "") +
      "-" + Math.random().toString(36).slice(2, 6);

    const post = {
      slug, title, date: dateEl.value || new Date().toISOString().slice(0, 10),
      tags: tags.length ? tags : ["随笔"],
      summary, minutes: Math.max(1, Math.ceil(words / 400)), words,
      featured: (currentPost && currentPost.featured) || false,
      cover: (currentPost && currentPost.cover) || "g1",
      body,
    };

    /* 组合完整自定义列表：仓库文章 + 本机草稿，应用本次修改 */
    const repo = (window.REPO_POSTS || []).slice();
    let list = [...repo, ...postsLocalAdded()];
    const i = list.findIndex((x) => x.slug === slug);
    if (i > -1) list[i] = post; else list.unshift(post);

    showToast("正在发布…", true);
    const isRepoPost = (window.REPO_POSTS || []).some((y) => y.slug === slug);
    const r = await syncPostsRepo(list);
    if (r.ok) {
      localStorage.removeItem(WRITE_DRAFT_KEY);
      postsSaveLocal([], postsLocalDeleted()); /* 全部已入库，清空本机草稿 */
      showToast(r.pushed ? "✅ 已发布并同步到 GitHub 仓库，线上稍后更新" : "✅ 已保存：" + (r.message || "仓库无变化"));
      setTimeout(() => { location.href = "blog.html"; }, 1200);
    } else if (isRepoPost) {
      showToast("同步到仓库失败（需本地 dev_server.py），修改未保存", true);
    } else {
      /* 新文章/本机草稿：留在本机，列表里仍可见 */
      postsSaveLocal(list.filter((x) => !((window.REPO_POSTS || []).some((y) => y.slug === x.slug))), postsLocalDeleted());
      showToast("💾 已保存在本机浏览器（列表中可见）。要发布给所有访客，请用 scripts/dev_server.py 启动本地站点后重新发布", true);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page === "write") initWritePage();
  });
} else {
  if (document.body.dataset.page === "write") initWritePage();
}
