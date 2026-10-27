/* ============================================================
   个人资料：本地存储 / 全站应用 / 个人主页渲染与编辑
   ============================================================ */
"use strict";

const PROFILE_KEY = "profile.v1";
const PROFILE_DEFAULTS = {
  siteName: "拾光小栈",
  name: "拾光",
  motto: "记录、思考与热爱",
  bio: "白天写前端，晚上写博客，周末在山里或书里。喜欢把复杂的东西讲简单。",
  location: "湖北 · 黄石",
  github: "cxjcom",
  email: "hello@example.com",
  qq: "",
  wechat: "",
  birthday: "",
  job: "",
  yearGoal: 20,
  tags: ["前端开发", "摄影", "读书", "徒步"],
  avatar: "", // dataURL，空则用默认
};

function fmtBirthday(v) {
  const d = new Date(v + "T12:00");
  if (isNaN(d)) return v;
  return d.getFullYear() + " 年 " + (d.getMonth() + 1) + " 月 " + d.getDate() + " 日";
}

function zodiacOf(birthday) {
  const d = new Date(birthday + "T12:00");
  if (isNaN(d)) return "";
  const m = d.getMonth() + 1, day = d.getDate();
  const names = ["摩羯座", "水瓶座", "双鱼座", "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座"];
  const edges = [[1, 20], [2, 19], [3, 21], [4, 20], [5, 21], [6, 22], [7, 23], [8, 23], [9, 23], [10, 24], [11, 23], [12, 22]];
  let idx = 12;
  for (let i = 0; i < 12; i++) {
    if (m < edges[i][0] || (m === edges[i][0] && day < edges[i][1])) { idx = i; break; }
    idx = i + 1;
  }
  return names[idx];
}

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

