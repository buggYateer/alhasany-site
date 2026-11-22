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
| `api/dl.js` | التحميل باسم الدرس بالعربي: `/api/dl?id=640` (دالة على Vercel بتجيب الملف من GitHub وتديه اسم «العنوان - الشيخ.mp3») |
| `fixes/` | تصحيحات بموافقة صاحب القناة: وصف (`fix_*.json` بعد تطبيقه في `applied.json`)، عناوين السلاسل، تواريخ، شيخ |
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

## الداشبورد (`/lawha-0ggtgy`)
تعديل عنوان/شيخ/نوع/تاريخ/سلسلة أي مقطع، إخفاؤه، إضافة مقطع جديد بملفه، والمختارات — من أي جهاز بباسورد.
- التعديلات بتتحفظ في `web/overrides.json` على GitHub (الموقع بيقراه فوق `lessons.json`)، وVercel بينشر لوحده.
- الصوت الجديد بيترفع في `incoming/<رقم الرسالة>.mp3` و GitHub Actions (`.github/workflows/incoming.yml`) بينقله لـ Release `audio-N` ويمسحه.
- `tools/update_site.py` بيعمل `git pull` الأول علشان ميكتبش فوق تعديلات الداشبورد.
- الإعداد (مرة واحدة): في Vercel ← Settings ← Environment Variables:
  - `ADMIN_PASSWORD`: باسورد الداشبورد
  - `GITHUB_TOKEN`: Fine-grained token محصور على `alhasany-site` بصلاحية Contents: Read and write
  - وبعدها Redeploy.

## تطبيق (PWA)
`manifest.webmanifest` + `sw.js`: الموقع يتثبت على الموبايل/الكمبيوتر كتطبيق (زرار في القائمة + شريط في الرئيسية مرة واحدة).
