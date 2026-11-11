// src/data/product-details.ts
export type BuyIcon = "whatsapp" | "tiktok" | "shopee";

export type BuyLink = {
  icon: BuyIcon;
  label: string;
  href: string;
};

export type ProductDetail = {
  category: string;
  origin: [string, string];
  lead: string;
  ingredients: string;
  mayContain: string;
  tips: string;
  weights: string[];
  shelfLife: string;
  heroArt?: string;    // ← 补上，消除 TS 报错
  buyFrom?: BuyLink[]; // ← 补上，消除 TS 报错
};

export const DEFAULT_BUY_LINKS: BuyLink[] = [
  { icon: "whatsapp", label: "WhatsApp", href: "https://wa.me/60123456789" },
  { icon: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@yourshop" },
  { icon: "shopee", label: "Shopee", href: "https://shopee.com.my/yourshop" },
];

export const PRODUCT_DETAILS: Record<string, ProductDetail> = {
  passionfruit: {
    category: "Tropical Goodness",
    origin: ["Made in", "Perak – Malaysia"],
    lead: "Glossy, vibrant and perfectly balanced between sweet and tangy. The lively note of passion fruit meets Mediterranean sunshine.",
    ingredients: "Ingredients: passion fruit (100%).",
    mayContain: "May contain: tree nuts, sesame, soy",
    tips: "Ideal for desserts, glazes and sparkling drinks. Keep away from direct sunlight.",
    weights: ["250g", "500g", "1kg"],
    shelfLife: "24 months",
    buyFrom: DEFAULT_BUY_LINKS,
  },
  potato: {
    category: "Savoury",
    origin: ["Made in", "Perak – Malaysia"],
    lead: "Earthy, generous and versatile. Sicilian potatoes from volcanic soil, the humble backbone of the island's table.",
    ingredients: "Ingredients: potatoes (100%).",
    mayContain: "May contain: gluten, soy, sesame",
    tips: "Ideal for roasts, purées and focaccia fillings. Keep away from direct sunlight and store in a cool, dry place.",
    weights: ["1kg", "2kg", "5kg"],
    shelfLife: "6 months",
    buyFrom: DEFAULT_BUY_LINKS,
  },
  durian: {
    category: "Fresh Fruit",
    origin: ["Made in", "Perak – Malaysia"],
    lead: "Creamy, complex and unmistakable. The king of fruits, harvested at peak ripeness for those who love bold, lingering flavour.",
    ingredients: "Ingredients: durian pulp (100%).",
    mayContain: "May contain: tree nuts, sesame, soy",
    tips: "Ideal for desserts, smoothies and daring pairings. Keep away from direct sunlight. After opening, store in the refrigerator and consume within 3–4 days.",
    weights: ["500g", "1kg", "2kg"],
    shelfLife: "24 months",
    buyFrom: DEFAULT_BUY_LINKS,
  },
  papaya: {
    category: "Fresh Fruit",
    origin: ["Made in", "Perak – Malaysia"],
    lead: "Soft, fragrant and sun-sweet. Sun-ripened papaya with a silken palate and a bright tropical finish, a classic of our orchards.",
    ingredients: "Ingredients: papaya (100%).",
    mayContain: "May contain: tree nuts, sesame, soy",
    tips: "Ideal for breakfast bowls, salads and smoothies. Keep away from direct sunlight. After opening, store in the refrigerator and consume within 3–4 days.",
    weights: ["500g", "1kg", "2kg"],
    shelfLife: "18 months",
    buyFrom: DEFAULT_BUY_LINKS,
  },
  hamimelon: {
    category: "Fresh Fruit",
    origin: ["Made in", "Perak – Malaysia"],
    lead: "Cool, honeyed and refreshing. Netted hami melon with a crisp bite and a delicate floral sweetness, perfectly balanced.",
    ingredients: "Ingredients: hami melon (100%).",
    mayContain: "May contain: tree nuts, sesame, soy",
    tips: "Ideal for fruit plates, cold soups and summer drinks. Keep away from direct sunlight. After opening, store in the refrigerator and consume within 3–4 days.",
    weights: ["1kg", "2kg", "3kg"],
    shelfLife: "12 months",
    buyFrom: DEFAULT_BUY_LINKS,
  },
};

export const DEFAULT_DETAIL: ProductDetail = {
  category: "Fresh Fruit",
  origin: ["Made in", "Perak – Malaysia"],
  lead: "Pure fruit, natural goodness. Grown with patience on our farm and brought to the table at the perfect moment of ripeness.",
  ingredients: "Ingredients: fruit (100%).",
  mayContain: "May contain: tree nuts, sesame, soy",
  tips: "Keep away from direct sunlight. After opening, store in the refrigerator and consume within 3–4 days.",
  weights: ["500g", "1kg"],
  shelfLife: "12 months",
  buyFrom: DEFAULT_BUY_LINKS,
};