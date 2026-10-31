# -*- coding: utf-8 -*-
"""一次性脚本：Cloudflare Worker 接入——配置文件 + 前台云端优先读取 + 后台云端登录"""

def rd(p):
    return open(p, encoding="utf-8", newline="").read()

def wr(p, s):
    open(p, "w", encoding="utf-8", newline="").write(s)

# ============ 1) cloud-config.js ============
cc = '''/* Cloudflare Worker 动态后端接入配置
   部署 Worker 后（见 cloudflare/DEPLOY.md），把你的 Worker 地址填到下一行引号里：
   例如 window.CLOUD_API = "https://blog-api.xxx.workers.dev";
   留空 = 不使用云端（前台回退读仓库 data/*.json，后台走本地服务器） */
window.CLOUD_API = "";

/* 读取（公开） */
window.cfGet = async function (name) {
  if (!window.CLOUD_API) return null;
  try {
    const r = await fetch(window.CLOUD_API + "/api/" + name, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.ok ? j.data : null;
  } catch (e) { return null; }
};

/* 登录（密码换令牌） */
window.cfLogin = async function (password) {
  const r = await fetch(window.CLOUD_API + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.message || "云端登录失败");
  return j.token;
};

/* 保存（需令牌） */
window.cfSave = async function (name, obj, token) {
  const r = await fetch(window.CLOUD_API + "/api/" + name, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ data: obj }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.message || "云端保存失败");
  return true;
};
'''
wr("assets/js/cloud-config.js", cc)
print("cloud-config.js created")

# ============ 2) 所有页面引入 cloud-config.js（profile.js 之前） ============
import glob, re
n = 0
for f in glob.glob("*.html") + glob.glob("posts/*.html"):
    if f in ("private.html", "admin.html"):
        continue
    s = rd(f)
    if "cloud-config.js" in s:
        continue
    prefix = "../" if f.startswith("posts/") else ""
    tag = '<script src="' + prefix + 'assets/js/cloud-config.js?v=2.8.0"></script>\n  '
    m = re.search(r'  <script src="(?:\.\./)?assets/js/profile\.js', s)
    if not m:
        m = re.search(r'  <script src="(?:\.\./)?assets/js/posts\.js', s)
    if not m:
        m = re.search(r'  <script src="(?:\.\./)?assets/js/music\.js', s)
    if m:
        s = s[:m.start()] + tag + s[m.start():]
        wr(f, s)
        n += 1
print("cloud-config included on", n, "pages")

# ============ 3) profile.js：云端优先 ============
p = "assets/js/profile.js"
s = rd(p)
old = '''async function loadServerProfile() {
  try {
    const r = await fetch(SITE_BASE + "data/profile.json?v=" + Date.now(), { cache: "no-store" });
    if (r.ok) SERVER_PROFILE = await r.json();
  } catch (e) {}
  return SERVER_PROFILE;
}'''
new = '''async function loadServerProfile() {
  /* 云端（Worker）优先，回退仓库 data/profile.json */
  try {
    const cloud = await cfGet("profile");
    if (cloud && typeof cloud === "object") { SERVER_PROFILE = cloud; return SERVER_PROFILE; }
  } catch (e) {}
  try {
    const r = await fetch(SITE_BASE + "data/profile.json?v=" + Date.now(), { cache: "no-store" });
    if (r.ok) SERVER_PROFILE = await r.json();
  } catch (e) {}
  return SERVER_PROFILE;
}'''
assert old in s, "profile fetch"
s = s.replace(old, new)

# 心情：云端优先
old_mood = '''  render({});
  fetch("data/mood.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((o) => { if (o && typeof o === "object") render(o); })
    .catch(() => {});'''
new_mood = '''  render({});
  (async () => {
    let o = null;
    try { o = await cfGet("mood"); } catch (e) {}
    if (!o || typeof o !== "object") {
      try {
        const r = await fetch("data/mood.json", { cache: "no-store" });
        if (r.ok) o = await r.json();
      } catch (e) {}
    }
    if (o && typeof o === "object") render(o);
  })();'''
assert old_mood in s, "mood fetch"
s = s.replace(old_mood, new_mood)
wr(p, s)
print("profile.js cloud-first done")

# ============ 4) album.js：云端优先 ============
p = "assets/js/album.js"
s = rd(p)
old = '''  /* 公共相册数据：后台（data/album.json）到达后重渲染 */
  fetch("data/album.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((arr) => {
      if (Array.isArray(arr)) { ALBUM_PHOTOS = arr; render(); }
    })
    .catch(() => {});'''
new = '''  /* 公共相册数据：云端（Worker）优先，回退仓库 data/album.json */
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
  })();'''
assert old in s, "album fetch"
s = s.replace(old, new)
wr(p, s)
print("album.js cloud-first done")

# ============ 5) music.js：云端优先 ============
p = "assets/js/music.js"
s = rd(p)
old = '''  /* 公共歌单：后台（data/music.json）到达后重渲染 */
  fetch("data/music.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((arr) => {
      if (Array.isArray(arr)) { REMOTE_MUSIC = arr; render(); }
    })
    .catch(() => {});'''
new = '''  /* 公共歌单：云端（Worker）优先，回退仓库 data/music.json */
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
  })();'''
assert old in s, "music fetch"
s = s.replace(old, new)
wr(p, s)
print("music.js cloud-first done")

# ============ 6) posts.js：云端优先 ============
p = "assets/js/posts.js"
s = rd(p)
old = '''  let repoPosts = [];
  try {
    const r = await fetch(POSTS_ROOT + "data/posts.json?v=" + Date.now(), { cache: "no-store" });
    if (r.ok) repoPosts = await r.json();
  } catch (e) {}'''
new = '''  let repoPosts = [];
  try { repoPosts = await cfGet("posts") || []; } catch (e) {}
  if (!repoPosts.length) {
    try {
      const r = await fetch(POSTS_ROOT + "data/posts.json?v=" + Date.now(), { cache: "no-store" });
      if (r.ok) repoPosts = await r.json();
    } catch (e) {}
  }'''
assert old in s, "posts fetch"
s = s.replace(old, new)
wr(p, s)
print("posts.js cloud-first done")

# ============ 7) admin.js：云端登录 + 保存通道云端优先 ============
p = "assets/js/admin.js"
s = rd(p)

old_enter = '''  $("#adminMode").textContent = isLocal() ? "本地模式 · 保存即推送" : "线上模式 · 需 GitHub Token";'''
new_enter = '''  const mode = window.CLOUD_API ? "云端模式 · 保存全站秒生效"
    : isLocal() ? "本地模式 · 保存即推送" : "线上模式 · 需 GitHub Token";
  $("#adminMode").textContent = mode;'''
assert old_enter in s, "mode"
s = s.replace(old_enter, new_enter)

# saveData：云端通道最优先
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

# loadAll：每类数据云端优先
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

# 云端登录绑定
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
print("admin.js cloud login done")

# ============ 8) admin.html：云端登录区 + 引入 cloud-config ============
p = "admin.html"
s = rd(p)
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

old_script = '  <script src="assets/js/music.js?v=2.7.0"></script>'
new_script = '  <script src="assets/js/cloud-config.js?v=2.8.0"></script>\n  <script src="assets/js/music.js?v=2.7.0"></script>'
assert old_script in s, "admin script"
s = s.replace(old_script, new_script)
wr(p, s)
print("admin.html cloud login done")
