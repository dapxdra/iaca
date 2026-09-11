/**
 * Primitivas de tabla. Envoltura redondeada con sombra suave y scroll
 * horizontal propio (el body nunca scrollea en X). Cabecera adherida, filas
 * con hover, celdas numéricas con cifras tabulares.
 */
export function TableWrap({
  children,
  "data-cy": dataCy,
}: {
  children: React.ReactNode;
  "data-cy"?: string;
}) {
  return (
    <div
      data-cy={dataCy}
      className="animate-fade-in overflow-x-auto rounded-lg border border-border bg-surface-raised shadow-sm"
    >
      <table className="w-full border-collapse text-small [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-surface [&_tbody_tr:last-child_td]:border-b-0">
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className = "",
  numeric = false,
}: {
  children?: React.ReactNode;
  className?: string;
  numeric?: boolean;
}) {
  return (
    <th
      className={`sticky top-0 z-10 border-b border-border bg-surface-sunken px-4 py-2.5 text-left text-[0.8125rem] font-semibold tracking-wide text-muted-foreground ${
        numeric ? "text-right tabular-nums" : ""
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  numeric = false,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  numeric?: boolean;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border-b border-border px-4 py-3 align-middle ${
        numeric ? "text-right tabular-nums" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr className="!bg-transparent">
      <Td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
        {children}
      </Td>
    </tr>
  );
}
