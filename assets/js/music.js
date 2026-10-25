/* ============================================================
   音乐空间：公开歌单数据 + 本地添加（localStorage）+ 播放器渲染
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

const MUSIC_KEY = "music.user.v1";

function loadUserTracks() {
  try {
    const arr = JSON.parse(localStorage.getItem(MUSIC_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveUserTracks(list) {
  try {
    localStorage.setItem(MUSIC_KEY, JSON.stringify(list));
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

  function allTracks() {
    return [...loadUserTracks(), ...MUSIC_LIST];
  }

  function render() {
    const tracks = allTracks();
    $("#musicCount").textContent = "· " + tracks.length + " 首";
    $("#musicEmpty").hidden = tracks.length > 0;
    list.innerHTML = tracks
      .map((t, i) => {
        const player =
          t.type === "embed"
            ? `<iframe src="${esc(t.src)}" frameborder="no" loading="lazy" allowfullscreen title="${esc(t.title)}"></iframe>`
            : `<audio controls preload="none" src="${esc(t.src)}"></audio>`;
        const del = t.user
          ? `<button class="music-del" data-i="${i}" title="删除这首歌" aria-label="删除歌曲">✕</button>`
          : "";
        return `
        <article class="music-item glass-card reveal">
          <div class="music-item-head">
            <span class="music-dot" aria-hidden="true"></span>
            <h3>${esc(t.title || "未命名")}</h3>
            ${t.artist ? `<span class="chip">${esc(t.artist)}</span>` : ""}
            ${del}
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
    const i = +del.dataset.i;
    const tracks = loadUserTracks();
    const removed = tracks.splice(i, 1)[0];
    if (confirm(`删除「${(removed && removed.title) || "未命名"}」？`)) {
      saveUserTracks(tracks);
      render();
    }
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
    const tracks = loadUserTracks();
    tracks.unshift({ user: true, title: title || "未命名", artist, ...parsed });
    if (saveUserTracks(tracks)) {
      $("#musicForm").reset();
      render();
    }
  });

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "music") initMusicPage();
});
