import { forwardRef } from "react";
import Link from "next/link";

/**
 * Botón del design system: esquinas rectas, foco visible, cursor-pointer,
 * transición 200ms (ver design-system/MASTER.md). `variant` cubre las 4
 * acciones que aparecen en el panel; no agregar más sin un caso real.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-primary",
  secondary:
    "border border-border bg-background text-foreground hover:bg-surface focus-visible:outline-primary",
  ghost:
    "text-foreground hover:bg-surface focus-visible:outline-primary",
  danger:
    "border border-red-700/40 bg-background text-red-700 hover:bg-red-700/10 focus-visible:outline-red-700",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-small",
  md: "px-4 py-2.5 text-small",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className = "", type = "button", ...props },
  ref
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />
  );
});

type LinkButtonProps = React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
