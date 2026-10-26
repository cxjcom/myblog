/* ============================================================
   Now 页：现在进行时，contenteditable + localStorage
   ============================================================ */
"use strict";

const NOW_KEY = "now.v1";
const NOW_DEFAULTS = {
  doing: "维护这个博客，把想做的功能一个个做出来",
  reading: "《卡片笔记写作法》",
  listening: "歌单里的老歌随机播放",
  status: "缓慢但持续地更新着",
  at: null,
};

function initNowPage() {
  const card = document.querySelector(".now-card");
  if (!card) return;

  let data;
  try {
    data = Object.assign({}, NOW_DEFAULTS, JSON.parse(localStorage.getItem(NOW_KEY) || "{}"));
  } catch (e) {
    data = Object.assign({}, NOW_DEFAULTS);
  }

  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const timeEl = $("#nowTime");

  function renderTime() {
    if (!data.at) { timeEl.textContent = "刚刚"; return; }
    const d = new Date(data.at);
    timeEl.textContent = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  }

  function save() {
    data.at = Date.now();
    try { localStorage.setItem(NOW_KEY, JSON.stringify(data)); } catch (e) {}
    renderTime();
  }

  document.querySelectorAll(".now-line").forEach((el) => {
    const key = el.dataset.now;
    el.innerHTML = esc(data[key] || "");
    el.addEventListener("blur", () => {
      const v = el.textContent.trim().slice(0, 120);
      if (v !== data[key]) {
        data[key] = v || NOW_DEFAULTS[key];
        el.textContent = data[key];
        save();
      }
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); el.blur(); }
    });
  });

  $(".js-now-reset").addEventListener("click", () => {
    if (!confirm("恢复默认内容？")) return;
    data = Object.assign({}, NOW_DEFAULTS);
    document.querySelectorAll(".now-line").forEach((el) => (el.textContent = data[el.dataset.now]));
    save();
  });

  renderTime();
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "now") initNowPage();
});
