"use client";

/** /others: speakers with the «sort» menu (sorted like the original: most clips / A→Z / Z→A, remembered on this device). */
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { strings } from "@/lib/ah";
import { OSORT_EVENT, readOsort, ShareBtn } from "./global";
import { PageHead, withLocale } from "./page-head";

type Row = { key: string; slug: string; name: string; n: number };

export function AhOthers({ list }: { list: Row[] }) {
  const locale = useLocale();
  const S = strings(locale);
  const [mode, setMode] = useState("count");
  useEffect(() => {
    const sync = () => setMode(readOsort());
    sync();
    addEventListener(OSORT_EVENT, sync);
    return () => removeEventListener(OSORT_EVENT, sync);
  }, []);
  const by: Record<string, (a: Row, b: Row) => number> = {
    count: (a, b) => b.n - a.n,
    az: (a, b) => a.name.localeCompare(b.name, "ar"),
    za: (a, b) => b.name.localeCompare(a.name, "ar"),
  };
  const sorted = [...list].sort(by[mode] ?? by.count);
  return (
    <>
      <PageHead
        t={S.others}
        sub={S.othersSub(list.length)}
        S={S}
        actions={
          <>
            <button className="icon-btn on-dark" data-osort aria-label={S.sort} title={S.sort}>
              <span className="ms" aria-hidden="true">
                swap_vert
              </span>
            </button>
            <ShareBtn path={withLocale(locale, "/others")} title={S.others} cls="on-dark" label={S.share} />
          </>
        }
      />
      <div className="others">
        {sorted.map((s) => (
          <Link key={s.key} href={`/s/${s.slug}`}>
            <span className="ms" aria-hidden="true">
              person
            </span>
            <span className="o-n">{s.name}</span>
            <b>{s.n}</b>
          </Link>
        ))}
      </div>
    </>
  );
}
