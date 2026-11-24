"use client";

/** /search — results update while typing in the header search bar (searchPage() in web/app.js). */
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { strings } from "@/lib/ah";
import type { Item } from "@/lib/library";
import { norm } from "@/lib/text";
import { List } from "./list";
import { PageHead, withLocale } from "./page-head";

type Indexed = Item & { x: string };
let cache: Promise<Indexed[]> | null = null;
const loadIndex = () => (cache ??= fetch("/data/index.json").then((r) => r.json()));

export function AhSearch() {
  const locale = useLocale();
  const S = strings(locale);
  const q = useSearchParams().get("q") ?? "";
  const [index, setIndex] = useState<Indexed[] | null>(null);
  useEffect(() => {
    loadIndex().then(setIndex).catch(() => setIndex([]));
  }, []);
  const ids = useMemo(() => {
    const words = norm(q.trim()).split(/\s+/).filter(Boolean);
    if (!words.length || !index) return [];
    return index.filter((i) => {
      const hay = norm(`${i.t} ${i.sh?.name ?? ""} ${i.x}`);
      return words.every((w) => hay.includes(w));
    });
  }, [q, index]);
  const share = withLocale(locale, "/search") + (q ? `?q=${encodeURIComponent(q)}` : "");
  return (
    <>
      <PageHead t={S.searchTitle} sub={q ? (index ? S.results(ids.length, q) : "…") : S.searchHint} share={share} S={S} />
      {q && index ? <List items={ids} limit={30} sheikh kind /> : null}
    </>
  );
}
