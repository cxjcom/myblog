# 拾光小栈 · 个人博客

一个**零依赖**的纯静态个人博客：不需要 Node 构建、不需要安装任何包，打开 HTML 就是完整网站，托管在 GitHub Pages 上。

> 🌐 在线访问：<https://cxjcom.github.io/myblog/>

## ✨ 功能亮点

- **首页**：打字机主视觉、精选/最新文章、站点统计、每日「一言」
- **博客列表**：标签筛选 + 实时搜索，卡片式排版
- **全站搜索**：任意页面按 `Ctrl + K`（或 `/`）唤起，`↑` `↓` 选择、`Enter` 打开
- **文章页**：阅读进度条、自动目录（TOC）、代码块一键复制、上一篇/下一篇、相关文章推荐
- **点赞与分享**：本地收藏喜欢文章，一键复制文章链接
- **归档页**：按年份分组的时间线，附累计字数统计
- **项目 / 友链 / 关于**：卡片式展示，全部内容可直接改 HTML
- **主题背景**：右上角调色板按钮进入主题页，10 套「AI 壁纸 + 动态层」主题即时切换——每套底层是文生图模型生成的实景壁纸（缓慢推拉的 Ken Burns 镜头），上层叠加程序绘制的动态元素（飘落花瓣 / 萤火虫 / 流星 / 电路脉冲…）；内容置于磨砂玻璃底板之上，亮暗模式均可读
- **明暗双主题**：跟随系统 + 手动切换 + 本地记忆
- **氛围感**：极光渐变背景、粒子连线、鼠标光晕、滚动显现动效（尊重 `prefers-reduced-motion`）
- **SEO 与订阅**：RSS（`feed.xml`）、`sitemap.xml`、Open Graph、JSON-LD 结构化数据、PWA manifest
- **创意 404**：飞碟带走页面的错误页

## 📂 目录结构

```
myblog/
├── index.html            # 首页
├── blog.html             # 博客列表（搜索 + 标签）
├── archive.html          # 归档时间线
├── projects.html         # 项目展示
├── links.html            # 常用站点 + 友链
├── about.html            # 关于
├── 404.html              # 错误页（GitHub Pages 自动启用）
├── themes.html           # 主题背景选择页
├── posts/                # 文章目录
│   ├── _template.html    #   ★ 新文章模板：复制它！
│   └── hello-world.html  #   每篇文章一个 HTML
├── assets/
│   ├── css/style.css     # 全站样式（设计系统）
│   └── js/
│       ├── posts.js      # ★ 文章元数据（唯一数据源）
│       ├── backgrounds.js # ★ 背景主题库（新增背景：加一个画师 + 一条预设）
│       └── main.js       # 站点脚本 + 站点配置 SITE
├── feed.xml              # RSS 订阅（发布新文章后手动同步）
├── sitemap.xml / robots.txt
├── manifest.webmanifest / favicon.svg
└── .github/workflows/deploy.yml   # GitHub Pages 自动部署
```

## 🚀 本地预览

任选其一：

```bash
# Python（Windows 自带）
cd myblog
python scripts/dev_server.py 8787
# 打开 http://127.0.0.1:8787
```

> 推荐用 `scripts/dev_server.py` 而不是 `python -m http.server`：它额外支持在「个人主页 → 编辑资料」里保存资料后**自动写入 `data/profile.json` 并提交推送到 GitHub**，线上站点随之更新，所有设备看到的资料保持一致。

或直接双击 `index.html` 用浏览器打开（搜索等功能同样可用；个人资料以仓库 `data/profile.json` 为准，本机未同步的修改仅草稿保存在浏览器里）。

## ✍️ 如何写一篇新文章

1. 复制 `posts/_template.html`，重命名为 `my-first-post.html`（用英文 slug 作文件名）；
2. 替换文件里所有 `【】` 占位内容，正文写在 `<div class="post-body">` 里（就是普通 HTML：`<h2>` 小节、`<p>` 段落、`<pre><code class="language-js">` 代码块、`<blockquote>` 引用）；
3. 在 `assets/js/posts.js` 的 `POSTS` 数组**最前面**加一条元数据（slug 要和文件名一致）；
4. （可选）在 `feed.xml` 和 `sitemap.xml` 补一条记录；
5. 提交并推送，GitHub Actions 会自动部署上线。

## 🎨 如何个性化

| 想改什么 | 去哪里改 |
| --- | --- |
| 站名 / 作者 / 邮箱 / GitHub 链接 | 各页面 `<title>` 与页头页脚，`assets/js/main.js` 顶部 `SITE` |
| 主题色 / 渐变 / 圆角 | `assets/css/style.css` 顶部 `:root` 中的 CSS 变量 |
| 打字机文案 | `index.html` 中 `#typed` 的 `data-phrases`（用 `\|` 分隔） |
| 头像与介绍 | `about.html`、`index.html` 的 hero 区 |

## 💬 开启评论（giscus，可选）

1. 仓库保持 **Public**，并在 GitHub 仓库 Settings → General → Discussions 打勾；
2. 访问 <https://giscus.app/zh-CN>，按引导选择本仓库和分类，生成四项配置；
3. 把 `data-repo`、`data-repo-id`、`data-category-id` 填进 `assets/js/main.js` 顶部 `SITE.giscus`，保存即可——所有文章页会自动出现评论区。

## 🚢 部署

推送到 `main` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）会自动把站点发布到 GitHub Pages，约 1 分钟后生效。部署状态可在仓库的 **Actions** 标签页查看。

## ⏪ 版本管理与回滚指南

本仓库**每个功能阶段都是一次独立提交**，并打了版本标签，随时可以回到任意版本：

```bash
# 查看所有历史版本（一条一行）
git log --oneline
# 查看某个版本改了什么
git show v0.4.0 --stat

# ① 只想「看看」某个历史版本的代码（不改动当前分支）
git checkout v0.4.0        # 进入只读浏览状态
git checkout main          # 回到最新

# ② 想从某个历史版本「重新出发」继续开发（推荐）
git checkout -b new-start v0.4.0   # 以 v0.4.0 为起点开新分支

# ③ 不喜欢最近某次提交，想生成一个「反向提交」抵消它（安全，推荐）
git revert <提交哈希>

# ④ 彻底把分支重置回某个版本（危险：之后的提交会被丢弃！）
git reset --hard v0.4.0
git push --force           # 需要强推覆盖远程
```

> 建议日常用 ②③，④ 只在确定不要后面所有提交时使用。每次改动前先 `git add -A && git commit`，你的每一版都会安全地留在 GitHub 上。

## 📄 许可

代码以 [MIT](LICENSE) 许可开源；文章内容版权归作者所有。
