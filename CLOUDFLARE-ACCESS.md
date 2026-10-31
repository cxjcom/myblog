# Cloudflare Access 接入指南（保护私密页面与后台）

> 目标：让 `private.html`（私密空间）和 `admin.html`（后台控制台）在访问时必须先通过 Cloudflare 的身份验证（邮箱验证码登录），只有你能打开。

## 前提（缺一不可）

| 条件 | 说明 |
|---|---|
| 一个自己的域名 | 任意注册商（阿里云/腾讯云/Namesilo 等，几十元/年）。**github.io 域名无法使用 Cloudflare Access**，因为它由 GitHub 托管，Cloudflare 无法在前面拦截 |
| Cloudflare 免费账号 | Zero Trust 免费版支持最多 50 个用户，够用 |
| GitHub Pages 绑定该域名 | 让博客从 `你的域名` 也能访问 |

## 第一步：域名 DNS 托管到 Cloudflare

1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com) → Add a site → 输入你的域名 → 选 **Free 计划**
2. Cloudflare 会给两条 NS 服务器地址，去注册商那里把域名的 DNS 服务器改成这两条
3. 等待生效（几分钟到几小时）

## 第二步：GitHub Pages 绑定自定义域名

1. 仓库根目录新建 `CNAME` 文件，内容一行：`你的域名`（提交推送）
2. 仓库 Settings → Pages → Custom domain 填入域名 → Save；勾选 **Enforce HTTPS**
3. 回到 Cloudflare DNS 面板，添加记录：
   - 类型 `CNAME`，名称 `@`（或你想用的子域如 `blog`），目标 `cxjcom.github.io`，**代理状态：已代理（橙色云）**
4. Cloudflare 面板 → SSL/TLS → 概述 → 加密模式选 **Full（完全）**

验证：浏览器打开 `https://你的域名` 能看到博客即成功。

## 第三步：配置 Cloudflare Access

1. 打开 [one.dash.cloudflare.com](https://one.dash.cloudflare.com)（Zero Trust 控制台），首次进入选一个团队名，免费计划
2. 左侧 **Access → Applications → Add an application → Self-hosted**
3. Application configuration：
   - Application name：`博客私密页`
   - Session Duration：`1 month`（一个月内免重复验证，可自行调整）
   - Public hostname：`你的域名`，Path：`private.html`
   - 想连后台一起保护：再添加一条 Path `admin.html`（或改用通配 `admin.html` 单独建应用）
4. 下一步 Add policies：
   - Policy name：`only-me`
   - Action：**Allow**
   - Include → Selector 选 **Emails** → 填你自己的邮箱
5. 保存。首次会提示部署 Access 登录页（One-time PIN 默认启用，无需额外配置）

## 第四步：验证

- 无痕窗口访问 `https://你的域名/private.html` → 应先跳转到 Cloudflare 登录页 → 输入邮箱 → 收验证码 → 通过后才能看到页面
- 访问 `https://你的域名/`（首页）→ 不需要验证（Access 只拦你配置的路径）

## 注意事项

- **cxjcom.github.io 直连仍可达**：Access 只保护自定义域名这条入口。因此：
  - 私密页面的内容做了第二道保险——AES-GCM 密码加密、只存本机浏览器，拿不到页面源码里的任何明文
  - 想彻底堵死 github.io 入口，可以在 `private.html` / `admin.html` 的脚本里加一段「若 location.hostname 是 cxjcom.github.io 就跳回首页」的判断（目前未加，需要的话说一声）
- 手记数据存在浏览器 localStorage，**换电脑/清浏览器数据 = 手记消失**；忘记解锁密码 = 无法解密。重要的东西请另行备份
- Cloudflare 免费版的 Access 请求量对个人完全够用
