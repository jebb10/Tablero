import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseClient } = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ getSupabaseClient }));
vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

function mockSupabaseClient({
  user,
  profile,
}: {
  user: { id: string; email?: string } | null;
  profile: { role: string; full_name: string | null } | null;
}) {
  getSupabaseClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: profile }),
        }),
      }),
    }),
  });
}

describe("session", () => {
  beforeEach(() => {
    vi.resetModules();
    getSupabaseClient.mockReset();
  });

  it("getCurrentProfile devuelve null sin usuario autenticado", async () => {
    mockSupabaseClient({ user: null, profile: null });
    const { getCurrentProfile } = await import("../session");

    expect(await getCurrentProfile()).toBeNull();
  });

  it("getCurrentProfile devuelve null si el usuario no tiene fila en profiles", async () => {
    mockSupabaseClient({ user: { id: "u1", email: "u1@test.com" }, profile: null });
    const { getCurrentProfile } = await import("../session");

    expect(await getCurrentProfile()).toBeNull();
  });

  it("requireAdmin redirige cuando el rol es viewer", async () => {
    mockSupabaseClient({
      user: { id: "u1", email: "viewer@test.com" },
      profile: { role: "viewer", full_name: "Viewer Test" },
    });
    const { requireAdmin } = await import("../session");

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
  });
});
