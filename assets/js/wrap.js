/* ============================================================
   年度回顾：从 POSTS 实时统计并渲染
   ============================================================ */
"use strict";

function initWrapPage() {
  const box = $("#wrapStats");
  if (!box || typeof POSTS === "undefined") return;
  const esc = escapeHTML;
  const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const n = POSTS.length;
  const words = POSTS.reduce((s, p) => s + (p.words || 0), 0);
  const tags = {};
  POSTS.forEach((p) => (p.tags || []).forEach((t) => (tags[t] = (tags[t] || 0) + 1)));

  /* 更新周数：有文章发布的不同周 */
  const weekOf = (d) => {
    const dt = new Date(d);
    const onejan = new Date(dt.getFullYear(), 0, 1);
    return Math.ceil(((dt - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  };
  const weeks = new Set(POSTS.map((p) => new Date(p.date).getFullYear() + "-W" + weekOf(p.date)));
  const weeksN = weeks.size;

  /* 统计卡数字滚动 */
  const nums = [n, words, Object.keys(tags).length, weeksN];
  $$("#wrapStats b").forEach((el, i) => (el.dataset.count = nums[i]));
  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, target = +el.dataset.count || 0;
      const fmt = (v) => Math.round(v).toLocaleString("zh-CN");
      if (rm) { el.textContent = fmt(target); return; }
      const t0 = performance.now(), dur = 1200;
      (function step(t) {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.4 });
  $$("#wrapStats b").forEach((el) => io.observe(el));

  /* 每月柱状图 */
  const year = new Date().getFullYear();
  const byMonth = new Array(12).fill(0);
  POSTS.forEach((p) => {
    const d = new Date(p.date);
    if (d.getFullYear() === year) byMonth[d.getMonth()] += (p.words || 0);
  });
  const max = Math.max(...byMonth, 1);
  const best = byMonth.indexOf(Math.max(...byMonth));
  $("#wrapBars").innerHTML = byMonth
    .map((w, i) => {
      const h = Math.max(4, Math.round((w / max) * 100));
      return `<div class="wrap-bar-col" title="${i + 1} 月 · ${w.toLocaleString("zh-CN")} 字">
        <span class="wrap-bar" style="--h:${h}%"></span>
        <small>${i + 1}</small>
      </div>`;
    })
    .join("");
  $("#wrapBest").textContent = `全年最高产的是 ${best + 1} 月，写了 ${byMonth[best].toLocaleString("zh-CN")} 字。`;

  /* 标签榜 */
  const top = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 6);
  $("#wrapTags").innerHTML = top
    .map(([t, c], i) => `<span class="chip reveal" style="--d:${(i * 0.05).toFixed(2)}s">${esc(t)} <span class="chip-count">${c} 篇</span></span>`)
    .join("");

  /* 总结语 */
  $("#wrapQuote").textContent =
    `${year} 年，我在这里写下了 ${n} 篇文章、${(words / 10000).toFixed(1)} 万字，` +
    `覆盖 ${Object.keys(tags).length} 个话题，横跨 ${weeksN} 个更新周。` +
    `谢谢每一个读到这里的人，明年继续。`;
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "wrap") initWrapPage();
});
