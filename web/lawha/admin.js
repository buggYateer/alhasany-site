"use strict";
/* داشبورد مسجد الحسني — بتعدّل web/overrides.json في GitHub، والموقع بيتنشر لوحده بعد كل حفظ */
const $ = s => document.querySelector(s), ad = $("#ad");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const KINDS = { lesson: "درس", khutba: "خطبة", tilawa: "تلاوة", other: "متفرقات" };
let TOKEN = null, REPO = null, DB = null, OV = null, OV_SHA = null, UPLOADS = {}, TAB = "list", Q = "", SEL = null;
const dirty = () => JSON.stringify(OV) !== ORIG || Object.keys(UPLOADS).length > 0;
let ORIG = "";

/* ---------- GitHub ---------- */
const gh = (path, opts = {}) => fetch(`https://api.github.com/repos/${REPO}/${path}`, {
  ...opts, headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", ...(opts.headers || {}) },
}).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || r.status); return j; });
const b64utf8 = s => btoa(unescape(encodeURIComponent(s)));
const utf8b64 = s => decodeURIComponent(escape(atob(s.replace(/\n/g, ""))));
async function putFile(path, contentB64, message, sha) {
  return gh(`contents/${path}`, { method: "PUT", body: JSON.stringify({ message, content: contentB64, branch: "main", ...(sha ? { sha } : {}) }) });
}

/* ---------- الدخول ---------- */
function loginView(err) {
  ad.innerHTML = `<div class="card login"><h2>دخول الداشبورد</h2>
    <form id="lf"><div class="fld"><span>الباسورد</span><input type="password" id="pw" autocomplete="current-password" required></div>
    <button class="btn" style="width:100%">دخول</button></form>${err ? `<div class="msg err">${esc(err)}</div>` : ""}</div>`;
  $("#lf").onsubmit = async e => {
    e.preventDefault();
    const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: $("#pw").value }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return loginView(j.error || "حصلت مشكلة في الدخول");
    TOKEN = j.token; REPO = j.repo;
    try { sessionStorage.setItem("adm", JSON.stringify(j)); } catch {}
    start();
  };
}

/* ---------- تحميل البيانات ---------- */
async function start() {
  ad.innerHTML = `<p class="loading">جاري تحميل البيانات…</p>`;
  try {
    DB = await fetch("/lessons.json", { cache: "no-cache" }).then(r => r.json());
    const f = await gh("contents/web/overrides.json?ref=main");
    OV = JSON.parse(utf8b64(f.content)); OV_SHA = f.sha;
  } catch (e) {
    if (String(e.message).includes("Bad credentials")) { try { sessionStorage.removeItem("adm"); } catch {} return loginView("مفتاح GitHub مش شغال — راجع GITHUB_TOKEN في Vercel"); }
    ad.innerHTML = `<div class="msg err">مقدرتش أحمّل البيانات: ${esc(e.message)}</div>`; return;
  }
  OV.edit ||= {}; OV.add ||= {}; OV.featured ||= [];
  ORIG = JSON.stringify(OV); UPLOADS = {};
  $("#pubBtn").hidden = false; $("#outBtn").hidden = false;
  render();
}

