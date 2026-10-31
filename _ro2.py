# -*- coding: utf-8 -*-
"""一次性脚本 v2：profile.js 只读化 + HTML/相册/音乐拆编辑（接续 _readonly 已完成的 1-2 步）"""

def rd(p):
    return open(p, encoding="utf-8", newline="").read()

def wr(p, s):
    open(p, "w", encoding="utf-8", newline="").write(s)

# ============ 3) profile.js ============
p = "assets/js/profile.js"
s = rd(p)

# 3a) loadProfile 去草稿层
start = s.find("function loadProfile() {")
end = s.find("\n}", start) + 3  # 取到该函数的收尾 "}"
old_fn = s[start:end]
new_fn = '''function loadProfile() {
  let server = null;
  try { server = SERVER_PROFILE; } catch (e) {}
  return Object.assign({}, PROFILE_DEFAULTS, server || {});
}'''
s = s[:start] + new_fn + s[end:]

# 3b) 拆编辑逻辑块：fillForm .. avatarInput
start = s.find("  function fillForm() {")
end_marker = '    reader.readAsDataURL(file);\n    e.target.value = "";\n  });\n\n  render();\n}'
end = s.find(end_marker)
assert start != -1 and end != -1, "edit block bounds: %d %d" % (start, end)
s = s[:start] + "  render();\n}" + s[end + len(end_marker):]

# 3c) initMood 只读化（整函数替换）
start = s.find("function initMood() {")
end_marker = "/* ---------------- 个人主页/首页：今日天气 + 城市切换 + 三日预报（Open-Meteo） ---------------- */"
end = s.find(end_marker)
assert start != -1 and end != -1, "mood bounds"
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
}

'''
s = s[:start] + new_mood + s[end:]
wr(p, s)
print("3) profile.js read-only done")

# ============ 4) profile.html ============
p = "profile.html"
s = rd(p)
old_desc = "点击「编辑资料」可以修改头像、昵称和各种信息——保存后立即生效，并同步到首页与品牌印章。"
assert old_desc in s, "desc"
s = s.replace(old_desc, "所有资料在站长后台统一维护，本页面为只读展示。")

start = s.find('            <button class="btn btn-primary" id="editBtn" type="button">')
end_marker = "              编辑资料\n            </button>"
end = s.find(end_marker)
assert start != -1 and end != -1, "edit btn"
s = s[:start] + s[end + len(end_marker):]

start = s.find("      <!-- 编辑视图 -->")
end = s.find('<p class="form-note sync-status" id="syncStatus" hidden></p>')
assert start != -1 and end != -1, "form bounds"
s = s[:start] + s[end + len(end_marker):]
wr(p, s)
print("4) profile.html read-only done")

# ============ 5) blog.html ============
p = "blog.html"
s = rd(p)
old_write = '<a class="btn btn-primary" href="write.html" style="margin-left:auto;white-space:nowrap">✍️ 写文章</a>'
assert old_write in s, "write btn"
s = s.replace(old_write, "")
wr(p, s)
print("5) blog.html done")

# ============ 6) album.js ============
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

start = s.find('  $("#albumRestore").addEventListener("click", () => {')
end = s.find("  migrateAlbum().then(render);")
assert start != -1 and end != -1, "album bindings"
s = s[:start] + "  migrateAlbum().then(render);" + s[end + len("  migrateAlbum().then(render);"):]
wr(p, s)
print("6) album.js read-only done")

# ============ 7) album.html ============
p = "album.html"
s = rd(p)
start = s.find('          <div class="glass-card album-add">')
end = s.find("</section>", start)
assert start != -1 and end != -1, "album add"
s = s[:start] + s[end + len("</section>"):]
old_restore = '<button class="btn" id="albumRestore" hidden>恢复默认内容</button>'
assert old_restore in s, "album restore"
s = s.replace(old_restore, "")
wr(p, s)
print("7) album.html done")

# ============ 8) music.js ============
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

old_btn = '''<button class="music-log" title="记入听歌记录" aria-label="记入听歌记录">♪</button>
            <button class="music-del" title="删除这首歌" aria-label="删除歌曲">✕</button>'''
assert old_btn in s, "music btns"
s = s.replace(old_btn, "")

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

start = s.find('  $("#musicRestore").addEventListener("click", () => {')
end = s.find('  $("#musicForm").addEventListener("submit", (e) => {')
assert start != -1 and end != -1, "music binds"
s = s[:start] + s[end:]

# 表单提交处理整块删除（表单将从 HTML 移除）
form_start = s.find('  $("#musicForm").addEventListener("submit", (e) => {')
form_end_marker = '''  render();

  /* 公共歌单数据：后台（data/music.json）到达后重渲染 */'''
form_end = s.find(form_end_marker)
assert form_start != -1 and form_end != -1, "music form bounds"
s = s[:form_start] + form_end_marker[:0] + s[form_end:]
s = s.replace(form_end_marker, form_end_marker, 1)
wr(p, s)
print("8) music.js read-only done")

# ============ 9) music.html ============
p = "music.html"
s = rd(p)
start = s.find('      <section class="section">\n        <div class="glass-card album-add">')
end = s.find("</section>", start)
assert start != -1 and end != -1, "music add"
s = s[:start] + s[end + len("</section>"):]
old_restore = '<button class="btn" id="musicRestore" hidden>恢复默认内容</button>'
assert old_restore in s, "music restore"
s = s.replace(old_restore, "")
wr(p, s)
print("9) music.html done")
