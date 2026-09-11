import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-xl border border-border bg-surface-raised text-muted-foreground shadow-sm">
        <Compass className="h-7 w-7" />
      </span>
      <div>
        <h1 className="font-heading text-h3 font-semibold text-foreground">Página no encontrada</h1>
        <p className="mt-1 text-body text-muted-foreground">
          El enlace no existe o el recurso fue movido.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-md bg-primary px-5 py-2.5 text-small font-semibold text-primary-foreground shadow-xs transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-sm"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
