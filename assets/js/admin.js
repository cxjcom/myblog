/* ============================================================
   后台控制台：站主登录 + 资料/文章/相册/音乐 统一管理
   保存通道：本地（dev_server /api/*）自动优先；线上站点走 GitHub API
   ============================================================ */
"use strict";

const ADMIN_HASH = "483fe429f6344a84429517dc0dc11621f88cfc1e41413a444fbdbf2b67a228ee";
const REPO = "cxjcom/myblog";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v == null ? "" : v)
  .replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let PAT = sessionStorage.getItem("adminPat") || "";
let PROFILE = {};
let POSTS = [];
let ALBUM = [];
let MUSIC = [];
let editingPostIdx = -1;

const isLocal = () => ["127.0.0.1", "localhost"].includes(location.hostname);

function setStatus(text, isErr) {
  const el = $("#adminStatus");
  el.textContent = text || "";
  el.style.color = isErr ? "#ff6b6b" : "var(--accent)";
}

async function sha256hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64of(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

async function ghApi(path, opts) {
  const res = await fetch("https://api.github.com/repos/" + REPO + "/contents/" + path, {
    headers: { Authorization: "Bearer " + PAT, Accept: "application/vnd.github+json" },
    ...opts,
  });
  if (!res.ok) throw new Error("GitHub API " + res.status + "：" + (await res.text()).slice(0, 160));
  return res.json();
}

/* 保存数据文件：本地走 /api/*，线上走 GitHub Contents API */
async function saveData(file, obj, msg) {
  const content = JSON.stringify(obj, null, 2) + "\n";
  if (isLocal()) {
    const r = await fetch("/api/" + file.replace(".json", ""), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: content,
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || "保存失败");
    setStatus("✓ " + j.message + (j.pushed ? "，线上 1-2 分钟后生效" : ""));
    return;
  }
  if (!PAT) throw new Error("线上修改需要 GitHub Token：在登录框的「GitHub Token」里填入后重试");
  setStatus("提交到 GitHub 中…");
  let sha;
  try { sha = (await ghApi("data/" + file)).sha; } catch (e) { /* 新文件无 sha */ }
  await ghApi("data/" + file, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg, content: b64of(content), sha, branch: "main" }),
  });
  setStatus("✓ 已提交到 GitHub，1-2 分钟后线上生效");
}

async function uploadImage(name, b64) {
  if (isLocal()) {
    const r = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, b64 }),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || "上传失败");
    setStatus("✓ 图片已上传" + (j.pushed ? "并推送" : ""));
    return j.path;
  }
  if (!PAT) throw new Error("线上上传需要 GitHub Token");
  setStatus("上传图片到 GitHub 中…");
  await ghApi("assets/img/gallery/" + name, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "chore: 上传相册图片（" + name + "）", content: b64, branch: "main" }),
  });
  return "assets/img/gallery/" + name;
}

/* ---------------- 登录 ---------------- */
async function tryLogin() {
  const pwd = $("#adminPwd").value;
  const msg = $("#adminLoginMsg");
  if (!pwd) { msg.textContent = "请输入管理密码"; return; }
  if ((await sha256hex(pwd)) === ADMIN_HASH) {
    sessionStorage.setItem("adminOk", "1");
    PAT = $("#adminPat").value.trim();
    if (PAT) sessionStorage.setItem("adminPat", PAT);
    enterConsole();
  } else {
    msg.textContent = "密码不对哦，再想想";
  }
}

function enterConsole() {
  $("#adminLogin").hidden = true;
  $("#adminConsole").hidden = false;
  loadAll();
}

