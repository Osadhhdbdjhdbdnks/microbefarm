// src/data/products.ts
export type VariantOption = { label: string; note?: string };
export type ProductVariant = {
  key: string;
  label: string;
  /** Unit price in euro cents (kept as integer to avoid float drift). */
  priceCents: number;
  unit: string;
  options?: VariantOption[];
};
export type Product = {
  slug: string;
  fruit: string;
  name: string;
  category: string; // 分类 slug（对应 categories）
  image: string;
  turns: string[];
  model: string; // 真 3D 网格（glTF-Binary）
  description: string;
  variants: ProductVariant[];
};
export type Category = {
  slug: string;
  label: string;
  blurb: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/* 实际 glb 位置（根目录 + models/ 混合，按素材盘真实文件名） */
const MODEL_BY_SLUG: Record<string, string> = {
  durian: "/assets/agrumea/models/durian_the_king_of_fruits.glb",
  papaya: "/assets/agrumea/papayafruit.glb",
  hamimelon: "/assets/agrumea/galia_melon.glb",
  potato: "/assets/agrumea/potato.glb",
  passionfruit: "/assets/agrumea/passionfruit.glb",
  mango: "/assets/agrumea/mango.glb", // v7.16：恒满3颗保险（未压缩 glb，任何解码器都能读）
};

/* 每个水果的购买选项：整颗售卖 / 果篮组合 / 手工果酱罐 */
const VARIANTS_BY_SLUG: Record<string, ProductVariant[]> = {
  passionfruit: [
    { key: "whole", label: "Whole fruit", priceCents: 490, unit: "per piece (~250 g)" },
    { key: "box", label: "Gift box", priceCents: 2900, unit: "box of 6 pieces", options: [{ label: "Classic kraft box" }, { label: "Wooden crate", note: "+ €3.00 at checkout" }] },
    { key: "preserve", label: "Passion fruit preserve", priceCents: 850, unit: "jar 290 g", options: [{ label: "Regular" }, { label: "Extra tangy" }] },
  ],
  durian: [
    { key: "whole", label: "Whole fruit", priceCents: 2490, unit: "per piece (~1.5 kg)" },
    { key: "box", label: "Gift box", priceCents: 4900, unit: "pre-cut tray, vacuum sealed" },
    { key: "preserve", label: "Durian cream jar", priceCents: 1150, unit: "jar 250 g" },
  ],
  papaya: [
    { key: "whole", label: "Whole fruit", priceCents: 390, unit: "per piece (~700 g)" },
    { key: "box", label: "Fruit basket", priceCents: 2200, unit: "basket of 3 papayas", options: [{ label: "Ripe & ready" }, { label: "Mixed ripeness" }] },
    { key: "preserve", label: "Papaya marmalade", priceCents: 790, unit: "jar 290 g" },
  ],
  hamimelon: [
    { key: "whole", label: "Whole fruit", priceCents: 890, unit: "per piece (~1.2 kg)" },
    { key: "box", label: "Gift box", priceCents: 3400, unit: "half melon, chilled pack" },
    { key: "preserve", label: "Melon preserve", priceCents: 850, unit: "jar 290 g" },
  ],
  potato: [
    { key: "whole", label: "Fresh harvest", priceCents: 250, unit: "per kg (loose)" },
    { key: "box", label: "Farm sack", priceCents: 1490, unit: "sack of 5 kg", options: [{ label: "Table potatoes" }, { label: "Baking selection" }] },
    { key: "preserve", label: "Savoury jar", priceCents: 750, unit: "jar 220 g" },
  ],
  mango: [
    { key: "whole", label: "Whole fruit", priceCents: 320, unit: "per piece (~400 g)" },
    { key: "box", label: "Fruit basket", priceCents: 1900, unit: "basket of 4 mangoes", options: [{ label: "Ripe & ready" }, { label: "Mixed ripeness" }] },
    { key: "preserve", label: "Mango marmalade", priceCents: 790, unit: "jar 290 g" },
  ],
};

const DEFAULT_VARIANTS: ProductVariant[] = [
  { key: "whole", label: "Whole fruit", priceCents: 490, unit: "per piece" },
  { key: "box", label: "Gift box", priceCents: 2490, unit: "assorted box" },
  { key: "preserve", label: "Artisanal preserve", priceCents: 790, unit: "jar 290 g" },
];

const product = (
  slug: string,
  fruit: string,
  name: string,
  category: string,
  description: string
): Product => ({
  slug,
  fruit,
  name,
  category,
  image: `/assets/agrumea/fruit-${slug}-side.webp`,
  turns: Array.from(
    { length: 16 },
    (_, i) => `/assets/agrumea/fruit-${slug}-turn-${pad(i)}.webp`
  ),
  model: MODEL_BY_SLUG[slug] ?? `/assets/agrumea/models/${slug}.glb`,
  description,
  variants: VARIANTS_BY_SLUG[slug] ?? DEFAULT_VARIANTS,
});

/* ============ 分类（Pantry 页按此分组） ============ */
export const categories: Category[] = [
  {
    slug: "fresh-fruit",
    label: "Fresh Fruit",
    blurb: "Sun-ripened harvest from our Sicilian orchards, picked at the perfect moment.",
  },
  {
    slug: "tropical",
    label: "Tropical Goodness",
    blurb: "Exotic notes grown with Mediterranean patience and bright, tangy character.",
  },
  {
    slug: "savoury",
    label: "Savoury",
    blurb: "Earthy, generous produce — the humble backbone of the island's table.",
  },
];

/* 顺序即展示顺序：初始三果 = 榴莲 / 木瓜 / 哈密瓜（对照设计图构图）
   v7.16：mango 挂末尾作"恒满3颗"保险——即使 3 个压缩 glb 全灭，
   土豆/百香果/芒果 仍能把树桩站满；索引序保证设计三果优先占槽 */
export const products: Product[] = [
  product("durian", "Durian", "Fresh durian", "fresh-fruit", "The king of fruits, 3D-scanned turn by turn."),
  product("papaya", "Papaya", "Fresh papaya", "fresh-fruit", "Sun-ripened papaya, 3D-scanned turn by turn."),
  product("hamimelon", "Hami melon", "Fresh hami melon", "fresh-fruit", "Netted hami melon, 3D-scanned turn by turn."),
  product("potato", "Potato", "Fresh potato", "savoury", "Earthy Sicilian potato, 3D-scanned turn by turn."),
  product("passionfruit", "Passion fruit", "Fresh passion fruit", "tropical", "Glossy passion fruit, 3D-scanned turn by turn."),
  product("mango", "Mango", "Fresh mango", "tropical", "Sun-gold mango, 3D-scanned turn by turn."),
];

/* ============ 分类 → 商品 映射（Pantry 页直接取用） ============ */
export const productsByCategory: Record<string, Product[]> = categories.reduce(
  (acc, c) => {
    acc[c.slug] = products.filter((p) => p.category === c.slug);
    return acc;
  },
  {} as Record<string, Product[]>
);

export function findProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export const PRODUCTS = products;
export default products;