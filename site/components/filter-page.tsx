import { locale as rootLocale } from "next/root-params";
import { Suspense } from "react";
import { AhFilter, type Field } from "@/components/ah/filter";
import { strings } from "@/lib/ah";
import { getLookup } from "@/lib/data";
import { kindIds } from "@/lib/library";
import type { Kind } from "@/lib/storage/types";

const PAGES = {
  all: { kind: null, facets: ["kind", "sheikh", "month"] },
  lessons: { kind: "lesson", facets: ["sheikh", "series", "month"] },
  khutab: { kind: "khutba", facets: ["sheikh", "month"] },
  tilawat: { kind: "tilawa", facets: ["sheikh", "surah", "month"] },
} as const satisfies Record<string, { kind: Kind | null; facets: Field[] }>;
export type FilterPageKey = keyof typeof PAGES;

export async function filterMetadata(page: FilterPageKey) {
  const S = strings(await rootLocale());
  return { title: S[page] as string };
}

/** /all, /lessons, /khutab, /tilawat: the list with filters kept in the URL. */
export async function FilterPage({ page }: { page: FilterPageKey }) {
  const lk = await getLookup();
  const def = PAGES[page];
  const items = lk.items(kindIds(lk, def.kind));
  const quick = page === "lessons" ? lk.site.sheikhs.filter((s) => s.main).map((s) => ({ slug: s.slug, name: s.name })) : undefined;
  return (
    <Suspense>
      <AhFilter page={page} kind={def.kind} fields={[...def.facets]} items={items} quick={quick} />
    </Suspense>
  );
}
