import type { DashboardPageContent } from "@/config/site";

export function DashboardPageHeader({ content }: { content: DashboardPageContent }) {
  return (
    <div>
      <h1 className="text-h3 font-semibold text-foreground">{content.title}</h1>
      <p className="mt-2 max-w-2xl text-body text-muted-foreground">
        {content.description} Ver <code className="text-small text-muted-foreground">{content.docsRef}</code>.
      </p>
    </div>
  );
}
