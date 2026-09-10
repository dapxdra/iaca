/**
 * Primitivas de tabla. Envoltura con scroll horizontal propio (el body nunca
 * scrollea en X — ver reglas de artefactos/diseño). Estilo hairline, sin
 * sombras, coherente con "Minimalism & Swiss Style".
 */
export function TableWrap({
  children,
  "data-cy": dataCy,
}: {
  children: React.ReactNode;
  "data-cy"?: string;
}) {
  return (
    <div data-cy={dataCy} className="overflow-x-auto border border-border">
      <table className="w-full border-collapse text-small">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`border-b border-border bg-surface px-3 py-2.5 text-left font-semibold text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`border-b border-border px-3 py-2.5 align-top ${className}`}>
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <Td colSpan={colSpan} className="py-8 text-center text-muted-foreground">
        {children}
      </Td>
    </tr>
  );
}
