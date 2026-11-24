/** Covers drawn in code, same markup as the original site (cover / lessonCover in web/app.js). */
import type { Item } from "@/lib/library";
import { cleanTitle, KIND_ICON, PATTERNS, sectionTag, toneClass, type Strings } from "@/lib/ah";

export function SeriesCover({ title, firstId, tone, sheikh, S }: { title: string; firstId: number; tone: number; sheikh: string; S: Strings }) {
  return (
    <div className={`cover t${tone} pat${firstId % PATTERNS}`} aria-hidden="true">
      <span className="ms cv-icon">auto_stories</span>
      <div className="cv-text">
        <small>{/^سلسلة/.test(title) ? S.seriesWord : S.lessonsWord}</small>
        <b>{cleanTitle(title)}</b>
        <i>
          {S.sheikh} {sheikh}
        </i>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="cv-logo" src="/logo-mark.svg?v=2" alt="" />
    </div>
  );
}

export function LessonCover({ it, S }: { it: Item; S: Strings }) {
  const tag = sectionTag(it) || S.badge[it.k] || "";
  return (
    <div className={`cover lcover ${toneClass(it)} pat${it.id % PATTERNS}`} aria-hidden="true">
      <span className="ms cv-icon">{KIND_ICON[it.k] || "graphic_eq"}</span>
      <div className="cv-text">
        <small>{tag}</small>
        <b>{it.t}</b>
        {it.sh ? (
          <i>
            {S.sheikh} {it.sh.name}
          </i>
        ) : null}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="cv-logo" src="/logo-mark.svg?v=2" alt="" />
    </div>
  );
}
