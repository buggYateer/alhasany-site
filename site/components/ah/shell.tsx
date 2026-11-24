"use client";

/** Header, search bar, side menu (drawer) and theme switch — the markup of web/index.html + their behaviour from web/app.js. */
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { strings, TG_PATH } from "@/lib/ah";
import { canInstall, doInstall, subscribeInstall } from "./install";

export type Cat = { href: string; icon: string; t: string; n: number };
export type DrawerCounts = { all: number; main: number; series: number; others: number };

/* ---------- theme (same storage key and attribute as the original site) ---------- */
const themeListeners = new Set<() => void>();
const isDark = () =>
  document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);
  const mq = matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => {
    themeListeners.delete(cb);
    mq.removeEventListener("change", cb);
  };
}
export function useDark() {
  return useSyncExternalStore(subscribeTheme, isDark, () => false);
}
export function toggleTheme() {
  const t = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("theme", t);
  } catch {}
  themeListeners.forEach((f) => f());
}

function TgIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={TG_PATH} />
    </svg>
  );
}

export function Shell({ cats, counts, channel }: { cats: Cat[]; counts: DrawerCounts; channel: string }) {
  const locale = useLocale();
  const S = strings(locale);
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const dark = useDark();
  const install = useSyncExternalStore(subscribeInstall, canInstall, () => false);

  /* theme-color follows the theme like paintTheme() */
  useEffect(() => {
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", dark ? "#0f1626" : "#1e2a4a");
  }, [dark]);

  /* ---------- search bar ---------- */
  const onSearch = pathname === "/search";
  const [searchOpen, setSearchOpen] = useState(onSearch);
  const [q, setQ] = useState(onSearch ? (params.get("q") ?? "") : "");
  const gq = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (pathname === "/search") setSearchOpen(true);
    else if (searchOpen) {
      setSearchOpen(false);
      setQ("");
    }
  }
  const openSearch = (on: boolean) => {
    setSearchOpen(on);
    if (on) requestAnimationFrame(() => gq.current?.focus());
  };
  const goSearch = (v: string) => {
    const url = "/search" + (v.trim() ? "?q=" + encodeURIComponent(v.trim()) : "");
    if (onSearch) router.replace(url, { scroll: false });
    else router.push(url);
  };

  /* ---------- drawer ---------- */
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const menuClose = useRef<HTMLButtonElement>(null);
  const menu = (on: boolean, fresh = false) => {
    clearTimeout(closeT.current);
    setClosing(false);
    const b = document.body;
    if (on) {
      setOpen(true);
      if (!b.dataset.lockY) {
        b.dataset.lockY = String(scrollY);
        Object.assign(b.style, { position: "fixed", top: -scrollY + "px", left: "0", right: "0", overflow: "hidden" });
      }
      requestAnimationFrame(() => menuClose.current?.focus());
    } else if (open) {
      setClosing(true);
      closeT.current = setTimeout(
        () => {
          setOpen(false);
          setClosing(false);
        },
        matchMedia("(prefers-reduced-motion:reduce)").matches ? 0 : 260,
      );
      if (b.dataset.lockY) {
        const y = +b.dataset.lockY;
        delete b.dataset.lockY;
        Object.assign(b.style, { position: "", top: "", left: "", right: "", overflow: "" });
        if (!fresh) scrollTo({ top: y, behavior: "instant" });
      }
      menuBtn.current?.focus();
    }
    document.documentElement.classList.toggle("menu-open", on);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !closing) menu(false);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const item = (href: string, t: string, icon: string, n?: number) => (
    <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setTimeout(() => menu(false, true), 0)}>
      <span className="ms" aria-hidden="true">
        {icon}
      </span>
      <span className="di-t">{t}</span>
      {n ? <small>{n}</small> : null}
    </Link>
  );

  return (
    <>
      <header className="top">
        <div className="wrap">
          <button ref={menuBtn} className="menu-btn" id="menuBtn" aria-label={S.menu} aria-expanded={open && !closing} aria-controls="drawer" onClick={() => menu(true)}>
            <svg viewBox="0 0 24 24">
              <rect x="3" y="5.5" width="18" height="2.2" rx="1.1" />
              <rect x="8" y="10.9" width="13" height="2.2" rx="1.1" />
              <rect x="3" y="16.3" width="18" height="2.2" rx="1.1" />
            </svg>
          </button>
          <a className="brand" href={locale === "ar" ? "/" : `/${locale}`} target="_self" title={S.refresh}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg?v=2" alt="" />
            <span>{S.siteName}</span>
          </a>
          <nav className="nav" aria-label={S.sections}>
            <Link href="/">{S.home}</Link>
            <Link href="/weekly">{S.weekly}</Link>
            <Link href="/series">{S.series}</Link>
            <Link href="/khutab">{S.khutab}</Link>
            <Link href="/all">{S.all}</Link>
          </nav>
          <button className="theme-btn" id="themeBtn" aria-label={dark ? S.light : S.dark} onClick={toggleTheme}>
            <span className="ms" id="themeIcon">
              {dark ? "light_mode" : "dark_mode"}
            </span>
          </button>
          <button
            className="search-btn"
            id="searchBtn"
            aria-label={S.search}
            aria-expanded={searchOpen}
            aria-controls="searchbar"
            onClick={() => {
              const on = !searchOpen;
              openSearch(on);
              if (!on && onSearch) router.push("/");
            }}
          >
            <span className="ms">search</span>
          </button>
          <a className="tg-btn" href={`https://t.me/${channel}`} target="_blank" rel="noopener">
            <TgIcon />
            <span>{S.tgChannel}</span>
          </a>
        </div>
        <div className="searchbar" id="searchbar" hidden={!searchOpen}>
          <div className="wrap">
            <div className="sbox">
              <span className="ms" aria-hidden="true">
                search
              </span>
              <input
                ref={gq}
                id="gq"
                type="search"
                placeholder={S.searchPh}
                aria-label={S.search}
                autoComplete="off"
                enterKeyHint="search"
                value={q}
                onChange={(e) => {
                  const v = e.target.value;
                  setQ(v);
                  clearTimeout(timer.current);
                  timer.current = setTimeout(() => goSearch(v), 250);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQ("");
                    openSearch(false);
                    if (onSearch) router.push("/");
                  }
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className={`scrim${closing ? " closing" : ""}`} id="scrim" hidden={!open} onClick={() => menu(false)} onTouchMove={(e) => e.preventDefault()} />
      <aside className={`drawer${closing ? " closing" : ""}`} id="drawer" aria-label={S.menu} hidden={!open}>
        <div className="drawer-h">
          <input
            className="search"
            id="drawerSearch"
            type="search"
            placeholder={S.drawerPh}
            aria-label={S.search}
            autoComplete="off"
            onKeyDown={(e) => {
              const v = e.currentTarget.value.trim();
              if (e.key !== "Enter" || !v) return;
              menu(false, true);
              router.push("/search?q=" + encodeURIComponent(v));
            }}
          />
          <button ref={menuClose} className="x-btn" id="menuClose" aria-label={S.closeMenu} onClick={() => menu(false)}>
            <svg viewBox="0 0 24 24">
              <path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" />
            </svg>
          </button>
        </div>
        <nav id="drawerNav">
          <h4>{S.sections}</h4>
          {cats.map((c) => item(c.href, c.t, c.icon, c.n))}
          <h4>{S.browse}</h4>
          {item("/", S.home, "home")}
          {item("/all", S.all, "library_music", counts.all)}
          {item("/latest", S.latest, "schedule")}
          {item("/popular", S.popular, "trending_up")}
          {item("/weekly", S.weekly, "calendar_month", counts.main)}
          {item("/series", S.series, "auto_stories", counts.series)}
          <h4>{S.more}</h4>
          {item("/others", S.others, "groups", counts.others)}
          <button className="install-row" id="installRow" type="button" hidden={!install} onClick={() => doInstall(S.iosInstall)}>
            <span className="ms" aria-hidden="true">
              add_to_home_screen
            </span>
            <span>{S.install}</span>
          </button>
          <button className="theme-row" id="themeRow" type="button" onClick={toggleTheme}>
            <span className="ms" aria-hidden="true">
              {dark ? "light_mode" : "dark_mode"}
            </span>
            <span>{dark ? S.light : S.dark}</span>
          </button>
          <Link className="lang-row" href={pathname} locale={locale === "en" ? "ar" : "en"} onClick={() => setTimeout(() => menu(false, true), 0)}>
            <span className="ms" aria-hidden="true">
              translate
            </span>
            <span>{S.language}</span>
          </Link>
        </nav>
      </aside>
    </>
  );
}
