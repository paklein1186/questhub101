import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Euro, MapPin, Hash, CalendarClock, Send, Video, ChevronLeft, ChevronRight, Shield, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { CommentTargetType, ReportTargetType } from "@/types/enums";
import { ReportButton } from "@/components/ReportButton";
import { DraftBanner } from "@/components/DraftBanner";
import { useServiceById, usePublicProfile, useGuildById, useAvailabilityRules, useAvailabilityExceptions, useBookingsForProvider } from "@/hooks/useEntityQueries";
import { generateSlots, generateCallUrl, type TimeSlot } from "@/lib/slots";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { useQueryClient } from "@tanstack/react-query";

async function insertBookingNotification(params: {
  recipientUserId: string; bookingId: string; serviceTitle: string; requesterName: string; action: string;
}) {
  const titleMap: Record<string, string> = {
    requested: "New booking request",
    confirmed: "Booking confirmed",
    sent: "Booking request sent",
    accepted: "Booking accepted",
    declined: "Booking declined",
    cancelled: "Booking cancelled",
  };
  const bodyMap: Record<string, string> = {
    requested: `${params.requesterName} requested "${params.serviceTitle}"`,
    confirmed: `Your session for "${params.serviceTitle}" is confirmed`,
    sent: `Your booking request for "${params.serviceTitle}" was sent`,
    accepted: `Your booking for "${params.serviceTitle}" has been accepted`,
    declined: `Your booking for "${params.serviceTitle}" was declined`,
    cancelled: `Booking for "${params.serviceTitle}" was cancelled`,
  };
  await supabase.from("notifications").insert({
    user_id: params.recipientUserId,
    type: params.action === "requested" ? "BOOKING_REQUESTED" : params.action === "confirmed" || params.action === "accepted" ? "BOOKING_CONFIRMED" : params.action === "declined" ? "BOOKING_CANCELLED" : "BOOKING_UPDATED",
    title: titleMap[params.action] || `Booking ${params.action}`,
    body: bodyMap[params.action] || `Booking for "${params.serviceTitle}" was ${params.action}`,
    related_entity_type: "BOOKING",
    related_entity_id: params.bookingId,
    deep_link_url: `/bookings/${params.bookingId}`,
    data: { bookingId: params.bookingId } as any,
  });
}
import { XpLevelBadge } from "@/components/XpLevelBadge";
import { computeLevelFromXp } from "@/lib/xpCreditsConfig";
import { canManageServiceSync } from "@/lib/serviceOwnership";

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
  const { data: guild } = useGuildById(svc?.provider_guild_id ?? undefined);
  const { data: rules } = useAvailabilityRules(svc?.provider_user_id ?? undefined, svc?.id);
  const { data: exceptions } = useAvailabilityExceptions(svc?.provider_user_id ?? undefined);
  const { data: providerBookings } = useBookingsForProvider(svc?.provider_user_id ?? undefined);

  const svcTopics = (svc as any)?.service_topics?.map((st: any) => st.topics).filter(Boolean) || [];
  const svcTerrs = (svc as any)?.service_territories?.map((st: any) => st.territories).filter(Boolean) || [];
  const ownerType = (svc as any)?.owner_type || "USER";
  const guildMemberRole = guild ? ((guild as any).guild_members || []).find((gm: any) => gm.user_id === currentUser.id)?.role : null;
  const canManage = svc ? canManageServiceSync(currentUser.id, currentUser.email, svc as any, guildMemberRole) : false;
  const isOwnService = canManage;
  const providerUserId = svc?.provider_user_id;

  const slots = useMemo(() => {
    if (!providerUserId || !svc?.duration_minutes || !rules) return [];
    const start = new Date(); start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    return generateSlots(
      rules.map((r: any) => ({ id: r.id, weekday: r.weekday, startTime: r.start_time, endTime: r.end_time, timezone: r.timezone, isActive: r.is_active, serviceId: r.service_id, providerUserId: r.provider_user_id, createdAt: r.created_at, updatedAt: r.updated_at })),
      (exceptions || []).map((e: any) => ({ id: e.id, date: e.date, isAvailable: e.is_available, startTime: e.start_time, endTime: e.end_time, providerUserId: e.provider_user_id, createdAt: e.created_at })),
      (providerBookings || []).map((b: any) => ({ startDateTime: b.start_date_time, endDateTime: b.end_date_time, status: b.status } as any)),
      svc.duration_minutes,
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0],
      svc.id
    );
  }, [providerUserId, svc?.id, svc?.duration_minutes, weekOffset, rules, exceptions, providerBookings]);

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

  const createBooking = async () => {
    if (!selectedSlot) { toast({ title: "Please select a time slot", variant: "destructive" }); return; }
    if (!currentUser.id) { toast({ title: "Please log in to book", variant: "destructive" }); return; }
    const callUrl = isFree ? generateCallUrl(`bk-${Date.now()}`, svc.online_location_type as any) : undefined;
    const { data: newBooking, error } = await supabase.from("bookings").insert({
      service_id: svc.id, requester_id: currentUser.id,
      provider_user_id: svc.provider_user_id, provider_guild_id: svc.provider_guild_id,
      start_date_time: selectedSlot.startDateTime, end_date_time: selectedSlot.endDateTime,
      status: isFree ? "CONFIRMED" : "PENDING",
      payment_status: isFree ? "NOT_REQUIRED" : "PENDING",
      amount: svc.price_amount || 0, currency: svc.price_currency,
      notes: bookNotes.trim() || null, call_url: callUrl,
    }).select("id").single();
    if (error || !newBooking) { toast({ title: "Failed to book", description: error?.message || "This slot may no longer be available.", variant: "destructive" }); return; }
    setBookOpen(false); setBookNotes(""); setSelectedSlot(null); setWeekOffset(0);
    queryClient.invalidateQueries({ queryKey: ["bookings-for-provider"] });
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });

    // Notify provider
    if (svc.provider_user_id) {
      await insertBookingNotification({
        recipientUserId: svc.provider_user_id,
        bookingId: newBooking.id,
        serviceTitle: svc.title,
        requesterName: currentUser.name,
        action: "requested",
      });
    }
    // Notify requester (self-confirmation)
    await insertBookingNotification({
      recipientUserId: currentUser.id,
      bookingId: newBooking.id,
      serviceTitle: svc.title,
      requesterName: currentUser.name,
      action: isFree ? "confirmed" : "sent",
    });

    if (isFree) {
      toast({ title: "✅ Session confirmed!", description: "You can join via the call link in your bookings." });
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
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/explore?tab=services"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Services</Link>
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
          ) : provider ? (
            <Link to={`/users/${provider.user_id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
              <Avatar className="h-6 w-6"><AvatarImage src={provider.avatar_url ?? undefined} /><AvatarFallback>{provider.name?.[0]}</AvatarFallback></Avatar>
              <span className="font-medium">Offered by <span className="text-foreground">{provider.name}</span></span>
              {provider.xp != null && <XpLevelBadge level={computeLevelFromXp(provider.xp)} compact />}
            </Link>
          ) : null}
          {svc.duration_minutes && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {svc.duration_minutes} min</span>}
          {svc.price_amount != null && <Badge className="bg-primary/10 text-primary border-0"><Euro className="h-3 w-3 mr-0.5" />{svc.price_amount === 0 ? "Free" : `${svc.price_amount} ${svc.price_currency}`}</Badge>}
          {svc.online_location_type && <Badge variant="outline" className="text-xs"><Video className="h-3 w-3 mr-1" />{svc.online_location_type}</Badge>}
        </div>

        <p className="text-muted-foreground max-w-2xl mb-4">{svc.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {svcTopics.map((t: any) => <Badge key={t.id} variant="secondary"><Hash className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
          {svcTerrs.map((t: any) => <Badge key={t.id} variant="outline"><MapPin className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
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
            <DialogTrigger asChild><Button><CalendarClock className="h-4 w-4 mr-1" /> Book a session</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Book — {svc.title}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" disabled={weekOffset === 0} onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm font-medium">{fmtDate(weekStart)} – {fmtDate(weekEnd)}</span>
                  <Button variant="ghost" size="icon" disabled={weekOffset >= 3} onClick={() => setWeekOffset(w => w + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
                {providerUserId ? (
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
                ) : <p className="text-sm text-muted-foreground">Guild-provided service. Availability managed by guild admins.</p>}
                <div><label className="text-sm font-medium mb-1 block">Notes (optional)</label><Textarea value={bookNotes} onChange={e => setBookNotes(e.target.value)} maxLength={500} className="resize-none" /></div>
                <Button onClick={createBooking} className="w-full" disabled={providerUserId ? !selectedSlot : false}><Send className="h-4 w-4 mr-1" />{isFree ? "Confirm (Free)" : `Book & Pay (€${svc.price_amount})`}</Button>
                {!isFree && <p className="text-[11px] text-muted-foreground text-center">Stripe Checkout will be enabled when Cloud is connected.</p>}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="font-display font-semibold mb-4">Discussion</h3>
          <CommentThread targetType={CommentTargetType.SERVICE} targetId={svc.id} />
        </div>
      </motion.div>
    </PageShell>
  );
}
