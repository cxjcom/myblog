# -*- coding: utf-8 -*-
"""一次性脚本：dev_server.py 增加 /api/album /api/music /api/upload 后台端点"""
p = "scripts/dev_server.py"
s = open(p, encoding="utf-8", newline="").read()

# 1) 路由
old_route = '''        if path == "/api/profile":
            self._save_profile()
        elif path == "/api/posts":
            self._save_posts()
        else:
            self.send_error(404, "只有 /api/profile 与 /api/posts 支持 POST")
            return'''
new_route = '''        if path == "/api/profile":
            self._save_profile()
        elif path == "/api/posts":
            self._save_posts()
        elif path == "/api/album":
            self._save_list("album.json", "相册")
        elif path == "/api/music":
            self._save_list("music.json", "音乐")
        elif path == "/api/upload":
            self._save_upload()
        else:
            self.send_error(404, "只有 /api/profile /api/posts /api/album /api/music /api/upload 支持 POST")
            return'''
assert old_route in s, "route"
s = s.replace(old_route, new_route)

# 2) 通用列表保存 + 上传（插在 _save_posts 之后）
anchor = '''    def _git_sync(self, rel_path, message):'''
addition = '''    def _save_list(self, name, label):
        """后台通用：保存 data/<name>（JSON 数组）。"""
        body = self._read_json_body(label)
        if body is None:
            return
        if not isinstance(body, list):
            self._reply(400, {"ok": False, "message": label + "必须是 JSON 数组"})
            return

        new_text = json.dumps(body, ensure_ascii=False, indent=2) + "\\n"
        target = ROOT / "data" / name
        if target.exists() and target.read_text(encoding="utf-8") == new_text:
            self._reply(200, {"ok": True, "pushed": False, "message": "内容没有变化，跳过提交"})
            return

        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            with open(target, "w", encoding="utf-8", newline="\\n") as f:
                f.write(new_text)
        except OSError as e:
            self._reply(500, {"ok": False, "message": "写入 data/%s 失败：%s" % (name, e)})
            return

        pushed, message = self._git_sync("data/" + name, "chore: 更新%s（data/%s）" % (label, name))
        self._reply(200, {"ok": True, "pushed": pushed, "message": message})

    def _save_upload(self):
        """后台相册上传：{name, b64} → assets/img/gallery/<name>。"""
        body = self._read_json_body("上传内容")
        if body is None:
            return
        name = str(body.get("name") or "")
        b64 = str(body.get("b64") or "")
        if not name or not b64:
            self._reply(400, {"ok": False, "message": "缺少文件名或内容"})
            return
        name = os.path.basename(name).replace("\\\\", "/").split("/")[-1]
        if not re.match(r"^[\\w.\\-\\u4e00-\\u9fff]+$", name):
            self._reply(400, {"ok": False, "message": "文件名只允许中文、字母、数字、点、横线、下划线"})
            return
        if not re.search(r"\\.(jpe?g|png|gif|webp|avif|bmp)$", name, re.I):
            self._reply(400, {"ok": False, "message": "只支持图片文件（jpg/png/gif/webp/avif/bmp）"})
            return
        try:
            data = base64.b64decode(b64)
        except Exception as e:
            self._reply(400, {"ok": False, "message": "文件内容解码失败：%s" % e})
            return
        if len(data) > 12 * 1024 * 1024:
            self._reply(400, {"ok": False, "message": "图片超过 12MB，请先压缩"})
            return

        target_dir = ROOT / "assets" / "img" / "gallery"
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / name
        try:
            with open(target, "wb") as f:
                f.write(data)
        except OSError as e:
            self._reply(500, {"ok": False, "message": "写入图片失败：%s" % e})
            return

        pushed, message = self._git_sync(
            "assets/img/gallery/" + name, "chore: 上传相册图片（assets/img/gallery/%s）" % name
        )
        self._reply(200, {
            "ok": True, "pushed": pushed, "message": message,
            "path": "assets/img/gallery/" + name,
        })

    def _git_sync(self, rel_path, message):'''
assert anchor in s, "anchor"
s = s.replace(anchor, addition, 1)

# 3) 顶部 import：os、re、base64
old_imports = "import json"
if "import base64" not in s:
    s = s.replace("import json", "import base64\\nimport json\\nimport os\\nimport re", 1)

open(p, "w", encoding="utf-8", newline="").write(s)
print("dev_server.py updated")
