/* ============================================================
   个人资料：本地存储 / 全站应用 / 个人主页渲染与编辑
   ============================================================ */
"use strict";

const PROFILE_KEY = "profile.v1";
const PROFILE_DEFAULTS = {
  name: "拾光",
  motto: "记录、思考与热爱",
  bio: "白天写前端，晚上写博客，周末在山里或书里。喜欢把复杂的东西讲简单。",
  location: "中国 · 上海",
  github: "cxjcom",
  email: "hello@example.com",
  tags: ["前端开发", "摄影", "读书", "徒步"],
  avatar: "", // dataURL，空则用默认
};

function loadProfile() {
  try {
    return Object.assign({}, PROFILE_DEFAULTS, JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"));
  } catch (e) {
    return Object.assign({}, PROFILE_DEFAULTS);
  }
}

function saveProfile(p) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch (e) {}
  document.dispatchEvent(new CustomEvent("profilechange", { detail: p }));
}

/* 头像 HTML：有自定义头像用图片，否则回退到首字符 */
function profileAvatarHTML(p, cls) {
  if (p.avatar) return `<img class="${cls || ""}" src="${p.avatar}" alt="${p.name} 的头像">`;
  return escapeHTML((p.name || "拾").charAt(0));
}

/* 把资料应用到全站（首页问候 / 星球头像 / 品牌印章首字） */
function applyProfileToSite(p) {
  const name = p.name || "拾光";
  $$("[data-profile-name]").forEach((el) => (el.textContent = name));
  $$("[data-profile-motto]").forEach((el) => (el.textContent = p.motto || ""));
  const orb = $(".orb");
  if (orb) {
    if (p.avatar) {
      orb.innerHTML = `<img class="orb-avatar" src="${p.avatar}" alt="${name} 的头像">`;
    } else {
      orb.innerHTML = "🪐";
    }
  }
  $$(".brand-seal").forEach((el) => (el.textContent = name.charAt(0)));
}

document.addEventListener("profilechange", (e) => applyProfileToSite(e.detail));

/* ---------------- 个人主页（profile.html）的渲染与编辑 ---------------- */
function initProfilePage() {
  const view = $("#profileView");
  if (!view) return;
  let tempAvatar = null; // 编辑中未保存的头像

  const esc = escapeHTML;
  function render() {
    const p = loadProfile();
    $("#viewAvatar").innerHTML = profileAvatarHTML(p);
    $("#viewName").textContent = p.name;
    $("#viewMotto").textContent = p.motto;
    $("#viewTags").innerHTML = (p.tags || [])
      .map((t) => `<span class="chip">${esc(t)}</span>`)
      .join("");
    $("#viewBio").textContent = p.bio;
    $("#viewLocation").textContent = p.location || "—";
    $("#viewJoined").textContent = p.joined || "2026 年 10 月";
    const gh = $("#viewGithub");
    gh.textContent = "@" + (p.github || "");
    gh.href = "https://github.com/" + (p.github || "");
    const em = $("#viewEmail");
    em.textContent = p.email || "—";
    em.href = "mailto:" + (p.email || "");
  }

  function fillForm() {
    const p = loadProfile();
    tempAvatar = p.avatar || "";
    $("#formAvatarPreview").innerHTML = profileAvatarHTML(p);
    $("#formName").value = p.name;
    $("#formMotto").value = p.motto;
    $("#formBio").value = p.bio;
    $("#formLocation").value = p.location;
    $("#formGithub").value = p.github;
    $("#formEmail").value = p.email;
    $("#formTags").value = (p.tags || []).join(", ");
  }

  function toggleEdit(editing) {
    $("#profileView").hidden = editing;
    $("#profileView").classList.toggle("hidden", editing);
    $("#profileForm").hidden = !editing;
    $("#profileForm").classList.toggle("hidden", !editing);
    if (editing) fillForm();
  }

  $("#editBtn").addEventListener("click", () => toggleEdit(true));
  $("#cancelEdit").addEventListener("click", () => toggleEdit(false));

  $("#profileForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const p = loadProfile();
    p.name = $("#formName").value.trim() || "拾光";
    p.motto = $("#formMotto").value.trim();
    p.bio = $("#formBio").value.trim();
    p.location = $("#formLocation").value.trim();
    p.github = $("#formGithub").value.trim().replace(/^@/, "");
    p.email = $("#formEmail").value.trim();
    p.tags = $("#formTags").value.split(/[,，、]/).map((t) => t.trim()).filter(Boolean).slice(0, 8);
    p.avatar = tempAvatar || "";
    saveProfile(p);
    render();
    applyProfileToSite(p);
    toggleEdit(false);
  });

  $("#resetProfile").addEventListener("click", () => {
    if (!confirm("确定恢复全部默认资料吗？")) return;
    try { localStorage.removeItem(PROFILE_KEY); } catch (e) {}
    tempAvatar = PROFILE_DEFAULTS.avatar;
    saveProfile(Object.assign({}, PROFILE_DEFAULTS));
    render();
    applyProfileToSite(loadProfile());
    toggleEdit(false);
  });

  $("#avatarReset").addEventListener("click", () => {
    tempAvatar = "";
    $("#formAvatarPreview").innerHTML = escapeHTML(($("#formName").value.trim() || "拾").charAt(0));
  });

  $("#avatarInput").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        /* 居中裁剪为正方形并压缩到 256px，控制本地存储体积 */
        const S = 256;
        const c = document.createElement("canvas");
        c.width = S; c.height = S;
        const cx = c.getContext("2d");
        const side = Math.min(img.width, img.height);
        cx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
        tempAvatar = c.toDataURL("image/jpeg", 0.85);
        $("#formAvatarPreview").innerHTML = `<img src="${tempAvatar}" alt="新头像预览">`;
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  });

  render();
}

