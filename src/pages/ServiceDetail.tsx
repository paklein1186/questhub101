import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Euro, MapPin, Hash, CalendarClock, Send, Video, ChevronLeft, ChevronRight, Shield, Pencil, Trash2, Briefcase, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { BookingLinkButton } from "@/components/BookingLinkButton";
import { CommentThread } from "@/components/CommentThread";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { CommentTargetType, ReportTargetType, TrustNodeType } from "@/types/enums";
import { GiveTrustButton } from "@/components/GiveTrustButton";
import { ReportButton } from "@/components/ReportButton";
import { DraftBanner } from "@/components/DraftBanner";
import { useServiceById, usePublicProfile, useGuildById, useCompanyById, useAvailabilityRules, useAvailabilityExceptions, useBookingsForProvider } from "@/hooks/useEntityQueries";
import { generateSlots, generateCallUrl, type TimeSlot } from "@/lib/slots";
import { useUnitAvailability, generateUnitSlots } from "@/hooks/useUnitAvailability";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { useQueryClient } from "@tanstack/react-query";
import { GuestContentGate } from "@/components/GuestContentGate";

async function insertBookingNotification(params: {
  recipientUserId: string; bookingId: string; serviceTitle: string; requesterName: string; action: string;
  startDateTime?: string; endDateTime?: string; amount?: number; currency?: string;
}) {
  const titleMap: Record<string, string> = {
    requested: "New booking request",
    confirmed: "Booking confirmed ✅",
    sent: "Booking request sent",
    accepted: "Booking accepted",
    declined: "Booking declined",
    cancelled: "Booking cancelled",
  };
  const timeSummary = params.startDateTime
    ? `\n📅 ${new Date(params.startDateTime).toLocaleString()}${params.endDateTime ? ` – ${new Date(params.endDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}`
    : "";
  const priceSummary = params.amount && params.amount > 0 ? `\n💰 €${params.amount} ${params.currency || "EUR"}` : "";
  const bodyMap: Record<string, string> = {
    requested: `${params.requesterName} requested "${params.serviceTitle}"${timeSummary}${priceSummary}`,
    confirmed: `Your session for "${params.serviceTitle}" is confirmed${timeSummary}`,
    sent: `Your booking request for "${params.serviceTitle}" was sent${timeSummary}${priceSummary}`,
    accepted: `Your booking for "${params.serviceTitle}" has been accepted${timeSummary}`,
    declined: `Your booking for "${params.serviceTitle}" was declined`,
    cancelled: `Booking for "${params.serviceTitle}" was cancelled`,
  };
  // Don't use .select().single() — RLS SELECT policy prevents reading other users'
  // notifications, which causes PostgREST to roll back the entire insert.
  // The DB trigger trg_send_notification_email handles email delivery automatically.
  const { error: notifErr } = await supabase.from("notifications").insert({
    user_id: params.recipientUserId,
    type: params.action === "requested" ? "BOOKING_REQUESTED" : params.action === "confirmed" || params.action === "accepted" ? "BOOKING_CONFIRMED" : params.action === "declined" ? "BOOKING_CANCELLED" : "BOOKING_UPDATED",
    title: titleMap[params.action] || `Booking ${params.action}`,
    body: bodyMap[params.action] || `Booking for "${params.serviceTitle}" was ${params.action}`,
    related_entity_type: "BOOKING",
    related_entity_id: params.bookingId,
    deep_link_url: `/bookings/${params.bookingId}`,
    data: { bookingId: params.bookingId } as any,
  });
  if (notifErr) {
    console.error("[BOOKING-NOTIF] Failed to insert notification:", notifErr.message, notifErr.code, notifErr.details);
  }
}
import { XpLevelBadge } from "@/components/XpLevelBadge";
import { computeLevelFromXp } from "@/lib/xpCreditsConfig";
import { canManageServiceSync } from "@/lib/serviceOwnership";
import { TrustTab } from "@/components/trust/TrustTab";
import { useTrustSummary } from "@/hooks/useTrustSummary";
import { TrustSummaryBadge } from "@/components/trust/TrustSummaryBadge";

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: svc, isLoading } = useServiceById(id);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  // notifications handled via insertBookingNotification helper
  const queryClient = useQueryClient();
  const [bookOpen, setBookOpen] = useState(false);
  const [bookNotes, setBookNotes] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: provider } = usePublicProfile(svc?.provider_user_id ?? undefined);
  const { data: providerTrust } = useTrustSummary("profile", svc?.provider_user_id ?? undefined);
  const { data: guild } = useGuildById(svc?.provider_guild_id ?? undefined);
  const ownerType = (svc as any)?.owner_type || "USER";
  const companyId = ownerType === "COMPANY" ? (svc as any)?.owner_id : undefined;
  const guildIdForAvail = ownerType === "GUILD" ? ((svc as any)?.owner_id || svc?.provider_guild_id) : undefined;
  const { data: company } = useCompanyById(companyId);
  const { data: rules } = useAvailabilityRules(svc?.provider_user_id ?? undefined, svc?.id);
  const { data: exceptions } = useAvailabilityExceptions(svc?.provider_user_id ?? undefined);
  const { data: providerBookings } = useBookingsForProvider(svc?.provider_user_id ?? undefined);
  const { data: unitAvailability } = useUnitAvailability(
    ownerType === "GUILD" ? "GUILD" : ownerType === "COMPANY" ? "COMPANY" : "",
    guildIdForAvail || companyId || undefined
  );

  // Fetch unit bookings for slot conflict checking
  const unitId = guildIdForAvail || companyId;
  const { data: unitBookingsData } = useQuery({
    queryKey: ["bookings-for-unit", unitId],
    queryFn: async () => {
      if (!unitId) return [];
      // Fetch bookings for services owned by this unit
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
  // Fetch provider's calendar busy events (only from enabled subcalendars)
  const providerIdForBusy = providerUserId || null;
  const { data: providerBusyEvents = [] } = useQuery({
    queryKey: ["provider-calendar-busy", providerIdForBusy],
    queryFn: async () => {
      if (!providerIdForBusy) return [];

      // 1. Fetch ALL busy events for this provider
      const { data: busyEvents, error: busyErr } = await supabase
        .from("calendar_busy_events")
        .select("start_at, end_at, source_calendar_id, connection_id")
        .eq("user_id", providerIdForBusy);

      if (busyErr) {
        console.error("[ServiceDetail] Failed to fetch busy events:", busyErr);
        return [];
      }
      if (!busyEvents || busyEvents.length === 0) {
        console.log("[ServiceDetail] No busy events found for provider", providerIdForBusy);
        return [];
      }

      // 2. Fetch subcalendar preferences to filter out disabled calendars
      const connectionIds = [...new Set(busyEvents.map(e => e.connection_id))];
      const { data: prefs, error: prefsErr } = await supabase
        .from("calendar_subcalendar_preferences")
        .select("source_calendar_id, is_enabled, connection_id")
        .eq("user_id", providerIdForBusy)
        .in("connection_id", connectionIds);

      if (prefsErr) {
        console.warn("[ServiceDetail] Could not fetch subcalendar prefs, using all busy events:", prefsErr);
        // Safe default: include all busy events (more restrictive for booking)
        console.log(`[ServiceDetail] Returning all ${busyEvents.length} busy events (no pref filtering)`);
        return busyEvents;
      }

      // Build set of disabled subcalendar keys
      const disabledSet = new Set<string>();
      if (prefs && prefs.length > 0) {
        for (const p of prefs as any[]) {
          if (!p.is_enabled) {
            disabledSet.add(`${p.connection_id}::${p.source_calendar_id}`);
          }
        }
      }

      // Keep events from enabled (or unknown) subcalendars
      const filtered = busyEvents.filter(e => {
        if (!e.source_calendar_id) return true;
        return !disabledSet.has(`${e.connection_id}::${e.source_calendar_id}`);
      });

      console.log(`[ServiceDetail] Busy events: ${busyEvents.length} total, ${filtered.length} after filtering (${disabledSet.size} disabled subcals)`);
      return filtered;
    },
    enabled: !!providerIdForBusy,
    staleTime: 30_000,
    refetchOnMount: "always",
  });

  const svcTopics = (svc as any)?.service_topics?.map((st: any) => st.topics).filter(Boolean) || [];
  const svcTerrs = (svc as any)?.service_territories?.map((st: any) => st.territories).filter(Boolean) || [];
  const guildMemberRole = guild ? ((guild as any).guild_members || []).find((gm: any) => gm.user_id === currentUser.id)?.role : null;
  const canManage = svc ? canManageServiceSync(currentUser.id, currentUser.email, svc as any, guildMemberRole) : false;
  const isOwnService = canManage;

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
    for (const slot of slots) { const date = slot.startDateTime.split("T")[0]; if (!groups[date]) groups[date] = []; groups[date].push(slot); }
    return groups;
  }, [slots]);

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!svc) return <PageShell><p>Service not found.</p></PageShell>;
  if (svc.is_deleted && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>This service has been removed.</p></PageShell>;
  if (svc.is_draft && !isOwnService && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>Service not found.</p></PageShell>;

  const isFree = !svc.price_amount || svc.price_amount === 0;
  const svcType = (svc as any).service_type || "online_call";
  const requiresApproval = svcType === "service_mission" || svcType === "event_attendance";

  const createBooking = async () => {
    if (!selectedSlot) { toast({ title: "Please select a time slot", variant: "destructive" }); return; }
    if (!currentUser.id) { toast({ title: "Please log in to book", variant: "destructive" }); return; }
    // For online_call free services, auto-confirm. For mission/event, always require approval.
    const autoConfirm = isFree && !requiresApproval;
    const callUrl = autoConfirm ? generateCallUrl(`bk-${Date.now()}`, svc.online_location_type as any) : undefined;
    const bookingPayload: any = {
      service_id: svc.id, requester_id: currentUser.id,
      provider_user_id: svc.provider_user_id || null,
      provider_guild_id: svc.provider_guild_id || (ownerType === "GUILD" ? (svc as any).owner_id : null),
      company_id: ownerType === "COMPANY" ? (svc as any).owner_id : null,
      start_date_time: selectedSlot.startDateTime, end_date_time: selectedSlot.endDateTime,
      status: autoConfirm ? "CONFIRMED" : "PENDING",
      payment_status: isFree ? "NOT_REQUIRED" : "PENDING",
      amount: svc.price_amount || 0, currency: svc.price_currency,
      notes: bookNotes.trim() || null, call_url: callUrl,
    };
    const { data: newBooking, error } = await supabase.from("bookings").insert(bookingPayload).select("id").single();
    if (error || !newBooking) { toast({ title: "Failed to book", description: error?.message || "This slot may no longer be available.", variant: "destructive" }); return; }
    setBookOpen(false); setBookNotes(""); setSelectedSlot(null); setWeekOffset(0);
    queryClient.invalidateQueries({ queryKey: ["bookings-for-provider"] });
    queryClient.invalidateQueries({ queryKey: ["bookings-for-unit"] });
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });

    // For paid bookings, redirect to Stripe Checkout (but still send notifications below)
    let redirectedToCheckout = false;
    if (!isFree && !requiresApproval) {
      try {
        const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("booking-checkout", {
          body: { bookingId: newBooking.id },
        });
        if (checkoutErr || !checkoutData?.url) {
          toast({ title: "Booking created", description: "Payment link could not be generated. You can pay later from your bookings." });
        } else {
          window.open(checkoutData.url, "_blank");
          toast({ title: "Booking created! Complete payment in the new tab." });
          redirectedToCheckout = true;
        }
      } catch {
        toast({ title: "Booking created", description: "Payment link could not be generated." });
      }
    }

    // Notify provider (user-owned service)
    if (svc.provider_user_id) {
      await insertBookingNotification({
        recipientUserId: svc.provider_user_id,
        bookingId: newBooking.id,
        serviceTitle: svc.title,
        requesterName: currentUser.name,
        action: "requested",
        startDateTime: selectedSlot.startDateTime,
        endDateTime: selectedSlot.endDateTime,
        amount: svc.price_amount,
        currency: svc.price_currency,
      });
    }

    // Notify unit admins for GUILD/COMPANY services
    if (isUnitService && unitId) {
      const memberTable = ownerType === "GUILD" ? "guild_members" : "company_members";
      const memberIdCol = ownerType === "GUILD" ? "guild_id" : "company_id";
      const { data: admins } = await (supabase as any)
        .from(memberTable)
        .select("user_id, role")
        .eq(memberIdCol, unitId);
      const adminUsers = (admins || []).filter((a: any) => {
        const r = a.role?.toUpperCase();
        return r === "ADMIN" || r === "OWNER";
      });
      for (const admin of adminUsers) {
        if (admin.user_id !== currentUser.id) {
          await insertBookingNotification({
            recipientUserId: admin.user_id,
            bookingId: newBooking.id,
            serviceTitle: svc.title,
            requesterName: currentUser.name,
            action: "requested",
            startDateTime: selectedSlot.startDateTime,
            endDateTime: selectedSlot.endDateTime,
            amount: svc.price_amount,
            currency: svc.price_currency,
          });
        }
      }
    }
    // Notify requester (self-confirmation with booking summary)
    await insertBookingNotification({
      recipientUserId: currentUser.id,
      bookingId: newBooking.id,
      serviceTitle: svc.title,
      requesterName: currentUser.name,
      action: isFree ? "confirmed" : "sent",
      startDateTime: selectedSlot.startDateTime,
      endDateTime: selectedSlot.endDateTime,
      amount: svc.price_amount,
      currency: svc.price_currency,
    });

    if (autoConfirm) {
      toast({ title: "✅ Session confirmed!", description: "You can join via the call link in your bookings." });
    } else if (requiresApproval) {
      toast({ title: "📋 Request submitted!", description: "An admin will review and validate your booking request." });
    } else {
      toast({ title: "✅ Booking request sent!", description: `${provider?.name || "The provider"} will be notified. You'll hear back soon.` });
    }
    navigate(`/bookings/${newBooking.id}`);
  };

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });

  return (
    <PageShell>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      {svc.is_draft && <DraftBanner />}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {svc.image_url && (
          <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-6">
            <img src={svc.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <h1 className="font-display text-3xl font-bold mb-2">{svc.title}</h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
          {ownerType === "GUILD" && guild ? (
            <Link to={`/guilds/${guild.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
              <Shield className="h-4 w-4 text-primary" />
              {guild.logo_url && <img src={guild.logo_url} className="h-6 w-6 rounded" alt="" />}
              <span className="font-medium">Offered by <span className="text-foreground">{guild.name}</span></span>
            </Link>
          ) : ownerType === "COMPANY" && company ? (
            <Link to={`/companies/${(company as any).id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
              <Shield className="h-4 w-4 text-primary" />
              {(company as any).logo_url && <img src={(company as any).logo_url} className="h-6 w-6 rounded" alt="" />}
              <span className="font-medium">Offered by <span className="text-foreground">{(company as any).name}</span></span>
            </Link>
          ) : provider ? (
            <Link to={`/users/${provider.user_id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
              <Avatar className="h-6 w-6"><AvatarImage src={provider.avatar_url ?? undefined} /><AvatarFallback>{provider.name?.[0]}</AvatarFallback></Avatar>
              <span className="font-medium">Offered by <span className="text-foreground">{provider.name}</span></span>
              {provider.xp != null && <XpLevelBadge level={computeLevelFromXp(provider.xp)} compact />}
              <TrustSummaryBadge summary={providerTrust} variant="compact" />
            </Link>
          ) : null}
          {svc.duration_minutes && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {svc.duration_minutes} min</span>}
          {svc.price_amount != null && <Badge className="bg-primary/10 text-primary border-0"><Euro className="h-3 w-3 mr-0.5" />{svc.price_amount === 0 ? "Free" : `${svc.price_amount} ${svc.price_currency}`}</Badge>}
          {(svc as any).service_type === "service_mission" && <Badge variant="outline" className="text-xs"><Briefcase className="h-3 w-3 mr-1" />Mission</Badge>}
          {(svc as any).service_type === "event_attendance" && <Badge variant="outline" className="text-xs"><Users className="h-3 w-3 mr-1" />Event</Badge>}
          {(svc as any).service_type === "online_call" && svc.online_location_type && <Badge variant="outline" className="text-xs"><Video className="h-3 w-3 mr-1" />{svc.online_location_type}</Badge>}
          {(svc as any).location_text && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {(svc as any).location_text}</span>}
        </div>

        {svc.description && (
          <GuestContentGate blur>
            <div className="rounded-xl border border-border bg-card/50 p-4 max-w-2xl mb-4">
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{svc.description}</p>
            </div>
          </GuestContentGate>
        )}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {svcTopics.map((t: any) => <Badge key={t.id} variant="secondary"><Hash className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
          {svcTerrs.map((t: any) => <Badge key={t.id} variant="outline"><MapPin className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          <ShareLinkButton entityType="service" entityId={svc.id} entityName={svc.title} />
          <GiveTrustButton targetNodeType={TrustNodeType.SERVICE} targetNodeId={svc.id} targetName={svc.title} />
          <BookingLinkButton serviceId={svc.id} serviceName={svc.title} />
          <ReportButton targetType={ReportTargetType.SERVICE} targetId={svc.id} />
          {canManage && (
            <>
              <Button size="sm" variant="outline" asChild><Link to={`/services/${svc.id}/edit`}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Link></Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
                const { error } = await supabase.from("services").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", svc.id);
                if (!error) { toast({ title: "Service deleted" }); navigate(-1); }
              }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </>
          )}
        </div>

        {!isOwnService && (
          <Dialog open={bookOpen} onOpenChange={o => { setBookOpen(o); if (!o) { setSelectedSlot(null); setWeekOffset(0); } }}>
            <DialogTrigger asChild><Button><CalendarClock className="h-4 w-4 mr-1" /> {svcType === "online_call" ? "Book a session" : svcType === "event_attendance" ? "Register" : "Request this service"}</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Book — {svc.title}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" disabled={weekOffset === 0} onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm font-medium">{fmtDate(weekStart)} – {fmtDate(weekEnd)}</span>
                  <Button variant="ghost" size="icon" disabled={weekOffset >= 3} onClick={() => setWeekOffset(w => w + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
                {(providerUserId || isUnitService) ? (
                  Object.keys(slotsByDate).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No available slots this week.</p> : (
                    <div className="max-h-[280px] overflow-y-auto space-y-3">
                      {Object.entries(slotsByDate).map(([date, daySlots]) => (
                        <div key={date}>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">{new Date(date).toLocaleDateString("en-GB", { weekday: "long", month: "short", day: "numeric" })}</p>
                          <div className="flex flex-wrap gap-1.5">{daySlots.map(slot => <Button key={slot.startDateTime} size="sm" variant={selectedSlot?.startDateTime === slot.startDateTime ? "default" : "outline"} className="text-xs" onClick={() => setSelectedSlot(slot)}>{slot.label}</Button>)}</div>
                        </div>
                      ))}
                    </div>
                  )
                ) : <p className="text-sm text-muted-foreground">Service availability not configured.</p>}
                <div><label className="text-sm font-medium mb-1 block">Notes (optional)</label><Textarea value={bookNotes} onChange={e => setBookNotes(e.target.value)} maxLength={500} className="resize-none" /></div>
                <Button onClick={createBooking} className="w-full" disabled={!selectedSlot}><Send className="h-4 w-4 mr-1" />{requiresApproval ? (isFree ? "Submit request (Free)" : `Submit request (€${svc.price_amount})`) : isFree ? "Confirm (Free)" : `Book & Pay (€${svc.price_amount})`}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Shield className="h-5 w-5" /> Trust</h3>
          <TrustTab nodeType={TrustNodeType.SERVICE} nodeId={svc.id} />
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="font-display font-semibold mb-4">Discussion</h3>
          <CommentThread targetType={CommentTargetType.SERVICE} targetId={svc.id} />
        </div>
      </motion.div>
    </PageShell>
  );
}
