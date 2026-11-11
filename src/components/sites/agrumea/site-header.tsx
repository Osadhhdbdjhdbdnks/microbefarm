import Link from "next/link";
import { navLinks, SHOP_URL } from "@/lib/agrumea";

const NAV_OUT_OF_SCOPE = new Set(["/en", "/en/produzione", "/en/experience", "/en/chi-siamo", "/en/contatti"]);

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__bar">
        <nav className="site-lang-switcher" aria-label="Language switcher">
          <Link href="/dispensa" className="site-lang-switcher__item">
            IT
          </Link>
          <span aria-current="true" className="site-lang-switcher__item is-active">
            EN
          </span>
        </nav>

        <div className="site-header__brand">
          <Link href="/en/dispensa" className="site-header__logo-link" aria-label="Agrumea Farm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sites/agrumea/logo.svg" alt="" className="site-header__logo-svg" width={151} height={130} />
          </Link>
        </div>

        <nav className="site-nav" aria-label="Main navigation">
          {navLinks.map((link) =>
            NAV_OUT_OF_SCOPE.has(link.href) ? (
              <a
                key={link.href}
                className="site-nav__link"
                href={`https://www.agrumeafarm.it${link.href}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ) : (
              <Link key={link.href} className="site-nav__link" href={link.href}>
                {link.label}
              </Link>
            ),
          )}
          <a className="site-nav__link site-nav__link--shop" href={SHOP_URL} target="_blank" rel="noopener noreferrer">
            Shop
          </a>
        </nav>
      </div>
    </header>
  );
}