/* 把资料应用到全站（首页问候 / 星球头像 / 品牌印章首字 / 关于页） */
function applyProfileToSite(p) {
  const site = p.siteName || "拾光小栈";
  const name = p.name || "拾光";
  $$("[data-site-name]").forEach((el) => (el.textContent = site));
  /* 浏览器标签标题跟随站点名 */
  if (site !== "拾光小栈") document.title = document.title.replace(/拾光小栈/g, site);
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
  /* 关于页：头像字 / 头像图与 GitHub 链接同步 */
  const aboutAvatar = $(".about-avatar");
  if (aboutAvatar) {
    aboutAvatar.innerHTML = p.avatar
      ? `<img src="${p.avatar}" alt="${name} 的头像">`
      : escapeHTML(name.charAt(0));
  }
  $$("[data-profile-github]").forEach((a) => {
    const gh = p.github || "";
    a.textContent = "@" + gh;
    a.href = "https://github.com/" + gh;
  });
  $$("[data-profile-email]").forEach((a) => {
    if (p.email) a.href = "mailto:" + p.email;
  });
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
    $("#viewQQ").textContent = p.qq || "—";
    $("#viewWechat").textContent = p.wechat || "—";
    $("#viewBirthday").textContent = p.birthday ? fmtBirthday(p.birthday) : "—";
    $("#viewZodiac").textContent = p.birthday ? zodiacOf(p.birthday) : "—";
    $("#viewJob").textContent = p.job || "—";
  }

  function fillForm() {
    const p = loadProfile();
    tempAvatar = p.avatar || "";
    $("#formAvatarPreview").innerHTML = profileAvatarHTML(p);
    $("#formSiteName").value = p.siteName;
    $("#formName").value = p.name;
    $("#formMotto").value = p.motto;
    $("#formBio").value = p.bio;
    $("#formLocation").value = p.location;
    $("#formGithub").value = p.github;
    $("#formEmail").value = p.email;
    $("#formQQ").value = p.qq || "";
    $("#formWechat").value = p.wechat || "";
    $("#formBirthday").value = p.birthday || "";
    $("#formJob").value = p.job || "";
    $("#formTags").value = (p.tags || []).join(", ");
    $("#formGoal").value = p.yearGoal || 20;
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
    p.siteName = $("#formSiteName").value.trim() || "拾光小栈";
    p.name = $("#formName").value.trim() || "拾光";
    p.motto = $("#formMotto").value.trim();
    p.bio = $("#formBio").value.trim();
    p.location = $("#formLocation").value.trim();
    p.github = $("#formGithub").value.trim().replace(/^@/, "");
    p.email = $("#formEmail").value.trim();
    p.qq = $("#formQQ").value.trim();
    p.wechat = $("#formWechat").value.trim();
    p.birthday = $("#formBirthday").value;
    p.job = $("#formJob").value.trim();
    p.tags = $("#formTags").value.split(/[,，、]/).map((t) => t.trim()).filter(Boolean).slice(0, 8);
    p.yearGoal = Math.max(1, +$("#formGoal").value || 20);
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

  /* 年度目标进度环 */
  const year = new Date().getFullYear();
  const yearPosts = POSTS.filter((p) => p.date.startsWith(String(year))).length;
  const goal = Math.max(1, loadProfile().yearGoal || 20);
  const pct = Math.min(100, Math.round((yearPosts / goal) * 100));
  const C = 2 * Math.PI * 52;
  const fg = $("#goalRingFg");
  $("#goalHint").textContent = year + " 年目标 " + goal + " 篇 · 已完成 " + yearPosts + " 篇";
  $("#goalDetail").innerHTML = "已完成 <b>" + yearPosts + "</b> / " + goal + " 篇" +
    (pct >= 100 ? " · 目标达成 🎉" : " · 还差 " + (goal - yearPosts) + " 篇");
  $("#goalPct").textContent = pct + "%";
  const ringIO = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      ringIO.unobserve(e.target);
      const t0 = performance.now(), dur = rm ? 0 : 1100;
      (function step(t) {
        const k = dur ? Math.min(1, (t - t0) / dur) : 1;
        fg.style.strokeDashoffset = C * (1 - (pct / 100) * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.4 });
  ringIO.observe(fg);

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

/* ---------------- 个人主页：Now 卡 / 空间速览 / 心情签到 ---------------- */
const NOW_DEFAULTS = {
  doing: "维护这个博客，把想做的功能一个个做出来",
  reading: "《卡片笔记写作法》",
  listening: "歌单里的老歌随机播放",
};

function initNowMini() {
  const box = $("#nowMini");
  if (!box) return;
  let data;
  try {
    data = Object.assign({}, NOW_DEFAULTS, JSON.parse(localStorage.getItem("now.v1") || "{}"));
  } catch (e) {
    data = Object.assign({}, NOW_DEFAULTS);
  }
  const esc = escapeHTML;
  const rows = [
    ["在做", data.doing], ["在读", data.reading], ["在听", data.listening],
  ];
  box.innerHTML = rows
    .map(([k, v]) => `<div class="now-mini-row"><span>${k}</span><p>${esc(v || "…")}</p></div>`)
    .join("") + `<a class="now-mini-edit" href="now.html">编辑这些状态 →</a>`;
}

function albumLatestPhoto() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("myblog-album", 1);
      req.onsuccess = () => {
        try {
          const tx = req.result.transaction("photos", "readonly").objectStore("photos").getAll();
          tx.onsuccess = () => {
            const list = (tx.result || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            resolve(list[0] || null);
          };
          tx.onerror = () => resolve(null);
        } catch (err) { resolve(null); }
      };
      req.onerror = () => resolve(null);
    } catch (err) { resolve(null); }
  });
}

function localLatest(key) {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(arr) && arr.length ? arr[0] : null;
  } catch (e) {
    return null;
  }
}

