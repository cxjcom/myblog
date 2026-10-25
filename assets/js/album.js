/* ============================================================
   相册空间：公开照片数据 + 本地添加（localStorage）+ 瀑布流 + 灯箱
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

const ALBUM_KEY = "album.user.v1";

function loadUserPhotos() {
  try {
    const arr = JSON.parse(localStorage.getItem(ALBUM_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveUserPhotos(list) {
  try {
    localStorage.setItem(ALBUM_KEY, JSON.stringify(list));
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

  function allPhotos() {
    return [...loadUserPhotos(), ...ALBUM_PHOTOS];
  }

  function render() {
    const list = allPhotos();
    $("#albumCount").textContent = "· " + list.length + " 张";
    $("#albumEmpty").hidden = list.length > 0;
    grid.innerHTML = list
      .map((p, i) => {
        const del = p.user
          ? `<button class="album-del" data-i="${i}" title="删除这张照片" aria-label="删除照片">✕</button>`
          : "";
        return `
        <figure class="album-item reveal" data-i="${i}">
          <img src="${esc(p.src)}" alt="${esc(p.title || "照片")}" loading="lazy">
          <figcaption>
            <span class="album-title">${esc(p.title || "未命名")}</span>
            ${p.date ? `<span class="album-date">${esc(p.date)}</span>` : ""}
            ${del}
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
      const i = +del.dataset.i;
      const list = loadUserPhotos();
      const removed = list.splice(i, 1)[0];
      if (confirm(`删除「${(removed && removed.title) || "未命名"}」？`)) {
        saveUserPhotos(list);
        render();
      }
      return;
    }
    const item = e.target.closest(".album-item");
    if (item) openLightbox(allPhotos()[+item.dataset.i]);
  });

  /* 文件上传（可多选） */
  $("#albumFile").addEventListener("change", (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    let pending = files.length;
    files.forEach((file) => {
      compressImageFile(file, (dataURL) => {
        const list = loadUserPhotos();
        list.unshift({
          user: true,
          src: dataURL,
          title: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 30) || "我的照片",
          date: new Date().toISOString().slice(0, 10),
        });
        if (saveUserPhotos(list)) {
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
    const list = loadUserPhotos();
    list.unshift({
      user: true,
      src,
      title: $("#albumTitle").value.trim() || "网络图片",
      date: new Date().toISOString().slice(0, 10),
    });
    if (saveUserPhotos(list)) {
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
