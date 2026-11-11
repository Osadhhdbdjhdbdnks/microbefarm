import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experience | Agrumea Farm",
  description:
    "Live the Agrumea Farm experience: tastings, tours and flavours of Sicily at the farm.",
};

export default function ExperiencePage() {
  return (
    <section className="experience-banner experience-banner--offset">
      <div>
        <p className="story-kicker">Experience</p>
        <h1 className="story-title">Taste the farm in person.</h1>
        <p className="story-text">
          Walk the orchards, join a preserving workshop and taste straight
          from the copper pan — wander, watch the slow cooking of the harvest
          and sit down to a tasting of our marmalades, creams and pestos.
        </p>
        <Link className="cta-pill" href="/contatti">
          Plan your visit
        </Link>
      </div>
    </section>
  );
}