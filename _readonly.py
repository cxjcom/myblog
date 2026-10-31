# -*- coding: utf-8 -*-
"""一次性脚本：前台全站只读化——拆除所有本机编辑层与编辑 UI"""

def rd(p):
    return open(p, encoding="utf-8", newline="").read()

def wr(p, s):
    open(p, "w", encoding="utf-8", newline="").write(s)

# ============ 1) main.js：博客卡片去掉管理按钮 + 删除处理 ============
p = "assets/js/main.js"
s = rd(p)
old = 'grid.innerHTML = list.map((p, i) => postCard(p, i * 0.06, !!p.custom)).join("");'
new = 'grid.innerHTML = list.map((p, i) => postCard(p, i * 0.06)).join("");'
assert old in s, "main manage render"
s = s.replace(old, new)

old_block = '''  render();

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
}'''
new_block = '''  render();
}'''
assert old_block in s, "main manage handler"
s = s.replace(old_block, new_block)
wr(p, s)
print("1) main.js read-only done")

# ============ 2) posts.js：去掉本机增删层 ============
p = "assets/js/posts.js"
s = rd(p)
old_head = '''const POSTS_ROOT = /\\/posts\\//.test(location.pathname) ? "../" : "./";
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
}'''
new_head = '''const POSTS_ROOT = /\\/posts\\//.test(location.pathname) ? "../" : "./";'''
assert old_head in s, "posts head"
s = s.replace(old_head, new_head)

old_merge = '''  const repoSlugs = new Set(window.REPO_POSTS.map((p) => p.slug));
  const deleted = new Set(postsLocalDeleted());
  /* 本机新文章：仓库里已有同 slug 的视为已同步，不再本地叠加 */
  const added = postsLocalAdded().filter((p) => !repoSlugs.has(p.slug));
  const customs = [
    ...added.map((p) => ({ ...p, local: true })),
    ...window.REPO_POSTS.filter((p) => !deleted.has(p.slug)),
  ].map((p) => ({ ...p, custom: true, url: customPostUrl(p.slug) }));'''
new_merge = '''  const customs = window.REPO_POSTS.map((p) => ({ ...p, custom: true, url: customPostUrl(p.slug) }));'''
assert old_merge in s, "posts merge"
s = s.replace(old_merge, new_merge)
wr(p, s)
print("2) posts.js read-only done")

# ============ 3) profile.js：去草稿层 + 拆编辑逻辑 + 心情只读 ============
p = "assets/js/profile.js"
s = rd(p)

old_load = '''function loadProfile() {
  let server = null, draft = null;
  try { server = SERVER_PROFILE; } catch (e) {}
  try { draft = JSON.parse(localStorage.getItem(PROFILE_DRAFT_KEY) || "null"); } catch (e) {}
  return Object.assign({}, PROFILE_DEFAULTS, server || {}, draft || {});
}'''
new_load = '''function loadProfile() {
  let server = null;
  try { server = SERVER_PROFILE; } catch (e) {}
  return Object.assign({}, PROFILE_DEFAULTS, server || {});
}'''
assert old_load in s, "profile load"
s = s.replace(old_load, new_load)

# 删除编辑逻辑块：fillForm .. avatarInput handler（保留末尾 render(); }）
start = s.find("  function fillForm() {")
end_marker = '''    reader.readAsDataURL(file);
    e.target.value = "";
  });

  render();
}'''
end = s.find(end_marker)
assert start != -1 and end != -1, "edit block bounds"
s = s[:start] + "  render();\n}" + s[end + len(end_marker):]

# 心情只读：initMood 重写（无 picker、无点击、读 data/mood.json）
old_mood_start = s.find("function initMood() {")
old_mood_end_marker = '''    render();
  });

  grid.addEventListener("click", (e) => {
    const b = e.target.closest(".mood-day");
    if (!b) return;
    const k = b.dataset.k;
    if (moods[k] === currentMood) delete moods[k];
    else moods[k] = currentMood;
    try { localStorage.setItem(MOOD_KEY, JSON.stringify(moods)); } catch (err) {}
    render();
  });'''
