"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/data/products";

/**
 * Pantry 网格卡片。webp 素材缺失时自动降级为
 * "衬线首字母 + 菱形" 排版卡，避免出现碎图图标。
 */
export function ProductCard({ product }: { product: Product }) {
  const [imgOk, setImgOk] = useState(true);

  return (
    <Link className="product-card" href={`/dispensa/${product.slug}`}>
      {imgOk ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          className="product-card__image"
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          onError={() => setImgOk(false)}
        />
      ) : (
        <span className="product-card__mono" aria-hidden="true">
          {product.fruit.charAt(0)}
          <i className="product-card__mono-diamond" />
        </span>
      )}
      <span className="product-card__name">{product.name}</span>
      <span className="product-card__cta">Discover</span>
    </Link>
  );
}