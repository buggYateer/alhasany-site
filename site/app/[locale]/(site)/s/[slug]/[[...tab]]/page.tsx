import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { notFound } from "next/navigation";
import { dayOf, withLocale } from "@/components/ah/blocks";
import { SeriesCover } from "@/components/ah/cover";
import { ShareBtn } from "@/components/ah/global";
import { Accordion, LatestPlay, List } from "@/components/ah/list";
import { SideTabs, type Tab } from "@/components/ah/side-tabs";
import { Link } from "@/i18n/navigation";
import { hijriText, strings, type Strings } from "@/lib/ah";
import { config } from "@/lib/config";
import { getLookup, getSite } from "@/lib/data";
import { clipCount, newest, seriesIds, sheikhAll, sheikhLessons, sheikhTabs, tabIds, type SheikhTab } from "@/lib/library";
import { toneOf } from "@/lib/theme";

export async function generateStaticParams() {
  const site = await getSite();
  return site.sheikhs.flatMap((sh) => [{ slug: sh.slug, tab: [] as string[] }, ...sheikhTabs(sh).map((t) => ({ slug: sh.slug, tab: [t.id] }))]);
}

async function resolve(params: Promise<{ slug: string; tab?: string[] }>) {
  const { slug, tab } = await params;
  const lk = await getLookup();
  const sh = lk.bySlug.get(decodeURIComponent(slug)) ?? lk.byKey.get(decodeURIComponent(slug));
  if (!sh) notFound();
  const tabs = sheikhTabs(sh, (id) => lk.site.lessons[String(id)]?.t ?? "");
  const active = tabs.find((x) => x.id === decodeURIComponent(tab?.[0] ?? "")) ?? tabs[0];
  if (tab?.[0] && active?.id !== decodeURIComponent(tab[0])) notFound();
  return { lk, sh, tabs, active };
}

const tabLabel = (x: SheikhTab, S: Strings) =>
  x.label ||
  (x.labelKey === "recent" ? S.recent : x.labelKey === "loose" ? S.loose : x.labelKey === "duaa" ? S.duaa : x.labelKey === "duaaMany" ? S.duaaMany : S.kind[(x.labelKey ?? "").replace("kinds.", "")]);

export async function generateMetadata({ params }: PageProps<"/[locale]/s/[slug]/[[...tab]]">): Promise<Metadata> {
  const { sh, active } = await resolve(params);
  const S = strings(await rootLocale());
  const se = (sh.series ?? []).find((x) => x.key === active?.id);
  return { title: se ? `${se.title} — ${S.sheikh} ${sh.name}` : `${S.sheikh} ${sh.name}` };
}

/** A sheikh's page — sheikhPage() / renderPanel() in web/app.js. */
export default async function SheikhPage({ params }: PageProps<"/[locale]/s/[slug]/[[...tab]]">) {
  const { lk, sh, tabs, active } = await resolve(params);
  const locale = await rootLocale();
  const S = strings(locale);
  const day = dayOf(sh.key, locale);
  const all = newest(sheikhAll(sh));
  const lastId = all.find((i) => lk.site.lessons[String(i)]?.p) ?? all[0];
  const last = lastId !== undefined ? lk.item(lastId) : null;
  const g1 = sheikhLessons(sh).length && sh.tilawa.length ? S.groupLessonsTilawat : S.groupLessons;
  const groupName = (g: SheikhTab["group"]) => (g === "series" ? S.series : g === "other" ? S.groupOther : g1);
  const side: Tab[] = tabs.map((x) => ({ id: x.id, t: tabLabel(x, S), n: x.n, g: groupName(x.group) }));
  const se = (sh.series ?? []).find((x) => x.key === active?.id);
  const name = `${S.sheikh} ${sh.name}`;

  let body = null;
  let n = 0;
  if (se) {
    const asc = lk.items(seriesIds(se));
    const secs = se.sections.map((x) => ({ t: x.t, items: lk.items(newest(x.ids)) })).sort((a, b) => (b.items[0]?.id ?? 0) - (a.items[0]?.id ?? 0));
    body = secs.length > 1 ? <Accordion id={`series:${se.key}`} sections={secs} queue={asc} /> : <List items={secs[0]?.items ?? []} queue={asc} />;
    n = asc.length;
  } else if (active) {
    const ids = tabIds(sh, active.id).ids;
    body = <List items={lk.items(ids)} limit={15} />;
    n = ids.length;
  }

  return (
    <>
      <div className="crumbs">
        <Link href="/">{S.home}</Link> ‹ {sh.name}
      </div>
      <header className="sh-head">
        <div className="sh-meta">
          <h1>
            {sh.main ? `${S.sheikh} ` : ""}
            {sh.name}
          </h1>
          <p>
            {day ? `${day} · ` : ""}
            {S.clipsN(clipCount(sh))}
          </p>
        </div>
        <ShareBtn path={withLocale(locale, `/s/${sh.slug}`)} title={name} cls="on-dark" label={S.share} />
      </header>
      {last ? (
        <div className="latest-card">
          <LatestPlay it={last} />
          <div className="txt">
            <small>{S.latestClip}</small>
            <div className="t">{last.t}</div>
            <div className="m">
              {hijriText(last.h, S)}
              {last.d ? ` — ${last.d}` : ""}
            </div>
          </div>
        </div>
      ) : null}
      <div className="split">
        <SideTabs slug={sh.slug} tabs={side} active={active?.id ?? ""} />
        <div className="panel" id="panel">
          {se ? (
            <div className="panel-cover">
              <SeriesCover title={se.title} firstId={seriesIds(se)[0] ?? 0} tone={toneOf(config, sh.key)} sheikh={sh.name} S={S} />
            </div>
          ) : null}
          <div className={`panel-h${se ? " slim" : ""}`}>
            <div>
              {se || !active ? null : <h2>{tabLabel(active, S)}</h2>}
              <p>{S.panelSub(n)}</p>
            </div>
            {active ? <ShareBtn path={withLocale(locale, `/s/${sh.slug}/${active.id}`)} title={`${tabLabel(active, S)} — ${name}`} cls="on-dark" label={S.share} /> : null}
          </div>
          {body}
        </div>
      </div>
    </>
  );
}