old_mood_end = s.find(old_mood_end_marker)
assert old_mood_start != -1 and old_mood_end != -1, "mood bounds"
new_mood = '''function initMood() {
  const grid = $("#moodGrid");
  if (!grid) return;

  function render(moods) {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const first = new Date(y, m, 1);
    const days = new Date(y, m + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7; /* 周一开头 */
    const key = (d) => y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    const wnames = ["一", "二", "三", "四", "五", "六", "日"];
    let html = wnames.map((w) => `<span class="mood-wn">${w}</span>`).join("");
    for (let i = 0; i < offset; i++) html += "<span></span>";
    for (let d = 1; d <= days; d++) {
      const k = key(d);
      const stamped = moods[k];
      const cls = "mood-day" + (stamped ? " stamped" : "") + (d === now.getDate() ? " today" : "");
      const tint = stamped ? ` style="--tint:${moodTintOf(stamped)}"` : "";
      html += `<span class="${cls}"${tint}>${stamped || d}</span>`;
    }
    grid.innerHTML = html;
    const monthPrefix = y + "-" + String(m + 1).padStart(2, "0");
    const count = Object.keys(moods).filter((k) => k.startsWith(monthPrefix)).length;
    $("#moodMeta").textContent = y + " 年 " + (m + 1) + " 月 · 本月签到 " + count + " 天（由站长在后台更新）";
  }

  render({});
  fetch("data/mood.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((o) => { if (o && typeof o === "object") render(o); })
    .catch(() => {});
}'''
s = s[:old_mood_start] + new_mood + s[old_mood_end + len(old_mood_end_marker):]
wr(p, s)
print("3) profile.js read-only done")

# ============ 4) profile.html：拆编辑表单/编辑按钮/心情选择器 ============
p = "profile.html"
s = rd(p)

old_desc = '''<p>我的资料卡。点击「编辑资料」可以修改头像、昵称和各种信息——保存后立即生效，并同步到首页与品牌印章。</p>'''
new_desc = '''<p>我的资料卡。所有资料在站长后台统一维护，本页面为只读展示。</p>'''
assert old_desc in s, "profile desc"
s = s.replace(old_desc, new_desc)

old_btn = '''            <button class="btn btn-primary" id="editBtn" type="button">
              <svg viewBox="0 0 24 24" class="btn-ico"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 6.5l3 3"/></svg>
              编辑资料
            </button>
'''
assert old_btn in s, "edit btn"
s = s.replace(old_btn, "")

# 编辑视图整块删除：从 <!-- 编辑视图 --> 到对应 </form>
start = s.find("      <!-- 编辑视图 -->")
end_anchor = '<p class="form-note sync-status" id="syncStatus" hidden></p>'
end = s.find(end_anchor)
assert start != -1 and end != -1, "profile form bounds"
s = s[:start] + s[end + len(end_anchor):]

# 心情选择器移除（若存在）
import re
s = re.sub(r'\\s*<div class="mood-picker"[^>]*>.*?</div>', "", s, flags=re.S)
wr(p, s)
print("4) profile.html read-only done")

# ============ 5) blog.html：去掉写文章按钮 ============
p = "blog.html"
s = rd(p)
old_write = '''      <a class="btn btn-primary" href="write.html" style="margin-left:auto;white-space:nowrap">✍️ 写文章</a>
'''
assert old_write in s, "write btn"
s = s.replace(old_write, "")
wr(p, s)
print("5) blog.html done")

# ============ 6) album.js：只渲染 data/album.json，拆上传/恢复 ============
p = "assets/js/album.js"
s = rd(p)
old_all = '''  async function allPhotos() {
    const hidden = new Set(loadHiddenPhotos());
    let users = [];
    try {
      users = await ALBUM_DB.all();
    } catch (e) {
      users = []; /* 存储异常时降级：只展示内置照片 */
    }
    return [
      ...users.map((p) => ({ ...p, key: "u:" + p.id })),
      ...ALBUM_PHOTOS.filter((p) => !hidden.has("d:" + p.src)).map((p) => ({ ...p, key: "d:" + p.src })),
    ];
  }'''
new_all = '''  async function allPhotos() {
    return ALBUM_PHOTOS.map((p) => ({ ...p, key: "d:" + p.src }));
  }'''
assert old_all in s, "album allPhotos"
s = s.replace(old_all, new_all)

