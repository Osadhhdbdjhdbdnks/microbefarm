import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Site-wide CTA pill. Renders a next/link by default; pass `href` starting
 * with http(s) to render an external anchor that opens in a new tab.
 */
export function CtaPill({
  href,
  variant = "solid",
  className,
  children,
  ...props
}: {
  href: string;
  variant?: "solid" | "outline";
  children: ReactNode;
} & Omit<ComponentProps<"a">, "href">) {
  const isExternal = /^https?:\/\//.test(href);
  const classes = cn("cta-pill", variant === "outline" && "cta-pill--outline", className);

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={classes}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
