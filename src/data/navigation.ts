/**
 * Shared navigation data and helpers for the site header, footer and CTAs.
 * v7：新增森林版顶栏 forestLinks（Home/About/Products/Our Farm/Contact）+ BUY_URL。
 */
export type NavLink = {
  href: string;
  label: string;
  /** External links render as plain anchors opening in a new tab. */
  external?: boolean;
};

export const SHOP_URL = "https://www.riblo.it/agrumea-farm/";
export const BUY_URL = SHOP_URL;

export const primaryLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/dispensa", label: "Pantry" },
  { href: "/produzione", label: "Production" },
];

export const secondaryLinks: NavLink[] = [
  { href: "/experience", label: "Experience" },
  { href: "/chi-siamo", label: "About" },
  { href: "/contatti", label: "Contacts" },
  { href: SHOP_URL, label: "Shop", external: true },
];

/* 森林版顶栏导航（桌面居中 5 链；移动端进汉堡菜单） */
export const forestLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/chi-siamo", label: "About" },
  { href: "/dispensa", label: "Products" },
  { href: "/produzione", label: "Our Farm" },
  { href: "/contatti", label: "Contact" },
];

export function isActiveLink(href: string, pathname: string): boolean {
  if (href === pathname) return true;
  return href !== "/" && pathname.startsWith(`${href}/`);
}