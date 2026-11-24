/** secH() and pageHead() from web/app.js. No server-only imports, so client pages can use them too. */
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { Strings } from "@/lib/ah";
import { ShareBtn } from "./global";

/** Path with the locale prefix (Arabic has none), for share links. */
export const withLocale = (locale: string, path: string) => (locale === "ar" ? path : `/${locale}${path === "/" ? "" : path}`);

export function SecH({ t, small, id, more, S }: { t: string; small?: string; id?: string; more?: string; S: Strings }) {
  return (
    <div className="sec-h" id={id}>
      <h2>{t}</h2>
      {more ? (
        <Link className="see-all" href={more}>
          {S.seeAll}
        </Link>
      ) : small ? (
        <small>{small}</small>
      ) : null}
    </div>
  );
}

export function PageHead({ t, sub, actions, share, S }: { t: string; sub?: string; actions?: ReactNode; share?: string; S: Strings }) {
  return (
    <>
      <div className="crumbs">
        <Link href="/">{S.home}</Link> ‹ {t}
      </div>
      <div className="page-h">
        <div className="ph-t">
          <h1>{t}</h1>
          {sub ? <p>{sub}</p> : null}
        </div>
        <div className="ph-act">{actions !== undefined ? actions : <ShareBtn path={share ?? "/"} title={t} cls="on-dark" label={S.share} />}</div>
      </div>
    </>
  );
}

