import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WeeklySlot {
  weekday: number; // 0=Mon, 6=Sun
  ranges: { start: string; end: string }[];
}

export interface AvailabilityException {
  date: string; // YYYY-MM-DD
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  label?: string;
}

export interface UnitAvailability {
  id: string;
  unit_type: string;
  unit_id: string;
  weekly_schedule: WeeklySlot[];
  exceptions: AvailabilityException[];
  max_bookings_per_day: number | null;
  availability_mode: "always_available" | "specific_slots" | "custom_calendar";
  created_at: string;
  updated_at: string;
}

export function useUnitAvailability(unitType: string, unitId: string | undefined) {
  return useQuery({
    queryKey: ["unit-availability", unitType, unitId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("unit_availability")
        .select("*")
        .eq("unit_type", unitType)
        .eq("unit_id", unitId!)
        .maybeSingle();
      if (error) throw error;
      return data as UnitAvailability | null;
    },
    enabled: !!unitId,
  });
}

export function useSaveUnitAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      unitType: string;
      unitId: string;
      availabilityMode: string;
      weeklySchedule: WeeklySlot[];
      exceptions: AvailabilityException[];
      maxBookingsPerDay: number | null;
    }) => {
      const { data: existing } = await (supabase as any)
        .from("unit_availability")
        .select("id")
        .eq("unit_type", payload.unitType)
        .eq("unit_id", payload.unitId)
        .maybeSingle();

      const row = {
        unit_type: payload.unitType,
        unit_id: payload.unitId,
        availability_mode: payload.availabilityMode,
        weekly_schedule: payload.weeklySchedule as any,
        exceptions: payload.exceptions as any,
        max_bookings_per_day: payload.maxBookingsPerDay,
      };

      if (existing) {
        const { error } = await (supabase as any)
          .from("unit_availability")
          .update(row)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("unit_availability")
          .insert(row);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["unit-availability", vars.unitType, vars.unitId] });
    },
  });
}

/**
 * Generate time slots for a unit-hosted service based on unit_availability.
 * Returns slots compatible with the existing booking UI.
 */
export function generateUnitSlots(
  availability: UnitAvailability | null,
  durationMinutes: number,
  startDate: string,
  endDate: string,
  existingBookings: { start_date_time: string | null; end_date_time: string | null; status: string }[] = [],
) {
  if (!availability || availability.availability_mode === "always_available") {
    // Default: Mon-Fri 9-17
    return generateSlotsFromSchedule(
      defaultWeeklySchedule(),
      [],
      durationMinutes,
      startDate,
      endDate,
      existingBookings,
    );
  }

  return generateSlotsFromSchedule(
    availability.weekly_schedule || [],
    availability.exceptions || [],
    durationMinutes,
    startDate,
    endDate,
    existingBookings,
  );
}

function defaultWeeklySchedule(): WeeklySlot[] {
  return [0, 1, 2, 3, 4].map(weekday => ({
    weekday,
    ranges: [{ start: "09:00", end: "17:00" }],
  }));
}

function generateSlotsFromSchedule(
  schedule: WeeklySlot[],
  exceptions: AvailabilityException[],
  durationMinutes: number,
  startDate: string,
  endDate: string,
  existingBookings: { start_date_time: string | null; end_date_time: string | null; status: string }[],
) {
  const slots: { startDateTime: string; endDateTime: string; label: string }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const jsDay = d.getDay();
    const weekday = jsDay === 0 ? 6 : jsDay - 1;

    // Check exceptions
    const dayExceptions = exceptions.filter(e => e.date === dateStr);
    const blocked = dayExceptions.some(e => !e.isAvailable);
    if (blocked) continue;

    // Get schedule for this weekday
    const daySchedule = schedule.find(s => s.weekday === weekday);
    const windows = [
      ...(daySchedule?.ranges || []),
      ...dayExceptions.filter(e => e.isAvailable && e.startTime && e.endTime).map(e => ({ start: e.startTime!, end: e.endTime! })),
    ];

    if (windows.length === 0 && !daySchedule) continue;

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

        if (slotStart <= now) continue;

        // Check overlaps
        const overlaps = existingBookings.some(b => {
          if (!["PENDING", "CONFIRMED", "ACCEPTED", "REQUESTED", "PENDING_PAYMENT"].includes(b.status)) return false;
          const bStart = b.start_date_time ? new Date(b.start_date_time) : null;
          const bEnd = b.end_date_time ? new Date(b.end_date_time) : null;
          if (!bStart || !bEnd) return false;
          return slotStart < bEnd && slotEnd > bStart;
        });

        if (!overlaps) {
          const fmt = (date: Date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
          slots.push({
            startDateTime: slotStart.toISOString(),
            endDateTime: slotEnd.toISOString(),
            label: `${fmt(slotStart)} – ${fmt(slotEnd)}`,
          });
        }
      }
    }
  }

  return slots;
}
