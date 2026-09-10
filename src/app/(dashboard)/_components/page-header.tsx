import type { DashboardPageContent } from "@/config/site";

/**
 * Cabecera estándar de cada página del panel: título (H3, no H1 — ver
 * design-system/MASTER.md), descripción, y un slot opcional a la derecha para
 * la acción principal (ej. "Nuevo cliente").
 */
export function DashboardPageHeader({
  content,
  action,
}: {
  content: DashboardPageContent;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-h3 font-semibold text-foreground">{content.title}</h1>
        <p className="mt-2 max-w-2xl text-body text-muted-foreground">{content.description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
