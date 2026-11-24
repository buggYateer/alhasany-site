import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { PageHead, withLocale } from "@/components/ah/blocks";
import { CardRow } from "@/components/ah/list";
import { strings } from "@/lib/ah";
import { currentWeek, getLookup } from "@/lib/data";
import { popularPage } from "@/lib/library";

export async function generateMetadata(): Promise<Metadata> {
  const S = strings(await rootLocale());
  return { title: S.popular, description: S.popularSub };
}

export default async function Popular() {
  const locale = await rootLocale();
  const S = strings(locale);
  const lk = await getLookup();
  return (
    <>
      <PageHead t={S.popular} sub={S.popularSub} share={withLocale(locale, "/popular")} S={S} />
      <CardRow items={lk.items(popularPage(lk, await currentWeek()))} className="card-grid" />
    </>
  );
}
