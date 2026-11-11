import productsJson from "@/data/agrumea-products.json";

export const SITE_ORIGIN = "https://www.agrumeafarm.it";
export const SHOP_URL = "https://www.riblo.it/agrumea-farm/";

export interface AgrumeaProduct {
  slug: string;
  title: string;
  heroTitleHtml: string;
  category: string;
  categoryName: string;
  themeColor: string;
  descriptionHtml: string;
  allergensHtml: string;
  tips: string;
  conservation: string;
  weightLabel: string;
  weights: string[];
  jarImage: string;
  labelImage: string;
  previewImage: string;
  gallery: string[];
  fruitSvg: string;
  seoTitle: string;
  seoDescription: string;
}

export const agrumeaProducts = productsJson as AgrumeaProduct[];

export function getProduct(slug: string): AgrumeaProduct | undefined {
  return agrumeaProducts.find((p) => p.slug === slug);
}

export function getOtherProducts(slug: string, count = 6): AgrumeaProduct[] {
  const others = agrumeaProducts.filter((p) => p.slug !== slug);
  return others.slice(0, count);
}

export const navLinks = [
  { href: "/en", label: "Home" },
  { href: "/en/dispensa", label: "Pantry" },
  { href: "/en/produzione", label: "Production" },
  { href: "/en/experience", label: "Experience" },
  { href: "/en/chi-siamo", label: "About" },
  { href: "/en/contatti", label: "Contacts" },
] as const;
