import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { Suspense } from "react";
import { AhSearch } from "@/components/ah/search";
import { strings } from "@/lib/ah";

export async function generateMetadata(): Promise<Metadata> {
  const S = strings(await rootLocale());
  return { title: S.searchTitle, robots: { index: false } };
}

export default function SearchPage() {
  return (
    <Suspense>
      <AhSearch />
    </Suspense>
  );
}
