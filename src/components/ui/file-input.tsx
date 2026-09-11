"use client";

import { useId, useState } from "react";
import { Paperclip, X } from "lucide-react";

/**
 * Selector de archivos múltiple con lista de seleccionados y tamaño. El
 * `name` es el mismo para todos los archivos — el servidor los lee con
 * `formData.getAll(name)` (ver bitacora/actions.ts, no puede usar el
 * `parseForm` genérico porque tiene múltiples valores por llave).
 */
export function FileInput({
  name,
  accept,
  multiple = true,
  hint,
}: {
  name: string;
  accept: string;
  multiple?: boolean;
  hint?: string;
}) {
  const id = useId();
  const [files, setFiles] = useState<File[]>([]);

  function remove(index: number) {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Reconstruir el FileList del input a partir de lo que queda — un
      // <input type=file> no permite editar su FileList directamente.
      const dt = new DataTransfer();
      next.forEach((f) => dt.items.add(f));
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.files = dt.files;
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-surface px-3 py-4 text-small text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
      >
        <Paperclip className="h-4 w-4" />
        {hint ?? "Elegir archivos…"}
      </label>
      <input
        id={id}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        className="sr-only"
      />
      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md bg-surface-sunken px-2.5 py-1.5 text-small"
            >
              <span className="min-w-0 truncate text-foreground">{file.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Quitar ${file.name}`}
                className="shrink-0 cursor-pointer rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-red-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
