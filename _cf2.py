# -*- coding: utf-8 -*-
"""一次性脚本 v2：Cloudflare 接入收尾（album/music/posts/admin）"""

def rd(p):
    return open(p, encoding="utf-8", newline="").read()

def wr(p, s):
    open(p, "w", encoding="utf-8", newline="").write(s)

# ============ album.js ============
p = "assets/js/album.js"
s = rd(p)
if "let ALBUM_PHOTOS" not in s:
    s = s.replace("const ALBUM_PHOTOS = [];", "let ALBUM_PHOTOS = []; /* 公共相册：云端/仓库数据 */")

old_end = "  migrateAlbum().then(render);\n}"
new_end = '''  migrateAlbum().then(render);

  /* 公共相册：云端（Worker）优先，回退仓库 data/album.json */
  (async () => {
    let arr = null;
    try { arr = await cfGet("album"); } catch (e) {}
    if (!Array.isArray(arr)) {
      try {
        const r = await fetch("data/album.json", { cache: "no-store" });
        if (r.ok) arr = await r.json();
      } catch (e) {}
    }
    if (Array.isArray(arr)) { ALBUM_PHOTOS = arr; render(); }
  })();
}'''
assert old_end in s, "album end"
s = s.replace(old_end, new_end)
wr(p, s)
print("album.js done")

# ============ music.js ============
p = "assets/js/music.js"
s = rd(p)
if "REMOTE_MUSIC" not in s:
    old_key = 'const MUSIC_KEY = "music.user.v1";'
    new_key = 'let REMOTE_MUSIC = null; /* 公共歌单：云端/仓库数据 */\nconst MUSIC_KEY = "music.user.v1";'
    assert old_key in s, "music key"
    s = s.replace(old_key, new_key)

old_all = '''  function allTracks() {
    const hidden = new Set(loadHiddenTracks());
    return [...userTracks(), ...MUSIC_LIST.filter((t) => !hidden.has("d:" + t.type + ":" + t.src))]
      .map((t) => ({ ...t, key: t.user ? "u:" + t.id : "d:" + t.type + ":" + t.src }));
  }'''
new_all = '''  function allTracks() {
    return (REMOTE_MUSIC || MUSIC_LIST).map((t) => ({ ...t, key: "d:" + t.type + ":" + t.src }));
  }'''
assert old_all in s, "music allTracks"
s = s.replace(old_all, new_all)

old_end = '''  render();
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "music") initMusicPage();
});'''
new_end = '''  render();

  /* 公共歌单：云端（Worker）优先，回退仓库 data/music.json */
  (async () => {
    let arr = null;
    try { arr = await cfGet("music"); } catch (e) {}
    if (!Array.isArray(arr)) {
      try {
        const r = await fetch("data/music.json", { cache: "no-store" });
        if (r.ok) arr = await r.json();
      } catch (e) {}
    }
    if (Array.isArray(arr)) { REMOTE_MUSIC = arr; render(); }
  })();
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "music") initMusicPage();
});'''
assert old_end in s, "music end"
s = s.replace(old_end, new_end)
wr(p, s)
print("music.js done")

# ============ posts.js ============
p = "assets/js/posts.js"
s = rd(p)
if "cfGet" not in s:
    old = '''  let repoPosts = [];
  try {
    const r = await fetch(POSTS_ROOT + "data/posts.json?v=" + Date.now(), { cache: "no-store" });
    if (r.ok) repoPosts = await r.json();
  } catch (e) {}'''
    new = '''  let repoPosts = [];
  try { repoPosts = (await cfGet("posts")) || []; } catch (e) {}
  if (!repoPosts.length) {
    try {
      const r = await fetch(POSTS_ROOT + "data/posts.json?v=" + Date.now(), { cache: "no-store" });
      if (r.ok) repoPosts = await r.json();
    } catch (e) {}
  }'''
    assert old in s, "posts fetch"
    s = s.replace(old, new)
wr(p, s)
print("posts.js done")

# ============ admin.js ============
p = "assets/js/admin.js"
s = rd(p)

old_mode = '''  $("#adminMode").textContent = isLocal() ? "本地模式 · 保存即推送" : "线上模式 · 需 GitHub Token";'''
new_mode = '''  const mode = window.CLOUD_API ? "云端模式 · 保存全站秒生效"
    : isLocal() ? "本地模式 · 保存即推送" : "线上模式 · 需 GitHub Token";
  $("#adminMode").textContent = mode;'''
