"""يطبّق تصحيحات الوصف (fixes/fix_*.json) على رسايل القناة بالبوت، ويسجلها في fixes/applied.json.
python tools/apply_fixes.py fixes/fix_dup_titles.json
(بيتشغل بس بعد ما صاحب القناة يقول «ارفع»)"""
import json
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SITE.parent / "scripts"))
import tg  # noqa: E402  (التوكن بيتقري جوه tg.py — عمره ما يتطبع)

APPLIED = SITE / "fixes" / "applied.json"
done = set(json.loads(APPLIED.read_text(encoding="utf-8"))) if APPLIED.exists() else set()
for x in json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")):
    r = tg.api("editMessageCaption", chat_id=tg.CHANNEL, message_id=x["id"], caption=x["html"], parse_mode="HTML")
    ok = r.get("ok") or "not modified" in r.get("description", "")
    print(x["id"], "✓" if ok else f"✗ {r.get('description')}")
    if ok:
        done.add(x["id"])
APPLIED.write_text(json.dumps(sorted(done)), encoding="utf-8")
