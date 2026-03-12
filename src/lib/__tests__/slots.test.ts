import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateSlots, generateCallUrl, type TimeSlot } from "@/lib/slots";
import { BookingStatus } from "@/types/enums";
import type { AvailabilityRule, AvailabilityException, Booking } from "@/types";

// Fix "now" so tests are deterministic (2026-03-11 at 00:00 UTC)
const FIXED_NOW = new Date("2026-03-11T00:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── helpers ───────────────────────────────────────────────────────

function rule(weekday: number, start: string, end: string, serviceId?: string): AvailabilityRule {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    weekday,
    startTime: start,
    endTime: end,
    isActive: true,
    serviceId: serviceId ?? null,
  } as AvailabilityRule;
}

function booking(startISO: string, endISO: string, status = BookingStatus.CONFIRMED): Booking {
  return {
    id: crypto.randomUUID(),
    startDateTime: startISO,
    endDateTime: endISO,
    status,
  } as Booking;
}

function exception(date: string, isAvailable: boolean, startTime?: string, endTime?: string): AvailabilityException {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    date,
    isAvailable,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
  } as AvailabilityException;
}

// ─── generateSlots ─────────────────────────────────────────────────

describe("generateSlots", () => {
  it("generates correct slots for a single day with one rule", () => {
    // Wednesday 2026-03-11 → weekday 2 (0=Mon)
    const rules = [rule(2, "09:00", "12:00")];
    const slots = generateSlots(rules, [], [], 60, "2026-03-11", "2026-03-11");

    expect(slots.length).toBe(3);
    expect(slots[0].label).toBe("09:00 – 10:00");
    expect(slots[1].label).toBe("10:00 – 11:00");
    expect(slots[2].label).toBe("11:00 – 12:00");
  });

  it("returns empty when no rules match the weekday", () => {
    // Thursday = weekday 3, but rule is for Monday (0)
    const rules = [rule(0, "09:00", "12:00")];
    const slots = generateSlots(rules, [], [], 60, "2026-03-12", "2026-03-12");
    expect(slots.length).toBe(0);
  });

  it("respects blocked exceptions", () => {
    const rules = [rule(2, "09:00", "12:00")];
    const exceptions = [exception("2026-03-11", false)];
    const slots = generateSlots(rules, exceptions, [], 60, "2026-03-11", "2026-03-11");
    expect(slots.length).toBe(0);
  });

  it("adds slots from open exceptions with custom times", () => {
    // No rules, but an open exception adds a window
    const exceptions = [exception("2026-03-11", true, "14:00", "16:00")];
    const slots = generateSlots([], exceptions, [], 60, "2026-03-11", "2026-03-11");
    expect(slots.length).toBe(2);
    expect(slots[0].label).toBe("14:00 – 15:00");
    expect(slots[1].label).toBe("15:00 – 16:00");
  });

  it("excludes slots that overlap with existing bookings", () => {
    const rules = [rule(2, "09:00", "12:00")];
    // Slots use local time via setHours, so booking times must align
    const bStart = new Date("2026-03-11"); bStart.setHours(10, 0, 0, 0);
    const bEnd = new Date("2026-03-11"); bEnd.setHours(11, 0, 0, 0);
    const bookings = [booking(bStart.toISOString(), bEnd.toISOString())];
    const slots = generateSlots(rules, [], bookings, 60, "2026-03-11", "2026-03-11");

    const labels = slots.map((s) => s.label);
    expect(labels).toContain("09:00 – 10:00");
    expect(labels).not.toContain("10:00 – 11:00");
    expect(labels).toContain("11:00 – 12:00");
  });

  it("ignores cancelled/declined bookings", () => {
    const rules = [rule(2, "09:00", "11:00")];
    const bookings = [booking("2026-03-11T09:00:00Z", "2026-03-11T10:00:00Z", BookingStatus.CANCELLED)];
    const slots = generateSlots(rules, [], bookings, 60, "2026-03-11", "2026-03-11");
    expect(slots.length).toBe(2);
  });

  it("excludes slots overlapping with calendar busy events", () => {
    const rules = [rule(2, "09:00", "12:00")];
    // Busy events must be in local-aligned time to overlap with locally-generated slots
    const bStart = new Date("2026-03-11"); bStart.setHours(9, 30, 0, 0);
    const bEnd = new Date("2026-03-11"); bEnd.setHours(10, 30, 0, 0);
    const busy = [{ start_at: bStart.toISOString(), end_at: bEnd.toISOString() }];
    const slots = generateSlots(rules, [], [], 60, "2026-03-11", "2026-03-11", undefined, busy);

    const labels = slots.map((s) => s.label);
    // 09:00-10:00 overlaps with busy (09:30-10:30)
    expect(labels).not.toContain("09:00 – 10:00");
    // 10:00-11:00 also overlaps
    expect(labels).not.toContain("10:00 – 11:00");
    expect(labels).toContain("11:00 – 12:00");
  });

  it("prefers service-specific rules over global rules", () => {
    const rules = [
      rule(2, "09:00", "12:00"),           // global
      rule(2, "14:00", "16:00", "svc-1"),  // service-specific
    ];
    const slots = generateSlots(rules, [], [], 60, "2026-03-11", "2026-03-11", "svc-1");

    const labels = slots.map((s) => s.label);
    // Should use the service-specific rule only
    expect(labels).toContain("14:00 – 15:00");
    expect(labels).not.toContain("09:00 – 10:00");
  });

  it("ignores inactive rules", () => {
    const rules = [{ ...rule(2, "09:00", "12:00"), isActive: false }];
    const slots = generateSlots(rules, [], [], 60, "2026-03-11", "2026-03-11");
    expect(slots.length).toBe(0);
  });

  it("generates correct 30-minute slots", () => {
    const rules = [rule(2, "09:00", "10:30")];
    const slots = generateSlots(rules, [], [], 30, "2026-03-11", "2026-03-11");
    expect(slots.length).toBe(3);
    expect(slots[0].label).toBe("09:00 – 09:30");
    expect(slots[1].label).toBe("09:30 – 10:00");
    expect(slots[2].label).toBe("10:00 – 10:30");
  });

  it("spans multiple days", () => {
    // Wed (2) and Thu (3)
    const rules = [rule(2, "09:00", "10:00"), rule(3, "09:00", "10:00")];
    const slots = generateSlots(rules, [], [], 60, "2026-03-11", "2026-03-12");
    expect(slots.length).toBe(2);
  });

  it("returns empty array when date range is invalid", () => {
    const rules = [rule(2, "09:00", "12:00")];
    const slots = generateSlots(rules, [], [], 60, "2026-03-12", "2026-03-11");
    expect(slots.length).toBe(0);
  });
});

// ─── generateCallUrl ───────────────────────────────────────────────

describe("generateCallUrl", () => {
  it("returns a Jitsi URL for JITSI location type", () => {
    expect(generateCallUrl("abc-123", "JITSI")).toBe("https://8x8.vc/gamechanger-abc-123");
  });

  it("returns a Jitsi URL when locationType is undefined", () => {
    expect(generateCallUrl("abc-123")).toBe("https://8x8.vc/gamechanger-abc-123");
  });

  it("returns empty string for non-Jitsi location types", () => {
    expect(generateCallUrl("abc-123", "ZOOM")).toBe("");
    expect(generateCallUrl("abc-123", "IN_PERSON")).toBe("");
  });
});
