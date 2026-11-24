import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { notFound } from "next/navigation";
import { withLocale } from "@/components/ah/blocks";
import { LessonCover } from "@/components/ah/cover";
import { ShareBtn } from "@/components/ah/global";
import { LessonActions } from "@/components/ah/lesson-actions";
import { Link } from "@/i18n/navigation";
import { BADGE_CLASS, hijriText, strings } from "@/lib/ah";
import { getLookup, getSite } from "@/lib/data";

export async function generateStaticParams() {
  return Object.keys((await getSite()).lessons).map((id) => ({ id }));
}

async function find(params: Promise<{ id: string }>) {
  const { id } = await params;
  const lk = await getLookup();
  if (!/^\d+$/.test(id) || !lk.site.lessons[id]) notFound();
  return { lk, item: lk.item(Number(id)) };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/l/[id]">): Promise<Metadata> {
  const { item } = await find(params);
  const S = strings(await rootLocale());
  const by = item.sh ? `${S.sheikh} ${item.sh.name}` : "";
  return { title: item.t, description: [by, item.se?.title].filter(Boolean).join(" — ") || undefined, openGraph: { title: item.t, description: by || undefined, type: "music.song" } };
}

/** One page per recording (/l/640) — lessonPage() in web/app.js. */
export default async function LessonPage({ params }: PageProps<"/[locale]/l/[id]">) {
  const { item: it } = await find(params);
  const locale = await rootLocale();
  const S = strings(locale);
  const sh = it.sh,
    se = it.se;
  return (
    <>
      <div className="crumbs">
        <Link href="/">{S.home}</Link>
        {sh ? (
          <>
            {" ‹ "}
            <Link href={`/s/${sh.slug}`}>{sh.name}</Link>
          </>
        ) : null}
        {sh && se ? (
          <>
            {" ‹ "}
            <Link href={`/s/${sh.slug}/${se.key}`}>{se.title}</Link>
          </>
        ) : null}
      </div>
      <article className="lesson-page">
        <div className="lp-cover">
          <LessonCover it={it} S={S} />
        </div>
        <div className="lp-info">
          {S.badge[it.k] ? <span className={`badge-k ${BADGE_CLASS[it.k]}`}>{S.badge[it.k]}</span> : null}
          <h1>
            {it.n ? (
              <>
                <span className="n">{it.n}</span>{" "}
              </>
            ) : null}
            {it.t}
          </h1>
          <p className="lp-meta">
            {sh ? (
              <Link href={`/s/${sh.slug}`}>
                {S.sheikh} {sh.name}
              </Link>
            ) : null}
            {sh && se ? (
              <>
                {" · "}
                <Link href={`/s/${sh.slug}/${se.key}`}>{se.title}</Link>
              </>
            ) : null}
          </p>
          <p className="lp-meta2">{[hijriText(it.h, S), it.d].filter(Boolean).join(" · ")}</p>
          <LessonActions it={it} share={<ShareBtn path={withLocale(locale, `/l/${it.id}`)} title={it.t} cls="lp-btn" label={S.share} />} />
        </div>
      </article>
    </>
  );
}
