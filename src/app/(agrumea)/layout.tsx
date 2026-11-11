import type { Metadata } from "next";
import { SiteHeader } from "@/components/sites/agrumea/site-header";
import { SiteFooter } from "@/components/sites/agrumea/site-footer";
import "./agrumea.css";

export const metadata: Metadata = {
  title: {
    default: "Agrumea Farm | Sicilian citrus, jams, pesto and specialities",
    template: "%s",
  },
  description:
    "Agrumea Farm — Azienda Agricola Sebastiano Piazza. Sicilian marmalades, jams, pesto, spreadable creams and savoury specialities.",
};

export default function AgrumeaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="agrumea-site flex min-h-screen flex-col bg-[#fdf3eb] text-[#762530]">
      <SiteHeader />
      <main id="site-main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
