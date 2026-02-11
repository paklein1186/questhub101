import type { AvailabilityRule, AvailabilityException, Booking } from "@/types";
import { BookingStatus } from "@/types/enums";

export interface TimeSlot {
  startDateTime: string; // ISO
  endDateTime: string; // ISO
  label: string; // display e.g. "09:00 – 10:30"
}

/**
 * Generate available time slots for a provider within a date range,
 * given a service duration and existing bookings.
 *
 * @param rules      AvailabilityRule records (global + per-service)
 * @param exceptions AvailabilityException records for the provider
 * @param bookings   Existing bookings with status REQUESTED | PENDING_PAYMENT | CONFIRMED
 * @param durationMinutes  Duration of each slot
 * @param startDate  Start of range (YYYY-MM-DD)
 * @param endDate    End of range (YYYY-MM-DD)
 * @param serviceId  Optional service ID to check per-service overrides
 */
export function generateSlots(
  rules: AvailabilityRule[],
  exceptions: AvailabilityException[],
  existingBookings: Booking[],
  durationMinutes: number,
  startDate: string,
  endDate: string,
  serviceId?: string,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Filter to active rules only
  const activeRules = rules.filter((r) => r.isActive);

  // For each day in range
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    // JS getDay: 0=Sunday. Our weekday: 0=Monday. Convert.
    const jsDay = d.getDay();
    const weekday = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon...6=Sun

    // Check exceptions for this date
    const dayExceptions = exceptions.filter((e) => e.date === dateStr);
    const blocked = dayExceptions.some((e) => !e.isAvailable);
    if (blocked) continue;

    // Get rules for this weekday
    // Prefer per-service rules if they exist; otherwise use global rules
    let dayRules = activeRules.filter((r) => r.weekday === weekday);
    const serviceSpecific = dayRules.filter((r) => r.serviceId === serviceId);
    const global = dayRules.filter((r) => !r.serviceId);
    dayRules = serviceSpecific.length > 0 ? serviceSpecific : global;

    // Check if there's an explicit "open" exception with custom times
    const openExceptions = dayExceptions.filter((e) => e.isAvailable && e.startTime && e.endTime);

    // Combine rule windows + open exception windows
    const windows: { start: string; end: string }[] = [
      ...dayRules.map((r) => ({ start: r.startTime, end: r.endTime })),
      ...openExceptions.map((e) => ({ start: e.startTime!, end: e.endTime! })),
    ];

    for (const win of windows) {
      const [sh, sm] = win.start.split(":").map(Number);
      const [eh, em] = win.end.split(":").map(Number);
      const windowStartMin = sh * 60 + sm;
      const windowEndMin = eh * 60 + em;

      for (let t = windowStartMin; t + durationMinutes <= windowEndMin; t += durationMinutes) {
        const slotStart = new Date(dateStr);
        slotStart.setHours(Math.floor(t / 60), t % 60, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

        // Check overlap with existing bookings
        const overlaps = existingBookings.some((b) => {
          if (
            b.status !== BookingStatus.REQUESTED &&
            b.status !== BookingStatus.PENDING_PAYMENT &&
            b.status !== BookingStatus.CONFIRMED &&
            b.status !== "PENDING" as any &&
            b.status !== BookingStatus.ACCEPTED
          )
            return false;
          const bStart = b.startDateTime ? new Date(b.startDateTime) : null;
          const bEnd = b.endDateTime ? new Date(b.endDateTime) : null;
          if (!bStart || !bEnd) return false;
          return slotStart < bEnd && slotEnd > bStart;
        });

        if (!overlaps) {
          const fmt = (date: Date) =>
            `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
          slots.push({
            startDateTime: slotStart.toISOString(),
            endDateTime: slotEnd.toISOString(),
            label: `${fmt(slotStart)} – ${fmt(slotEnd)}`,
          });
        }
      }
    }
  }

  // Filter out slots in the past
  const now = new Date();
  return slots.filter((s) => new Date(s.startDateTime) > now);
}

/** Generate a Jitsi meeting URL for a booking */
export function generateCallUrl(bookingId: string, locationType?: string): string {
  if (!locationType || locationType === "JITSI") {
    return `https://meet.jit.si/gamechanger-${bookingId}`;
  }
  return "";
}
