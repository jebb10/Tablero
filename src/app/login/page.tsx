import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; msg?: string }>;
}) {
  const { next, msg } = await searchParams;

  const profile = await getCurrentProfile();
  if (profile) {
    redirect("/");
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-surface-muted p-6">
      <div className="w-full max-w-[400px] rounded-[14px] border border-border bg-card px-9 py-10 shadow-[0_1px_3px_rgba(27,59,81,0.06)]">
        <div className="flex flex-col items-center gap-6">
          <Image src="/logo-positiva.svg" alt="Positiva" width={140} height={52} className="h-[52px] w-auto" />
          <h1 className="text-xl font-bold text-foreground">Iniciar sesión</h1>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {msg === "expired" && (
            <Alert variant="warning">Tu sesión expiró. Vuelve a iniciar sesión.</Alert>
          )}
          {msg === "logged-out" && (
            <Alert variant="success">Cerraste sesión correctamente.</Alert>
          )}

          <LoginForm next={next ?? "/"} />

          <Link
            href="/login/recuperar"
            className="text-center text-[13px] text-muted-foreground hover:text-foreground"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
    </main>
  );
}
