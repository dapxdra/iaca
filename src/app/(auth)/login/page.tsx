import { authContent } from "@/config/site";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        data-cy="login-card"
        className="w-full max-w-sm rounded-lg border border-black/10 p-8 dark:border-white/10"
      >
        <h1 className="text-xl font-semibold">{authContent.title}</h1>
        <p className="mt-2 text-sm text-foreground/70">{authContent.description}</p>
        <LoginForm />
      </div>
    </div>
  );
}
