"""يبني web/lessons.json من بيانات القناة (قراءة فقط من ../data و ../scripts).
python tools/build_data.py
المصدر: data/channel_audio.json (كل المقاطع الصوتية اللي في القناة) + أحدث وصف من data/captions
+ قوايم السلاسل من scripts/gen_series.py. مفيش أي مقطع بيتضاف من برّه القناة."""
import glob
import html
import json
import re
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
ROOT = SITE.parent
DATA = ROOT / "data"

# --- قوايم السلاسل: ناخد تعريف SERIES من gen_series.py من غير ما نشغّل الجزء اللي بيكتب ملفات
src = (ROOT / "scripts" / "gen_series.py").read_text(encoding="utf-8")
ns = {"__file__": str(ROOT / "scripts" / "gen_series.py")}
exec(src[: src.index("\nNUM =")], ns)
SERIES = ns["SERIES"]

# --- أحدث وصف لكل رسالة
cap = {}
files = sorted(glob.glob(str(DATA / "captions" / "batch_*.json"))) + sorted(glob.glob(str(DATA / "captions" / "fix_*.json")))
for f in files:
    if ".applied." in f:
        continue
    for x in json.loads(Path(f).read_text(encoding="utf-8")):
        cap[x["id"]] = x["html"]

msgs = json.loads((DATA / "channel_audio.json").read_text(encoding="utf-8"))

# --- رسايل اتنشرت بعد لقطة channel_audio.json: موجودة في todo.json ووصفها اترفع بنجاح (applied ok)
todo = {x["id"]: x for x in json.loads((DATA / "todo.json").read_text(encoding="utf-8"))}
applied = set()
for f in glob.glob(str(DATA / "captions" / "*.applied.json")):
    applied |= {x["id"] for x in json.loads(Path(f).read_text(encoding="utf-8")) if x.get("ok")}
known = {m["id"] for m in msgs}
DUR_CACHE = SITE / "tools" / "durations.json"
durs = json.loads(DUR_CACHE.read_text(encoding="utf-8")) if DUR_CACHE.exists() else {}


def duration(path):
    if path in durs:
        return durs[path]
    import subprocess
    try:
        sec = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                                   capture_output=True, text=True).stdout.strip())
        durs[path] = f"{int(sec // 60)}:{int(sec % 60):02d}" if sec < 3600 else f"{int(sec // 3600)}:{int(sec % 3600 // 60):02d}:{int(sec % 60):02d}"
    except ValueError:
        durs[path] = ""
    return durs[path]


for i in sorted(applied - known):
    if i in todo:
        msgs.append({"id": i, "t": todo[i]["title"], "d": todo[i]["dur"] or duration(todo[i]["file"]), "c": "", "l": []})
msgs.sort(key=lambda m: m["id"])
DUR_CACHE.write_text(json.dumps(durs, ensure_ascii=False, indent=0), encoding="utf-8")

SHORT = {"يحيى": "يحيى_زكريا", "أحمد": "أحمد_عبدالسلام", "سيد": "سيد_عبدالعال", "معاذ": "معاذ_زكريا"}
AUDIO_BASE = "https://github.com/buggYateer/alhasany-site/releases/download"
MAIN = ["يحيى_زكريا", "أحمد_عبدالسلام", "سيد_عبدالعال", "معاذ_زكريا"]


def plain(h):
    return html.unescape(re.sub(r"<[^>]+>", "", h))


def title_of(m, text):
    first = text.strip().split("\n")[0].strip()
    first = re.sub(r"^[^\w#«(\"]+", "", first)  # إيموجي في الأول
    if "|" in first:
        t = first.split("|", 1)[1]
    elif first.startswith("#"):
        t = ""
    elif "||" in m["t"]:
        t = m["t"].split("||")[0]
    else:
        q = re.search(r'(?:بعنوان|عن)\s*["«](.+?)["»]', first)
        t = q.group(1) if q else first
    t = re.sub(r"#(\S+)", lambda g: g.group(1).replace("_", " "), t).strip(" -–")
    if not t:
        t = re.sub(r"\.mp3$", "", m["t"])
    return t


def kind_of(text, name):
    s = text + " " + name
    if "#خطبة_الجمعة" in s or name.startswith("خطبة") or "خطبة" in text.split("\n")[0]:
        return "khutba"
    if "تلاوة" in s or name.startswith("عشاء") or name.startswith("صلاة"):
        return "tilawa"
    if "أذان" in s:
        return "other"
    return "lesson"


def sheikh_of(text, name):
    m = re.search(r"الشيخ\s*#(\S+)", text)
    if m:
        return m.group(1).strip("–-")
    m = re.search(r"(?:ال|ل)شيخ\s+(\S+\s+\S+)", text)
    if m:
        return m.group(1).strip(" –-").replace(" ", "_")
    m = re.search(r"ش\s+([^\s.]+)", name.replace(".mp3", ""))
    if m:
        return SHORT.get(m.group(1), m.group(1))
    return ""


def hijri_of(name, text):
    m = re.search(r"(\d{1,2})-(\d{1,2})-(14\d\d)", name)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = re.search(r"#(\S+?)_(14\d\d)هـ", text)
    return f"{m.group(1).replace('_', ' ')} {m.group(2)}" if m else ""


