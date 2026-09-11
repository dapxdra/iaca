import { forwardRef } from "react";

/**
 * Campos de formulario del design system. `Field` = label + control + mensaje
 * de error (el de `FormState.fieldErrors`). Los controles comparten borde,
 * radio 6px, foco anillado con el color de acento y transición de 150ms.
 */
const controlClass =
  "w-full rounded-md border border-border bg-surface-raised px-3 py-2.5 text-body text-foreground " +
  "shadow-xs outline-none transition-[border-color,box-shadow,background-color] duration-150 " +
  "placeholder:text-muted-foreground/70 " +
  "hover:border-border-strong " +
  "focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--ring)] " +
  "disabled:opacity-55 disabled:cursor-not-allowed " +
  "aria-[invalid=true]:border-red-700 aria-[invalid=true]:focus-visible:shadow-[0_0_0_3px_rgb(185_28_28/0.25)]";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-small font-medium text-foreground">
        {label}
        {required && <span className="text-red-700"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-small text-muted-foreground">{hint}</p>}
      {error && (
        <p
          role="alert"
          data-cy={`${htmlFor}-error`}
          className="animate-fade-in text-small font-medium text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`${controlClass} ${className}`} {...props} />;
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", rows = 3, ...props }, ref) {
  return (
    <textarea ref={ref} rows={rows} className={`${controlClass} resize-y ${className}`} {...props} />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = "", children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`${controlClass} cursor-pointer appearance-none bg-[length:1.1em] bg-[right_0.6rem_center] bg-no-repeat pr-9 ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23575d83' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...props}
    >
      {children}
    </select>
  );
});
