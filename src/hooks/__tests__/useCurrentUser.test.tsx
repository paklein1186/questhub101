import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { UserRole } from "@/types/enums";

// Mock useAuth
const mockUser = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser() }),
}));

describe("useCurrentUser", () => {
  it("returns a guest user when not authenticated", () => {
    mockUser.mockReturnValue(null);

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.id).toBe("");
    expect(result.current.name).toBe("Guest");
    expect(result.current.email).toBe("");
    expect(result.current.role).toBe(UserRole.GAMECHANGER);
    expect(result.current.xp).toBe(0);
    expect(result.current.contributionIndex).toBe(0);
  });

  it("maps authenticated user data correctly", () => {
    mockUser.mockReturnValue({
      id: "user-123",
      name: "Pierre",
      email: "pierre@example.com",
      avatarUrl: "https://example.com/avatar.png",
      role: "ECOSYSTEM_BUILDER",
    });

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.id).toBe("user-123");
    expect(result.current.name).toBe("Pierre");
    expect(result.current.email).toBe("pierre@example.com");
    expect(result.current.avatarUrl).toBe("https://example.com/avatar.png");
    expect(result.current.role).toBe(UserRole.ECOSYSTEM_BUILDER);
  });

  it("falls back to GAMECHANGER when role is empty", () => {
    mockUser.mockReturnValue({
      id: "user-123",
      name: "Test",
      email: "test@example.com",
      role: "",
    });

    const { result } = renderHook(() => useCurrentUser());
    expect(result.current.role).toBe(UserRole.GAMECHANGER);
  });

  it("always sets xp and contributionIndex to 0", () => {
    mockUser.mockReturnValue({
      id: "user-123",
      name: "Test",
      email: "test@example.com",
      role: "GAMECHANGER",
    });

    const { result } = renderHook(() => useCurrentUser());
    expect(result.current.xp).toBe(0);
    expect(result.current.contributionIndex).toBe(0);
  });
});
