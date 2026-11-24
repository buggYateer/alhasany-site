"use client";

/** /all, /lessons, /khutab, /tilawat — filterPage() in web/app.js: filters in the page header, choices kept in the link. */
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { strings } from "@/lib/ah";
import type { Item } from "@/lib/library";
import { hijriMonth, SURAHS_AR, SURAHS_LATIN, surahNo, surahsOf } from "@/lib/text";
import { ShareBtn } from "./global";
import { List } from "./list";
import { PageHead, withLocale } from "./page-head";

export type Field = "kind" | "sheikh" | "month" | "surah" | "series";

/** Open/closed state of the filter panel survives moving between filter pages (like FOPEN). */
let FOPEN = false;

export function AhFilter({ page, kind, fields, items, quick }: { page: string; kind: string | null; fields: Field[]; items: Item[]; quick?: { slug: string; name: string }[] }) {
  const locale = useLocale();
  const S = strings(locale);
  const title = S[page as "all"] as string;
  const unit = S.unit[page];
  const params = useSearchParams();
  const [open, setOpenState] = useState(FOPEN);
  const setOpen = (o: boolean) => {
    FOPEN = o;
    setOpenState(o);
  };
  const surahs = locale === "ar" ? SURAHS_AR : SURAHS_LATIN;

  const facet = (() => {
    const seriesTitle = new Map(items.filter((i) => i.se).map((i) => [i.se!.key, i.se!.title]));
    const names = new Map(items.filter((i) => i.sh).map((i) => [i.sh!.slug, i.sh!.name]));
    return {
      kind: { label: S.fKind, all: S.fKindAll, of: (i: Item) => [i.k], name: (k: string) => S.kind[k] ?? k },
      sheikh: { label: S.fSheikh, all: S.fSheikhAll, of: (i: Item) => (i.sh ? [i.sh.slug] : []), name: (k: string) => names.get(k) ?? k },
      month: {
        label: S.fMonth,
        all: S.fMonthAll,
        of: (i: Item) => {
          const m = hijriMonth(i.h);
          return m ? [m.key] : [];
        },
        name: (k: string) => {
          const [y, m] = k.split("-");
          return `${S.months[+m - 1]} ${y}`;
        },
        sort: (a: string, b: string) => b.localeCompare(a),
      },
      surah: {
        label: S.fSurah,
        all: S.fSurahAll,
        of: (i: Item) => surahsOf(i.t).map((n) => String(surahNo(n) || n)),
        name: (k: string) => surahs[+k - 1] || k,
        sort: (a: string, b: string) => (+a || 999) - (+b || 999),
      },
      series: { label: S.fSeries, all: S.fSeriesAll, of: (i: Item) => [i.se ? i.se.key : "_"], name: (k: string) => (k === "_" ? S.loose : (seriesTitle.get(k) ?? k)) },
    } as Record<Field, { label: string; all: string; of: (i: Item) => string[]; name: (k: string) => string; sort?: (a: string, b: string) => number }>;
  })();

  const sel = Object.fromEntries(fields.map((f) => [f, params.get(f) ?? ""])) as Record<Field, string>;
  const order = params.get("order") === "old" ? "old" : "new";
  const pick = (except: Field | null) => items.filter((i) => fields.every((f) => f === except || !sel[f] || facet[f].of(i).includes(sel[f])));
  // (React Compiler memoizes this, so the list only resets when the choices change)
  const filtered = items.filter((i) => fields.every((f) => !sel[f] || facet[f].of(i).includes(sel[f])));
  const ids = order === "old" ? filtered.reverse() : filtered;

  const setParams = (q: URLSearchParams) => {
    const s = q.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
  };
  const change = (f: string, v: string) => {
    const q = new URLSearchParams(location.search);
    if (v && !(f === "order" && v === "new")) q.set(f, v);
    else q.delete(f);
    setParams(q);
  };
  const nActive = fields.filter((f) => sel[f]).length + (order === "old" ? 1 : 0);
  const active = nActive > 0;
  const qs = params.toString();

  return (
    <>
      <PageHead
        t={title}
        sub={`${items.length} ${unit}`}
        S={S}
        actions={
          <>
            <button className={`icon-btn on-dark${open ? " on" : ""}`} data-ftoggle aria-expanded={open} aria-label={S.filterSort} title={S.filterSort} onClick={() => setOpen(!open)}>
              <span className="ms" aria-hidden="true">
                tune
              </span>
              {active ? <b className="badge">{nActive}</b> : null}
            </button>
            <ShareBtn path={withLocale(locale, `/${page}`) + (qs ? `?${qs}` : "")} title={title} cls="on-dark" label={S.share} />
          </>
        }
      />
      <div className="fpanel" id="fpanel" hidden={!open}>
        <div className="filters">
          {fields.map((f) => {
            const F = facet[f];
            const cnt: Record<string, number> = {};
            for (const i of pick(f)) for (const k of F.of(i)) cnt[k] = (cnt[k] || 0) + 1;
            const keys = Object.keys(cnt).sort(F.sort ?? ((a, b) => cnt[b] - cnt[a]));
            return (
              <label className="flt" key={f}>
                <span>{F.label}</span>
                <select data-f={f} value={sel[f]} onChange={(e) => change(f, e.target.value)}>
                  <option value="">{F.all}</option>
                  {keys.map((k) => (
                    <option key={k} value={k}>
                      {F.name(k)} ({cnt[k]})
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
          <label className="flt">
            <span>{S.fOrder}</span>
            <select data-f="order" value={order} onChange={(e) => change("order", e.target.value)}>
              <option value="new">{S.orderNew}</option>
              <option value="old">{S.orderOld}</option>
            </select>
          </label>
          {active ? (
            <button className="clear-f" onClick={() => setParams(new URLSearchParams())}>
              {S.clearFilters}
            </button>
          ) : null}
        </div>
      </div>
      {quick ? (
        <div className="qchips" role="group" aria-label={S.quickLabel}>
          {[{ slug: "", name: S.quickAll }, ...quick].map((x) => (
            <button
              key={x.slug}
              className={sel.sheikh === x.slug ? "on" : undefined}
              onClick={() => {
                const q = new URLSearchParams(location.search);
                q.delete("series");
                if (x.slug) q.set("sheikh", x.slug);
                else q.delete("sheikh");
                setParams(q);
              }}
            >
              {x.name}
            </button>
          ))}
        </div>
      ) : null}
      {active ? <p className="f-count">{S.matching(ids.length, unit)}</p> : null}
      <List items={ids} limit={30} sheikh kind={!kind} />
    </>
  );
}