if old_mode in s:
    s = s.replace(old_mode, new_mode)

if "await cfSave(" not in s:
    old_save = '''async function saveData(file, obj, msg) {
  const content = JSON.stringify(obj, null, 2) + "\\n";
  if (isLocal()) {'''
    new_save = '''async function saveData(file, obj, msg) {
  const content = JSON.stringify(obj, null, 2) + "\\n";
  const cfToken = sessionStorage.getItem("cfToken");
  if (window.CLOUD_API && cfToken) {
    setStatus("保存到云端…");
    await cfSave(file.replace(".json", ""), obj, cfToken);
    setStatus("✓ 已保存，前台立即生效");
    return;
  }
  if (isLocal()) {'''
    assert old_save in s, "saveData"
    s = s.replace(old_save, new_save)

if 'cfGet("profile")' not in s:
    old_load = '''  const [pf, po, al, mu, mo] = await Promise.all([
    fetch("data/profile.json" + bust).then((r) => r.json()).catch(() => ({})),
    fetch("data/posts.json" + bust).then((r) => r.json()).catch(() => []),
    fetch("data/album.json" + bust).then((r) => r.json()).catch(() => []),
    fetch("data/music.json" + bust).then((r) => r.json()).catch(() => []),
    fetch("data/mood.json" + bust).then((r) => r.json()).catch(() => ({})),
  ]);'''
    new_load = '''  const [pf, po, al, mu, mo] = await Promise.all([
    cfGet("profile").then((v) => v || fetch("data/profile.json" + bust).then((r) => r.json()).catch(() => ({}))),
    cfGet("posts").then((v) => v || fetch("data/posts.json" + bust).then((r) => r.json()).catch(() => [])),
    cfGet("album").then((v) => v || fetch("data/album.json" + bust).then((r) => r.json()).catch(() => [])),
    cfGet("music").then((v) => v || fetch("data/music.json" + bust).then((r) => r.json()).catch(() => [])),
    cfGet("mood").then((v) => v || fetch("data/mood.json" + bust).then((r) => r.json()).catch(() => ({}))),
  ]);'''
    assert old_load in s, "admin loadAll"
    s = s.replace(old_load, new_load)

if "cloudLoginBtn" not in s:
    old_bind = '''  $("#pwdLoginBtn").addEventListener("click", pwdLogin);
  $("#adminPwd").addEventListener("keydown", (e) => { if (e.key === "Enter") pwdLogin(); });'''
    new_bind = '''  $("#pwdLoginBtn").addEventListener("click", pwdLogin);
  $("#adminPwd").addEventListener("keydown", (e) => { if (e.key === "Enter") pwdLogin(); });
  $("#cloudLoginBtn").addEventListener("click", async () => {
    try {
      const token = await cfLogin($("#cloudPass").value);
      sessionStorage.setItem("cfToken", token);
      sessionStorage.setItem("adminOk", "1");
      PAT = $("#adminPat").value.trim();
      if (PAT) sessionStorage.setItem("adminPat", PAT);
      enterConsole();
    } catch (e) { loginMsg("✕ " + e.message, true); }
  });
  $("#cloudPass").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#cloudLoginBtn").click(); });'''
    assert old_bind in s, "cloud bind"
    s = s.replace(old_bind, new_bind)
wr(p, s)
print("admin.js done")

# ============ admin.html ============
p = "admin.html"
s = rd(p)
if "cloudLoginBtn" not in s:
    old_pat = '''      <details class="admin-pat">
        <summary>备用方式：管理密码登录</summary>'''
    new_pat = '''      <details class="admin-pat" open>
        <summary>Cloudflare 云端登录（部署 Worker 后推荐，任何设备可用）</summary>
        <input type="password" id="cloudPass" placeholder="云端后台密码（部署时设置的 ADMIN_PASS）" autocomplete="current-password">
        <button class="btn" id="cloudLoginBtn">云端登录</button>
      </details>

      <details class="admin-pat">
        <summary>备用方式：管理密码登录</summary>'''
    assert old_pat in s, "cloud login ui"
    s = s.replace(old_pat, new_pat)
if "cloud-config.js" not in s:
    old_script = '  <script src="assets/js/music.js?v=2.7.0"></script>'
    new_script = '  <script src="assets/js/cloud-config.js?v=2.8.0"></script>\n  <script src="assets/js/music.js?v=2.7.0"></script>'
    assert old_script in s, "admin script"
    s = s.replace(old_script, new_script)
wr(p, s)
print("admin.html done")
