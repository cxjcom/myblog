/* ============================================================
   相册空间：公开照片数据 + 本地添加/删除（localStorage）+ 瀑布流 + 灯箱
   ============================================================ */
"use strict";

/* ---------------- 公开照片（想让所有访客看到就加在这里） ----------------
   把图片文件放进 assets/img/gallery/，然后加一行：
   { src: "assets/img/gallery/xxx.jpg", title: "标题", date: "2026-10-26" }, */
const ALBUM_PHOTOS = [
  { src: "assets/img/bg/nebula.jpg",    title: "星云深处",   date: "2026-10-24" },
  { src: "assets/img/bg/aurora.jpg",    title: "极光之夜",   date: "2026-10-24" },
  { src: "assets/img/bg/sakura.jpg",    title: "樱花季节",   date: "2026-10-24" },
  { src: "assets/img/bg/fireflies.jpg", title: "萤火虫森林", date: "2026-10-24" },
  { src: "assets/img/bg/stars.jpg",     title: "满天星野",   date: "2026-10-24" },
  { src: "assets/img/bg/planet.jpg",    title: "遥远行星",   date: "2026-10-24" },
];

const ALBUM_KEY = "album.user.v1";    // 自己添加的照片
const ALBUM_HIDDEN_KEY = "album.hidden.v1"; // 被删除的内置照片（src 列表）

function loadUserPhotos() {
  try {
    const arr = JSON.parse(localStorage.getItem(ALBUM_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function loadHiddenPhotos() {
  try {
    const arr = JSON.parse(localStorage.getItem(ALBUM_HIDDEN_KEY) || "[]");
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
    alert("保存失败：浏览器本地存储空间不足，试试换小一点的图片。");
    return false;
  }
}

/* 图片文件压缩为 dataURL（最长边 1280），控制本地存储体积 */
function compressImageFile(file, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1280;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
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

function initAlbumPage() {
  const grid = $("#albumGrid");
  if (!grid) return;
  const esc = escapeHTML;

  /* 兼容旧数据：给用户照片补 id */
  function userPhotos() {
    const list = loadUserPhotos();
    let dirty = false;
    list.forEach((p) => {
      if (!p.id) { p.id = "u" + Date.now() + Math.random().toString(36).slice(2, 7); dirty = true; }
    });
    if (dirty) saveStore(ALBUM_KEY, list);
    return list;
  }

  function allPhotos() {
    const hidden = new Set(loadHiddenPhotos());
    return [...userPhotos(), ...ALBUM_PHOTOS.filter((p) => !hidden.has("d:" + p.src))]
      .map((p) => ({ ...p, key: p.user ? "u:" + p.id : "d:" + p.src }));
  }

  function render() {
    const list = allPhotos();
    const hiddenCount = loadHiddenPhotos().length;
    $("#albumCount").textContent = "· " + list.length + " 张";
    $("#albumRestore").hidden = hiddenCount === 0;
    $("#albumEmpty").hidden = list.length > 0;
    grid.innerHTML = list
      .map((p) => {
        return `
        <figure class="album-item reveal" data-key="${esc(p.key)}">
          <img src="${esc(p.src)}" alt="${esc(p.title || "照片")}" loading="lazy">
          <figcaption>
            <span class="album-title">${esc(p.title || "未命名")}</span>
            ${p.date ? `<span class="album-date">${esc(p.date)}</span>` : ""}
            <button class="album-del" title="删除这张照片" aria-label="删除照片">✕</button>
          </figcaption>
        </figure>`;
      })
      .join("");
    if (typeof observeReveals === "function") observeReveals();
  }

  /* 灯箱 */
  const box = $("#lightbox");
  function openLightbox(p) {
    $("#lightboxImg").src = p.src;
    $("#lightboxCap").textContent = (p.title || "未命名") + (p.date ? " · " + p.date : "");
    box.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    box.hidden = true;
    document.body.style.overflow = "";
  }
  box.addEventListener("click", (e) => {
    if (e.target === box || e.target.closest(".lightbox-x")) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !box.hidden) closeLightbox();
  });

  grid.addEventListener("click", (e) => {
    const del = e.target.closest(".album-del");
    if (del) {
      e.stopPropagation();
      const key = del.closest(".album-item").dataset.key;
      if (key.startsWith("u:")) {
        const id = key.slice(2);
        const list = userPhotos();
        const removed = list.find((p) => p.id === id);
        if (removed && confirm(`删除「${removed.title || "未命名"}」？此操作不可恢复。`)) {
          saveStore(ALBUM_KEY, list.filter((p) => p.id !== id));
          render();
        }
      } else {
        /* 内置照片：只在本浏览器隐藏，可随时恢复默认 */
        const hidden = loadHiddenPhotos();
        if (!hidden.includes(key)) {
          hidden.push(key);
          saveStore(ALBUM_HIDDEN_KEY, hidden);
          render();
        }
      }
      return;
    }
    const item = e.target.closest(".album-item");
    if (item) {
      const p = allPhotos().find((x) => x.key === item.dataset.key);
      if (p) openLightbox(p);
    }
  });

  /* 恢复默认内容：找回被删除的内置照片 */
  $("#albumRestore").addEventListener("click", () => {
    saveStore(ALBUM_HIDDEN_KEY, []);
    render();
  });

  /* 文件上传（可多选） */
  $("#albumFile").addEventListener("change", (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    let pending = files.length;
    files.forEach((file) => {
      compressImageFile(file, (dataURL) => {
        const list = userPhotos();
        list.unshift({
          user: true,
          id: "u" + Date.now() + Math.random().toString(36).slice(2, 7),
          src: dataURL,
          title: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 30) || "我的照片",
          date: new Date().toISOString().slice(0, 10),
        });
        if (saveStore(ALBUM_KEY, list)) {
          render();
          if (--pending === 0) grid.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
    e.target.value = "";
  });

  /* 图片链接添加 */
  $("#albumUrlForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const src = $("#albumUrl").value.trim();
    if (!/^https?:\/\//i.test(src)) {
      alert("请粘贴以 http(s):// 开头的图片链接");
      return;
    }
    const list = userPhotos();
    list.unshift({
      user: true,
      id: "u" + Date.now() + Math.random().toString(36).slice(2, 7),
      src,
      title: $("#albumTitle").value.trim() || "网络图片",
      date: new Date().toISOString().slice(0, 10),
    });
    if (saveStore(ALBUM_KEY, list)) {
      $("#albumUrl").value = "";
      $("#albumTitle").value = "";
      render();
    }
  });

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "album") initAlbumPage();
});
