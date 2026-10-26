/* ============================================================
   书影记录：公开条目 + 本地添加（localStorage）+ 类型筛选
   ============================================================ */
"use strict";

/* 想让所有访客看到就加在这里：{ type:"书", title:"…", score:5, note:"…" } */
const SHELF_ITEMS = [];

const SHELF_KEY = "shelf.user.v1";

function loadUserItems() {
  try {
    const arr = JSON.parse(localStorage.getItem(SHELF_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function initShelfPage() {
  const grid = $("#shelfGrid");
  if (!grid) return;
  const esc = escapeHTML;
  let activeType = "全部";

  function allItems() {
    return [...loadUserItems().map((t) => ({ ...t, user: true })), ...SHELF_ITEMS.map((t) => ({ ...t, user: false }))];
  }

  function render() {
    const list = allItems().filter((t) => activeType === "全部" || t.type === activeType);
    $("#shelfCount").textContent = "· " + allItems().length + " 条";
    $("#shelfEmpty").hidden = list.length > 0;
    grid.innerHTML = list
      .map(
        (t, i) => `
        <article class="shelf-item glass-card reveal" style="--d:${(i * 0.04).toFixed(2)}s">
          <div class="shelf-item-head">
            <span class="shelf-type">${esc(t.type)}</span>
            <span class="shelf-score">${"★".repeat(t.score || 0)}<i>${"★".repeat(5 - (t.score || 0))}</i></span>
            ${t.user ? '<button class="music-del shelf-del" title="删除" aria-label="删除">✕</button>' : ""}
          </div>
          <h3>${esc(t.title)}</h3>
          ${t.note ? `<p>${esc(t.note)}</p>` : ""}
          ${t.date ? `<time>${esc(t.date)}</time>` : ""}
        </article>`
      )
      .join("");
    if (typeof observeReveals === "function") observeReveals();
  }

  $("#shelfFilter").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    activeType = btn.dataset.type;
    $$("#shelfFilter button").forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });

  grid.addEventListener("click", (e) => {
    const del = e.target.closest(".shelf-del");
    if (!del) return;
    const item = del.closest(".shelf-item");
    const title = item.querySelector("h3").textContent;
    if (!confirm(`删除「${title}」？`)) return;
    const list = loadUserItems();
    const remain = allItems().filter((t) => t.title === title && t.user);
    if (remain.length) {
      const idx = list.findIndex((t) => t.title === title);
      if (idx > -1) list.splice(idx, 1);
      try { localStorage.setItem(SHELF_KEY, JSON.stringify(list)); } catch (err) {}
      render();
    }
  });

  $("#shelfForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#shelfTitle").value.trim();
    if (!title) return;
    const list = loadUserItems();
    list.unshift({
      type: $("#shelfType").value,
      title: title.slice(0, 40),
      score: +$("#shelfScore").value,
      note: $("#shelfNote").value.trim().slice(0, 60),
      date: new Date().toISOString().slice(0, 10),
    });
    try { localStorage.setItem(SHELF_KEY, JSON.stringify(list)); } catch (err) {}
    $("#shelfForm").reset();
    render();
  });

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "shelf") initShelfPage();
});
