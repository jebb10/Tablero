import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";
import { cerrarSesion } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/auth/role-badge";
import { getCurrentProfile } from "@/lib/auth/session";

const montserrat = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "../../public/fonts/montserrat-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/montserrat-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/montserrat-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/montserrat-700.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Dashboard 414",
  description: "Seguimiento de requerimientos — Positiva Web 414",
};

function nombreVisible(profile: { email: string; fullName: string | null }): string {
  const nombre = profile.fullName?.trim();
  if (nombre) return nombre;
  const usuario = profile.email.split("@")[0] ?? "";
  return usuario.charAt(0).toUpperCase() + usuario.slice(1);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {profile && (
          <nav className="flex items-center gap-4 border-b bg-card px-6 py-2.5 print:hidden">
            <Link href="/" className="text-sm font-semibold">
              Dashboard 414
            </Link>
            <Link
              href="/planeacion"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Planeación
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{nombreVisible(profile)}</span>
              <RoleBadge role={profile.role} />
              <form action={cerrarSesion}>
                <Button type="submit" variant="ghost" size="sm">
                  Cerrar sesión
                </Button>
              </form>
            </div>
          </nav>
        )}
        {children}
      </body>
    </html>
  );
}
