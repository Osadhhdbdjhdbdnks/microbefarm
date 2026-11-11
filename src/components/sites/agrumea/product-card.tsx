import Image from "next/image";
import Link from "next/link";
import type { AgrumeaProduct } from "@/lib/agrumea";

/** Clickable product card (fruit SVG + jar) linking to its dispensa detail page. */
export function ProductCard({ product }: { product: AgrumeaProduct }) {
  const href = `/en/dispensa/${product.slug}`;
  return (
    <article className="product-slide" style={{ "--slide-bg": product.themeColor } as React.CSSProperties} aria-label={product.title}>
      <div className="product-slide__stage" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.fruitSvg} alt="" className="product-slide__fruit" loading="lazy" />
      </div>
      <figure className="product-slide__jar">
        <Image src={product.previewImage} alt={product.title} width={367} height={481} loading="lazy" unoptimized />
      </figure>
      <div className="product-slide__caption">
        <h3 className="product-slide__name">{product.title}</h3>
        <p className="product-slide__category">{product.categoryName}</p>
      </div>
      <Link href={href} className="product-slide__link" aria-label={product.title} />
    </article>
  );
}
