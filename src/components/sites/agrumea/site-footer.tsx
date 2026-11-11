import Link from "next/link";
import { navLinks, SHOP_URL, SITE_ORIGIN } from "@/lib/agrumea";

const NAV_OUT_OF_SCOPE = new Set(["/en", "/en/produzione", "/en/experience", "/en/chi-siamo", "/en/contatti"]);

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="grid-12 site-footer__top">
          <nav className="site-footer__nav" aria-label="Footer">
            {navLinks.map((link) =>
              NAV_OUT_OF_SCOPE.has(link.href) ? (
                <a
                  key={link.href}
                  className="site-footer__nav-link"
                  href={`${SITE_ORIGIN}${link.href}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} className="site-footer__nav-link" href={link.href}>
                  {link.label}
                </Link>
              ),
            )}
            <a className="site-footer__nav-link" href={SHOP_URL} target="_blank" rel="noopener noreferrer">
              Shop
            </a>
          </nav>

          <div style={{ display: "grid", gap: "var(--space-s)", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <div className="site-footer__col">
              <h3>Registered office</h3>
              <p>
                Via Generale Ameglio, 13
                <br />
                95123 - Catania
              </p>
            </div>
            <div className="site-footer__col">
              <h3>Operational office</h3>
              <p>
                Seconda strada c.da piana s. Croce sn
                <br />
                96014 - Floridia (SR)
              </p>
            </div>
            <div className="site-footer__col">
              <h3>Follow us</h3>
              <p>
                <a href="https://www.instagram.com/agrumea.farm/" target="_blank" rel="noopener noreferrer">
                  @instagram
                </a>
              </p>
            </div>
            <div className="site-footer__col">
              <h3>Contacts</h3>
              <p>
                Do you have a question or would you like to find out more about us? Drop us a line, we&rsquo;d be
                delighted to tell you all about Agrumea Farm.
              </p>
              <p style={{ marginTop: "0.8em" }}>
                <a href="mailto:info@agrumeafarm.it">info@agrumeafarm.it</a>
              </p>
            </div>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>&copy;2026 | Agrumea Farm Azienda Agricola Sebastiano Piazza VAT IT01748040894</span>
          <a href={`${SITE_ORIGIN}/en/privacy`} target="_blank" rel="noopener noreferrer">
            Privacy &amp; Cookies
          </a>
        </div>
      </div>
    </footer>
  );
}
