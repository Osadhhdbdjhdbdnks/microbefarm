"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type Product } from "@/data/products";
import { SHOP_URL } from "@/data/navigation";

/**
 * Purchase panel rendered inside /dispensa/[slug]/buy.
 * Lets the visitor pick a sale format (whole fruit / basket / preserve jar),
 * an optional sub-option, and a quantity — then hands the selection over to
 * the external Agrumea shop with the product pre-filled in the URL hash so
 * staff/customers can see exactly what was chosen.
 */

/* v7.28 fix (TS2614): `formatPrice` is NOT exported from @/data/products,
   so define it locally: integer cents → "€x.xx". */
const formatPrice = (cents: number): string => `€${(cents / 100).toFixed(2)}`;

export function BuyForm({ product }: { product: Product }) {
  const router = useRouter();
  const [variantIdx, setVariantIdx] = useState(0);
  const [optionIdx, setOptionIdx] = useState<Record<number, number>>({});
  const [qty, setQty] = useState(1);

  const variant = product.variants[variantIdx];
  const options = variant.options ?? [];
  const selectedOption = options.length > 0 ? optionIdx[variantIdx] ?? 0 : -1;
  const unitPrice = variant.priceCents;
  const total = useMemo(() => unitPrice * qty, [unitPrice, qty]);

  const chooseVariant = (i: number) => {
    setVariantIdx(i);
    setQty(1);
  };

  const checkoutHref = () => {
    const label = options.length > 0 ? options[selectedOption].label : variant.label;
    const q = new URLSearchParams({
      fruit: product.slug,
      format: label,
      qty: String(qty),
    });
    return `${SHOP_URL}?${q.toString()}#${product.slug}`;
  };

  return (
    <form
      className="buy-form"
      onSubmit={(e) => {
        e.preventDefault();
        window.open(checkoutHref(), "_blank", "noopener");
      }}
    >
      <fieldset className="buy-form__group">
        <legend className="buy-form__legend">Choose how you want it</legend>
        <div className="buy-form__variants" role="radiogroup" aria-label="Purchase format">
          {product.variants.map((v, i) => (
            <label
              key={v.key}
              className={`buy-form__variant${i === variantIdx ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="variant"
                checked={i === variantIdx}
                onChange={() => chooseVariant(i)}
              />
              <span className="buy-form__variant-label">{v.label}</span>
              <span className="buy-form__variant-unit">{v.unit}</span>
              <span className="buy-form__variant-price">{formatPrice(v.priceCents)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {options.length > 0 && (
        <fieldset className="buy-form__group">
          <legend className="buy-form__legend">Option</legend>
          <div className="buy-form__options">
            {options.map((o, i) => (
              <label
                key={o.label}
                className={`buy-form__option${(optionIdx[variantIdx] ?? 0) === i ? " is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name={`option-${variantIdx}`}
                  checked={(optionIdx[variantIdx] ?? 0) === i}
                  onChange={() => setOptionIdx((prev) => ({ ...prev, [variantIdx]: i }))}
                />
                <span>{o.label}</span>
                {o.note ? <em className="buy-form__option-note">{o.note}</em> : null}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="buy-form__row">
        <label className="buy-form__legend" htmlFor="buy-qty">
          Quantity
        </label>
        <div className="buy-form__stepper">
          <button
            type="button"
            className="buy-form__step"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <input
            id="buy-qty"
            className="buy-form__qty"
            type="number"
            min={1}
            max={99}
            value={qty}
            onChange={(e) => setQty(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
          />
          <button
            type="button"
            className="buy-form__step"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(99, q + 1))}
          >
            +
          </button>
        </div>
      </div>

      <div className="buy-form__summary">
        <span>Total</span>
        <strong className="buy-form__total">{formatPrice(total)}</strong>
      </div>

      <div className="buy-form__actions">
        <button type="submit" className="cta-pill buy-form__submit">
          Buy now
        </button>
        <button
          type="button"
          className="cta-pill cta-pill--outline"
          onClick={() => router.push(`/dispensa/${product.slug}`)}
        >
          Back to details
        </button>
      </div>

      <p className="buy-form__note">
        Checkout continues on agrumeafarm.it — your selection ({
          options.length > 0 ? options[selectedOption].label : variant.label
        }, ×{qty}) is carried over automatically.
      </p>
    </form>
  );
}