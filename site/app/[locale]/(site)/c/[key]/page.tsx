import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AhCollection } from "@/components/ah/collection";
import { getLookup, getSite } from "@/lib/data";

export async function generateStaticParams() {
  return (await getSite()).collections.map((c) => ({ key: c.key }));
}

async function find(params: Promise<{ key: string }>) {
  const { key } = await params;
  const lk = await getLookup();
  const c = lk.site.collections.find((x) => x.key === decodeURIComponent(key));
  if (!c) notFound();
  return { lk, c };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/c/[key]">): Promise<Metadata> {
  const { c } = await find(params);
  return { title: c.title };
}

export default async function CollectionPage({ params }: PageProps<"/[locale]/c/[key]">) {
  const { lk, c } = await find(params);
  const locale = await rootLocale();
  const title = locale === "ar" ? c.title : "Ramadan nights";
  return (
    <Suspense>
      <AhCollection path={`/c/${c.key}`} title={title} items={lk.items(c.ids)} />
    </Suspense>
  );
}