/* ---------------- 数据加载 ---------------- */
async function loadAll() {
  setStatus("加载中…");
  const bust = "?v=" + Date.now();
  const [pf, po, al, mu] = await Promise.all([
    fetch("data/profile.json" + bust).then((r) => r.json()).catch(() => ({})),
    fetch("data/posts.json" + bust).then((r) => r.json()).catch(() => []),
    fetch("data/album.json" + bust).then((r) => r.json()).catch(() => []),
    fetch("data/music.json" + bust).then((r) => r.json()).catch(() => []),
  ]);
  PROFILE = pf && typeof pf === "object" ? pf : {};
  POSTS = Array.isArray(po) ? po : [];
  ALBUM = Array.isArray(al) ? al : [];
  MUSIC = Array.isArray(mu) ? mu : [];
  renderProfile();
  renderPosts();
  renderAlbum();
  renderMusic();
  setStatus(isLocal() ? "本地模式：保存即写入仓库并推送" : "线上模式：保存通过 GitHub Token 提交");
}

/* ---------------- 个人资料 ---------------- */
const PROFILE_FIELDS = [
  ["siteName", "站点名称", "text"],
  ["name", "昵称", "text"],
  ["motto", "座右铭", "text"],
  ["location", "所在地", "text"],
  ["job", "职业", "text"],
  ["birthday", "生日（YYYY-MM-DD）", "text"],
  ["qq", "QQ", "text"],
  ["wechat", "微信", "text"],
  ["github", "GitHub 用户名", "text"],
  ["email", "邮箱", "text"],
  ["joined", "加入时间", "text"],
  ["avatar", "头像链接（可选）", "text"],
  ["yearGoal", "年度目标篇数", "num"],
];

function renderProfile() {
  const box = $("#profileFields");
  const rows = PROFILE_FIELDS.map(([k, label, type]) => {
    const v = PROFILE[k] == null ? "" : PROFILE[k];
    return `<label class="${k === "bio" || k === "motto" ? "full" : ""}">${esc(label)}
      <input data-k="${k}" data-type="${type}" value="${esc(v)}"></label>`;
  }).join("");
  const tags = (PROFILE.tags || []).join("、");
  box.innerHTML = rows + `
    <label class="full">标签（顿号或逗号分隔）
      <input data-k="tags" data-type="tags" value="${esc(tags)}"></label>
    <label class="full">个人简介
      <textarea data-k="bio" data-type="text" rows="3">${esc(PROFILE.bio || "")}</textarea></label>`;
  return;
}

function collectProfile() {
  const obj = { ...PROFILE };
  $$("#profileFields [data-k]").forEach((el) => {
    const k = el.dataset.k, type = el.dataset.type;
    let v = el.value;
    if (type === "num") v = parseInt(v, 10) || 0;
    if (type === "tags") v = v.split(/[、,，]/).map((x) => x.trim()).filter(Boolean);
    obj[k] = v;
  });
  return obj;
}

/* ---------------- 文章 ---------------- */
function renderPosts() {
  const box = $("#postList");
  box.innerHTML = POSTS.length
    ? POSTS.map((p, i) => `
      <div class="admin-row" data-i="${i}">
        <b style="flex:1;min-width:160px">${esc(p.title || "未命名")}</b>
        <span class="admin-file">${esc(p.date || "")}</span>
        ${p.featured ? '<span class="chip">精选</span>' : ""}
        <button class="btn pe-edit" data-i="${i}">编辑</button>
        <button class="btn admin-danger pe-del" data-i="${i}">删除</button>
      </div>`).join("")
    : '<p class="admin-hint">还没有自定义文章，点「＋ 新建文章」发布第一篇。</p>';
}

function fillPostEditor(p, idx) {
  editingPostIdx = idx;
  $("#postEditor").hidden = false;
  $("#peTitle").value = p.title || "";
  $("#peSlug").value = p.slug || "";
  $("#peDate").value = p.date || new Date().toISOString().slice(0, 10);
  $("#peTags").value = (p.tags || []).join(", ");
  $("#peSummary").value = p.summary || "";
  $("#peFeatured").checked = !!p.featured;
  $("#peBody").value = p.body || "";
}

function peCollect() {
  const body = $("#peBody").value;
  const words = body.replace(/<[^>]+>/g, "").replace(/\s/g, "").length;
  return {
    slug: $("#peSlug").value.trim() || "post-" + Date.now(),
    title: $("#peTitle").value.trim() || "未命名",
    date: $("#peDate").value || new Date().toISOString().slice(0, 10),
    tags: $("#peTags").value.split(/[,，]/).map((x) => x.trim()).filter(Boolean),
    summary: $("#peSummary").value.trim(),
    featured: $("#peFeatured").checked,
    body,
    minutes: Math.max(1, Math.round(words / 400)),
    words,
  };
}

