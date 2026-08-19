import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";

type GradientTextProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  shine?: boolean;
  /** Which design-system gradient to apply. Default: the multi-color text gradient. */
  variant?: "default" | "green";
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

/**
 * Applies the `--gradient-text` design token across its own text box.
 * Pass `shine` to add a diagonal specular glare that sweeps through.
 * Nest <Ink> to punch solid-color words back through the gradient.
 */
export default function GradientText<T extends ElementType = "span">({
  as,
  children,
  className,
  shine = false,
  variant = "default",
  ...rest
}: GradientTextProps<T>) {
  const Tag = (as ?? "span") as ElementType;
  const base =
    variant === "green"
      ? shine
        ? "gradient-text-green-shine"
        : "gradient-text-green"
      : shine
        ? "gradient-text-shine"
        : "gradient-text";
  const merged = [base, className].filter(Boolean).join(" ");
  return (
    <Tag className={merged} {...rest}>
      {children}
    </Tag>
  );
}

export function Ink({ children }: { children: ReactNode }) {
  return <span className="ink">{children}</span>;
}