function initSpaceLatest() {
  const box = $("#spaceLatest");
  if (!box) return;
  const esc = escapeHTML;
  const cards = [
    { href: "album.html", ico: "📸", label: "最新照片", fallback: "相册还没有照片，去上传一张" },
    { href: "music.html", ico: "🎵", label: "最新歌曲", fallback: "歌单里还没有歌，去添加" },
    { href: "shelf.html", ico: "📚", label: "最近记录", fallback: "书架还空着，去记一条" },
  ];
  box.innerHTML = cards.map((c) => `<a class="space-latest-card glass-card reveal" href="${c.href}"></a>`).join("");
  const els = $$(".space-latest-card", box);

  albumLatestPhoto().then((photo) => {
    const v = photo ? { text: photo.title || "未命名", sub: photo.date || "" } : null;
    els[0].innerHTML = `
      <span class="sl-ico" aria-hidden="true">${cards[0].ico}</span>
      <div class="sl-body"><small>${cards[0].label}</small>
      ${v ? `<b>${esc(v.text)}</b>${v.sub ? `<small class="sl-sub">${esc(v.sub)}</small>` : ""}` : `<small class="sl-sub">${cards[0].fallback}</small>`}</div>
      <span class="space-arrow" aria-hidden="true">→</span>`;
    if (typeof observeReveals === "function") observeReveals();
  });
  const song = localLatest("music.user.v1");
  els[1].innerHTML = `
    <span class="sl-ico" aria-hidden="true">${cards[1].ico}</span>
    <div class="sl-body"><small>${cards[1].label}</small>
    ${song ? `<b>${esc(song.title || "未命名")}</b>${song.artist ? `<small class="sl-sub">${esc(song.artist)}</small>` : ""}` : `<small class="sl-sub">${cards[1].fallback}</small>`}</div>
    <span class="space-arrow" aria-hidden="true">→</span>`;
  const shelfItem = localLatest("shelf.user.v1");
  els[2].innerHTML = `
    <span class="sl-ico" aria-hidden="true">${cards[2].ico}</span>
    <div class="sl-body"><small>${cards[2].label}</small>
    ${shelfItem ? `<b>${esc(shelfItem.title || "未命名")}</b>${shelfItem.note ? `<small class="sl-sub">${esc(shelfItem.note)}</small>` : ""}` : `<small class="sl-sub">${cards[2].fallback}</small>`}</div>
    <span class="space-arrow" aria-hidden="true">→</span>`;
  if (typeof observeReveals === "function") observeReveals();
}

const MOOD_KEY = "mood.v1";
const MOODS = [
  { e: "😄", label: "开心", tint: "rgba(255, 205, 110, 0.4)" },
  { e: "🥰", label: "喜爱", tint: "rgba(255, 158, 205, 0.38)" },
  { e: "😌", label: "平静", tint: "rgba(133, 222, 190, 0.38)" },
  { e: "🤔", label: "思考", tint: "rgba(150, 190, 255, 0.38)" },
  { e: "😴", label: "疲惫", tint: "rgba(170, 175, 235, 0.38)" },
  { e: "🥲", label: "低落", tint: "rgba(160, 200, 230, 0.34)" },
];
/* 旧版单 emoji 数据映射到新表情 */
const MOOD_MIGRATE = { "😊": "😄", "🤩": "🥰", "😢": "🥲" };
let currentMood = MOODS[0].e;

function moodTintOf(e) {
  const hit = MOODS.find((m) => m.e === e);
  return hit ? hit.tint : "rgba(160, 170, 190, 0.3)";
}

function loadMoods() {
  try {
    const o = JSON.parse(localStorage.getItem(MOOD_KEY) || "{}");
    const out = {};
    Object.keys(o || {}).forEach((k) => (out[k] = MOOD_MIGRATE[o[k]] || o[k]));
    return out;
  } catch (e) {
    return {};
  }
}

