import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { AhOthers } from "@/components/ah/others";
import { strings } from "@/lib/ah";
import { getLookup } from "@/lib/data";
import { clipCount } from "@/lib/library";

export async function generateMetadata(): Promise<Metadata> {
  const S = strings(await rootLocale());
  return { title: S.others };
}

export default async function Others() {
  const lk = await getLookup();
  const rest = lk.site.sheikhs.filter((s) => !s.main).map((s) => ({ key: s.key, slug: s.slug, name: s.name, n: clipCount(s) }));
  return <AhOthers list={rest} />;
}
