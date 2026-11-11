import type { Metadata } from "next";
import { StorySection } from "@/components/story-section";
import { CtaPill } from "@/components/cta-pill";

export const metadata: Metadata = {
  title: "About | Microbe Farm",
  description:
    "Microbe Farm — a Sicilian-hearted farm in Perak, Malaysia: growing, picking and preserving fruit at the peak of ripeness.",
};

const MARQUEE_WORDS = [
  "Pure fruits",
  "Natural goodness",
  "From our farm",
  "Sicilian recipes",
  "Malaysian harvest",
];

export default function AboutPage() {
  return (
    <>
      {/* 词带（原首页块①），顶部留出让固定 header 的空间 */}
      <div className="home-marquee home-marquee--offset" aria-hidden="true">
        <div className="home-marquee__track">
          {[0, 1].map((k) => (
            <span className="home-marquee__group" key={k}>
              {MARQUEE_WORDS.map((w) => (
                <span className="home-marquee__item" key={w}>
                  {w}
                  <i className="home-marquee__diamond" />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* 故事段（原首页块①） */}
      <StorySection kicker="Our story" title="From our orchards to your table." tint>
        <p className="story-text">
          Microbe Farm grows, picks and preserves fruit at the exact peak of
          ripeness. No concentrates, no shortcuts — only the patience of the
          seasons and the honesty of whole fruit.
        </p>
        <p className="story-text">
          Every jar, crate and box carries the same promise: pure fruit,
          natural goodness, from our farm to your table.
        </p>
        <div className="story-stats">
          <div className="story-stat">
            <p className="story-stat__value">100%</p>
            <p className="story-stat__label">Pure fruit</p>
          </div>
          <div className="story-stat">
            <p className="story-stat__value">5</p>
            <p className="story-stat__label">Harvests a year</p>
          </div>
          <div className="story-stat">
            <p className="story-stat__value">0</p>
            <p className="story-stat__label">Additives, ever</p>
          </div>
        </div>
        <div className="story-actions">
          <CtaPill href="/produzione" variant="outline">How we preserve</CtaPill>
          <CtaPill href="/dispensa">Browse the pantry</CtaPill>
        </div>
      </StorySection>

      {/* 原 About 文案保留 */}
      <StorySection kicker="About" title="A farm that keeps Sicilian flavours alive.">
        <p className="story-text">
          Agrumea Farm is the agricultural estate of Sebastiano Piazza, a
          family that has chosen to keep working the land the honest way:
          growing citrus fruits, almonds, pistachios and vegetables, then
          transforming them by hand into jams, pestos and preserves with an
          authentic flavour.
        </p>
        <p className="story-text">
          Every product carries the story of our orchards — a small piece of
          Sicily, cooked slowly and shared generously.
        </p>
        <p className="story-text story-copyright">
          ©2026 | Agrumea Farm — Azienda Agricola Sebastiano Piazza
        </p>
      </StorySection>
    </>
  );
}