function initMood() {
  const grid = $("#moodGrid");
  if (!grid) return;
  const picker = $("#moodPicker");
  picker.innerHTML = MOODS.map((m, i) => `
    <button type="button" class="mood-opt${i === 0 ? " on" : ""}" data-m="${m.e}" style="--tint:${m.tint}" aria-label="心情：${m.label}">
      <span class="m-emoji" aria-hidden="true">${m.e}</span><span class="m-label">${m.label}</span>
    </button>`).join("");
  picker.addEventListener("click", (e) => {
    const b = e.target.closest(".mood-opt");
    if (!b) return;
    currentMood = b.dataset.m;
    $$(".mood-opt", picker).forEach((x) => x.classList.toggle("on", x === b));
  });

  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; /* 周一开头 */
  const moods = loadMoods();
  const key = (d) => y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  const wnames = ["一", "二", "三", "四", "五", "六", "日"];

  function render() {
    let html = wnames.map((w) => `<span class="mood-wn">${w}</span>`).join("");
    for (let i = 0; i < offset; i++) html += "<span></span>";
    for (let d = 1; d <= days; d++) {
      const k = key(d);
      const stamped = moods[k];
      const cls = "mood-day" + (stamped ? " stamped" : "") + (d === now.getDate() ? " today" : "");
      const tint = stamped ? ` style="--tint:${moodTintOf(stamped)}"` : "";
      html += `<button type="button" class="${cls}" data-k="${k}" title="${k}${stamped ? " · " + stamped : ""}"${tint}>${stamped || d}</button>`;
    }
    grid.innerHTML = html;
    const monthPrefix = y + "-" + String(m + 1).padStart(2, "0");
    const count = Object.keys(moods).filter((k) => k.startsWith(monthPrefix)).length;
    $("#moodMeta").textContent = y + " 年 " + (m + 1) + " 月 · 本月签到 " + count + " 天";
  }

  grid.addEventListener("click", (e) => {
    const b = e.target.closest(".mood-day");
    if (!b) return;
    const k = b.dataset.k;
    if (moods[k] === currentMood) delete moods[k];
    else moods[k] = currentMood;
    try { localStorage.setItem(MOOD_KEY, JSON.stringify(moods)); } catch (err) {}
    render();
  });

  render();
}


/* ---------------- 个人主页/首页：今日天气 + 城市切换 + 三日预报（Open-Meteo） ---------------- */
const WMO_MAP = {
  0: ["sun", "晴"], 1: ["suncloud", "大致晴朗"], 2: ["suncloud", "多云"], 3: ["cloud", "阴"],
  45: ["fog", "有雾"], 48: ["fog", "雾凇"],
  51: ["rain", "毛毛雨"], 53: ["rain", "毛毛雨"], 55: ["rain", "毛毛雨"],
  61: ["rain", "小雨"], 63: ["rain", "中雨"], 65: ["rain", "大雨"],
  66: ["rain", "冻雨"], 67: ["rain", "冻雨"],
  71: ["snow", "小雪"], 73: ["snow", "中雪"], 75: ["snow", "大雪"], 77: ["snow", "霰"],
  80: ["rain", "阵雨"], 81: ["rain", "强阵雨"], 82: ["rain", "暴雨"],
  85: ["snow", "阵雪"], 86: ["snow", "阵雪"],
  95: ["thunder", "雷阵雨"], 96: ["thunder", "雷阵雨"], 99: ["thunder", "强雷暴"],
};

const WX_FALLBACK = { latitude: 30.24706, longitude: 115.04814, city: "黄石" };
const WX_OVERRIDE_KEY = "weather.override.v1";
const WX_CACHE_KEY = "weather.cache.v1";
let wxPanelOpen = false;

function wxOverride() {
  try {
    const o = JSON.parse(localStorage.getItem(WX_OVERRIDE_KEY) || "null");
    if (o && o.city && o.coords) return o;
  } catch (e) {}
  return null;
}

function setWxOverride(o) {
  try {
    if (o) localStorage.setItem(WX_OVERRIDE_KEY, JSON.stringify(o));
    else localStorage.removeItem(WX_OVERRIDE_KEY);
  } catch (e) {}
}

function wxCityCandidates(loc) {
  const parts = (loc || "").split(/[·，,、\s]+/).map((x) => x.trim())
    .filter((x) => x && !/^(中国|China)$/i.test(x));
  if (!parts.length) parts.push(WX_FALLBACK.city);
  return parts.reverse();
}

async function wxGeocode(name) {
  const r = await fetch("https://geocoding-api.open-meteo.com/v1/search?name=" +
    encodeURIComponent(name) + "&count=1&language=zh&format=json");
  const d = await r.json();
  return (d.results && d.results[0]) || null;
}

