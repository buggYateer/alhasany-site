import { ThemeProvider } from "@/components/theme-provider";
import { config } from "@/lib/config";
import { siteFont } from "@/lib/generated/font";
import { themeCss } from "@/lib/theme";
import "../../globals.css";

/** The dashboard keeps the Tailwind/shadcn design; the public pages use the original site's style.css. */
export default function LawhaLayout({ children }: LayoutProps<"/[locale]/lawha">) {
  return (
    <ThemeProvider>
      <style>{themeCss(config)}</style>
      <div className={`${siteFont.variable} min-h-dvh font-sans antialiased`}>{children}</div>
    </ThemeProvider>
  );
}
