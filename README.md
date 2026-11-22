# موقع مسجد الحَسَنِي

🌐 **https://masjed-alhasany.vercel.app** (Vercel — كل push على main بيتنشر لوحده)

موقع ثابت (من غير سيرفر): الزائر يختار **الشيخ ← السلسلة ← الدروس** ويسمع من الموقع مباشرة، وفيه **آخر المستجدات** وبحث وزرار قناة التليجرام.
بيعرض **محتوى القناة بالظبط** — مفيش أي مقطع من برّه القناة.

## الملفات
| الملف | وظيفته |
|---|---|
| `web/` | الموقع نفسه (index.html + app.js + style.css + lessons.json) — ده اللي بيتنشر على Vercel (Output Directory = web) — كل push بيتنشر لوحده |
| `web/img/sheikhs/<اسم_الشيخ>.jpg` | صورة الشيخ (مثلًا `يحيى_زكريا.jpg`) — أول ما تتحط وتشغّل البناء تظهر لوحدها |
| `tools/build_data.py` | يبني `web/lessons.json` من `../data` و`../scripts/gen_series.py` (قراءة بس) |
| `tools/serve.py` | معاينة على الجهاز: `python tools/serve.py` ← http://localhost:8765 (الصوت من الملفات المحلية) |
| `tools/update_site.py` | **التحديث الأسبوعي بخطوة واحدة**: يبني ← يرفع الصوت الجديد على GitHub Releases ← push |
| `tools/missing_audio.txt` | مقاطع في القناة ملفها مش لاقيه على الجهاز (بتظهر في الموقع بزرار تليجرام بس) |

## مصدر البيانات
- المقاطع: `data/channel_audio.json` + الرسايل الأحدث اللي في `data/todo.json` ووصفها اترفع (`captions/*.applied.json`).
- العناوين: أحدث وصف من `data/captions` (العنوان بعد `|`)، وعناوين الفهارس من `gen_series.py` هي المعتمدة للسلاسل.
- الصوت على الموقع: `https://github.com/buggYateer/alhasany-site/releases/download/audio-<رقم الرسالة ÷ 500>/<رقم الرسالة>.mp3`

## التحديث الأسبوعي
```
python tools/update_site.py
```
(`--dry` يوري هيعمل إيه من غير ما يرفع، و`--no-push` يرفع الصوت من غير ما ينشر الموقع)
