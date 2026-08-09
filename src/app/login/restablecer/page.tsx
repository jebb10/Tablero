import { RestablecerForm } from "@/components/auth/restablecer-form";

export default function RestablecerPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-surface-muted p-6">
      <div className="w-full max-w-[400px] rounded-[14px] border border-border bg-card px-9 py-10 shadow-[0_1px_3px_rgba(27,59,81,0.06)]">
        <RestablecerForm />
      </div>
    </main>
  );
}
