# Cloudflare Worker 后端部署指南（全程面板操作，无需装任何工具）

> 部署完成后：后台在**任何设备**（包括手机）都能打开，保存**立即全站生效**，不再依赖本地电脑。

## 第一步：创建 KV 存储桶

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com) → 左侧 **存储和数据库（Storage & Databases）** → **KV**
2. **Create a namespace** → 名称填 `BLOG_DATA` → Add

## 第二步：创建 Worker

1. 左侧 **Workers 和 Pages（Workers & Pages）** → **Create** → **Create Worker**
2. 名称填 `blog-api` → **Deploy**（先用默认代码部署）
3. 部署后点 **Edit code（编辑代码）** → 删光默认代码 → 把本目录 `worker.js` 的全部内容粘贴进去 → 右上 **Deploy**
4. 回到 Worker 页面，顶部能看到你的接口地址，形如：
   `https://blog-api.你的子域.workers.dev` —— **复制这个地址**

## 第三步：绑定 KV 与两个变量

Worker 页面 → **Settings（设置）** → **Bindings（绑定）**：

1. **KV Namespace Bindings** → Add binding：
   - Variable name：`BLOG_DATA`
   - KV namespace：选 `BLOG_DATA`
2. **Variables and Secrets** → Add variable（类型 Text）两次：
   - Variable name：`ADMIN_PASS`，Value：你给后台定的密码（别用测试值）
   - Variable name：`API_SIGN`，Value：随便一串长随机字符（比如乱敲 40 个字母数字）

每次改完变量都需要点 Deploy 生效。

## 第四步：博客接入

1. 编辑仓库里的 `assets/js/cloud-config.js`，把第一行改成：
   ```js
   window.CLOUD_API = "https://blog-api.你的子域.workers.dev";
   ```
   （提交推送到 GitHub；本地改完刷新即见）
2. 打开后台 → 登录页展开「**Cloudflare 云端登录**」→ 输入第三步设置的 `ADMIN_PASS` → 登录
3. 之后在后台保存任何内容 → **前台立即生效**（访客刷新即见，无构建等待）

## 验证

- 浏览器直接访问 `https://blog-api.你的子域.workers.dev/api/profile`
  看到 `{"ok":true,"data":...}` 即 Worker 正常
- 后台改一个资料 → 打开前台个人主页刷新 → 内容已变 ✓

## 免费额度（个人绰绰有余）

| 项目 | 免费额度 |
|---|---|
| Worker 请求数 | 10 万次/天 |
| KV 读取 | 10 万次/天 |
| KV 写入 | 1 千次/天 |
| 存储 | 1 GB |

## 常见问题

- **保存返回 401**：令牌过期（7 天）或 API_SIGN 改过——重新用密码登录即可
- **前台读不到新数据**：检查 cloud-config.js 的地址是否与 Worker 地址一致、Worker 是否绑定了 KV
- **想在本地后台也走云端**：本地服务器开着时优先走本地 /api（秒写文件），关掉本地服务器后自动走云端，无需切换
