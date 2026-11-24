import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { PageHead, SeriesCard, withLocale } from "@/components/ah/blocks";
import { strings } from "@/lib/ah";
import { getLookup } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const S = strings(await rootLocale());
  return { title: S.series, description: S.seriesSub };
}

export default async function SeriesPage() {
  const locale = await rootLocale();
  const S = strings(locale);
  const lk = await getLookup();
  return (
    <>
      <PageHead t={S.series} sub={S.seriesSub} share={withLocale(locale, "/series")} S={S} />
      <div className="series-grid">
        {lk.site.sheikhs.flatMap((sh) => (sh.series ?? []).map((se) => <SeriesCard key={se.key} se={se} sh={sh} S={S} />))}
      </div>
    </>
  );
}
