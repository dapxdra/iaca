import { dashboardPages } from "@/config/site";
import { DashboardPageHeader } from "../_components/page-header";

export default function KpiPage() {
  return (
    <div data-cy="page-kpi">
      <DashboardPageHeader content={dashboardPages.kpi} />
    </div>
  );
}
