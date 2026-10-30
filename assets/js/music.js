/* ============================================================
   音乐空间：公开歌单 + 本地添加/删除 + 多平台解析 + 听歌记录
   ============================================================ */
"use strict";

/* ---------------- 公开歌单（想让所有访客听到就加在这里） ----------------
   type: "embed" 网易云外链 | "apple" Apple Music | "bili" B 站 | "audio" 音频直链 */
const MUSIC_LIST = [
  {
    title: "The truth that you leave",
    artist: "Pianoboy 高至豪",
    type: "embed",
    src: "https://music.163.com/outchain/player?type=2&id=139774&auto=0&height=66",
    note: "示例歌曲（免登录即可播放）。周杰伦等版权歌曲需登录网易云 VIP 才能听——添加时优先选免登录可播的歌，或把 mp3 放进 assets/music/ 用直链，谁来都能听。",
    lyrics: "（钢琴声轻轻响起）\n夜里适合听一首钢琴曲\nThe truth that you leave\n—— Pianoboy 高至豪\n旋律替我说了想说的话\n（纯音乐 · 请欣赏）",
  },
];

const MUSIC_KEY = "music.user.v1";        // 自己添加的歌曲
const MUSIC_HIDDEN_KEY = "music.hidden.v1"; // 被删除的内置歌曲
const MUSIC_HIST_KEY = "music.history.v1";  // 听歌记录 [{key,title,artist,at}]

