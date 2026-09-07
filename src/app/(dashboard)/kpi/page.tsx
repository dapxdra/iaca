import { dashboardPages } from "@/config/site";

const content = dashboardPages.kpi;

export default function KpiPage() {
  return (
    <div data-cy="page-kpi">
      <h1 className="text-2xl font-semibold">{content.title}</h1>
      <p className="mt-2 text-sm text-foreground/70">
        {content.description} Ver <code>{content.docsRef}</code>.
      </p>
    </div>
  );
}
