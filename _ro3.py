# -*- coding: utf-8 -*-
"""一次性脚本 v3：album.html 拆上传区 + music.js/music.html 只读化（收尾）"""

def rd(p):
    return open(p, encoding="utf-8", newline="").read()

def wr(p, s):
    open(p, "w", encoding="utf-8", newline="").write(s)

# ============ 7) album.html：拆上传表单与恢复按钮 ============
p = "album.html"
s = rd(p)
start = s.find('        <div class="glass-card album-add">')
sec_start = s.rfind('      <section class="section">', 0, start)
end = s.find("</section>", start)
assert start != -1 and sec_start != -1 and end != -1, "album add bounds"
s = s[:sec_start] + s[end + len("</section>"):]
old_restore = '<button class="btn" id="albumRestore" hidden>恢复默认内容</button>'
assert old_restore in s, "album restore"
s = s.replace(old_restore, "")
# 页头说明同步更新
s = s.replace("照片增删都保存在当前浏览器的 IndexedDB 里", "相册由站长在后台维护")
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

form_start = s.find('  $("#musicForm").addEventListener("submit", (e) => {')
form_end = s.find('  render();\n\n  /* 公共歌单数据')
assert form_start != -1 and form_end != -1, "music form bounds"
s = s[:form_start] + s[form_end:]
wr(p, s)
print("8) music.js done")

# ============ 9) music.html ============
p = "music.html"
s = rd(p)
start = s.find('        <div class="glass-card album-add">')
sec_start = s.rfind('      <section class="section">', 0, start)
end = s.find("</section>", start)
assert start != -1 and sec_start != -1 and end != -1, "music add bounds"
s = s[:sec_start] + s[end + len("</section>"):]
old_restore = '<button class="btn" id="musicRestore" hidden>恢复默认内容</button>'
assert old_restore in s, "music restore"
s = s.replace(old_restore, "")
wr(p, s)
print("9) music.html done")
