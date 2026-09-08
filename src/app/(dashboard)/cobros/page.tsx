import { dashboardPages } from "@/config/site";
import { DashboardPageHeader } from "../_components/page-header";

export default function CobrosPage() {
  return (
    <div data-cy="page-cobros">
      <DashboardPageHeader content={dashboardPages.cobros} />
    </div>
  );
}
