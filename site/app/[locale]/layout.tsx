import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { notFound } from "next/navigation";
import { ServiceWorker } from "@/components/sw-register";
import { routing } from "@/i18n/routing";
import { config, RTL_LOCALES, type Locale } from "@/lib/config";

const CLIENT_NAMESPACES = ["nav", "kind", "kinds", "common", "filters", "player", "pwa", "collection", "pages"];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: { default: config.name, template: `%s — ${config.name}` },
  description: config.description,
  applicationName: config.shortName,
  ...(config.domain ? { metadataBase: new URL(config.domain) } : {}),
  openGraph: {
    siteName: config.name,
    type: "website",
    description: "دروس الأسبوع وخطب الجمعة والتلاوات والتراويح — استمع مباشرة من الموقع",
    images: [{ url: "/og-v2.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { url: "/icon-v2.svg", type: "image/svg+xml" },
      { url: "/favicon-32-v2.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192-v2.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon-v2.png",
  },
  appleWebApp: { capable: true, title: config.shortName },
};

export const viewport: Viewport = { themeColor: "#1e2a4a" };

const ICONS =
  "add_to_home_screen,auto_stories,bedtime,calendar_month,chat,check,close,dark_mode,download,forward_10,graphic_eq,groups,home,keyboard_arrow_down,library_music,light_mode,link,menu_book,mic,nights_stay,pause,person,play_arrow,replay_10,schedule,search,send,share,skip_next,skip_previous,swap_vert,translate,trending_up,tune,volume_down,volume_off,volume_up,wb_twilight";

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  const dir = RTL_LOCALES.includes(locale as Locale) ? "rtl" : "ltr";
  const all = await getMessages();
  const messages = Object.fromEntries(CLIENT_NAMESPACES.filter((k) => k in all).map((k) => [k, all[k]]));
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- the original site's fonts, loaded the same way */}
        <link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href={`https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,500,1,0&icon_names=${ICONS}&display=block`} rel="stylesheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}` }}
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
          <ServiceWorker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