lessons = {}
for m in msgs:
    text = plain(cap.get(m["id"], m.get("c") or ""))
    lessons[m["id"]] = {
        "t": title_of(m, text),
        "s": sheikh_of(text, m["t"]),
        "k": kind_of(text, m["t"]),
        "d": m.get("d", ""),
        "h": hijri_of(m["t"], text),
    }

# --- السلاسل (بترتيب الفهرس) والعنوان اللي في الفهرس هو المعتمد
in_series = set()
series_by_sheikh = {}
for s in SERIES:
    secs = []
    n = 0
    for sec, items in s["sections"]:
        ids = []
        for i, t in items:
            if i not in lessons:
                continue
            n += 1
            lessons[i]["t"] = t
            lessons[i]["k"] = "lesson"
            if s.get("numbered"):
                lessons[i]["n"] = n
            ids.append(i)
            in_series.add(i)
        if ids:
            secs.append({"t": sec, "ids": ids})
    series_by_sheikh.setdefault(s["sheikh"], []).append({"key": s["key"], "title": s["title"], "sections": secs})

# --- الصفحات حسب الشيخ
ramadan = [m["id"] for m in msgs if "رمضان 1447" in m["t"]]
# مقاطع من غير شيخ معروف ونازلة وسط ليالي رمضان (زي «تذكرة مع بداية الاعتكاف») تتبع رمضان
ramadan += [i for i in lessons if not lessons[i]["s"] and min(ramadan) < i < max(ramadan) and i not in ramadan]
ramadan.sort()
for i in ramadan:
    lessons[i]["t"] = re.sub(r"\.mp3$", "", [m for m in msgs if m["id"] == i][0]["t"].split("||")[0]).strip()
sheikhs = {}
for i in sorted(lessons):
    L = lessons[i]
    key = L["s"] or "غير_محدد"
    if i in ramadan:
        continue
    sh = sheikhs.setdefault(key, {"key": key, "name": key.replace("_", " "), "lesson": [], "khutba": [], "tilawa": [], "other": []})
    if i in ramadan:
        continue
    if i not in in_series:
        sh[L["k"]].append(i)
for key, ser in series_by_sheikh.items():
    sheikhs.setdefault(key, {"key": key, "name": key.replace("_", " "), "lesson": [], "khutba": [], "tilawa": [], "other": []})["series"] = ser

def weight(sh):
    if sh["key"] in MAIN:
        return (0, MAIN.index(sh["key"]))
    total = sum(len(sh[k]) for k in ("lesson", "khutba", "tilawa", "other"))
    return (1, -total)

for sh in sheikhs.values():
    sh["main"] = sh["key"] in MAIN
    for ext in ("jpg", "jpeg", "png", "webp"):
        if (SITE / "web" / "img" / "sheikhs" / f"{sh['key']}.{ext}").exists():
            sh["img"] = f"img/sheikhs/{sh['key']}.{ext}"
            break

out = {
    "channel": "masjed_alhasany",
    "audioBase": AUDIO_BASE,
    "sheikhs": sorted(sheikhs.values(), key=weight),
    "collections": [{"key": "ramadan1447", "title": "ليالي رمضان 1447هـ", "ids": ramadan}],
    "lessons": {str(k): v for k, v in lessons.items()},
}
(SITE / "web").mkdir(exist_ok=True)
(SITE / "web" / "lessons.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

print("مقاطع:", len(lessons), "| في سلاسل:", len(in_series), "| مشايخ:", len(sheikhs))
for sh in out["sheikhs"]:
    print(f"  {sh['name']}: سلاسل {len(sh.get('series', []))} دروس {len(sh['lesson'])} خطب {len(sh['khutba'])} تلاوات {len(sh['tilawa'])} أخرى {len(sh['other'])}")

# --- ربط كل مقطع بملفه على الجهاز (للرفع وللمعاينة المحلية) — ملف خاص مش بيتنشر
DIRS = [Path(r"D:\الحَسَنِي\مقصوص"), ROOT / "مقصوص_كلود", SITE / "audio_from_telegram"]
def nkey(n):
    n = re.sub(r"(\.mp3)+$", "", n.strip())
    n = re.sub(r"\s*\(\d+\)$", "", n).replace("_", " ")
    return re.sub(r"\s+", " ", n).strip()


index = {}
for d in DIRS:
    for f in d.rglob("*.mp3"):
        index.setdefault(nkey(f.name), str(f))
amap, missing = {}, []
for m in msgs:
    parts = [x.strip() for x in m["t"].split("||") if x.strip()]
    found = []
    for n in parts:
        p = m["file"] if m.get("file") and len(parts) == 1 and Path(m["file"]).exists() else todo[m["id"]]["file"] if m["id"] in todo and len(parts) == 1 and Path(todo[m["id"]]["file"]).exists() else index.get(nkey(n))
        if p:
            found.append(p)
    if found and len(found) == len(parts):
        amap[m["id"]] = found
    else:
        missing.append((m["id"], m["t"][:60]))
(SITE / "tools" / "audio_map.json").write_text(json.dumps(amap, ensure_ascii=False, indent=0), encoding="utf-8")
# p = عدد أجزاء الصوت المتاحة (0 = لسه مش مرفوع ← زرار تليجرام بس)
for k, L in out["lessons"].items():
    L["p"] = len(amap.get(int(k), []))
(SITE / "web" / "lessons.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("ملفات صوت لاقيتها:", len(amap), "| ناقص:", len(missing))
(SITE / "tools" / "missing_audio.txt").write_text("\n".join(f"{i}\t{t}" for i, t in missing), encoding="utf-8")