/* 动态 SVG 图标 */
const WX_SUN_CORE = `<g class="wx-rays">
      <line x1="48" y1="10" x2="48" y2="22"/><line x1="48" y1="74" x2="48" y2="86"/>
      <line x1="10" y1="48" x2="22" y2="48"/><line x1="74" y1="48" x2="86" y2="48"/>
      <line x1="21" y1="21" x2="30" y2="30"/><line x1="66" y1="66" x2="75" y2="75"/>
      <line x1="75" y1="21" x2="66" y2="30"/><line x1="30" y1="66" x2="21" y2="75"/></g>
    <circle class="c-sun" cx="48" cy="48" r="17"/>`;

function wxIcon(kind) {
  const cloud = (cls) => `<g class="wx-cloud ${cls || ""}">
    <circle class="c-cloud" cx="36" cy="52" r="13"/><circle class="c-cloud" cx="52" cy="44" r="17"/>
    <circle class="c-cloud" cx="66" cy="52" r="12"/><rect class="c-cloud" x="28" y="50" width="52" height="15" rx="7.5"/></g>`;
  const drops = (cls) => [58, 70, 82].map((x, i) =>
    `<line class="wx-drop ${cls}" x1="${x}" y1="66" x2="${x - 3}" y2="76" style="animation-delay:${i * 0.45}s"/>`).join("");
  const flakes = (cls) => [58, 70, 82].map((x, i) =>
    `<circle class="wx-flake ${cls}" cx="${x}" cy="68" r="2.6" style="animation-delay:${i * 0.6}s"/>`).join("");
  const icons = {
    sun: `<g class="wx-sun">${WX_SUN_CORE}</g>`,
    suncloud: `<g class="wx-sun" transform="translate(-13,-13) scale(0.68)">${WX_SUN_CORE}</g>` + cloud("lift"),
    cloud: cloud(),
    rain: cloud("lift") + drops("heavy"),
    drizzle: cloud("lift") + drops("light"),
    snow: cloud("lift") + flakes(""),
    thunder: cloud("dark") + `<polygon class="wx-bolt" points="52,58 44,74 51,74 46,88 60,70 52,70 58,58"/>`,
    fog: cloud("lift") + `<g class="wx-fog">
        <line x1="26" y1="72" x2="70" y2="72"/><line x1="32" y1="80" x2="76" y2="80"/><line x1="26" y1="88" x2="64" y2="88"/></g>`,
  };
  return `<svg viewBox="0 0 96 96" class="wx-svg" aria-hidden="true">${icons[kind] || icons.cloud}</svg>`;
}

function wxSmallIcon(code) {
  const kind = (WMO_MAP[code] || ["cloud"])[0];
  const m = { sun: "☀️", suncloud: "🌤️", cloud: "☁️", fog: "🌫️", rain: "🌧️", drizzle: "🌦️", snow: "🌨️", thunder: "⛈️" };
  return m[kind] || "☁️";
}

