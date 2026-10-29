/* ============================================================
   相册空间：公开照片 + 本地添加/删除（IndexedDB）+ 瀑布流 + 灯箱
   ============================================================ */
"use strict";

/* ---------------- 公开照片（想让所有访客看到就加在这里） ----------------
   把图片文件放进 assets/img/gallery/，然后加一行：
   { src: "assets/img/gallery/xxx.jpg", title: "标题", date: "2026-10-26" }, */
const ALBUM_PHOTOS = [];

const ALBUM_KEY = "album.user.v1";          // 旧版 localStorage 数据（仅用于迁移）
const ALBUM_HIDDEN_KEY = "album.hidden.v1"; // 被删除的内置照片（src 列表）

/* ---------------- IndexedDB 存储层 ---------------- */
const ALBUM_DB = (() => {
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      /* v2：幂等建 store，兼容缺 photos 存储的旧库 */
      const req = indexedDB.open("myblog-album", 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("photos"))
          db.createObjectStore("photos", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  function tx(mode, fn) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction("photos", mode);
          const store = t.objectStore("photos");
          const out = fn(store);
          t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : undefined);
          t.onerror = () => reject(t.error);
        })
    );
  }
  return {
    all: () => tx("readonly", (s) => s.getAll()).then((list) =>
      (list || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    ),
    put: (photo) => tx("readwrite", (s) => s.put(photo)),
    del: (id) => tx("readwrite", (s) => s.delete(id)),
  };
})();

/* 旧 localStorage 数据一次性迁移到 IndexedDB */
async function migrateAlbum() {
  try {
    const raw = localStorage.getItem(ALBUM_KEY);
    if (!raw) return;
    const old = JSON.parse(raw);
    if (Array.isArray(old) && old.length) {
      const now = Date.now();
      for (let i = 0; i < old.length; i++) {
        const p = old[i];
        await ALBUM_DB.put({
          id: p.id || "u" + (now - i),
          user: true,
          src: p.src,
          title: p.title,
          date: p.date,
          createdAt: now - i,
        });
      }
    }
    localStorage.removeItem(ALBUM_KEY);
  } catch (e) { /* 迁移失败不影响使用 */ }
}

function loadHiddenPhotos() {
  try {
    const arr = JSON.parse(localStorage.getItem(ALBUM_HIDDEN_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveHidden(list) {
  try {
    localStorage.setItem(ALBUM_HIDDEN_KEY, JSON.stringify(list));
  } catch (e) {}
}

/* 图片文件压缩为 dataURL（最长边 1280） */
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
  let renderSeq = 0; /* 防止异步渲染乱序 */

  async function allPhotos() {
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
  }

  async function render() {
    const seq = ++renderSeq;
    const list = await allPhotos();
    if (seq !== renderSeq) return;
    $("#albumCount").textContent = "· " + list.length + " 张";
    $("#albumRestore").hidden = loadHiddenPhotos().length === 0;
    $("#albumEmpty").hidden = list.length > 0;
    grid.innerHTML = list
      .map(
        (p) => `
        <figure class="album-item reveal" data-key="${esc(p.key)}">
          <img src="${esc(p.src)}" alt="${esc(p.title || "照片")}" loading="lazy">
          <figcaption>
            <span class="album-title">${esc(p.title || "未命名")}</span>
            ${p.date ? `<span class="album-date">${esc(p.date)}</span>` : ""}
            <button class="album-del" title="删除这张照片" aria-label="删除照片">✕</button>
          </figcaption>
        </figure>`
      )
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

  grid.addEventListener("click", async (e) => {
    const del = e.target.closest(".album-del");
    if (del) {
      e.stopPropagation();
      const key = del.closest(".album-item").dataset.key;
      if (key.startsWith("u:")) {
        const id = key.slice(2);
        const users = await ALBUM_DB.all();
        const removed = users.find((p) => p.id === id);
        if (removed && confirm(`删除「${removed.title || "未命名"}」？此操作不可恢复。`)) {
          await ALBUM_DB.del(id);
          render();
        }
      } else {
        const hidden = loadHiddenPhotos();
        if (!hidden.includes(key)) {
          hidden.push(key);
          saveHidden(hidden);
          render();
        }
      }
      return;
    }
    const item = e.target.closest(".album-item");
    if (item) {
      const p = (await allPhotos()).find((x) => x.key === item.dataset.key);
      if (p) openLightbox(p);
    }
  });

  $("#albumRestore").addEventListener("click", () => {
    saveHidden([]);
    render();
  });

  /* 文件上传（可多选） */
  $("#albumFile").addEventListener("change", (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    let pending = files.length;
    files.forEach((file) => {
      compressImageFile(file, async (dataURL) => {
        await ALBUM_DB.put({
          id: "u" + Date.now() + Math.random().toString(36).slice(2, 7),
          user: true,
          src: dataURL,
          title: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 30) || "我的照片",
          date: new Date().toISOString().slice(0, 10),
          createdAt: Date.now(),
        });
        render();
        if (--pending === 0) grid.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    e.target.value = "";
  });

  /* 图片链接添加 */
  $("#albumUrlForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const src = $("#albumUrl").value.trim();
    if (!/^https?:\/\//i.test(src)) {
      alert("请粘贴以 http(s):// 开头的图片链接");
      return;
    }
    await ALBUM_DB.put({
      id: "u" + Date.now() + Math.random().toString(36).slice(2, 7),
      user: true,
      src,
      title: $("#albumTitle").value.trim() || "网络图片",
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
    });
    $("#albumUrl").value = "";
    $("#albumTitle").value = "";
    render();
  });

  migrateAlbum().then(render);
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "album") initAlbumPage();
});
