/**
 * Reusable Supabase client mock for tests.
 *
 * Usage in test files:
 *   vi.mock("@/integrations/supabase/client", () => ({
 *     supabase: mockSupabase(),
 *   }));
 *
 * Then configure per-test:
 *   const sb = mockSupabase();
 *   sb.__mockSelect.mockResolvedValue({ data: [...], error: null });
 */

import { vi } from "vitest";

export function mockSupabase() {
  const selectMock = vi.fn().mockResolvedValue({ data: [], error: null });
  const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const updateMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const deleteMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve(selectMock())),
  };

  // Make chainable methods resolve to the mock result
  Object.assign(chainable, {
    select: vi.fn().mockReturnValue(chainable),
    insert: vi.fn().mockReturnValue(chainable),
    update: vi.fn().mockReturnValue(chainable),
    delete: vi.fn().mockReturnValue(chainable),
  });

  return {
    from: vi.fn().mockReturnValue(chainable),
    rpc: rpcMock,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    // Expose internals for per-test configuration
    __mockSelect: selectMock,
    __mockInsert: insertMock,
    __mockRpc: rpcMock,
    __chainable: chainable,
  };
}
