/* Cloudflare Worker 动态后端接入配置
   部署 Worker 后（见 cloudflare/DEPLOY.md），把你的 Worker 地址填到下一行引号里：
   例如 window.CLOUD_API = "https://blog-api.xxx.workers.dev";
   留空 = 不使用云端（前台回退读仓库 data/*.json，后台走本地服务器） */
window.CLOUD_API = "";

/* 读取（公开） */
window.cfGet = async function (name) {
  if (!window.CLOUD_API) return null;
  try {
    const r = await fetch(window.CLOUD_API + "/api/" + name, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.ok ? j.data : null;
  } catch (e) { return null; }
};

/* 登录（密码换令牌） */
window.cfLogin = async function (password) {
  const r = await fetch(window.CLOUD_API + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.message || "云端登录失败");
  return j.token;
};

/* 保存（需令牌） */
window.cfSave = async function (name, obj, token) {
  const r = await fetch(window.CLOUD_API + "/api/" + name, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ data: obj }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.message || "云端保存失败");
  return true;
};