# 拆掉上传/链接/恢复三个绑定块
start = s.find('  $("#albumRestore").addEventListener("click", () => {')
end_marker = '''    render();
  });

  migrateAlbum().then(render);'''
end = s.find(end_marker)
assert start != -1 and end != -1, "album bindings bounds"
s = s[:start] + "  migrateAlbum().then(render);" + s[end + len(end_marker):]
wr(p, s)
print("6) album.js read-only done")

# ============ 7) album.html：拆上传表单与恢复按钮 ============
p = "album.html"
s = rd(p)
start = s.find('          <div class="glass-card album-add">')
end_anchor = "</section>"
end = s.find(end_anchor, start)
assert start != -1 and end != -1, "album add section"
s = s[:start] + s[end + len(end_anchor):]
old_restore = '''          <button class="btn" id="albumRestore" hidden>恢复默认内容</button>
'''
assert old_restore in s, "album restore"
s = s.replace(old_restore, "")
wr(p, s)
print("7) album.html done")

# ============ 8) music.js：只渲染 data/music.json，拆表单/删除/记录 ============
p = "assets/js/music.js"
s = rd(p)
old_all = '''  function allTracks() {
    const hidden = new Set(loadHiddenTracks());
    return [...userTracks(), ...(REMOTE_MUSIC || MUSIC_LIST).filter((t) => !hidden.has("d:" + t.type + ":" + t.src))]
      .map((t) => ({ ...t, key: t.user ? "u:" + t.id : "d:" + t.type + ":" + t.src }));
  }'''
new_all = '''  function allTracks() {
    return (REMOTE_MUSIC || MUSIC_LIST).map((t) => ({ ...t, key: "d:" + t.type + ":" + t.src }));
  }'''
assert old_all in s, "music allTracks"
s = s.replace(old_all, new_all)

# render 模板：去掉 ♪ 记录与 ✕ 删除按钮
old_btn = '''            <button class="music-log" title="记入听歌记录" aria-label="记入听歌记录">♪</button>
            <button class="music-del" title="删除这首歌" aria-label="删除歌曲">✕</button>'''
assert old_btn in s, "music item btns"
s = s.replace(old_btn, "")

# click 委托：只保留播放界面分支
old_del = '''    const log = e.target.closest(".music-log");
    if (log) {
      const item = log.closest(".music-item");
      const t = allTracks().find((x) => x.key === item.dataset.key);
      if (t) { recordPlay(t.key, t.title, t.artist); renderHistory(); }
      log.classList.add("done");
      setTimeout(() => log.classList.remove("done"), 800);
      return;
    }
    const del = e.target.closest(".music-del");
    if (!del) return;
    const key = del.closest(".music-item").dataset.key;
    if (key.startsWith("u:")) {
      const id = key.slice(2);
      const tracks = userTracks();
      const removed = tracks.find((t) => t.id === id);
      if (removed && confirm(`删除「${removed.title || "未命名"}」？此操作不可恢复。`)) {
        saveStore(MUSIC_KEY, tracks.filter((t) => t.id !== id));
        render();
      }
    } else {
      const hidden = loadHiddenTracks();
      if (!hidden.includes(key)) {
        hidden.push(key);
        saveStore(MUSIC_HIDDEN_KEY, hidden);
        render();
      }
    }
  });'''
assert old_del in s, "music del"
s = s.replace(old_del, "  });")

# 拆表单提交与恢复绑定
start = s.find('  $("#musicRestore").addEventListener("click", () => {')
end_marker = '''  $("#musicForm").reset();
    render();
  });'''
end = s.find(end_marker)
assert start != -1 and end != -1, "music bindings bounds"
s = s[:start] + s[end + len(end_marker):]
wr(p, s)
print("8) music.js read-only done")

# ============ 9) music.html：拆表单与恢复按钮 ============
p = "music.html"
s = rd(p)
start = s.find('      <section class="section">\n        <div class="glass-card album-add">')
end = s.find("</section>", start)
assert start != -1 and end != -1, "music add section"
s = s[:start] + s[end + len("</section>"):]
old_restore = '''          <button class="btn" id="musicRestore" hidden>恢复默认内容</button>
'''
assert old_restore in s, "music restore"
s = s.replace(old_restore, "")
wr(p, s)
print("9) music.html done")
