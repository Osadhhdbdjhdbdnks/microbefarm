import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Cormorant_Garamond } from "next/font/google";

// 导入 Cormorant Garamond 衬线字体（匹配照片中的优雅风格）
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Microbe Farm | Jams, pestos and flavours of Sicily",
  description:
    "Microbe Farm transforms Sicilian citrus fruits, other fruits and produce into artisanal jams, pestos and preserves with an authentic flavour",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cormorant.variable}>
      <body>
        <a className="visually-hidden" href="#site-main">
          Skip to content
        </a>

        <SiteHeader />

        <div className="site-shell">
          {/* ⚠️ {children} 全文件只允许出现这一次 */}
          <main id="site-main">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}