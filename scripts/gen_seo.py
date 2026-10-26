#!/usr/bin/env python3
"""从 assets/js/posts.js 自动生成 feed.xml 与 sitemap.xml。
本地或 GitHub Actions 中运行：python scripts/gen_seo.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://cxjcom.github.io/myblog"
PAGES = [
    ("", 1.0, "2026-10-26"),
    ("blog.html", 0.9, "2026-10-26"),
    ("archive.html", 0.7, "2026-10-26"),
    ("projects.html", 0.6, "2026-10-26"),
    ("links.html", 0.5, "2026-10-26"),
    ("about.html", 0.6, "2026-10-26"),
    ("album.html", 0.6, "2026-10-26"),
    ("music.html", 0.6, "2026-10-26"),
    ("profile.html", 0.4, "2026-10-26"),
    ("themes.html", 0.4, "2026-10-26"),
]


def load_posts():
    src = (ROOT / "assets/js/posts.js").read_text(encoding="utf-8")
    body = src[src.index("["): src.rindex("]") + 1]
    # JS 对象字面量 → JSON：键名加引号，去掉尾逗号
    body = re.sub(r"([{,]\s*)([A-Za-z_]\w*)\s*:", r'\1"\2":', body)
    body = re.sub(r",\s*([}\]])", r"\1", body)
    posts = json.loads(body)
    return sorted(posts, key=lambda p: p["date"], reverse=True)


def esc(s):
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def gen_feed(posts):
    items = []
    for p in posts[:15]:
        link = f"{BASE}/posts/{p['slug']}.html"
        items.append(
            f"    <item>\n"
            f"      <title>{esc(p['title'])}</title>\n"
            f"      <link>{link}</link>\n"
            f"      <guid isPermaLink=\"true\">{link}</guid>\n"
            f"      <pubDate>{p['date']}</pubDate>\n"
            f"      <description>{esc(p['summary'])}</description>\n"
            f"    </item>"
        )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        f"    <title>拾光小栈</title>\n"
        f"    <link>{BASE}/</link>\n"
        f"    <atom:link href=\"{BASE}/feed.xml\" rel=\"self\" type=\"application/rss+xml\"/>\n"
        "    <description>记录、思考与热爱</description>\n"
        "    <language>zh-CN</language>\n"
        + "\n".join(items)
        + "\n  </channel>\n</rss>\n"
    )


def gen_sitemap(posts):
    urls = [f"  <url><loc>{BASE}/{p + '' if not p else p}</loc><lastmod>{m}</lastmod><priority>{pr}</priority></url>"
            for p, pr, m in PAGES]
    urls += [
        f"  <url><loc>{BASE}/posts/{p['slug']}.html</loc><lastmod>{p['date']}</lastmod><priority>0.8</priority></url>"
        for p in posts
    ]
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )


def main():
    posts = load_posts()
    (ROOT / "feed.xml").write_text(gen_feed(posts), encoding="utf-8", newline="\n")
    (ROOT / "sitemap.xml").write_text(gen_sitemap(posts), encoding="utf-8", newline="\n")
    print(f"feed.xml + sitemap.xml generated for {len(posts)} posts")


if __name__ == "__main__":
    main()
