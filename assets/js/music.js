/* ============================================================
   音乐空间：公开歌单数据 + 本地添加/删除（localStorage）+ 播放器渲染
   ============================================================ */
"use strict";

/* ---------------- 公开歌单（想让所有访客听到就加在这里） ----------------
   type: "embed" 粘贴网易云等平台的外链播放器地址
         "audio" 直链音频文件（mp3 / m4a / ogg …，可放 assets/music/ 目录）  */
const MUSIC_LIST = [
  {
    title: "晴天",
    artist: "周杰伦",
    type: "embed",
    src: "https://music.163.com/outchain/player?type=2&id=186016&auto=0&height=66",
    note: "示例歌曲：在下方表单添加你喜欢的音乐，或直接编辑本文件换成自己的歌单。",
  },
];

const MUSIC_KEY = "music.user.v1";       // 自己添加的歌曲
const MUSIC_HIDDEN_KEY = "music.hidden.v1"; // 被删除的内置歌曲（type+src 列表）

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

/* 智能识别音乐链接：
   - 网易云歌曲页 / 音乐外链 → 外链播放器
   - 直接粘贴的 <iframe …> 代码 → 提取其中 src
   - mp3 / m4a / ogg / wav / flac 直链 → 原生播放器 */
function parseMusicLink(raw) {
  const s = String(raw).trim();
  let m;
  if (/^<iframe/i.test(s)) {
    m = s.match(/src=["']([^"']+)["']/i);
    if (m) return { type: "embed", src: m[1] };
  }
  m = s.match(/music\.163\.com.*[?&]id=(\d+)/i);
  if (m) {
    return { type: "embed", src: `https://music.163.com/outchain/player?type=2&id=${m[1]}&auto=0&height=66` };
  }
  m = s.match(/outchain\/player\?/i);
  if (m) return { type: "embed", src: s };
  if (/\.(mp3|m4a|ogg|wav|flac)(\?|#|$)/i.test(s)) return { type: "audio", src: s };
  return null;
}

function initMusicPage() {
  const list = $("#musicList");
  if (!list) return;
  const esc = escapeHTML;

  /* 兼容旧数据：给用户歌曲补 id */
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

  function render() {
    const tracks = allTracks();
    const hiddenCount = loadHiddenTracks().length;
    $("#musicCount").textContent = "· " + tracks.length + " 首";
    $("#musicRestore").hidden = hiddenCount === 0;
    $("#musicEmpty").hidden = tracks.length > 0;
    list.innerHTML = tracks
      .map((t) => {
        const player =
          t.type === "embed"
            ? `<iframe src="${esc(t.src)}" frameborder="no" loading="lazy" allowfullscreen title="${esc(t.title)}"></iframe>`
            : `<audio controls preload="none" src="${esc(t.src)}"></audio>`;
        return `
        <article class="music-item glass-card reveal" data-key="${esc(t.key)}">
          <div class="music-item-head">
            <span class="music-dot" aria-hidden="true"></span>
            <h3>${esc(t.title || "未命名")}</h3>
            ${t.artist ? `<span class="chip">${esc(t.artist)}</span>` : ""}
            <button class="music-del" title="删除这首歌" aria-label="删除歌曲">✕</button>
          </div>
          ${t.note ? `<p class="music-note">${esc(t.note)}</p>` : ""}
          ${player}
        </article>`;
      })
      .join("");
    if (typeof observeReveals === "function") observeReveals();
  }

  list.addEventListener("click", (e) => {
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
      /* 内置歌曲：只在本浏览器隐藏，可随时恢复默认 */
      const hidden = loadHiddenTracks();
      if (!hidden.includes(key)) {
        hidden.push(key);
        saveStore(MUSIC_HIDDEN_KEY, hidden);
        render();
      }
    }
  });

  /* 恢复默认内容：找回被删除的内置歌曲 */
  $("#musicRestore").addEventListener("click", () => {
    saveStore(MUSIC_HIDDEN_KEY, []);
    render();
  });

  $("#musicForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#musicTitle").value.trim();
    const artist = $("#musicArtist").value.trim();
    const link = $("#musicLink").value.trim();
    const parsed = parseMusicLink(link);
    if (!parsed) {
      alert("没有识别出音乐链接：支持网易云音乐歌曲链接/外链代码，或 mp3 等音频直链。");
      return;
    }
    const tracks = userTracks();
    tracks.unshift({
      user: true,
      id: "u" + Date.now() + Math.random().toString(36).slice(2, 7),
      title: title || "未命名",
      artist,
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
