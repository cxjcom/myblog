# -*- coding: utf-8 -*-
"""拾光小栈本地服务器：静态站点 + 个人资料同步。

用途：python scripts/dev_server.py [端口]（默认 8080，仅监听本机 127.0.0.1）

在浏览器里编辑并保存个人资料时，页面会把资料 POST 到 /api/profile，
本服务器将其写入 data/profile.json，并自动执行：
    git add data/profile.json
    git commit -m "chore: 更新个人资料（data/profile.json）"
    git push
推送到 GitHub 后，GitHub Pages 会自动重新部署，所有设备即可看到最新资料。
"""
import json
import subprocess
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "profile.json"

# 允许写入的字段白名单（与 assets/js/profile.js 的 PROFILE_DEFAULTS 对应）
ALLOWED_KEYS = [
    "siteName", "name", "motto", "bio", "location", "github", "email",
    "qq", "wechat", "birthday", "job", "yearGoal", "tags", "avatar", "joined",
]

COMMIT_MSG = "chore: 更新个人资料（data/profile.json）"


class BlogHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        path = self.path.split("?")[0]
        if path == "/api/profile":
            self._save_profile()
        elif path == "/api/posts":
            self._save_posts()
        else:
            self.send_error(404, "只有 /api/profile 与 /api/posts 支持 POST")
            return

    def _read_json_body(self, err_label):
        length = int(self.headers.get("Content-Length") or 0)
        try:
            raw = self.rfile.read(length).decode("utf-8", "replace")
            body = json.loads(raw or "{}")
        except Exception as e:
            self._reply(400, {"ok": False, "message": err_label + "格式不正确：%s" % e})
            return None
        return body

    def _save_profile(self):
        body = self._read_json_body("资料")
        if body is None:
            return
        if not isinstance(body, dict):
            self._reply(400, {"ok": False, "message": "资料必须是 JSON 对象"})
            return

        clean = {k: body[k] for k in ALLOWED_KEYS if k in body}
        new_text = json.dumps(clean, ensure_ascii=False, indent=2) + "\n"
        if DATA_FILE.exists() and DATA_FILE.read_text(encoding="utf-8") == new_text:
            self._reply(200, {"ok": True, "pushed": False, "message": "资料没有变化，跳过提交"})
            return

        try:
            DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
            # newline="\n" 固定 LF 行尾，避免 Windows 下 CRLF 造成"内容没变却反复提交"
            with open(DATA_FILE, "w", encoding="utf-8", newline="\n") as f:
                f.write(new_text)
        except OSError as e:
            self._reply(500, {"ok": False, "message": "写入 data/profile.json 失败：%s" % e})
            return

        pushed, message = self._git_sync("data/profile.json", COMMIT_MSG)
        self._reply(200, {"ok": True, "pushed": pushed, "message": message})

    def _save_posts(self):
        """站主写作页发布：保存完整自定义文章列表到 data/posts.json。"""
        body = self._read_json_body("文章列表")
        if body is None:
            return
        if not isinstance(body, list):
            self._reply(400, {"ok": False, "message": "文章列表必须是 JSON 数组"})
            return

        new_text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
        target = ROOT / "data" / "posts.json"
        if target.exists() and target.read_text(encoding="utf-8") == new_text:
            self._reply(200, {"ok": True, "pushed": False, "message": "内容没有变化，跳过提交"})
            return

        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            with open(target, "w", encoding="utf-8", newline="\n") as f:
                f.write(new_text)
        except OSError as e:
            self._reply(500, {"ok": False, "message": "写入 data/posts.json 失败：%s" % e})
            return

        pushed, message = self._git_sync(
            "data/posts.json", "chore: 更新文章（data/posts.json）"
        )
        self._reply(200, {"ok": True, "pushed": pushed, "message": message})

    def _git_sync(self, rel_path, message):
        def run(*args):
            return subprocess.run(args, cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8")

        run("git", "add", rel_path)
        commit = run("git", "commit", "-m", message)
        if commit.returncode != 0:
            return False, "内容已写入，但提交失败：" + (commit.stderr or commit.stdout).strip()[-200:]
        push = run("git", "push")
        if push.returncode != 0:
            return False, "已提交到本地仓库，但推送到 GitHub 失败：" + (push.stderr or push.stdout).strip()[-200:]
        return True, "已写入 %s 并推送到 GitHub" % rel_path

    def _reply(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        sys.stderr.write("[dev_server] %s\n" % (fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print("拾光小栈本地服务器：http://127.0.0.1:%d" % port)
    print("编辑资料将写入 data/profile.json 并自动提交推送到 GitHub（Ctrl+C 退出）")
    server = ThreadingHTTPServer(("127.0.0.1", port), BlogHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == "__main__":
    main()
