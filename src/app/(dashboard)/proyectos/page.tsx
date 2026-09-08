import { dashboardPages } from "@/config/site";
import { DashboardPageHeader } from "../_components/page-header";

export default function ProyectosPage() {
  return (
    <div data-cy="page-proyectos">
      <DashboardPageHeader content={dashboardPages.proyectos} />
    </div>
  );
}
