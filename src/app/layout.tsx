import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
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
        </nav>
        {children}
      </body>
    </html>
  );
}
