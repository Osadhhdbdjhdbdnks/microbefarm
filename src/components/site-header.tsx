"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BUY_URL, forestLinks, isActiveLink } from "@/data/navigation";

/**
 * v7 森林版顶栏：左字标 / 中导航（桌面）/ 右 Buy Now 胶囊；
 * ≤900px：左字标 + 右汉堡 → 全屏绿幕菜单。双端同一组件、仅断点重排。
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setMenuOpen(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className={`site-header site-header--forest${menuOpen ? " is-menu-open" : ""}`}>
        <div className="fh-bar">
          <Link href="/" className="fh-logo" aria-label="Microbe Farm — home">
            MICROBE
            <span>Farm</span>
          </Link>

          <nav className="fh-nav" aria-label="Primary">
            {forestLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActiveLink(l.href, pathname) ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <a className="fh-cta" href={BUY_URL} target="_blank" rel="noreferrer">
            Buy Now <span aria-hidden="true">→</span>
          </a>

          <button
            type="button"
            className="fh-burger"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fh-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="fh-menu__close" onClick={close} aria-label="Close menu">
            ✕
          </button>
          <nav aria-label="Primary mobile">
            <ul>
              {forestLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={close}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <a className="fh-cta fh-cta--menu" href={BUY_URL} target="_blank" rel="noreferrer" onClick={close}>
            Buy Now <span aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </>
  );
}