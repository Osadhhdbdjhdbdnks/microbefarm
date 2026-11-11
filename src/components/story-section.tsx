import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Static content section used across the informational pages. The `offset`
 * variant adds extra top padding so the fixed header does not overlap the
 * kicker on pages without their own hero; `tint` gives a full-bleed tinted
 * background with the content wrapped in `.story-inner`.
 */
export function StorySection({
  kicker,
  title,
  titleLevel = 1,
  offset = false,
  tint = false,
  className,
  children,
}: {
  kicker?: string;
  title: ReactNode;
  /** Heading level rendered for the title (1 for page heroes, 2 for blocks). */
  titleLevel?: 1 | 2;
  /** Push content below the fixed site header. */
  offset?: boolean;
  /** Full-bleed tinted background (wraps content in .story-inner). */
  tint?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const Heading = titleLevel === 2 ? "h2" : "h1";
  const inner = (
    <>
      {kicker ? <p className="story-kicker">{kicker}</p> : null}
      <Heading className="story-title">{title}</Heading>
      {children}
    </>
  );

  return (
    <section
      className={cn(
        "story-section",
        tint && "story-section--tint",
        offset && "story-section--offset",
        className,
      )}
    >
      {tint ? <div className="story-inner">{inner}</div> : inner}
    </section>
  );
}
