"use client";

/**
 * Page-wide behaviour from web/app.js that lives outside React's tree:
 * the share menu (any [data-share] button), the Telegram confirm menu (any t.me link),
 * the «sort» menu of /others ([data-osort]) and the small toast.
 */
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { strings, TG_PATH } from "@/lib/ah";

const TG_SVG = `<svg viewBox="0 0 24 24"><path d="${TG_PATH}"/></svg>`;

export function toast(msg: string) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("on");
  const w = window as unknown as { __toastT?: ReturnType<typeof setTimeout> };
  clearTimeout(w.__toastT);
  w.__toastT = setTimeout(() => el!.classList.remove("on"), 2200);
}

export const OSORT_EVENT = "ah:osort";
export const readOsort = () => {
  try {
    return localStorage.getItem("osort") || "count";
  } catch {
    return "count";
  }
};

export function Global() {
  const S = strings(useLocale());
  useEffect(() => {
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const close = () => document.getElementById("shareMenu")?.remove();
    async function copyLink(url: string) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        const t = document.createElement("textarea");
        t.value = url;
        document.body.appendChild(t);
        t.select();
        document.execCommand("copy");
        t.remove();
      }
      toast(S.copied);
    }
    const place = (m: HTMLElement, r: DOMRect, below = false) => {
      const mw = m.offsetWidth,
        mh = m.offsetHeight;
      let top = below ? r.bottom + 8 : r.top - mh - 8;
      if (top < 8) top = r.bottom + 8;
      const left = Math.max(8, Math.min(r.left + r.width / 2 - mw / 2, innerWidth - mw - 8));
      m.style.top = top + "px";
      m.style.left = left + "px";
    };
    function shareLink(path: string, title: string, btn: Element) {
      const url = location.origin + path,
        ttl = title || S.siteName;
      if (document.getElementById("shareMenu")?.dataset.for === path) return close();
      close();
      const m = document.createElement("div");
      m.id = "shareMenu";
      m.className = "share-menu";
      m.dataset.for = path;
      m.setAttribute("role", "menu");
      const enc = encodeURIComponent,
        text = enc(ttl + "\n" + url);
      m.innerHTML =
        `<button role="menuitem" data-sm="copy"><span class="ms">link</span>${S.copyLink}</button>` +
        ("share" in navigator
          ? `<button role="menuitem" data-sm="native"><span class="ms">share</span>${S.shareVia}</button>`
          : `<a role="menuitem" href="https://wa.me/?text=${text}" target="_blank" rel="noopener"><span class="ms">chat</span>${S.whatsapp}</a><a role="menuitem" href="https://t.me/share/url?url=${enc(url)}&text=${enc(ttl)}" target="_blank" rel="noopener"><span class="ms">send</span>${S.telegram}</a>`);
      document.body.appendChild(m);
      place(m, btn.getBoundingClientRect());
      m.onclick = async (e) => {
        const it = (e.target as Element).closest<HTMLElement>("[data-sm], a");
        if (!it) return;
        if (it.dataset.sm === "copy") {
          e.preventDefault();
          await copyLink(url);
        } else if (it.dataset.sm === "native") {
          e.preventDefault();
          try {
            await navigator.share({ title: ttl, url });
          } catch {}
        }
        close();
      };
    }
    // Telegram links: a small menu first instead of opening right away (in case of a mis-tap)
    const onTg = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="https://t.me/"]');
      if (!a || a.closest("#shareMenu") || a.href.includes("/share/url") || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      const url = a.href;
      if (document.getElementById("shareMenu")?.dataset.for === "tg:" + url) return close();
      close();
      const m = document.createElement("div");
      m.id = "shareMenu";
      m.className = "share-menu tg-menu";
      m.dataset.for = "tg:" + url;
      m.setAttribute("role", "menu");
      m.setAttribute("aria-label", S.telegram);
      const what = /t\.me\/[^/]+\/\d+/.test(url) ? S.tgClip : S.tgChannelMenu;
      m.innerHTML = `<div class="tgm-h"><i>${TG_SVG}</i><span>${what}</span></div><a role="menuitem" href="${esc(url)}" target="_blank" rel="noopener"><i class="tgm-ic">${TG_SVG}</i>${S.openTg}</a><button role="menuitem" data-sm="copy"><span class="ms">link</span>${S.copyTg}</button>`;
      document.body.appendChild(m);
      place(m, a.getBoundingClientRect());
      m.onclick = async (ev) => {
        const it = (ev.target as Element).closest<HTMLElement>("[data-sm], a");
        if (!it) return;
        if (it.dataset.sm === "copy") {
          ev.preventDefault();
          await copyLink(url);
        }
        close();
      };
    };
    const onShare = (e: MouseEvent) => {
      const b = (e.target as Element).closest<HTMLElement>("[data-share]");
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      shareLink(b.dataset.share!, b.dataset.title ?? "", b);
    };
    const onOsort = (e: MouseEvent) => {
      const b = (e.target as Element).closest<HTMLElement>("[data-osort]");
      if (!b) return;
      e.stopPropagation();
      close();
      const m = document.createElement("div");
      m.id = "shareMenu";
      m.className = "share-menu";
      m.dataset.for = "osort";
      m.setAttribute("role", "menu");
      const cur = readOsort(),
        opt = (k: string, t: string) => `<button role="menuitemradio" aria-checked="${cur === k}" data-o="${k}"><span class="ms">${cur === k ? "check" : ""}</span>${t}</button>`;
      m.innerHTML = opt("count", S.sortCount) + opt("az", S.sortAz) + opt("za", S.sortZa);
      document.body.appendChild(m);
      place(m, b.getBoundingClientRect(), true);
      m.onclick = (ev) => {
        const it = (ev.target as Element).closest<HTMLElement>("[data-o]");
        if (!it) return;
        try {
          localStorage.setItem("osort", it.dataset.o!);
        } catch {}
        close();
        dispatchEvent(new Event(OSORT_EVENT));
      };
    };
    const onDocClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest("#shareMenu, [data-share], [data-osort]")) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("click", onTg, true);
    document.addEventListener("click", onShare, true);
    document.addEventListener("click", onOsort);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    addEventListener("scroll", close, { passive: true });
    return () => {
      document.removeEventListener("click", onTg, true);
      document.removeEventListener("click", onShare, true);
      document.removeEventListener("click", onOsort);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
      removeEventListener("scroll", close);
      close();
    };
  }, [S]);
  return null;
}

/** The share button markup (shareBtn() in web/app.js). */
export function ShareBtn({ path, title, cls = "", label }: { path: string; title: string; cls?: string; label: string }) {
  return (
    <button className={`share-btn ${cls}`} data-share={path} data-title={title} aria-label={label}>
      <span className="ms" aria-hidden="true">
        share
      </span>
      <span className="sb-t">{label}</span>
    </button>
  );
}