/* ---------------- 相册 ---------------- */
function renderAlbum() {
  const box = $("#albumList");
  box.innerHTML = ALBUM.length
    ? ALBUM.map((p, i) => `
      <div class="admin-row" data-i="${i}">
        <img src="${esc(p.src)}" alt="" loading="lazy"
             onerror="this.style.opacity=.25">
        <input data-i="${i}" data-f="src" value="${esc(p.src)}" placeholder="图片链接" style="flex:1;min-width:180px">
        <input data-i="${i}" data-f="title" value="${esc(p.title || "")}" placeholder="标题">
        <input data-i="${i}" data-f="date" value="${esc(p.date || "")}" placeholder="日期" style="max-width:120px">
        <button class="btn admin-danger al-del" data-i="${i}">删除</button>
      </div>`).join("")
    : '<p class="admin-hint">相册是空的，用下方表单添加照片（链接或上传）。</p>';
}

/* ---------------- 音乐 ---------------- */
function renderMusic() {
  const box = $("#musicAdminList");
  box.innerHTML = MUSIC.length
    ? MUSIC.map((t, i) => `
      <div class="admin-editor" data-i="${i}">
        <div class="admin-row">
          <input data-i="${i}" data-f="title" value="${esc(t.title || "")}" placeholder="歌名" style="flex:1">
          <input data-i="${i}" data-f="artist" value="${esc(t.artist || "")}" placeholder="歌手">
          <button class="btn admin-danger mu-del" data-i="${i}">删除</button>
        </div>
        <input data-i="${i}" data-f="src" value="${esc(t.src || "")}" placeholder="音乐链接（网易云/Apple/B站/mp3 直链）" style="width:100%">
        <textarea data-i="${i}" data-f="lyrics" rows="3" placeholder="歌词（可选）：LRC 或每行一句">${esc(t.lyrics || "")}</textarea>
      </div>`).join("")
    : '<p class="admin-hint">歌单是空的，点「＋ 新增歌曲」。</p>';
}

/* ---------------- 通用：收集行内编辑 ---------------- */
function collectRows(boxSel, target) {
  $$(boxSel + " [data-i][data-f]").forEach((el) => {
    const i = +el.dataset.i;
    if (!target[i]) target[i] = {};
    target[i][el.dataset.f] = el.value;
  });
}

