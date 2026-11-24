"use client";

/** /c/ramadan — sections by title (collectionPage() in web/app.js), picked with ?type=. */
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { strings } from "@/lib/ah";
import type { Item } from "@/lib/library";
import { List } from "./list";
import { PageHead, withLocale } from "./page-head";

const RM = [
  { id: "lessons", icon: "menu_book", test: (L: Item) => L.k === "lesson" && !/تهجد|فجر/.test(L.t) },
  { id: "tarawih", icon: "nights_stay", test: (L: Item) => /^(تلاوة|عشاء) ليلة/.test(L.t) },
  { id: "tahajjud", icon: "bedtime", test: (L: Item) => /تهجد/.test(L.t) },
  { id: "other", icon: "wb_twilight", test: () => true },
];
const typeOf = (L: Item) => RM.find((x) => x.test(L))!.id;

export function AhCollection({ path, title, items }: { path: string; title: string; items: Item[] }) {
  const locale = useLocale();
  const S = strings(locale);
  const type = useSearchParams().get("type") ?? "";
  const groups = RM.map((x) => ({ ...x, items: items.filter((i) => typeOf(i) === x.id) })).filter((x) => x.items.length);
  const cur = groups.find((g) => g.id === type);
  return (
    <>
      <PageHead t={title} sub={S.clipsN(items.length)} share={withLocale(locale, path) + (cur ? `?type=${cur.id}` : "")} S={S} />
      <nav className="rm-tabs" aria-label={S.rmLabel}>
        <Link href={path} className={cur ? "" : "on"} scroll={false}>
          {S.quickAll} <small>{items.length}</small>
        </Link>
        {groups.map((g) => (
          <Link key={g.id} href={`${path}?type=${g.id}`} className={cur?.id === g.id ? "on" : ""} scroll={false}>
            <span className="ms" aria-hidden="true">
              {g.icon}
            </span>
            {S.rmTypes[g.id]} <small>{g.items.length}</small>
          </Link>
        ))}
      </nav>
      <List key={type} items={cur ? cur.items : items} sheikh />
    </>
  );
}
