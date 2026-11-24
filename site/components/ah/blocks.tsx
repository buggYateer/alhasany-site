/** Static pieces shared by pages (secH / pageHead / sheikhCards / othersGrid / seriesCard in web/app.js). */
import { Link } from "@/i18n/navigation";
import { config } from "@/lib/config";
import { clipCount, seriesIds } from "@/lib/library";
import type { SheikhData, Series } from "@/lib/storage/types";
import { toneOf } from "@/lib/theme";
import type { Strings } from "@/lib/ah";
import { SeriesCover } from "./cover";
export { PageHead, SecH, withLocale } from "./page-head";

const DAY_EN: Record<string, string> = { السبت: "Saturday", الأحد: "Sunday", الاثنين: "Monday", الثلاثاء: "Tuesday", الأربعاء: "Wednesday", الخميس: "Thursday", الجمعة: "Friday" };
export function dayOf(key: string, locale: string) {
  const d = config.sheikhs.find((x) => x.key === key)?.day;
  if (!d || locale === "ar") return d;
  const w = d.replace(/^درس\s+/, "");
  return DAY_EN[w] ? `${DAY_EN[w]} lesson` : d;
}

export function SheikhCards({ list, locale, S, wk }: { list: SheikhData[]; locale: string; S: Strings; wk?: boolean }) {
  return (
    <div className={wk ? "sheikhs wk-list" : "sheikhs"}>
      {list.map((s) => {
        const day = dayOf(s.key, locale);
        return (
          <Link key={s.key} className={`sh-card t${toneOf(config, s.key)}`} href={`/s/${s.slug}`}>
            <div className="who">
              <small>{S.sheikh}</small>
              <div className="name">{s.name}</div>
            </div>
            {day ? <div className="day">{day}</div> : null}
          </Link>
        );
      })}
    </div>
  );
}

export function OthersGrid({ list }: { list: SheikhData[] }) {
  return (
    <div className="others">
      {list.map((s) => (
        <Link key={s.key} href={`/s/${s.slug}`}>
          <span className="ms" aria-hidden="true">
            person
          </span>
          <span className="o-n">{s.name}</span>
          <b>{clipCount(s)}</b>
        </Link>
      ))}
    </div>
  );
}

export function SeriesCard({ se, sh, S }: { se: Series; sh: SheikhData; S: Strings }) {
  const ids = seriesIds(se);
  return (
    <Link className="series-card" href={`/s/${sh.slug}/${se.key}`}>
      <SeriesCover title={se.title} firstId={ids[0] ?? 0} tone={toneOf(config, sh.key)} sheikh={sh.name} S={S} />
      <div className="sc-body">
        <h3>{se.title}</h3>
        <p>
          {S.sheikh} {sh.name} · {S.lessonsN(ids.length)}
        </p>
      </div>
    </Link>
  );
}
