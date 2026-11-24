"use client";

/** The sections of a sheikh page (nav.side): tabs that switch the panel without leaving the page. */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useS } from "./list";

export type Tab = { id: string; t: string; n: number; g: string };

export function SideTabs({ slug, tabs, active }: { slug: string; tabs: Tab[]; active: string }) {
  const S = useS();
  const router = useRouter();
  const nav = useRef<HTMLElement>(null);
  const [sel, setSel] = useState(active);
  const [prev, setPrev] = useState(active);
  if (prev !== active) {
    setPrev(active);
    setSel(active);
  }
  // On load (mobile): the selected tab in the middle of the bar.
  useEffect(() => {
    const bar = nav.current,
      tab = bar?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (bar && tab && innerWidth <= 860) bar.scrollLeft = tab.offsetLeft - (bar.clientWidth - tab.clientWidth) / 2;
  }, []);
  const out: React.ReactNode[] = [];
  let g = "";
  for (const t of tabs) {
    if (t.g !== g) {
      g = t.g;
      out.push(<h4 key={`h-${g}`}>{g}</h4>);
    }
    out.push(
      <button
        key={t.id}
        role="tab"
        data-tab={t.id}
        aria-selected={t.id === sel}
        onClick={(e) => {
          const tab = e.currentTarget,
            bar = tab.parentElement!;
          setSel(t.id);
          router.replace(`/s/${slug}/${t.id}`, { scroll: false });
          if (bar.scrollWidth > bar.clientWidth) requestAnimationFrame(() => bar.scrollTo({ left: tab.offsetLeft - (bar.clientWidth - tab.clientWidth) / 2, behavior: "smooth" }));
          if (innerWidth <= 860) {
            // Down to the first lesson under the sticky header and tab bar (without covering it).
            const top = document.querySelector<HTMLElement>(".top")!.offsetHeight + bar.offsetHeight + 10;
            const target = document.getElementById("panel")!.getBoundingClientRect().top + scrollY - top;
            if (target < scrollY) scrollTo({ top: target, behavior: "instant" });
          }
        }}
      >
        {t.t} <b>{t.n}</b>
      </button>,
    );
  }
  return (
    <nav ref={nav} className="side" role="tablist" aria-label={S.sections}>
      {out}
    </nav>
  );
}
