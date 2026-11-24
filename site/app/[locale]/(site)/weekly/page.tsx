import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { PageHead, SheikhCards, withLocale } from "@/components/ah/blocks";
import { strings } from "@/lib/ah";
import { getLookup } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const S = strings(await rootLocale());
  return { title: S.weekly, description: S.weeklySub };
}

export default async function Weekly() {
  const locale = await rootLocale();
  const S = strings(locale);
  const lk = await getLookup();
  return (
    <>
      <PageHead t={S.weekly} sub={S.weeklySub} share={withLocale(locale, "/weekly")} S={S} />
      <SheikhCards list={lk.site.sheikhs.filter((s) => s.main)} locale={locale} S={S} wk />
    </>
  );
}
