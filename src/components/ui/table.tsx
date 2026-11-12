/**
 * Primitivas de tabla. Envoltura redondeada con sombra suave y scroll
 * horizontal propio (el body nunca scrollea en X). Cabecera adherida, filas
 * con hover, celdas numéricas con cifras tabulares.
 *
 * En celulares (< md) las columnas secundarias se ocultan con `hideOnMobile`
 * para que la tabla quepa sin scroll lateral; lo esencial de esas columnas se
 * repite apilado bajo la celda principal con `MobileOnly`.
 */
const HIDE_ON_MOBILE = "hidden md:table-cell";

export function MobileOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-0.5 block whitespace-normal text-small font-normal text-muted-foreground md:hidden">
      {children}
    </span>
  );
}
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
  hideOnMobile = false,
}: {
  children?: React.ReactNode;
  className?: string;
  numeric?: boolean;
  hideOnMobile?: boolean;
}) {
  return (
    <th
      className={`sticky top-0 z-10 border-b border-border bg-surface-sunken px-3 py-2.5 text-left text-[0.8125rem] font-semibold tracking-wide text-muted-foreground md:px-4 ${
        numeric ? "text-right tabular-nums" : ""
      } ${hideOnMobile ? HIDE_ON_MOBILE : ""} ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  numeric = false,
  hideOnMobile = false,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  numeric?: boolean;
  hideOnMobile?: boolean;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border-b border-border px-3 py-3 align-middle md:px-4 ${
        numeric ? "text-right tabular-nums" : ""
      } ${hideOnMobile ? HIDE_ON_MOBILE : ""} ${className}`}
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
