"use client";

/** Rows, lists, accordions and cards — the same markup as row() / list() / accordion() in web/app.js. */
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { usePlayer } from "@/components/player/player-provider";
import { Link } from "@/i18n/navigation";
import { BADGE_CLASS, hijriText, ICON_PAUSE, ICON_PLAY, strings, TG_PATH } from "@/lib/ah";
import type { Item } from "@/lib/library";
import { readStored } from "@/lib/use-stored";
import { parseDur } from "@/lib/text";
import { LessonCover } from "./cover";

export const useS = () => strings(useLocale());

export function PlaySvg({ on }: { on?: boolean }) {
  return (
    <svg viewBox="0 0 24 24">
      <path d={on ? ICON_PAUSE : ICON_PLAY} />
    </svg>
  );
}
export function TgSvg() {
  return (
    <svg viewBox="0 0 24 24">
      <path d={TG_PATH} />
    </svg>
  );
}

function useProgress(it: Item) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const pos = Number(readStored(`pos:${it.id}`) ?? 0) || 0;
    const dur = parseDur(it.d);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- saved position only exists in this browser
    setPct(pos && dur ? Math.min(100, (pos / dur) * 100) : 0);
  }, [it.id, it.d]);
  return pct;
}

export function Row({ it, queue, sheikh, kind }: { it: Item; queue: Item[]; sheikh?: boolean; kind?: boolean }) {
  const p = usePlayer();
  const S = useS();
  const pct = useProgress(it);
  const cur = p.current?.id === it.id;
  const play = () => p.play(it, queue);
  return (
    <div
      className={`row${cur ? " playing" : ""}`}
      data-id={it.id}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("a, button") && it.p) play();
      }}
    >
      <button className="play" disabled={!it.p} title={it.p ? undefined : S.tgOnly} aria-label={`${S.play} ${it.t}`} onClick={play}>
        <PlaySvg on={cur && p.playing} />
      </button>
      <div className="txt">
        <div className="t">
          {kind && S.badge[it.k] ? <span className={`badge-k ${BADGE_CLASS[it.k]}`}>{S.badge[it.k]}</span> : null}
          {it.n ? <span className="n">{it.n}</span> : null}
          {it.t}
        </div>
        <div className="m">
          {sheikh && it.sh ? (
            <Link className="sh" href={`/s/${it.sh.slug}`}>
              {it.sh.name}
            </Link>
          ) : null}
          {it.h ? <span className="dt">{hijriText(it.h, S)}</span> : null}
          {it.d ? <span className="du">{it.d}</span> : null}
          {it.p ? null : (
            <a className="tg-only" href={p.telegramUrl(it.id)} target="_blank" rel="noopener">
              {S.listenOnTg}
            </a>
          )}
        </div>
        {pct > 1 ? (
          <div className="prog">
            <i style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A list with «show more» (first `limit`, then 20 at a time). `queue` = what «next» plays (defaults to the list). */
export function List({ items, queue, limit, sheikh, kind }: { items: Item[]; queue?: Item[]; limit?: number; sheikh?: boolean; kind?: boolean }) {
  const S = useS();
  const [shown, setShown] = useState(limit || items.length);
  // Back to the first page only when the list itself changes (not on every re-render).
  const sig = `${items.length}:${items[0]?.id}:${items.at(-1)?.id}`;
  const [prevSig, setPrevSig] = useState(sig);
  if (prevSig !== sig) {
    setPrevSig(sig);
    setShown(limit || items.length);
  }
  const q = queue ?? items;
  return (
    <div className="list">
      {items.length ? items.slice(0, shown).map((it) => <Row key={it.id} it={it} queue={q} sheikh={sheikh} kind={kind} />) : <div className="empty">{S.empty}</div>}
      {items.length > shown ? (
        <button className="more" onClick={() => setShown((n) => n + 20)}>
          {S.showMore} ({items.length - shown})
        </button>
      ) : null}
    </div>
  );
}

/** Closed sections that open on tap (series with several parts). */
export function Accordion({ id, sections, queue }: { id: string; sections: { t: string; items: Item[] }[]; queue: Item[] }) {
  const S = useS();
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <>
      {sections.map((s, i) => (
        <section className="acc" key={`${s.t}-${i}`}>
          <button className="acc-h" aria-expanded={!!open[i]} aria-controls={`${id}-${i}`} onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}>
            <svg className="chev" viewBox="0 0 24 24">
              <path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z" />
            </svg>
            <span>{s.t || S.lessons}</span>
            <small>{S.lessonsN(s.items.length)}</small>
          </button>
          <div className="acc-b" id={`${id}-${i}`} hidden={!open[i]}>
            <div className="list" style={{ border: 0, borderRadius: 0 }}>
              {s.items.map((it) => (
                <Row key={it.id} it={it} queue={queue} />
              ))}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

export function LessonCard({ it, queue }: { it: Item; queue: Item[] }) {
  const p = usePlayer();
  const S = useS();
  return (
    <button className="lesson-card" disabled={!it.p} onClick={() => p.play(it, queue)}>
      <LessonCover it={it} S={S} />
      <div className="sc-body">
        <h3>
          {S.badge[it.k] ? <span className={`badge-k ${BADGE_CLASS[it.k]}`}>{S.badge[it.k]}</span> : null}
          {it.t}
        </h3>
        <p>{it.sh?.name ?? ""}</p>
      </div>
    </button>
  );
}

export function CardRow({ items, className = "card-row" }: { items: Item[]; className?: string }) {
  return (
    <div className={className}>
      {items.map((it) => (
        <LessonCard key={it.id} it={it} queue={items} />
      ))}
    </div>
  );
}

/** «استمع للدرس» on the home feature card. */
export function BigPlay({ it, label }: { it: Item; label: string }) {
  const p = usePlayer();
  return (
    <button className="big-play" onClick={() => p.play(it, [it])}>
      <PlaySvg />
      <span>{label}</span>
    </button>
  );
}

/** The round play button of the «latest clip» card on a sheikh page. */
export function LatestPlay({ it }: { it: Item }) {
  const p = usePlayer();
  const S = useS();
  return (
    <button className="play" disabled={!it.p} aria-label={S.playLatest} onClick={() => p.play(it, [it])}>
      <PlaySvg />
    </button>
  );
}
