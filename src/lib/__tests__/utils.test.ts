import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (classname utility)", () => {
  it("returns a single class unchanged", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("merges multiple classes", () => {
    expect(cn("p-4", "mt-2")).toBe("p-4 mt-2");
  });

  it("handles conditional classes via clsx", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    // twMerge should keep only the last conflicting utility
    expect(cn("p-4", "p-8")).toBe("p-8");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("handles undefined and null gracefully", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
});
