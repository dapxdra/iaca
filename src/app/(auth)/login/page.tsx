export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-black/10 p-8 dark:border-white/10">
        <h1 className="text-xl font-semibold">Acceso interno IACA</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Formulario de inicio de sesión con Supabase Auth (correo/contraseña o magic
          link). Ver <code>docs/REQUIREMENTS.md</code> sección 6.
        </p>
      </div>
    </div>
  );
}
