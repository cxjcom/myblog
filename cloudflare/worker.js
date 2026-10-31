/**
 * 拾光小栈 · Cloudflare Pages 动态后端（_worker.js 高级模式）
 * 能力：公开读取数据 + 密码登录 + 邮箱验证码登录（Brevo API 发信）+ 令牌鉴权写入
 *
 * Pages 项目环境变量配置（Settings → 环境变量）：
 *   KV 绑定：BLOG_DATA
 *   Secret：ADMIN_PASS（云端登录密码）
 *   Secret：API_SIGN（令牌签名密钥）
 *   Secret：BREVO_KEY（Brevo API Key，用于发送验证码邮件）
 *   Secret：MAIL_SENDER（已验证的发件邮箱，如 717583885@qq.com）
 *   变量：ADMIN_EMAILS（允许接收验证码的邮箱，逗号分隔）
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

/* ---------------- 验证码：Brevo API 发信 ---------------- */
async function sendCode(env, email) {
  if (!env.BREVO_KEY) {
    return json({ ok: false, message: "Brevo API Key 未配置：注册 brevo.com 并验证发件人后，把 API Key 填入 Pages 环境变量 BREVO_KEY" }, 500);
  }
  const allow = String(env.ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (allow.length && !allow.includes(email)) {
    return json({ ok: false, message: "该邮箱不在管理员名单里" }, 403);
  }
  /* 60 秒重发冷却：冷却键 TTL 60s 自动消失 */
  const cd = await env.BLOG_DATA.get("code:cd:" + email);
  if (cd) return json({ ok: false, message: "发送太频繁，请 1 分钟后再试" }, 429);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_KEY, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "拾光小栈", email: env.MAIL_SENDER },
      to: [{ email }],
      subject: "拾光小栈后台登录验证码",
      textContent: `你的后台登录验证码是：${code}\n\n5 分钟内有效。若非本人操作请忽略本邮件。`,
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    return json({ ok: false, message: "Brevo 发送失败（" + r.status + "）：" + t.slice(0, 140) }, 502);
  }
  await env.BLOG_DATA.put("code:" + email, code, { expirationTtl: 300 });  /* 5 分钟有效 */
  await env.BLOG_DATA.put("code:cd:" + email, "1", { expirationTtl: 60 });
  return json({ ok: true, message: "验证码已发送到 " + email });
}

async function verifyCode(env, email, code) {
  const saved = await env.BLOG_DATA.get("code:" + email);
  if (!saved || saved !== code) {
    return json({ ok: false, message: "验证码错误或已过期" }, 403);
  }
  await env.BLOG_DATA.delete("code:" + email);
  await env.BLOG_DATA.delete("code:cd:" + email);
  return json({ ok: true, token: await makeToken(env) });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: JSON_HEADERS });

    const url = new URL(request.url);
    const name = url.pathname.replace(/^\/api\//, "").replace(/\.json$/, "").replace(/^\//, "");

    if (url.pathname === "/api/sendcode" && request.method === "POST") {
      let body;
      try { body = await request.json(); }
      catch (e) { return json({ ok: false, message: "请求格式错误" }, 400); }
      return await sendCode(env, String(body.email || "").trim().toLowerCase());
    }
    if (url.pathname === "/api/verifycode" && request.method === "POST") {
      let body;
      try { body = await request.json(); }
      catch (e) { return json({ ok: false, message: "请求格式错误" }, 400); }
      return await verifyCode(env, String(body.email || "").trim().toLowerCase(), String(body.code || "").trim());
    }

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

    if (!NAMES.includes(name)) return json({ ok: false, message: "未知数据名称" }, 404);

    if (request.method === "GET") {
      try {
        const v = await env.BLOG_DATA.get("data:" + name);
        return json({ ok: true, data: v ? JSON.parse(v) : null });
      } catch (e) { return json({ ok: false, message: "读取失败" }, 500); }
    }

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
