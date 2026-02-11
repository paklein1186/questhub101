import { useState, useEffect } from "react";
import { Save, Plus, Trash2, CalendarOff, CalendarCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUnitAvailability, useSaveUnitAvailability, type WeeklySlot, type AvailabilityException } from "@/hooks/useUnitAvailability";

const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Props {
  unitType: "GUILD" | "COMPANY";
  unitId: string;
}

export function UnitAvailabilityEditor({ unitType, unitId }: Props) {
  const { data: existing, isLoading } = useUnitAvailability(unitType, unitId);
  const save = useSaveUnitAvailability();
  const { toast } = useToast();

  const [mode, setMode] = useState<string>("always_available");
  const [schedule, setSchedule] = useState<WeeklySlot[]>(defaultSchedule());
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [maxPerDay, setMaxPerDay] = useState<string>("");

  useEffect(() => {
    if (existing) {
      setMode(existing.availability_mode);
      setSchedule(existing.weekly_schedule?.length ? existing.weekly_schedule : defaultSchedule());
      setExceptions(existing.exceptions || []);
      setMaxPerDay(existing.max_bookings_per_day != null ? String(existing.max_bookings_per_day) : "");
    }
  }, [existing]);

  function defaultSchedule(): WeeklySlot[] {
    return Array.from({ length: 7 }, (_, i) => ({
      weekday: i,
      ranges: i < 5 ? [{ start: "09:00", end: "17:00" }] : [],
    }));
  }

  const updateRange = (weekday: number, rangeIdx: number, field: "start" | "end", value: string) => {
    setSchedule(prev => prev.map(s =>
      s.weekday === weekday
        ? { ...s, ranges: s.ranges.map((r, i) => i === rangeIdx ? { ...r, [field]: value } : r) }
        : s
    ));
  };

  const addRange = (weekday: number) => {
    setSchedule(prev => prev.map(s =>
      s.weekday === weekday ? { ...s, ranges: [...s.ranges, { start: "09:00", end: "17:00" }] } : s
    ));
  };

  const removeRange = (weekday: number, rangeIdx: number) => {
    setSchedule(prev => prev.map(s =>
      s.weekday === weekday ? { ...s, ranges: s.ranges.filter((_, i) => i !== rangeIdx) } : s
    ));
  };

  const addException = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setExceptions(prev => [...prev, {
      date: tomorrow.toISOString().split("T")[0],
      isAvailable: false,
      label: "",
    }]);
  };

  const removeException = (idx: number) => {
    setExceptions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateException = (idx: number, patch: Partial<AvailabilityException>) => {
    setExceptions(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        unitType,
        unitId,
        availabilityMode: mode,
        weeklySchedule: schedule,
        exceptions,
        maxBookingsPerDay: maxPerDay ? Number(maxPerDay) : null,
      });
      toast({ title: "Availability saved!" });
    } catch {
      toast({ title: "Failed to save availability", variant: "destructive" });
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading availability…</p>;

  return (
    <div className="space-y-6 max-w-lg">
      {/* Mode */}
      <div>
        <label className="text-sm font-medium mb-1 block">Availability mode</label>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="always_available">Always available (default Mon-Fri 9-17)</SelectItem>
            <SelectItem value="specific_slots">Specific time slots</SelectItem>
            <SelectItem value="custom_calendar">Custom calendar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Weekly schedule */}
      {mode !== "always_available" && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Weekly Schedule</h4>
          {schedule.map(day => (
            <div key={day.weekday} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{WEEKDAY_LABELS[day.weekday]}</span>
                {day.ranges.length === 0 ? (
                  <Badge variant="outline" className="text-xs">Unavailable</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">{day.ranges.length} slot{day.ranges.length > 1 ? "s" : ""}</Badge>
                )}
              </div>
              {day.ranges.map((range, ri) => (
                <div key={ri} className="flex items-center gap-2 mb-1.5">
                  <Input type="time" value={range.start} onChange={e => updateRange(day.weekday, ri, "start", e.target.value)} className="w-28" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input type="time" value={range.end} onChange={e => updateRange(day.weekday, ri, "end", e.target.value)} className="w-28" />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRange(day.weekday, ri)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => addRange(day.weekday)}>
                <Plus className="h-3 w-3 mr-1" /> Add time range
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Exceptions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2"><CalendarOff className="h-4 w-4" /> Exceptions</h4>
          <Button variant="outline" size="sm" onClick={addException}><Plus className="h-3.5 w-3.5 mr-1" /> Add exception</Button>
        </div>
        {exceptions.map((exc, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
            <Input type="date" value={exc.date} onChange={e => updateException(i, { date: e.target.value })} className="w-36" />
            <div className="flex items-center gap-1.5">
              <Switch checked={exc.isAvailable} onCheckedChange={v => updateException(i, { isAvailable: v })} />
              <span className="text-xs">{exc.isAvailable ? <CalendarCheck className="h-3.5 w-3.5 text-primary" /> : <CalendarOff className="h-3.5 w-3.5 text-destructive" />}</span>
            </div>
            {exc.isAvailable && (
              <>
                <Input type="time" value={exc.startTime || ""} onChange={e => updateException(i, { startTime: e.target.value })} className="w-24" placeholder="Start" />
                <Input type="time" value={exc.endTime || ""} onChange={e => updateException(i, { endTime: e.target.value })} className="w-24" placeholder="End" />
              </>
            )}
            <Input value={exc.label || ""} onChange={e => updateException(i, { label: e.target.value })} placeholder="Reason" className="flex-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeException(i)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
        {exceptions.length === 0 && <p className="text-xs text-muted-foreground">No exceptions defined. Add blocked or override dates above.</p>}
      </div>

      {/* Max bookings */}
      <div>
        <label className="text-sm font-medium mb-1 block">Max bookings per day (optional)</label>
        <Input type="number" value={maxPerDay} onChange={e => setMaxPerDay(e.target.value)} min={0} placeholder="No limit" className="w-32" />
      </div>

      <Button onClick={handleSave} disabled={save.isPending} className="w-full">
        <Save className="h-4 w-4 mr-2" /> Save availability
      </Button>

      {!existing && (
        <p className="text-xs text-muted-foreground text-center">
          💡 Define availability in unit settings to improve booking accuracy for your services.
        </p>
      )}
    </div>
  );
}
