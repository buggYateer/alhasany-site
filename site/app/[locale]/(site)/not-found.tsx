import { locale as rootLocale } from "next/root-params";
import { Link } from "@/i18n/navigation";
import { strings } from "@/lib/ah";

export default async function NotFound() {
  const S = strings((await rootLocale()) ?? "ar");
  return (
    <p className="empty">
      {S.notFound}{" "}
      <Link href="/" style={{ textDecoration: "underline" }}>
        {S.backHome}
      </Link>
    </p>
  );
}
