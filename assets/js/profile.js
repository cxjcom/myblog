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
    $("#profileForm").hidden = !editing;
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

/* ---------------- 全站应用（所有页面） ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  applyProfileToSite(loadProfile());
  if (document.body.dataset.page === "me") initProfilePage();
});
