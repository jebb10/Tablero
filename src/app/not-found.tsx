import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">No encontrado</h1>
      <p className="text-sm text-muted-foreground">
        No se encontró el recurso solicitado.
      </p>
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        Volver al dashboard
      </Link>
    </main>
  );
}