/* ---------- مساعدات ---------- */
const sheikhs = () => DB.sheikhs.map(s => [s.key, s.name]);
const shName = k => (DB.sheikhs.find(s => s.key === k) || {}).name || "";
const seriesOpts = () => DB.sheikhs.flatMap(sh => (sh.series || []).flatMap(se => (se.sections.length > 1 ? se.sections : [{ t: "" }]).map(sec => [`${se.key}|${sec.t || ""}`, `${se.title}${sec.t ? " — " + sec.t : ""} (${sh.name})`])));
function seriesOf(id) {
  for (const sh of DB.sheikhs) for (const se of sh.series || []) for (const sec of se.sections) if (sec.ids.includes(+id)) return `${se.key}|${se.sections.length > 1 ? sec.t || "" : ""}`;
  return "";
}
function eff(id) { // البيانات بعد التعديلات
  const base = DB.lessons[id] || OV.add[id] || {};
  const e = OV.edit[id] || {};
  const L = { ...base };
  for (const f of ["t", "s", "k", "h", "d"]) if (e[f]) L[f] = e[f];
  L.series = e.series !== undefined ? `${e.series}|${e.sec || ""}` : (OV.add[id] ? `${OV.add[id].series || ""}|${OV.add[id].sec || ""}` : seriesOf(id));
  if (L.series === "|") L.series = "";
  L.hidden = !!e.hidden; L.isNew = !!OV.add[id] && !DB.lessons[id]; L.edited = !!OV.edit[id];
  return L;
}
const allIds = () => [...new Set([...Object.keys(DB.lessons), ...Object.keys(OV.add)])].map(Number).sort((a, b) => b - a);
const norm = s => String(s).replace(/[ً-ْ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
const opt = (pairs, v) => pairs.map(([k, t]) => `<option value="${esc(k)}"${k === v ? " selected" : ""}>${esc(t)}</option>`).join("");

function updatePub() {
  const n = Object.keys(OV.edit).length + Object.keys(OV.add).length;
  $("#pubBtn").disabled = !dirty();
  $("#pubBtn").textContent = dirty() ? "نشر التعديلات" : "مفيش تعديلات جديدة";
  return n;
}

/* ---------- العرض ---------- */
function render() {
  updatePub();
  const tabs = [["list", "المقاطع"], ["add", "إضافة مقطع"], ["feat", "المختارات"]];
  ad.innerHTML = `<div class="tabs">${tabs.map(([k, t]) => `<button data-tab="${k}" class="${TAB === k ? "on" : ""}">${t}</button>`).join("")}</div><div id="pane"></div>`;
  ad.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { TAB = b.dataset.tab; SEL = null; render(); });
  ({ list: listView, add: addView, feat: featView })[TAB]();
}

function listView() {
  const ids = allIds().filter(i => !Q || norm(`${i} ${eff(i).t} ${shName(eff(i).s)}`).includes(norm(Q)));
  $("#pane").innerHTML = `<div class="card"><div class="fld"><span>ابحث بالعنوان أو الشيخ أو رقم الرسالة</span><input id="q" value="${esc(Q)}" placeholder="مثلًا: الحسد أو 640"></div>
    <div id="edit"></div>
    <div>${ids.slice(0, 80).map(i => { const L = eff(i); return `<div class="lrow" data-id="${i}"><span class="id">${i}</span><div class="tt"><b>${esc(L.t)}</b><small>${esc(shName(L.s))} · ${KINDS[L.k] || ""}${L.h ? " · " + esc(L.h) : ""}</small></div>${L.isNew ? '<span class="tag new">جديد</span>' : ""}${L.hidden ? '<span class="tag hid">مخفي</span>' : L.edited ? '<span class="tag ed">متعدّل</span>' : ""}</div>`; }).join("")}</div>
    ${ids.length > 80 ? `<p class="hint">بيظهر أول 80 — استعمل البحث للباقي (${ids.length})</p>` : ""}</div>`;
  const q = $("#q"); q.oninput = () => { Q = q.value; const pos = q.selectionStart; listView(); const n = $("#q"); n.focus(); n.setSelectionRange(pos, pos); };
  ad.querySelectorAll(".lrow").forEach(r => r.onclick = () => { SEL = +r.dataset.id; editView(); window.scrollTo({ top: $("#edit").getBoundingClientRect().top + scrollY - 80, behavior: "smooth" }); });
  if (SEL) editView();
}

function editView() {
  const id = SEL, L = eff(id);
  $("#edit").innerHTML = `<div class="card" style="border-color:var(--gold)"><h2>تعديل المقطع ${id}</h2>
    <div class="fld"><span>العنوان</span><input id="e_t" value="${esc(L.t)}"></div>
    <div class="grid2">
      <div class="fld"><span>الشيخ</span><select id="e_s">${opt(sheikhs(), L.s)}</select></div>
      <div class="fld"><span>النوع</span><select id="e_k">${opt(Object.entries(KINDS), L.k)}</select></div>
      <div class="fld"><span>التاريخ الهجري (يوم-شهر-سنة)</span><input id="e_h" value="${esc(L.h)}" placeholder="7-6-1448"></div>
      <div class="fld"><span>السلسلة</span><select id="e_se"><option value="">— من غير سلسلة —</option>${opt(seriesOpts(), L.series)}</select></div>
    </div>
    <label class="chk"><input type="checkbox" id="e_hid"${L.hidden ? " checked" : ""}> إخفاء المقطع من الموقع</label>
    <label class="chk"><input type="checkbox" id="e_fe"${OV.featured.includes(id) ? " checked" : ""}> في المختارات (الصفحة الرئيسية)</label>
    <div class="row-btns"><button class="btn" id="e_save">حفظ</button>${OV.edit[id] ? '<button class="btn light" id="e_reset">رجّعه للأصل</button>' : ""}<button class="btn light" id="e_close">إغلاق</button>
    <a class="btn light" href="https://t.me/masjed_alhasany/${id}" target="_blank" rel="noopener">على تليجرام</a></div></div>`;
  $("#e_close").onclick = () => { SEL = null; $("#edit").innerHTML = ""; };
  if ($("#e_reset")) $("#e_reset").onclick = () => { delete OV.edit[id]; SEL = null; listView(); updatePub(); };
  $("#e_save").onclick = () => {
    const orig = DB.lessons[id] ? { ...DB.lessons[id], series: seriesOf(id) } : null;
    const v = { t: $("#e_t").value.trim(), s: $("#e_s").value, k: $("#e_k").value, h: $("#e_h").value.trim() }, se = $("#e_se").value;
    if (OV.add[id] && !DB.lessons[id]) { // مقطع مضاف من الداشبورد: نعدّله مباشرة
      Object.assign(OV.add[id], v, { series: se.split("|")[0] || "", sec: se.split("|")[1] || "" });
    } else {
      const e = {};
      for (const f of ["t", "s", "k", "h"]) if (v[f] && v[f] !== orig[f]) e[f] = v[f];
      if (se !== orig.series) { e.series = se.split("|")[0] || ""; e.sec = se.split("|")[1] || ""; }
      if ($("#e_hid").checked) e.hidden = true;
      if (Object.keys(e).length) OV.edit[id] = e; else delete OV.edit[id];
    }
    OV.featured = OV.featured.filter(x => x !== id); if ($("#e_fe").checked) OV.featured.unshift(id);
    SEL = null; listView(); updatePub();
    toast("اتحفظ — دوس «نشر التعديلات» فوق علشان يظهر على الموقع");
  };
}

function addView() {
  $("#pane").innerHTML = `<div class="card"><h2>إضافة مقطع جديد</h2>
    <p class="hint">للمقاطع اللي على القناة ومش موجودة على الموقع. اكتب رقم الرسالة على تليجرام (آخر رقم في لينكها) وارفع ملف الصوت.</p>
    <div class="grid2">
      <div class="fld"><span>رقم الرسالة على تليجرام</span><input id="a_id" inputmode="numeric" placeholder="مثلًا 650"></div>
      <div class="fld"><span>ملف الصوت (mp3)</span><input id="a_f" type="file" accept="audio/mpeg,.mp3"></div>
    </div>
    <div class="fld"><span>العنوان</span><input id="a_t"></div>
    <div class="grid2">
      <div class="fld"><span>الشيخ</span><select id="a_s">${opt(sheikhs(), "")}</select></div>
      <div class="fld"><span>النوع</span><select id="a_k">${opt(Object.entries(KINDS), "lesson")}</select></div>
      <div class="fld"><span>التاريخ الهجري (يوم-شهر-سنة)</span><input id="a_h" placeholder="7-6-1448"></div>
      <div class="fld"><span>السلسلة</span><select id="a_se"><option value="">— من غير سلسلة —</option>${opt(seriesOpts(), "")}</select></div>
    </div>
    <button class="btn" id="a_go">إضافة</button><div id="a_msg"></div></div>
    ${Object.keys(UPLOADS).length ? `<div class="card"><h2>مستني النشر</h2>${Object.keys(UPLOADS).map(i => `<div class="lrow"><span class="id">${i}</span><div class="tt"><b>${esc(OV.add[i]?.t)}</b><small>${esc(UPLOADS[i].name)} · ${(UPLOADS[i].size / 1e6).toFixed(1)} ميجا</small></div></div>`).join("")}</div>` : ""}`;
  $("#a_go").onclick = async () => {
    const id = $("#a_id").value.trim(), file = $("#a_f").files[0], t = $("#a_t").value.trim(), m = $("#a_msg");
    const err = x => m.innerHTML = `<div class="msg err">${x}</div>`;
    if (!/^\d+$/.test(id)) return err("رقم الرسالة لازم يكون أرقام بس");
    if (DB.lessons[id] || OV.add[id]) return err("الرقم ده موجود على الموقع أصلًا — عدّله من «المقاطع»");
    if (!file) return err("اختار ملف الصوت");
    if (file.size > 90e6) return err("الملف أكبر من 90 ميجا");
    if (!t) return err("اكتب العنوان");
    const d = await new Promise(res => { const a = new Audio(); a.preload = "metadata"; a.onloadedmetadata = () => { const s = Math.round(a.duration); res(s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`); URL.revokeObjectURL(a.src); }; a.onerror = () => res(""); a.src = URL.createObjectURL(file); });
    const se = $("#a_se").value;
    OV.add[id] = { t, s: $("#a_s").value, k: $("#a_k").value, h: $("#a_h").value.trim(), d, p: 1, series: se.split("|")[0] || "", sec: se.split("|")[1] || "" };
    UPLOADS[id] = file;
    updatePub(); addView();
    toast("اتضاف — دوس «نشر التعديلات» فوق علشان يترفع ويظهر على الموقع");
  };
}

function featView() {
  const ids = OV.featured;
  $("#pane").innerHTML = `<div class="card"><h2>المختارات</h2><p class="hint">بتظهر في الصفحة الرئيسية في قسم «مختارات». تضيف مقطع من «المقاطع» ← افتحه ← علّم «في المختارات».</p>
    ${ids.length ? ids.map((i, n) => `<div class="lrow" style="cursor:default"><span class="id">${i}</span><div class="tt"><b>${esc(eff(i).t)}</b><small>${esc(shName(eff(i).s))}</small></div>
      <button class="btn light" data-up="${n}" ${n ? "" : "disabled"}>▲</button><button class="btn light" data-rm="${i}">شيل</button></div>`).join("") : '<p class="hint">لسه مفيش مختارات.</p>'}</div>`;
  ad.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { OV.featured = OV.featured.filter(x => x !== +b.dataset.rm); featView(); updatePub(); });
  ad.querySelectorAll("[data-up]").forEach(b => b.onclick = () => { const n = +b.dataset.up; [OV.featured[n - 1], OV.featured[n]] = [OV.featured[n], OV.featured[n - 1]]; featView(); updatePub(); });
}

/* ---------- النشر ---------- */
$("#pubBtn").onclick = async () => {
  const b = $("#pubBtn"); b.disabled = true;
  try {
    for (const [id, file] of Object.entries(UPLOADS)) {
      b.textContent = `بيرفع ${id}.mp3…`;
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
      let sha; try { sha = (await gh(`contents/incoming/${id}.mp3?ref=main`)).sha; } catch {}
      await putFile(`incoming/${id}.mp3`, b64, `داشبورد: صوت جديد ${id}`, sha);
      delete UPLOADS[id];
    }
    b.textContent = "بيحفظ التعديلات…";
    const latest = await gh("contents/web/overrides.json?ref=main"); // آخر نسخة (لو حد عدّل من مكان تاني)
    const r = await putFile("web/overrides.json", b64utf8(JSON.stringify(OV, null, 1) + "\n"), "داشبورد: تعديلات الموقع", latest.sha);
    OV_SHA = r.content.sha; ORIG = JSON.stringify(OV);
    toast("✓ اتنشر — الموقع هيتحدث خلال دقيقة (والصوت الجديد خلال 2-3 دقايق)", "ok");
  } catch (e) { toast("حصلت مشكلة في النشر: " + e.message, "err"); }
  updatePub(); if (TAB === "add") addView();
};
$("#outBtn").onclick = () => { try { sessionStorage.removeItem("adm"); } catch {} location.reload(); };
window.addEventListener("beforeunload", e => { if (OV && dirty()) { e.preventDefault(); e.returnValue = ""; } });

function toast(t, kind = "") {
  let el = $("#toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.style.cssText = "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:50;max-width:92vw"; document.body.appendChild(el); }
  el.innerHTML = `<div class="msg ${kind}" style="box-shadow:0 8px 24px rgba(0,0,0,.2)">${esc(t)}</div>`;
  clearTimeout(toast.t); toast.t = setTimeout(() => el.innerHTML = "", 4500);
}

try { const s = JSON.parse(sessionStorage.getItem("adm") || "null"); if (s) { TOKEN = s.token; REPO = s.repo; start(); } else loginView(); } catch { loginView(); }
