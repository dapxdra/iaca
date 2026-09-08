import { authContent, siteConfig } from "@/config/site";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div data-cy="login-card" className="w-full max-w-sm border border-border p-8">
        <span className="text-small font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {siteConfig.name}
        </span>
        <h1 className="mt-3 text-h3 font-semibold text-foreground">{authContent.title}</h1>
        <p className="mt-2 text-body text-muted-foreground">{authContent.description}</p>
        <LoginForm />
      </div>
    </div>
  );
}
