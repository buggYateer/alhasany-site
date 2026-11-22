"""يجيب عدد المشاهدات لكل مقطع من صفحة الرسالة العامة على تليجرام (t.me/.../ID?embed=1)
ويحفظها في tools/views.json — build_data بيقراها لقسم «الأكثر استماعًا».
python tools/fetch_views.py"""
import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
OUT = SITE / "tools" / "views.json"


def parse(v):
    v = v.strip().upper().replace(",", "")
    mul = 1000 if v.endswith("K") else 1_000_000 if v.endswith("M") else 1
    try:
        return int(float(v.rstrip("KM")) * mul)
    except ValueError:
        return None


def views(i):
    try:
        req = urllib.request.Request(f"https://t.me/masjed_alhasany/{i}?embed=1&mode=tme", headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore")
        m = re.search(r'tgme_widget_message_views">([^<]+)<', html)
        return i, parse(m.group(1)) if m else None
    except Exception:
        return i, None


def main():
    ids = json.loads((SITE / "web" / "lessons.json").read_text(encoding="utf-8"))["lessons"].keys()
    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    with ThreadPoolExecutor(8) as ex:
        res = dict(ex.map(views, ids))
    got = {k: v for k, v in res.items() if v is not None}
    old.update(got)
    OUT.write_text(json.dumps(old, indent=0), encoding="utf-8")
    print(f"مشاهدات: {len(got)} من {len(res)}")


if __name__ == "__main__":
    main()