async function initWeather() {
  const card = $("#weatherCard");
  if (!card) return;
  const esc = escapeHTML;
  const loc = loadProfile().location || "";
  const ov = wxOverride();

  /* 缓存 30 分钟（按生效城市区分） */
  const cacheKey = (ov ? "o:" + ov.city : "p:" + loc);
  try {
    const cache = JSON.parse(localStorage.getItem(WX_CACHE_KEY) || "null");
    if (cache && cache.key === cacheKey && Date.now() - cache.at < 30 * 60 * 1000) {
      paint(cache.data, cache.city, !!ov, cache.forecast);
      return;
    }
  } catch (e) {}

  card.innerHTML = '<div class="wx-loading">天气加载中…</div>';
  try {
    let coords, city;
    if (ov) {
      coords = ov.coords; city = ov.city;
    } else {
      coords = null; city = "";
      for (const cand of wxCityCandidates(loc)) {
        const hit = await wxGeocode(cand);
        if (hit) { coords = hit; city = hit.name; break; }
      }
      if (!coords) { coords = WX_FALLBACK; city = WX_FALLBACK.city; }
    }
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + coords.latitude +
      "&longitude=" + coords.longitude +
      "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m" +
      "&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=3";
    const d = await (await fetch(url)).json();
    const data = {
      temp: Math.round(d.current.temperature_2m),
      code: d.current.weather_code,
      humidity: d.current.relative_humidity_2m,
      wind: Math.round(d.current.wind_speed_10m),
      max: Math.round(d.daily.temperature_2m_max[0]),
      min: Math.round(d.daily.temperature_2m_min[0]),
    };
    const forecast = [0, 1, 2].map((i) => ({
      date: d.daily.time[i],
      code: d.daily.weather_code[i],
      max: Math.round(d.daily.temperature_2m_max[i]),
      min: Math.round(d.daily.temperature_2m_min[i]),
    }));
    try {
      localStorage.setItem(WX_CACHE_KEY, JSON.stringify({ key: cacheKey, at: Date.now(), data, city, forecast }));
    } catch (e) {}
    paint(data, city, !!ov, forecast);
  } catch (e) {
    card.innerHTML = '<div class="wx-loading">天气暂时拿不到，稍后再来看看吧</div>';
  }

  function paint(data, city, isOverride, forecast) {
    const kindText = WMO_MAP[data.code] || ["cloud", "—"];
    card.innerHTML = `
      <button type="button" class="wx-main" title="展开预报与城市切换">
        <span class="wx-icon">${wxIcon(kindText[0])}</span>
        <span class="wx-temp"><b>${data.temp}°</b><span>${kindText[1]}</span></span>
        <span class="wx-details">
          <span>最高 ${data.max}° · 最低 ${data.min}°</span>
          <span>湿度 ${data.humidity}% · 风速 ${data.wind} km/h</span>
        </span>
        <span class="wx-city">${esc(city)} · 今天 ▾</span>
      </button>
      <div class="wx-panel" ${wxPanelOpen ? "" : "hidden"}>
        <div class="wx-forecast">
          ${forecast.map((f, i) => {
            const dt = new Date(f.date + "T12:00");
            const label = i === 0 ? "今天" : i === 1 ? "明天" : "后天";
            return `<div class="wx-frow">
              <span class="wx-fday">${label}<small>${dt.getMonth() + 1}/${dt.getDate()}</small></span>
              <span class="wx-fico" title="${(WMO_MAP[f.code] || ["", ""])[1]}">${wxSmallIcon(f.code)}</span>
              <span class="wx-fdeg">${f.max}° <small>/ ${f.min}°</small></span>
            </div>`;
          }).join("")}
        </div>
        <form class="wx-city-form">
          <input type="text" placeholder="输入任意城市：北京 / Tokyo …" aria-label="城市名">
          <button class="btn" type="submit">切换</button>
          ${isOverride ? '<button type="button" class="btn wx-follow">跟随资料所在地</button>' : ""}
        </form>
      </div>`;
    wire(data, city, isOverride, forecast);
  }

  function wire(data, city, isOverride, forecast) {
    $(".wx-main", card).addEventListener("click", () => {
      wxPanelOpen = !wxPanelOpen;
      const panel = $(".wx-panel", card);
      if (panel) panel.hidden = !wxPanelOpen;
    });
    $(".wx-city-form", card).addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $(".wx-city-form input", card).value.trim();
      if (!name) return;
      const hit = await wxGeocode(name);
      if (!hit) { alert("没有找到城市「" + name + "」，换个名字试试（支持中文和英文）"); return; }
      setWxOverride({ city: hit.name, coords: { latitude: hit.latitude, longitude: hit.longitude } });
      wxPanelOpen = true;
      initWeather();
    });
    const follow = $(".wx-follow", card);
    if (follow) follow.addEventListener("click", () => {
      setWxOverride(null);
      wxPanelOpen = true;
      initWeather();
    });
  }
}


/* ---------------- 全站应用（所有页面） ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  applyProfileToSite(loadProfile());
  if (document.querySelector("#weatherCard")) initWeather();
  if (document.body.dataset.page === "me") {
    initProfilePage();
    initProfileExtras();
    initNowMini();
    initSpaceLatest();
    initMood();
  }
});
