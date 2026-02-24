import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Clock, Euro, MapPin, Hash, CalendarClock, Video,
  ChevronLeft, ChevronRight, Shield, Check, ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useServiceById,
  usePublicProfile,
  useGuildById,
  useCompanyById,
  useAvailabilityRules,
  useAvailabilityExceptions,
  useBookingsForProvider,
} from "@/hooks/useEntityQueries";
import { generateSlots, generateCallUrl, type TimeSlot } from "@/lib/slots";
import { useUnitAvailability, generateUnitSlots } from "@/hooks/useUnitAvailability";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { GuestOnboardingAssistant } from "@/components/GuestOnboardingAssistant";
import { ShareLinkButton } from "@/components/ShareLinkButton";

const PENDING_BOOKING_KEY = "pendingBookingSlot";

export default function PublicBooking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const isLoggedIn = !!currentUser.id;

  const { data: svc, isLoading } = useServiceById(id);
  const { data: provider } = usePublicProfile(svc?.provider_user_id ?? undefined);

  const ownerType = (svc as any)?.owner_type || "USER";
  const companyId = ownerType === "COMPANY" ? (svc as any)?.owner_id : undefined;
  const guildIdForAvail = ownerType === "GUILD" ? ((svc as any)?.owner_id || svc?.provider_guild_id) : undefined;
  const { data: guild } = useGuildById(ownerType === "GUILD" ? guildIdForAvail : undefined);
  const { data: company } = useCompanyById(companyId);

  const { data: rules } = useAvailabilityRules(svc?.provider_user_id ?? undefined, svc?.id);
  const { data: exceptions } = useAvailabilityExceptions(svc?.provider_user_id ?? undefined);
  const { data: providerBookings } = useBookingsForProvider(svc?.provider_user_id ?? undefined);
  const { data: unitAvailability } = useUnitAvailability(
    ownerType === "GUILD" ? "GUILD" : ownerType === "COMPANY" ? "COMPANY" : "",
    guildIdForAvail || companyId || undefined
  );

  const unitId = guildIdForAvail || companyId;
  const { data: unitBookingsData } = useQuery({
    queryKey: ["bookings-for-unit", unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("start_date_time, end_date_time, status, service_id")
        .eq("is_deleted", false);
      if (error) throw error;
      return data || [];
    },
    enabled: !!unitId && (ownerType === "GUILD" || ownerType === "COMPANY"),
  });

  const providerUserId = svc?.provider_user_id;
  const { data: providerBusyEvents = [] } = useQuery({
    queryKey: ["provider-calendar-busy", providerUserId],
    queryFn: async () => {
      if (!providerUserId) return [];
      const { data: busyEvents } = await supabase
        .from("calendar_busy_events")
        .select("start_at, end_at, source_calendar_id, connection_id")
        .eq("user_id", providerUserId);
      if (!busyEvents || busyEvents.length === 0) return [];
      const connectionIds = [...new Set(busyEvents.map(e => e.connection_id))];
      const { data: prefs } = await (supabase as any)
        .from("calendar_subcalendar_preferences")
        .select("source_calendar_id, is_enabled, connection_id")
        .eq("user_id", providerUserId)
        .in("connection_id", connectionIds);
      const disabledSet = new Set<string>();
      if (prefs?.length) {
        for (const p of prefs) {
          if (!p.is_enabled) disabledSet.add(`${p.connection_id}::${p.source_calendar_id}`);
        }
      }
      return busyEvents.filter((e: any) =>
        !e.source_calendar_id || !disabledSet.has(`${e.connection_id}::${e.source_calendar_id}`)
      );
    },
    enabled: !!providerUserId,
  });

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookNotes, setBookNotes] = useState("");
  const [guestOpen, setGuestOpen] = useState(false);
  const [quickSignup, setQuickSignup] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [showSignupChoice, setShowSignupChoice] = useState(false);

  const isUnitService = ownerType === "GUILD" || ownerType === "COMPANY";

  const slots = useMemo(() => {
    if (!svc?.duration_minutes) return [];
    const start = new Date(); start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start); end.setDate(end.getDate() + 6);

    if (isUnitService) {
      return generateUnitSlots(
        unitAvailability ?? null,
        svc.duration_minutes,
        start.toISOString().split("T")[0],
        end.toISOString().split("T")[0],
        (unitBookingsData || []).map((b: any) => ({ start_date_time: b.start_date_time, end_date_time: b.end_date_time, status: b.status })),
        providerBusyEvents.map((e: any) => ({ start_at: e.start_at, end_at: e.end_at })),
      );
    }

    if (!providerUserId || !rules) return [];
    return generateSlots(
      rules.map((r: any) => ({ id: r.id, weekday: r.weekday, startTime: r.start_time, endTime: r.end_time, timezone: r.timezone, isActive: r.is_active, serviceId: r.service_id, providerUserId: r.provider_user_id, createdAt: r.created_at, updatedAt: r.updated_at })),
      (exceptions || []).map((e: any) => ({ id: e.id, date: e.date, isAvailable: e.is_available, startTime: e.start_time, endTime: e.end_time, providerUserId: e.provider_user_id, createdAt: e.created_at })),
      (providerBookings || []).map((b: any) => ({ startDateTime: b.start_date_time, endDateTime: b.end_date_time, status: b.status } as any)),
      svc.duration_minutes,
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0],
      svc.id,
      providerBusyEvents.map((e: any) => ({ start_at: e.start_at, end_at: e.end_at })),
    );
  }, [providerUserId, svc?.id, svc?.duration_minutes, weekOffset, rules, exceptions, providerBookings, isUnitService, unitAvailability, unitBookingsData, providerBusyEvents]);

  const slotsByDate = useMemo(() => {
    const groups: Record<string, TimeSlot[]> = {};
    for (const slot of slots) {
      const date = slot.startDateTime.split("T")[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(slot);
    }
    return groups;
  }, [slots]);

  // After login, auto-create the pending booking
  useEffect(() => {
    if (!isLoggedIn || !svc) return;
    const pending = localStorage.getItem(PENDING_BOOKING_KEY);
    if (!pending) return;
    try {
      const data = JSON.parse(pending);
      if (data.serviceId !== svc.id) return;
      localStorage.removeItem(PENDING_BOOKING_KEY);
      // Auto-create booking
      (async () => {
        setBookingInProgress(true);
        const isFree = !svc.price_amount || svc.price_amount === 0;
        const callUrl = isFree ? generateCallUrl(`bk-${Date.now()}`, svc.online_location_type as any) : undefined;
        const { data: newBooking, error } = await supabase.from("bookings").insert({
          service_id: svc.id,
          requester_id: currentUser.id,
          provider_user_id: svc.provider_user_id || null,
          provider_guild_id: svc.provider_guild_id || (ownerType === "GUILD" ? (svc as any).owner_id : null),
          company_id: ownerType === "COMPANY" ? (svc as any).owner_id : null,
          start_date_time: data.startDateTime,
          end_date_time: data.endDateTime,
          status: isFree ? "CONFIRMED" : "PENDING",
          payment_status: isFree ? "NOT_REQUIRED" : "PENDING",
          amount: svc.price_amount || 0,
          currency: svc.price_currency,
          notes: data.notes || null,
          call_url: callUrl,
        }).select("id").single();
        setBookingInProgress(false);
        if (error || !newBooking) {
          toast({ title: "Could not create booking", description: error?.message, variant: "destructive" });
          return;
        }
        toast({ title: isFree ? "✅ Session confirmed!" : "✅ Booking request sent!" });
        navigate(`/bookings/${newBooking.id}`);
      })();
    } catch {
      localStorage.removeItem(PENDING_BOOKING_KEY);
    }
  }, [isLoggedIn, svc, currentUser.id]);

  const handleSelectSlot = () => {
    if (!selectedSlot || !svc) return;
    if (isLoggedIn) {
      // Redirect to the full service detail for booking
      navigate(`/services/${svc.id}`);
      return;
    }
    // Store pending slot and show signup choice
    localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify({
      serviceId: svc.id,
      startDateTime: selectedSlot.startDateTime,
      endDateTime: selectedSlot.endDateTime,
      notes: bookNotes.trim(),
    }));
    setShowSignupChoice(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading service…</div>
      </div>
    );
  }

  if (!svc || svc.is_deleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Service not found</h1>
          <p className="text-muted-foreground">This service may have been removed.</p>
        </div>
      </div>
    );
  }

  const isFree = !svc.price_amount || svc.price_amount === 0;
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });

  const svcTopics = (svc as any)?.service_topics?.map((st: any) => st.topics).filter(Boolean) || [];
  const svcTerrs = (svc as any)?.service_territories?.map((st: any) => st.territories).filter(Boolean) || [];

  const providerName = ownerType === "GUILD" && guild ? guild.name
    : ownerType === "COMPANY" && company ? (company as any).name
    : provider?.name || "Provider";
  const providerAvatar = ownerType === "GUILD" && guild ? guild.logo_url
    : ownerType === "COMPANY" && company ? (company as any).logo_url
    : provider?.avatar_url;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="text-center mb-8">
            {svc.image_url && (
              <div className="w-full h-40 sm:h-52 rounded-xl overflow-hidden mb-6">
                <img src={svc.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="font-display text-2xl sm:text-3xl font-bold mb-3">{svc.title}</h1>

            {/* Provider */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
              <Avatar className="h-7 w-7">
                <AvatarImage src={providerAvatar ?? undefined} />
                <AvatarFallback>{providerName?.[0]}</AvatarFallback>
              </Avatar>
              <span>by <span className="text-foreground font-medium">{providerName}</span></span>
            </div>

            {/* Meta badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              {svc.duration_minutes && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" /> {svc.duration_minutes} min
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                <Euro className="h-3 w-3" />
                {isFree ? "Free" : `${svc.price_amount} ${svc.price_currency}`}
              </Badge>
              {svc.online_location_type && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Video className="h-3 w-3" /> {svc.online_location_type}
                </Badge>
              )}
            </div>

            {/* Tags */}
            {(svcTopics.length > 0 || svcTerrs.length > 0) && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                {svcTopics.map((t: any) => (
                  <Badge key={t.id} variant="secondary" className="text-xs">
                    <Hash className="h-3 w-3 mr-0.5" />{t.name}
                  </Badge>
                ))}
                {svcTerrs.map((t: any) => (
                  <Badge key={t.id} variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-0.5" />{t.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {svc.description && (
            <div className="rounded-xl border border-border bg-card/50 p-4 mb-6">
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{svc.description}</p>
            </div>
          )}

          {/* Availability Calendar */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 mb-6">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Choose a time slot
            </h2>

            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" disabled={weekOffset === 0} onClick={() => setWeekOffset(w => w - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{fmtDate(weekStart)} – {fmtDate(weekEnd)}</span>
              <Button variant="ghost" size="icon" disabled={weekOffset >= 3} onClick={() => setWeekOffset(w => w + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {(providerUserId || isUnitService) ? (
              Object.keys(slotsByDate).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No available slots this week.</p>
              ) : (
                <div className="max-h-[320px] overflow-y-auto space-y-3">
                  {Object.entries(slotsByDate).map(([date, daySlots]) => (
                    <div key={date}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                        {new Date(date).toLocaleDateString("en-GB", { weekday: "long", month: "short", day: "numeric" })}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {daySlots.map(slot => (
                          <Button
                            key={slot.startDateTime}
                            size="sm"
                            variant={selectedSlot?.startDateTime === slot.startDateTime ? "default" : "outline"}
                            className="text-xs"
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {selectedSlot?.startDateTime === slot.startDateTime && <Check className="h-3 w-3 mr-1" />}
                            {slot.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Availability not configured for this service.
              </p>
            )}
          </div>

          {/* Notes */}
          {selectedSlot && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 mb-6">
              <label className="text-sm font-medium block">Notes (optional)</label>
              <Textarea
                value={bookNotes}
                onChange={e => setBookNotes(e.target.value)}
                maxLength={500}
                className="resize-none"
                placeholder="Any details for the provider…"
              />
            </div>
          )}

          {/* CTA */}
          <Button
            size="lg"
            className="w-full"
            disabled={!selectedSlot || bookingInProgress}
            onClick={handleSelectSlot}
          >
            {bookingInProgress ? (
              <span className="animate-pulse">Creating booking…</span>
            ) : isLoggedIn ? (
              <>
                <CalendarClock className="h-4 w-4 mr-2" />
                {isFree ? "Confirm session" : `Book & Pay (€${svc.price_amount})`}
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Sign up to book this slot
              </>
            )}
          </Button>

          {!isLoggedIn && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              You'll create a free account to confirm your booking.
            </p>
          )}
        </motion.div>
      </div>

      {/* Guest Onboarding Assistant */}
      <GuestOnboardingAssistant
        open={guestOpen}
        onOpenChange={setGuestOpen}
        actionLabel="book this session"
      />
    </div>
  );
}
