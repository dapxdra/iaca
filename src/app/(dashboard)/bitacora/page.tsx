import { dashboardPages } from "@/config/site";
import { DashboardPageHeader } from "../_components/page-header";

export default function BitacoraPage() {
  return (
    <div data-cy="page-bitacora">
      <DashboardPageHeader content={dashboardPages.bitacora} />
    </div>
  );
}
