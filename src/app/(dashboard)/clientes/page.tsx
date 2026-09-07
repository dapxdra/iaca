import { dashboardPages } from "@/config/site";

const content = dashboardPages.clientes;

export default function ClientesPage() {
  return (
    <div data-cy="page-clientes">
      <h1 className="text-2xl font-semibold">{content.title}</h1>
      <p className="mt-2 text-sm text-foreground/70">
        {content.description} Ver <code>{content.docsRef}</code>.
      </p>
    </div>
  );
}
