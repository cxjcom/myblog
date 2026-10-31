/**
 * 拾光小栈 · Cloudflare Worker 动态后端
 * 部署后提供：公开读取数据 + 密码登录换令牌 + 令牌鉴权写入
 *
 * 需要在 Cloudflare 面板配置：
 *   1. KV 命名空间绑定：变量名 BLOG_DATA
 *   2. 文本变量：ADMIN_PASS（后台登录密码）
 *   3. 文本变量：API_SIGN（任意一串长随机字符，用于签名令牌）
 * 详见 cloudflare/DEPLOY.md
 */

const NAMES = ["profile", "posts", "album", "music", "mood"];
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
}

function b64url(bytes) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(secret, text) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text))));
}

async function makeToken(env, days = 7) {
  const exp = Date.now() + days * 86400_000;
  const payload = b64url(new TextEncoder().encode(String(exp)));
  const sig = await hmacSign(env.API_SIGN, payload);
  return payload + "." + sig;
}

async function verifyToken(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expect = await hmacSign(env.API_SIGN, payload);
  if (sig !== expect) return false;
  return Number(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) > Date.now();
}

export default {
  async fetch(request, env) {
    /* CORS 预检 */
    if (request.method === "OPTIONS") return new Response(null, { headers: JSON_HEADERS });

    const url = new URL(request.url);
    const name = url.pathname.replace(/^\/api\//, "").replace(/\.json$/, "").replace(/^\//, "");

    /* 登录：密码换令牌 */
    if (url.pathname === "/api/login" && request.method === "POST") {
      try {
        const body = await request.json();
        if (!env.ADMIN_PASS) return json({ ok: false, message: "Worker 未设置 ADMIN_PASS 变量" }, 500);
        if (String(body.password || "") === env.ADMIN_PASS) {
          return json({ ok: true, token: await makeToken(env) });
        }
        return json({ ok: false, message: "密码不对" }, 403);
      } catch (e) { return json({ ok: false, message: "请求格式错误" }, 400); }
    }

    /* 数据读写仅限已知名称 */
    if (!NAMES.includes(name)) return json({ ok: false, message: "未知数据名称" }, 404);

    /* 公开读取 */
    if (request.method === "GET") {
      try {
        const v = await env.BLOG_DATA.get("data:" + name);
        return json({ ok: true, data: v ? JSON.parse(v) : null });
      } catch (e) { return json({ ok: false, message: "读取失败" }, 500); }
    }

    /* 写入：需要有效令牌 */
    if (request.method === "POST") {
      if (!(await verifyToken(request, env))) {
        return json({ ok: false, message: "未登录或登录已过期" }, 401);
      }
      try {
        const body = await request.json();
        const content = body.data !== undefined ? body.data : body;
        await env.BLOG_DATA.put("data:" + name, JSON.stringify(content));
        return json({ ok: true, message: "已保存，前台立即生效" });
      } catch (e) { return json({ ok: false, message: "保存失败：" + e.message }, 500); }
    }

    return json({ ok: false, message: "不支持的请求方法" }, 405);
  },
};
