"""تحديث الموقع بخطوة واحدة:  python tools/update_site.py
1) يعيد بناء web/lessons.json من بيانات القناة (build_data.py)
2) يرفع ملفات الصوت الجديدة بس على GitHub Releases باسم <رقم الرسالة>.mp3 (مقاطع القناة بس — مفيش أي ملف زيادة)
3) يعمل commit + push ← GitHub Pages ينشر الموقع لوحده خلال دقيقة
اختيارات: --no-push (يرفع الصوت ويبني من غير push) | --dry (يوري هيعمل إيه بس)"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
REPO = "buggYateer/alhasany-site"
DRY = "--dry" in sys.argv
UPLOADED = SITE / "tools" / "uploaded.json"


def run(*cmd, check=True):
    print("  $", " ".join(cmd))
    if DRY:
        return ""
    return subprocess.run(cmd, check=check, capture_output=True, text=True, encoding="utf-8", cwd=SITE).stdout


def main():
    subprocess.run([sys.executable, str(SITE / "tools" / "build_data.py")], check=True)
    amap = json.loads((SITE / "tools" / "audio_map.json").read_text(encoding="utf-8"))
    done = set(json.loads(UPLOADED.read_text(encoding="utf-8"))) if UPLOADED.exists() else set()

    todo = [k for k in sorted(amap, key=int) if k not in done]
    print(f"ملفات جديدة للرفع: {len(todo)}")
    releases = set(run("gh", "release", "list", "-R", REPO, "--limit", "100", "--json", "tagName", "-q", ".[].tagName", check=False).split())
    tmp = Path(tempfile.mkdtemp())
    try:
        for k in todo:
            tag = f"audio-{int(k) // 500}"
            if tag not in releases:
                run("gh", "release", "create", tag, "-R", REPO, "--title", f"صوتيات {tag}", "--notes", "ملفات صوت موقع مسجد الحسني")
                releases.add(tag)
            parts = amap[k]
            files = []
            for i, src in enumerate(parts, 1):
                name = f"{k}.mp3" if len(parts) == 1 else f"{k}_{i}.mp3"
                dst = tmp / name
                if not DRY:
                    shutil.copyfile(src, dst)
                files.append(str(dst))
            run("gh", "release", "upload", tag, *files, "-R", REPO, "--clobber")
            done.add(k)
            if not DRY:
                UPLOADED.write_text(json.dumps(sorted(done, key=int)), encoding="utf-8")
                for f in files:
                    Path(f).unlink(missing_ok=True)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # الموقع المنشور يشغّل بس اللي اترفع فعلًا
    p = SITE / "web" / "lessons.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    for k, L in data["lessons"].items():
        if k not in done:
            L["p"] = 0
    if not DRY:
        p.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    if "--no-push" in sys.argv:
        return
    run("git", "add", "-A", "web", "tools", ".github", "README.md", ".gitignore")
    if run("git", "status", "--porcelain", check=False).strip() or DRY:
        run("git", "commit", "-m", "تحديث الموقع")
        run("git", "push")
    print("✓ تم — الموقع هيتحدث خلال دقيقة")


if __name__ == "__main__":
    main()
