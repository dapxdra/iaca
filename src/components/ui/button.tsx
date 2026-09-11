import { forwardRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Botón del design system: radio 6px, foco anillado, micro-elevación en hover
 * (translateY -1px + sombra), se hunde en :active. `variant` cubre las 4
 * acciones del panel. Con `loading` muestra spinner y se deshabilita.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2 rounded-md font-semibold " +
  "transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] " +
  "cursor-pointer select-none focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)] " +
  "active:translate-y-0 active:shadow-none disabled:pointer-events-none disabled:opacity-55";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-xs hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--accent)_18%,var(--primary))] hover:shadow-sm",
  secondary:
    "border border-border bg-surface-raised text-foreground shadow-xs hover:-translate-y-px hover:border-border-strong hover:shadow-sm",
  ghost: "text-foreground hover:bg-surface-sunken",
  danger:
    "border border-red-700/35 bg-surface-raised text-red-700 hover:-translate-y-px hover:border-red-700/60 hover:bg-red-700/8 hover:shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-small",
  md: "h-10 px-4 text-small",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className = "", type = "button", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
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
