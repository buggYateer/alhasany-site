import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { PageHead, withLocale } from "@/components/ah/blocks";
import { List } from "@/components/ah/list";
import { strings } from "@/lib/ah";
import { getLookup } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const S = strings(await rootLocale());
  return { title: S.latest, description: S.latestSub };
}

export default async function Latest() {
  const locale = await rootLocale();
  const S = strings(locale);
  const lk = await getLookup();
  return (
    <>
      <PageHead t={S.latest} sub={S.latestSub} share={withLocale(locale, "/latest")} S={S} />
      <List items={lk.items(lk.ids.slice(0, 10))} sheikh kind />
    </>
  );
}
