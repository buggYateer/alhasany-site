import type { Cat } from "@/components/ah/shell";
import type { Strings } from "./ah";
import { getCategories } from "./data";

const CAT_ICON: Record<string, string> = { tilawa: "graphic_eq", lesson: "menu_book", khutba: "mic" };

export async function siteCats(S: Strings, locale: string): Promise<Cat[]> {
  const cats = await getCategories();
  return cats.map((c) => ({
    href: c.href,
    icon: CAT_ICON[c.icon] ?? c.icon,
    t: c.key ? (S[c.key as "tilawat"] as string) : locale === "ar" ? "التراويح والتهجد" : "Tarawih & Tahajjud",
    n: c.n,
  }));
}