/* ---------------- 事件绑定 ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem("adminOk") === "1") enterConsole();

  $("#adminLoginBtn").addEventListener("click", tryLogin);
  $("#adminPwd").addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });
  $("#adminLogout").addEventListener("click", () => {
    sessionStorage.removeItem("adminOk");
    location.reload();
  });

  $$(".admin-tab").forEach((t) => t.addEventListener("click", () => {
    $$(".admin-tab").forEach((x) => x.classList.toggle("active", x === t));
    $$(".admin-pane").forEach((p) => (p.hidden = p.id !== "pane-" + t.dataset.tab));
  }));

  /* 资料保存 */
  $("#saveProfile").addEventListener("click", async () => {
    try {
      PROFILE = collectProfile();
      await saveData("profile.json", PROFILE, "chore: 更新个人资料（后台）");
      ["profile.v1", "profile.draft.v1"].forEach((k) => localStorage.removeItem(k));
    } catch (e) { setStatus("✕ " + e.message, true); }
  });

  /* 文章 */
  $("#postNew").addEventListener("click", () => fillPostEditor({}, -1));
  $("#postList").addEventListener("click", (e) => {
    const edit = e.target.closest(".pe-edit");
    const del = e.target.closest(".pe-del");
    if (edit) fillPostEditor(POSTS[+edit.dataset.i], +edit.dataset.i);
    if (del && confirm("删除这篇文章？保存全部后才会提交到仓库。")) {
      POSTS.splice(+del.dataset.i, 1);
      renderPosts();
    }
  });
  $("#peSave").addEventListener("click", () => {
    const p = peCollect();
    if (editingPostIdx >= 0 && POSTS[editingPostIdx]) POSTS[editingPostIdx] = p;
    else POSTS.unshift(p);
    editingPostIdx = -1;
    $("#postEditor").hidden = true;
    renderPosts();
    setStatus("文章已存入待保存列表，记得点「保存全部文章」");
  });
  $("#peDelete").addEventListener("click", () => {
    if (editingPostIdx >= 0 && POSTS[editingPostIdx]) {
      POSTS.splice(editingPostIdx, 1);
      editingPostIdx = -1;
      $("#postEditor").hidden = true;
      renderPosts();
    }
  });
  $("#peCancel").addEventListener("click", () => {
    editingPostIdx = -1;
    $("#postEditor").hidden = true;
  });
  $("#savePosts").addEventListener("click", async () => {
    try { await saveData("posts.json", POSTS, "chore: 更新文章（后台）"); }
    catch (e) { setStatus("✕ " + e.message, true); }
  });

  /* 相册 */
  $("#albumList").addEventListener("click", (e) => {
    const del = e.target.closest(".al-del");
    if (del && confirm("删除这张照片？保存相册后才会提交到仓库。")) {
      ALBUM.splice(+del.dataset.i, 1);
      renderAlbum();
    }
  });
  $("#albumList").addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.f && el.dataset.i != null && ALBUM[+el.dataset.i]) {
      ALBUM[+el.dataset.i][el.dataset.f] = el.value;
    }
  });
  $("#alAdd").addEventListener("click", async () => {
    const title = $("#alTitle").value.trim();
    const date = $("#alDate").value || new Date().toISOString().slice(0, 10);
    const file = $("#alFile").files[0];
    try {
      let src = $("#alUrl").value.trim();
      if (file) {
        const b64 = await new Promise((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result).split(",")[1]);
          fr.onerror = rej;
          fr.readAsDataURL(file);
        });
        src = await uploadImage(file.name, b64);
      }
      if (!src) { setStatus("请填图片链接或选择本地图片", true); return; }
      ALBUM.push({ src, title, date });
      $("#alTitle").value = ""; $("#alUrl").value = ""; $("#alFile").value = "";
      renderAlbum();
      setStatus("照片已加入列表，记得点「保存相册」提交到仓库");
    } catch (e) { setStatus("✕ " + e.message, true); }
  });
  $("#saveAlbum").addEventListener("click", async () => {
    collectRows("#albumList", ALBUM);
    try { await saveData("album.json", ALBUM, "chore: 更新相册（后台）"); }
    catch (e) { setStatus("✕ " + e.message, true); }
  });

  /* 音乐 */
  $("#musicAdd").addEventListener("click", () => {
    MUSIC.unshift({ title: "", artist: "", type: "embed", src: "", lyrics: "" });
    renderMusic();
  });
  $("#musicAdminList").addEventListener("click", (e) => {
    const del = e.target.closest(".mu-del");
    if (del && confirm("删除这首歌曲？保存歌单后才会提交到仓库。")) {
      MUSIC.splice(+del.dataset.i, 1);
      renderMusic();
    }
  });
  $("#musicAdminList").addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.f && el.dataset.i != null && MUSIC[+el.dataset.i]) {
      MUSIC[+el.dataset.i][el.dataset.f] = el.value;
    }
  });
  $("#saveMusic").addEventListener("click", async () => {
    collectRows("#musicAdminList", MUSIC);
    MUSIC.forEach((t) => {
      const parsed = typeof parseMusicLink === "function" ? parseMusicLink(t.src || "") : null;
      if (parsed) {
        t.type = parsed.type;
        t.src = parsed.src;
        if (parsed.neteaseId) t.neteaseId = parsed.neteaseId;
      } else if (t.type == null) {
        t.type = "embed";
      }
    });
    try { await saveData("music.json", MUSIC, "chore: 更新歌单（后台）"); }
    catch (e) { setStatus("✕ " + e.message, true); }
  });
});