function loadUserTracks() {
  try {
    const arr = JSON.parse(localStorage.getItem(MUSIC_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function loadHiddenTracks() {
  try {
    const arr = JSON.parse(localStorage.getItem(MUSIC_HIDDEN_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveStore(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch (e) {
    alert("保存失败：浏览器本地存储空间不足。");
    return false;
  }
}

/* ---------------- 听歌记录 ---------------- */
function loadHistory() {
  try {
    const arr = JSON.parse(localStorage.getItem(MUSIC_HIST_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function recordPlay(key, title, artist) {
  const h = loadHistory();
  /* 同一首 30 秒内不重复记录 */
  if (h[0] && h[0].key === key && Date.now() - h[0].at < 30000) return;
  h.unshift({ key, title, artist, at: Date.now() });
  saveStore(MUSIC_HIST_KEY, h.slice(0, 100));
}

/* ---------------- 链接智能识别 ----------------
   网易云歌曲页/外链代码 → embed；Apple Music → 官方嵌入；
   B 站视频页(BV号) → 官方播放器；mp3 等直链 → 原生播放器 */
function parseMusicLink(raw) {
  const s = String(raw).trim();
  let m;
  if (/^<iframe/i.test(s)) {
    m = s.match(/src=["']([^"']+)["']/i);
    if (m) return { type: "embed", src: m[1] };
  }
  m = s.match(/music\.163\.com.*[?&]id=(\d+)/i);
  if (m) {
    return {
      type: "embed",
      src: `https://music.163.com/outchain/player?type=2&id=${m[1]}&auto=0&height=66`,
      neteaseId: m[1],
    };
  }
  if (/outchain\/player\?/i.test(s)) return { type: "embed", src: s };
  m = s.match(/music\.apple\.com\/(\S+)/i);
  if (m) {
    return { type: "apple", src: "https://embed." + m[0].replace(/[\?"'].*$/, "") };
  }
  m = s.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/i);
  if (m) {
    return {
      type: "bili",
      src: `https://player.bilibili.com/player.html?bvid=${m[1]}&autoplay=0&high_quality=1&danmaku=0`,
    };
  }
  if (/\.(mp3|m4a|ogg|wav|flac)(\?|#|$)/i.test(s)) return { type: "audio", src: s };
  return null;
}

/* 各类型播放器的渲染与卡片高度类 */
const MUSIC_PLAYER = {
  embed: (src, title) => `<iframe src="${src}" frameborder="no" loading="lazy" allowfullscreen title="${title}"></iframe>`,
  apple: (src, title) => `<iframe src="${src}" frameborder="no" loading="lazy" allowfullscreen title="${title}"></iframe>`,
  bili: (src, title) => `<iframe src="${src}" frameborder="no" loading="lazy" allowfullscreen scrolling="no" title="${title}"></iframe>`,
  audio: (src) => `<audio controls preload="none" src="${src}"></audio>`,
};
const MUSIC_H_CLASS = { embed: "", apple: "music-item--h110", bili: "music-item--h210", audio: "" };

let npGetTracks = () => [];

function initMusicPage() {
  const list = $("#musicList");
  if (!list) return;
  npEnsure();
  const esc = escapeHTML;

  function userTracks() {
    const arr = loadUserTracks();
    let dirty = false;
    arr.forEach((t) => {
      if (!t.id) { t.id = "u" + Date.now() + Math.random().toString(36).slice(2, 7); dirty = true; }
    });
    if (dirty) saveStore(MUSIC_KEY, arr);
    return arr;
  }

  function allTracks() {
    const hidden = new Set(loadHiddenTracks());
    return [...userTracks(), ...MUSIC_LIST.filter((t) => !hidden.has("d:" + t.type + ":" + t.src))]
      .map((t) => ({ ...t, key: t.user ? "u:" + t.id : "d:" + t.type + ":" + t.src }));
  }
  npGetTracks = allTracks;

  function trackKeyOf(t) {
    return t.user ? "u:" + t.id : "d:" + t.type + ":" + t.src;
  }

  function render() {
    const tracks = allTracks();
    $("#musicCount").textContent = "· " + tracks.length + " 首";
    $("#musicRestore").hidden = loadHiddenTracks().length === 0;
    $("#musicEmpty").hidden = tracks.length > 0;
    list.innerHTML = tracks
      .map((t) => {
        const render2 = MUSIC_PLAYER[t.type] || MUSIC_PLAYER.embed;
        return `
        <article class="music-item glass-card reveal ${MUSIC_H_CLASS[t.type] || ""}" data-key="${esc(t.key)}">
          <div class="music-item-head">
            <span class="music-dot" aria-hidden="true"></span>
            <h3>${esc(t.title || "未命名")}</h3>
            ${t.artist ? `<span class="chip">${esc(t.artist)}</span>` : ""}
            ${(t.neteaseId || /music\.163\.com.*[?&]id=(\d+)/.test(t.src)) ? `<a class="music-open" href="https://music.163.com/song?id=${(t.neteaseId || (t.src.match(/[?&]id=(\d+)/) || [])[1])}" target="_blank" rel="noopener" title="在网易云打开这首歌">网易云 ↗</a>` : ""}
            <button class="music-play" title="进入播放界面" aria-label="进入播放界面">▶</button>
            <button class="music-log" title="记入听歌记录" aria-label="记入听歌记录">♪</button>
            <button class="music-del" title="删除这首歌" aria-label="删除歌曲">✕</button>
          </div>
          ${t.note ? `<p class="music-note">${esc(t.note)}</p>` : ""}
          ${render2(esc(t.src), esc(t.title || "未命名"))}
        </article>`;
      })
      .join("");
    if (typeof observeReveals === "function") observeReveals();
    renderHistory();
  }

  /* ---------------- 听歌记录面板 ---------------- */
  function renderHistory() {
    const box = $("#musicHistory");
    if (!box) return;
    const h = loadHistory();
    box.hidden = h.length === 0;
    if (!h.length) return;
    const fmt = (ts) => {
      const d = new Date(ts), now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      const hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
      return sameDay ? `今天 ${hh}:${mm}` : `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
    };
    const recent = h.slice(0, 5);
    const counts = {};
    h.forEach((x) => { counts[x.key] = counts[x.key] || { n: 0, title: x.title, artist: x.artist }; counts[x.key].n++; });
    const top = Object.values(counts).sort((a, b) => b.n - a.n).slice(0, 5);
    box.innerHTML = `
      <div class="music-hist glass-card reveal">
        <h3><span class="music-dot"></span>最近播放</h3>
        <ol class="hist-list">${recent.map((x) => `<li><span class="hist-title">${esc(x.title)}</span><time>${fmt(x.at)}</time></li>`).join("")}</ol>
      </div>
      <div class="music-hist glass-card reveal">
        <h3><span class="music-dot"></span>常听排行</h3>
        <ol class="hist-list top">${top.map((x, i) => `<li><b class="hist-rank">${i + 1}</b><span class="hist-title">${esc(x.title)}</span><time>${x.n} 次</time></li>`).join("")}</ol>
      </div>`;
  }

  /* 原生 audio 播放自动记录 */
  list.addEventListener("play", (e) => {
    if (e.target.tagName !== "AUDIO") return;
    const item = e.target.closest(".music-item");
    if (!item) return;
    const t = allTracks().find((x) => x.key === item.dataset.key);
    if (t) { recordPlay(t.key, t.title, t.artist); renderHistory(); }
  }, true);

  /* 手动记一次（外链播放器无法监听，给个按钮） */
  list.addEventListener("click", (e) => {
    const play = e.target.closest(".music-play");
    if (play) {
      const item = play.closest(".music-item");
      const t = allTracks().find((x) => x.key === item.dataset.key);
      if (t) npOpen(t);
      return;
    }
    const log = e.target.closest(".music-log");
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
  });

  $("#musicRestore").addEventListener("click", () => {
    saveStore(MUSIC_HIDDEN_KEY, []);
    render();
  });

  $("#musicForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#musicTitle").value.trim();
    const artist = $("#musicArtist").value.trim();
    const link = $("#musicLink").value.trim();
    const lyrics = $("#musicLyrics") ? $("#musicLyrics").value.trim() : "";
    const parsed = parseMusicLink(link);
    if (!parsed) {
      alert("没有识别出音乐链接：支持网易云 / Apple Music / B 站视频页链接、外链代码，或 mp3 等音频直链。");
      return;
    }
    const tracks = userTracks();
    tracks.unshift({
      user: true,
      id: "u" + Date.now() + Math.random().toString(36).slice(2, 7),
      title: title || (parsed.neteaseId ? "网易云歌曲 " + parsed.neteaseId : "未命名"),
      artist,
      lyrics: lyrics || undefined,
      ...parsed,
    });
    if (saveStore(MUSIC_KEY, tracks)) {
      $("#musicForm").reset();
      render();
    }
  });

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "music") initMusicPage();
});


/* ============================================================
   正在播放：独立播放界面（歌手名片 + 歌词流动）
   ============================================================ */
const npState = { idx: -1, timer: null, audio: null };

function npParseLrc(text) {
  const out = [];
  String(text || "").split(/\r?\n/).forEach((line) => {
    const stamps = [...line.matchAll(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
    const content = line.replace(/\[[^\]]*\]/g, "").trim();
    if (!stamps.length) { if (content) out.push({ t: null, line: content }); return; }
    stamps.forEach((m) => out.push({ t: +m[1] * 60 + +m[2] + (m[3] ? +("0." + m[3]) : 0), line: content }));
  });
  return out.filter((x) => x.line).sort((a, b) => (a.t ?? -1) - (b.t ?? -1));
}

function npEnsure() {
  let ov = $("#npOverlay");
  if (ov) return ov;
  ov = document.createElement("div");
  ov.id = "npOverlay";
  ov.className = "np-overlay";
  ov.hidden = true;
  ov.innerHTML = `
    <div class="np-panel glass-card" role="dialog" aria-modal="true" aria-label="正在播放">
      <button class="np-close" aria-label="关闭播放界面">✕</button>
      <div class="np-main">
        <div class="np-stage">
          <div class="np-disc" aria-hidden="true"><span class="np-disc-core">♪</span></div>
          <div class="np-artist-card glass-card">
            <div class="np-avatar" aria-hidden="true"></div>
            <div class="np-meta">
              <p class="np-artist"></p>
              <h3 class="np-title"></h3>
              <p class="chip np-platform"></p>
            </div>
          </div>
          <div class="np-player"></div>
        </div>
        <div class="np-lyrics-wrap"><div class="np-lyrics"></div></div>
      </div>
      <div class="np-controls">
        <button class="btn" id="npPrev">⏮ 上一首</button>
        <span class="np-hint">Esc 关闭</span>
        <button class="btn" id="npNext">下一首 ⏭</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener("click", (e) => { if (e.target === ov) npClose(); });
  ov.querySelector(".np-close").addEventListener("click", npClose);
  $("#npPrev").addEventListener("click", () => npStep(-1));
  $("#npNext").addEventListener("click", () => npStep(1));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !ov.hidden) npClose();
  });
  return ov;
}

function npStop() {
  if (npState.timer) { clearInterval(npState.timer); npState.timer = null; }
  if (npState.audio) { npState.audio.pause(); npState.audio = null; }
}

function npClose() {
  npStop();
  const ov = $("#npOverlay");
  if (ov) ov.hidden = true;
}

function npPlatformName(t) {
  return { embed: "网易云音乐", apple: "Apple Music", bili: "哔哩哔哩", audio: "本地音频" }[t.type] || "未知来源";
}

function npSetLine(box, wrap, idx) {
  const els = box.querySelectorAll(".np-line");
  els.forEach((el, i) => el.classList.toggle("active", i === idx));
  const el = els[idx];
  if (!el) return;
  const target = el.offsetTop - wrap.clientHeight / 2 + el.clientHeight / 2;
  box.style.transform = `translateY(${-Math.max(0, target)}px)`;
}

function npStartLyrics(track, audio) {
  const box = $(".np-lyrics");
  const wrap = $(".np-lyrics-wrap");
  if (npState.timer) { clearInterval(npState.timer); npState.timer = null; }
  box.style.transform = "translateY(0)";

  const lrc = npParseLrc(track.lyrics);
  if (!lrc.length) {
    box.innerHTML = `
      <div class="np-notes" aria-hidden="true"><span>♪</span><span>♫</span><span>♪</span><span>♩</span></div>
      <p class="np-idle">纯音乐 · 请欣赏</p>`;
    return;
  }

  box.innerHTML = lrc.map((x, i) => `<p class="np-line${i === 0 ? " active" : ""}">${escapeHTML(x.line)}</p>`).join("");
  npSetLine(box, wrap, 0);

  if (audio && lrc.every((x) => x.t !== null)) {
    /* 音频直链 + 带时间戳 LRC：跟随播放进度同步滚动 */
    const onTime = () => {
      const cur = audio.currentTime;
      let idx = 0;
      for (let i = 0; i < lrc.length; i++) if (lrc[i].t <= cur + 0.2) idx = i;
      npSetLine(box, wrap, idx);
    };
    audio.addEventListener("timeupdate", onTime);
    return;
  }
  /* 外链播放器读不到进度：匀速流动 */
  let idx = 0;
  npState.timer = setInterval(() => {
    idx = (idx + 1) % lrc.length;
    npSetLine(box, wrap, idx);
  }, 5500);
}

function npOpen(track) {
  const ov = npEnsure();
  npStop();
  const tracks = npGetTracks();
  npState.idx = Math.max(0, tracks.findIndex((x) => x.key === track.key));

  ov.querySelector(".np-artist").textContent = track.artist || "未知歌手";
  ov.querySelector(".np-title").textContent = track.title || "未命名";
  ov.querySelector(".np-avatar").textContent = (track.artist || track.title || "♪").trim().charAt(0).toUpperCase();
  ov.querySelector(".np-platform").textContent = npPlatformName(track);
  recordPlay(track.key, track.title, track.artist);
  renderHistory();

  const player = ov.querySelector(".np-player");
  let src = track.src || "";
  if (track.type === "embed") src = src.replace(/auto=0/, "auto=1");
  if (track.type === "bili") src = src.replace(/autoplay=0/, "autoplay=1");
  if (track.type === "audio") {
    player.innerHTML = `<audio controls autoplay src="${escapeHTML(src)}"></audio>`;
  } else {
    player.innerHTML = MUSIC_PLAYER[track.type](escapeHTML(src), escapeHTML(track.title || "未命名"));
  }
  npState.audio = player.querySelector("audio") || null;

  npStartLyrics(track, npState.audio);
  ov.hidden = false;
}

function npStep(dir) {
  const tracks = npGetTracks();
  if (!tracks.length) return;
  npOpen(tracks[(npState.idx + dir + tracks.length) % tracks.length]);
}
