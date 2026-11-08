/* ============================================================
   相册空间：公开照片（云端/仓库数据）+ 瀑布流 + 灯箱
   照片在后台管理（admin.html → 相册），写入 data/album.json 或云端 KV
   ============================================================ */
"use strict";

/* 照片对象：{ src, title, date } */
let ALBUM_PHOTOS = []; /* 公共相册：云端优先，回退仓库 data/album.json */

function initAlbumPage() {
  const grid = $("#albumGrid");
  if (!grid) return;
  const esc = escapeHTML;
  let renderSeq = 0; /* 防止异步渲染乱序 */

  async function allPhotos() {
    return ALBUM_PHOTOS.map((p) => ({ ...p, key: "d:" + p.src }));
  }

  async function render() {
    const seq = ++renderSeq;
    const list = await allPhotos();
    if (seq !== renderSeq) return;
    $("#albumCount").textContent = "· " + list.length + " 张";
    $("#albumEmpty").hidden = list.length > 0;
    grid.innerHTML = list
      .map(
        (p) => `
        <figure class="album-item reveal" data-key="${esc(p.key)}">
          <img src="${esc(p.src)}" alt="${esc(p.title || "照片")}" loading="lazy">
          <figcaption>
            <span class="album-title">${esc(p.title || "未命名")}</span>
            ${p.date ? `<span class="album-date">${esc(p.date)}</span>` : ""}
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
    const item = e.target.closest(".album-item");
    if (item) {
      const p = (await allPhotos()).find((x) => x.key === item.dataset.key);
      if (p) openLightbox(p);
    }
  });

  render();

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
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "album") initAlbumPage();
});
