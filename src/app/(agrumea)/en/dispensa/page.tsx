import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { agrumeaProducts } from "@/lib/agrumea";

export const metadata: Metadata = {
  title: "Pantry | Agrumea Farm",
  description:
    "Agrumea Farm's pantry: Sicilian marmalades and jams, spreadable creams, and savoury specialities — pesto, caponata, sweet and sour onions.",
};

const categories = [
  { id: "marmellate", label: "Marmelade and Jams" },
  { id: "spalmabili", label: "Spreadable Creams" },
  { id: "salati", label: "Savoury" },
];

export default function PantryPage() {
  return (
    <>
      <section className="pantry-hero">
        <h1 className="pantry-hero__title">The Pantry</h1>
      </section>

      {categories.map((cat) => {
        const items = agrumeaProducts.filter((p) => p.category === cat.id);
        if (!items.length) return null;
        return (
          <section className="pantry-section" id={cat.id} key={cat.id}>
            <div className="container">
              <h2 className="pantry-section__title">{cat.label}</h2>
              <div className="grid-12">
                <div className="pantry-grid">
                  {items.map((product) => (
                    <Link
                      key={product.slug}
                      href={`/en/dispensa/${product.slug}`}
                      className="pantry-card"
                      style={{ "--slide-bg": product.themeColor } as React.CSSProperties}
                      aria-label={product.title}
                    >
                      <div className="pantry-card__stage" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.fruitSvg} alt="" className="pantry-card__fruit" loading="lazy" />
                      </div>
                      <div className="pantry-card__jar">
                        <Image
                          src={product.previewImage}
                          alt={product.title}
                          width={367}
                          height={481}
                          loading="lazy"
                          unoptimized
                        />
                      </div>
                      <div className="pantry-card__caption">
                        <h3 className="pantry-card__name">{product.title}</h3>
                        <p className="pantry-card__category">{product.categoryName}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
