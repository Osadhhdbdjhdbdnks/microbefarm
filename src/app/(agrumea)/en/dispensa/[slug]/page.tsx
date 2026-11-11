import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { agrumeaProducts, getProduct, getOtherProducts, SITE_ORIGIN } from "@/lib/agrumea";
import { PhotoSlider } from "@/components/sites/agrumea/photo-slider";
import { ProductCard } from "@/components/sites/agrumea/product-card";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return agrumeaProducts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return {
    title: product.seoTitle || `${product.title} | Agrumea Farm`,
    description: product.seoDescription,
    alternates: { canonical: `${SITE_ORIGIN}/en/dispensa/${slug}` },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const others = getOtherProducts(product.slug);

  return (
    <>
      {/* Hero: big serif title, category link, jar with label overlay */}
      <section className="product-hero" style={{ "--product-bg": product.themeColor } as React.CSSProperties}>
        <div className="product-hero__stage">
          <h1 aria-label={product.title} className="product-hero__title" dangerouslySetInnerHTML={{ __html: product.heroTitleHtml }} />
          <div className="product-hero__meta container">
            <div className="product-hero__meta-grid">
              <Link href={`/en/dispensa#${product.category}`} className="product-hero__meta-item product-hero__meta-item--left">
                {product.categoryName}
              </Link>
              <p className="product-hero__meta-item product-hero__meta-item--right">
                Made in
                <br />
                Sicily &ndash; Italy
              </p>
            </div>
          </div>
          <div className="product-hero__jar">
            <Image
              className="product-hero__jar-base"
              src={product.jarImage}
              alt={`Agrumea Farm - ${product.title}`}
              width={995}
              height={1600}
              priority
              unoptimized
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="product-hero__jar-label" src={product.labelImage} alt="" aria-hidden="true" />
          </div>
          <p className="product-hero__buy">
            <a
              className="product-hero__buy-link"
              href="https://www.riblo.it/agrumea-farm/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Buy now
            </a>
          </p>
        </div>
      </section>

      {/* Intro: description + allergens */}
      <section className="page-intro product-detail__intro">
        <div className="container">
          <div className="grid-12">
            <div className="page-intro__inner">
              <span className="page-intro__rhombus" aria-hidden="true" />
              <div
                className="page-intro__text rich-text"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
              {product.allergensHtml && (
                <div className="page-intro__after rich-text" dangerouslySetInnerHTML={{ __html: product.allergensHtml }} />
              )}
              <span className="page-intro__rhombus" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* Meta columns: tips / weights / shelf life */}
      <section className="product-meta">
        <div className="container">
          <div className="grid-12">
            <div className="product-meta__inner">
              <div className="product-meta__col">
                <p className="product-meta__label">Useful tips</p>
                <p className="product-meta__value">{product.tips}</p>
              </div>
              <div className="product-meta__col meta-border-left">
                <p className="product-meta__label">{product.weightLabel}</p>
                <ul className="product-meta__weights">
                  {product.weights.map((w) => (
                    <li className="product-meta__weight" key={w}>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="product-meta__col">
                <p className="product-meta__label">Shelf life</p>
                <p className="product-meta__value">{product.conservation}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Photo gallery */}
      <section className="photo-slider">
        <p className="visually-hidden">Use the left and right arrow keys to browse the photos.</p>
        <PhotoSlider images={product.gallery} alt={product.title} />
      </section>

      {/* Other products — clicking a card navigates to its dispensa page */}
      <section className="other-products">
        <div className="container">
          <div className="grid-12">
            <h2 className="other-products__title">The other products</h2>
          </div>
        </div>
        <div className="product-slider">
          <div className="product-slider__track">
            {others.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
