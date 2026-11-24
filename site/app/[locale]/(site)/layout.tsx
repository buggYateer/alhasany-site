import { locale as rootLocale } from "next/root-params";
import { Suspense } from "react";
import { Global } from "@/components/ah/global";
import { AhPlayer } from "@/components/ah/player";
import { Shell } from "@/components/ah/shell";
import { siteCats } from "@/lib/ah-server";
import { PlayerProvider } from "@/components/player/player-provider";
import { strings } from "@/lib/ah";
import { config } from "@/lib/config";
import { getLookup } from "@/lib/data";
import "@/lib/generated/legacy.css";
import "@/components/ah/extra.css";

/** Public pages: the original site's header, drawer and player around each page. */
export default async function SiteLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  const S = strings(locale);
  const lk = await getLookup();
  const { site } = lk;
  const cats = await siteCats(S, locale);
  const counts = {
    all: Object.keys(site.lessons).length,
    main: site.sheikhs.filter((s) => s.main).length,
    series: site.sheikhs.reduce((a, s) => a + (s.series ?? []).length, 0),
    others: site.sheikhs.filter((s) => !s.main).length,
  };
  // Demo data has no real audio: a small route plays a tone instead.
  const audioBase = site.demo || process.env.NODE_ENV === "development" ? "/api/dev-audio" : config.audioBase;
  return (
    <PlayerProvider audioBase={audioBase} channel={config.telegramChannel} siteName={S.siteName} logo="/logo.png">
      <Suspense>
        <Shell cats={cats} counts={counts} channel={config.telegramChannel} />
      </Suspense>
      <main id="app" className="wrap" aria-live="polite">
        {children}
      </main>
      <AhPlayer />
      <Global />
    </PlayerProvider>
  );
}
