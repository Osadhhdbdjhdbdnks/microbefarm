import type { Metadata } from "next";
import { FruitSlider } from "@/components/fruit-slider";

export const metadata: Metadata = {
  title: "Agrumea Farm | Jams, pestos and Sicilian preserves",
  description:
    "Agrumea Farm — Sicilian artisan marmalades, spreads and preserves. Pure fruits, natural goodness, from our farm.",
};

export default function HomePage() {
  return <FruitSlider />;
}