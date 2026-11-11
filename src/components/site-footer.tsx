"use client";

import Link from "next/link";
import {
  primaryLinks,
  secondaryLinks,
  type NavLink,
} from "@/data/navigation";

/**
 * Explore 栏固定只显示三项：Home / Experience / Contacts。
 * （Pantry / Production / About / Shop 已按要求移除。）
 * 标签文案仍取自 navigation.ts，保持单一数据源。
 */
const EXPLORE_HREFS = ["/", "/experience", "/contatti"];

export function SiteFooter() {
  const year = new Date().getFullYear();
  const exploreLinks: NavLink[] = [...primaryLinks, ...secondaryLinks].filter((l) =>
    EXPLORE_HREFS.includes(l.href),
  );

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Link
            href="/"
            aria-label="Microbe Farm"
            className="site-header__wordmark site-footer__wordmark"
          >
            <span className="site-header__wordmark-main">MICROBE</span>
            <span className="site-header__wordmark-sub">Farm</span>
          </Link>
          <p className="site-footer__tag">
            Pure fruits · Natural goodness · From our farm
          </p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer">
          <p className="site-footer__head">Explore</p>
          <ul>
            {exploreLinks.map((l) =>
              l.external ? (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noreferrer">
                    {l.label} ↗
                  </a>
                </li>
              ) : (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="site-footer__contact">
          <p className="site-footer__head">Contacts</p>
          <p>hello@microbefarm.my</p>
          <p>Perak — Malaysia</p>
          <p>By appointment, Tue – Sat</p>
        </div>
      </div>

      <div className="site-footer__legal">
        <span>© {year} Microbe Farm. All rights reserved.</span>
        <span className="site-footer__legal-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/cookies">Cookies</Link>
        </span>
      </div>
    </footer>
  );
}