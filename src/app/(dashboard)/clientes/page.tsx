import { dashboardPages } from "@/config/site";
import { DashboardPageHeader } from "../_components/page-header";

export default function ClientesPage() {
  return (
    <div data-cy="page-clientes">
      <DashboardPageHeader content={dashboardPages.clientes} />
    </div>
  );
}