/* ---------------- 个人主页：数据统计 / 成就 / 动态 / 动效 ---------------- */
function initProfileExtras() {
  if (typeof POSTS === "undefined" || !POSTS.length) return;
  const esc = escapeHTML;
  const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const n = POSTS.length;
  const words = POSTS.reduce((s, p) => s + (p.words || 0), 0);
  const tags = new Set(POSTS.flatMap((p) => p.tags || [])).size;
  const firstDate = POSTS.reduce((m, p) => (p.date < m ? p.date : m), POSTS[0].date);
  const days = Math.max(1, Math.round((Date.now() - new Date(firstDate)) / 86400000));

  /* 统计带：数字滚动 */
  const nums = [n, words, tags, days];
  $$("#meStats b").forEach((el, i) => (el.dataset.count = nums[i]));
  function countUp(el) {
    const target = +el.dataset.count || 0;
    const fmt = (v) => Math.round(v).toLocaleString("zh-CN");
    if (rm) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 1200;
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  const statIO = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      statIO.unobserve(e.target);
      countUp(e.target);
    });
  }, { threshold: 0.4 });
  $$("#meStats b").forEach((el) => statIO.observe(el));

  /* 成就徽章：随写作数据自动解锁 */
  const badges = [
    { icon: "🌱", name: "初次落笔", desc: "发表第一篇文章", ok: n >= 1, prog: `${n}/1` },
    { icon: "✍️", name: "笔耕不辍", desc: "累计 5 篇文章", ok: n >= 5, prog: `${n}/5` },
    { icon: "📚", name: "万字里程碑", desc: "累计写作 1 万字", ok: words >= 10000, prog: `${(words / 10000).toFixed(1)}/1 万` },
    { icon: "🏷️", name: "多元表达", desc: "用满 6 个标签", ok: tags >= 6, prog: `${tags}/6` },
    { icon: "🔥", name: "持续更新", desc: "创作旅程满 30 天", ok: days >= 30, prog: `${days}/30 天` },
    { icon: "🚀", name: "十篇之路", desc: "发表 10 篇文章", ok: n >= 10, prog: `${n}/10` },
  ];
  const okCount = badges.filter((b) => b.ok).length;
  $("#badgeHint").textContent = `已解锁 ${okCount} / ${badges.length}`;
  $("#meBadges").innerHTML = badges
    .map(
      (b, i) => `
      <div class="badge ${b.ok ? "" : "locked"} reveal" style="--d:${(i * 0.06).toFixed(2)}s">
        <span class="b-icon" aria-hidden="true">${b.ok ? b.icon : "🔒"}</span>
        <b>${esc(b.name)}</b>
        <small>${esc(b.desc)}</small>
        ${b.ok ? "" : `<span class="b-progress">${esc(b.prog)}</span>`}
      </div>`
    )
    .join("");

  /* 最近动态：最新 3 篇 */
  const recent = [...POSTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  $("#meRecent").innerHTML = recent
    .map(
      (p, i) => `
      <a class="me-recent-item glass-card reveal" style="--d:${(i * 0.08).toFixed(2)}s" href="${postUrl(p.slug)}">
        <time>${esc(p.date)}</time>
        <span>发表了《${esc(p.title)}》</span>
        <em>${esc((p.tags && p.tags[0]) || "博文")}</em>
      </a>`
    )
    .join("");

  /* 签名打字机（首次加载时） */
  const mottoEl = $("#viewMotto");
  const motto = mottoEl.textContent;
  if (motto && !rm) {
    mottoEl.classList.add("typing");
    mottoEl.textContent = "";
    let i = 0;
    const timer = setInterval(() => {
      mottoEl.textContent = motto.slice(0, ++i);
      if (i >= motto.length) {
        clearInterval(timer);
        mottoEl.classList.remove("typing");
      }
    }, 70);
  }
}

/* ---------------- 全站应用（所有页面） ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  applyProfileToSite(loadProfile());
  if (document.body.dataset.page === "me") {
    initProfilePage();
    initProfileExtras();
  }
});
