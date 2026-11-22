"""معاينة محلية: python tools/serve.py  ← افتح http://localhost:8765
بيعرض فولدر web، وأي طلب audio/<id>.mp3 أو audio/<id>_<part>.mp3 بيتجاب من الملف الأصلي على الجهاز."""
import json
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
AMAP = json.loads((SITE / "tools" / "audio_map.json").read_text(encoding="utf-8"))


class H(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        m = re.match(r"^/audio/(\d+)(?:_(\d+))?\.mp3", path)
        if m and m.group(1) in AMAP:
            files = AMAP[m.group(1)]
            return files[int(m.group(2) or 1) - 1]
        return super().translate_path(path)

    def do_GET(self):
        if self.path.startswith("/api/dl"):
            from urllib.parse import parse_qs, quote, urlparse
            q = parse_qs(urlparse(self.path).query)
            i, part = q.get("id", [""])[0], int(q.get("p", ["1"])[0] or 1)
            db = json.loads((SITE / "web" / "lessons.json").read_text(encoding="utf-8"))
            L = db["lessons"].get(i)
            if not L or i not in AMAP:
                return self.send_error(404)
            sh = next((x["name"] for x in db["sheikhs"] if x["key"] == L["s"]), "")
            name = L["t"] + (f" - الشيخ {sh}" if sh else "") + (f" ({part})" if L["p"] > 1 else "")
            f = Path(AMAP[i][part - 1])
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Disposition", f"attachment; filename=\"{i}.mp3\"; filename*=UTF-8''{quote(name + '.mp3')}")
            self.send_header("Content-Length", str(f.stat().st_size))
            self.end_headers()
            with open(f, "rb") as fh:
                try:
                    while chunk := fh.read(65536):
                        self.wfile.write(chunk)
                except (ConnectionResetError, BrokenPipeError):
                    pass
            return
        m = re.match(r"^/audio/(\d+)(?:_(\d+))?\.mp3", self.path)
        if not m:
            # صفحات الموقع (/s/...، /c/...) كلها بتتعرض من index.html
            local = Path(super().translate_path(self.path))
            if not local.exists():
                self.path = "/index.html"
            return super().do_GET()
        if m.group(1) not in AMAP:
            return self.send_error(404)
        f = Path(AMAP[m.group(1)][int(m.group(2) or 1) - 1])
        size = f.stat().st_size
        start, end = 0, size - 1
        r = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
        if r:
            start = int(r.group(1) or 0)
            end = int(r.group(2)) if r.group(2) else size - 1
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        with open(f, "rb") as fh:
            fh.seek(start)
            left = end - start + 1
            try:
                while left > 0:
                    chunk = fh.read(min(65536, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
            except (ConnectionResetError, BrokenPipeError):
                pass

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print("http://localhost:8765")
    ThreadingHTTPServer(("127.0.0.1", 8765), partial(H, directory=str(SITE / "web"))).serve_forever()
