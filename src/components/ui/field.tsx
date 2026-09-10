import { forwardRef } from "react";

/**
 * Campos de formulario del design system. `Field` envuelve label + control +
 * mensaje de error (el que devuelve `FormState.fieldErrors`). Los controles
 * comparten estilo de borde/foco.
 */
const controlClass =
  "w-full border border-border bg-background px-3 py-2.5 text-body text-foreground outline-none transition-colors duration-150 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60 aria-[invalid=true]:border-red-700";

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
        <p role="alert" data-cy={`${htmlFor}-error`} className="text-small font-medium text-red-700">
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
  return <textarea ref={ref} rows={rows} className={`${controlClass} ${className}`} {...props} />;
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = "", children, ...props }, ref) {
  return (
    <select ref={ref} className={`${controlClass} ${className}`} {...props}>
      {children}
    </select>
  );
});
