import { locale as rootLocale } from "next/root-params";
import { OthersGrid, SecH, SeriesCard, SheikhCards } from "@/components/ah/blocks";
import { InstallBar } from "@/components/ah/install";
import { BigPlay, CardRow, List } from "@/components/ah/list";
import { Link } from "@/i18n/navigation";
import { hijriText, strings } from "@/lib/ah";
import { siteCats } from "@/lib/ah-server";
import { currentWeek, getLookup } from "@/lib/data";
import { popularPicks } from "@/lib/library";

/** The home page — same sections and markup as home() in web/app.js. */
export default async function Home() {
  const locale = await rootLocale();
  const S = strings(locale);
  const lk = await getLookup();
  const { site } = lk;
  const all = lk.ids;
  const L = (i: number) => site.lessons[String(i)];
  const latest = all.find((i) => L(i).p && L(i).k === "lesson") ?? all[0];
  const feature = lk.item(latest);
  const main = site.sheikhs.filter((s) => s.main);
  const rest = site.sheikhs.filter((s) => !s.main);
  const tilawat = lk.items(all.filter((i) => L(i).k === "tilawa" && !lk.inCollection.has(i)).slice(0, 3));
  const featured = lk.items(site.featured.slice(0, 8));
  const latestCards = lk.items(all.slice(0, 4));
  const popular = lk.items(popularPicks(lk, await currentWeek()));
  const allSeries = site.sheikhs.flatMap((sh) => (sh.series ?? []).map((se) => ({ se, sh })));
  const cats = await siteCats(S, locale);

  return (
    <>
      <InstallBar />
      <section className="hero">
        <nav className="cats" aria-label={S.sections}>
          {cats.map((c) => (
            <Link key={c.href} className="cat" href={c.href}>
              <span className="ms" aria-hidden="true">
                {c.icon}
              </span>
              <b>{c.t}</b>
              <small>{c.n}</small>
            </Link>
          ))}
        </nav>
      </section>
      <div className="duo2">
        <section className="duo2-ti">
          <SecH t={S.latestTilawat} id="tilawat" more="/tilawat" S={S} />
          <List items={tilawat} sheikh />
        </section>
        <article className="feature">
          <small>{S.latestLesson}</small>
          <h2>{feature.t}</h2>
          <p>
            {feature.sh ? (
              <>
                {S.sheikh} <bdi>{feature.sh.name}</bdi>
              </>
            ) : null}
            {feature.h ? ` — ${hijriText(feature.h, S)}` : ""}
          </p>
          <BigPlay it={feature} label={S.listenLesson} />
        </article>
      </div>
      {featured.length ? (
        <>
          <SecH t={S.featured} S={S} />
          <CardRow items={featured} />
        </>
      ) : null}
      <SecH t={S.weekly} id="sheikhs" S={S} />
      <SheikhCards list={main} locale={locale} S={S} />
      <div className="duo">
        <section>
          <SecH t={S.latest} id="latest" more="/latest" S={S} />
          <CardRow items={latestCards} className="card-row duo-grid" />
        </section>
        {popular.length ? (
          <section>
            <SecH t={S.popular} id="popular" more="/popular" S={S} />
            <CardRow items={popular} className="card-row duo-grid" />
          </section>
        ) : null}
      </div>
      <SecH t={S.series} id="series" more="/series" S={S} />
      <div className="series-row">
        {allSeries.map(({ se, sh }) => (
          <SeriesCard key={se.key} se={se} sh={sh} S={S} />
        ))}
      </div>
      <SecH t={S.others} more="/others" S={S} />
      <OthersGrid list={rest.slice(0, 8)} />
    </>
  );
}
