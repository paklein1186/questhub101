import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Check, X, CheckCircle, Video, ExternalLink, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useMyBookings, useUpdateBookingStatus } from "@/hooks/useEntityQueries";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { GiveBackModal } from "@/components/giveback/GiveBackModal";

const statusColors: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning",
  REQUESTED: "bg-warning/10 text-warning",
  PENDING_PAYMENT: "bg-amber-500/10 text-amber-600",
  CONFIRMED: "bg-primary/10 text-primary",
  ACCEPTED: "bg-primary/10 text-primary",
  DECLINED: "bg-destructive/10 text-destructive",
  COMPLETED: "bg-emerald-500/10 text-emerald-600",
  CANCELLED: "bg-muted text-muted-foreground",
};

export default function MyBookings({ bare }: { bare?: boolean }) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { data: allBookings = [], isLoading } = useMyBookings(currentUser.id);
  const updateStatus = useUpdateBookingStatus();
  const [giveBackOpen, setGiveBackOpen] = useState(false);
  const [giveBackBooking, setGiveBackBooking] = useState<any>(null);

  // Incoming = I am the provider
  const myIncoming = allBookings.filter((b) => b.provider_user_id === currentUser.id);

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    const booking = myIncoming.find(b => b.id === bookingId);
    updateStatus.mutate({ bookingId, status }, {
      onSuccess: async () => {
        toast({ title: `Booking ${status.toLowerCase()}` });
        // Trigger give-back modal when completing a booking
        if (status === "COMPLETED" && booking) {
          setGiveBackBooking(booking);
          setGiveBackOpen(true);
          // Emit $CTG for service delivery
          supabase.rpc('emit_ctg_for_contribution', {
            p_user_id: currentUser.id,
            p_contribution_type: 'service_delivered',
            p_related_entity_id: bookingId,
            p_related_entity_type: 'booking',
          } as any).then((res) => {
            const earned = (res.data as any)?.amount ?? 20;
            toast({
              title: "🌱 $CTG earned!",
              description: `You earned ${earned} 🌱 $CTG for delivering this session. This reflects your contribution to the commons.`,
            });
          });
        }
        if (booking) {
          const svc = booking.services as any;
          const startFmt = booking.start_date_time ? new Date(booking.start_date_time).toLocaleString() : "";
          const endFmt = booking.end_date_time ? new Date(booking.end_date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
          const timeLine = startFmt ? `📅 ${startFmt}${endFmt ? ` – ${endFmt}` : ""}` : "";
          const priceLine = booking.amount && Number(booking.amount) > 0 ? `💰 ${booking.currency || "€"}${booking.amount}` : "";
          const bodyText = status === "ACCEPTED" || status === "CONFIRMED"
            ? `Your session "${svc?.title || "a service"}" has been accepted! ${timeLine} ${priceLine}`.trim()
            : status === "DECLINED" || status === "CANCELLED"
            ? `Your booking for "${svc?.title || "a service"}" has been ${status.toLowerCase()}.`
            : `Your booking for "${svc?.title || "a service"}" has been updated.`;
          const { error: notifErr } = await supabase.from("notifications").insert({
            user_id: booking.requester_id,
            type: status === "ACCEPTED" || status === "CONFIRMED" ? "BOOKING_CONFIRMED" : status === "DECLINED" || status === "CANCELLED" ? "BOOKING_CANCELLED" : "BOOKING_UPDATED",
            title: status === "ACCEPTED" || status === "CONFIRMED" ? "Session accepted! ✅" : status === "DECLINED" ? "Booking declined" : status === "CANCELLED" ? "Booking cancelled" : `Booking ${status.toLowerCase()}`,
            body: bodyText,
            related_entity_type: "BOOKING",
            related_entity_id: bookingId,
            deep_link_url: `/bookings/${bookingId}`,
            data: { bookingId, serviceTitle: svc?.title, startDateTime: booking.start_date_time, endDateTime: booking.end_date_time, amount: booking.amount, currency: booking.currency, callUrl: booking.call_url } as any,
          });
          if (notifErr) console.error("[BOOKING-NOTIF] Insert failed:", notifErr.message);
          // Email is triggered automatically by DB trigger trg_send_notification_email
        }
      },
    });
  };

  return (
    <PageShell bare={bare}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Briefcase className="h-7 w-7 text-primary" /> My Bookings
        </h1>
        <p className="text-muted-foreground mt-1">Incoming session requests for your services.</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && myIncoming.length === 0 && <p className="text-muted-foreground">No incoming bookings yet.</p>}

      <div className="space-y-3">
        {myIncoming.map((b, i) => {
          const svc = b.services as any;
          const requester = (b as any).requester_profile;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Link to={`/bookings/${b.id}`} className="font-display font-semibold hover:text-primary transition-colors">{svc?.title ?? "Booking"}</Link>
                </div>
                <Badge className={`${statusColors[b.status] || ""} border-0 capitalize`}>{b.status.toLowerCase().replace(/_/g, " ")}</Badge>
              </div>

              {/* Requester info */}
              {requester && (
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={requester.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">{requester.name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    Requested by <Link to={`/users/${b.requester_id}`} className="font-medium text-foreground hover:text-primary">{requester.name}</Link>
                  </span>
                </div>
              )}

              {b.notes && <p className="text-sm text-muted-foreground mb-2">{b.notes}</p>}
              {b.start_date_time && (
                <p className="text-xs text-muted-foreground mb-1">
                  📅 {new Date(b.start_date_time).toLocaleString()} – {b.end_date_time ? new Date(b.end_date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              )}
              {b.amount != null && b.amount > 0 && (
                <p className="text-xs text-muted-foreground mb-1">🟩 {Math.round(b.amount / 0.04).toLocaleString()} Coins (≈ €{b.amount}) — {b.payment_status || "N/A"}</p>
              )}
              {(b.status === "CONFIRMED" || b.status === "ACCEPTED") && (
                <Link to={`/call/${b.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2">
                  <Video className="h-3 w-3" /> Join call room <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              <p className="text-[11px] text-muted-foreground mb-3">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</p>

              {(b.status === "REQUESTED" || b.status === "PENDING") && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUpdateStatus(b.id, "ACCEPTED")}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(b.id, "CANCELLED")}>
                    <X className="h-3.5 w-3.5 mr-1" /> Decline
                  </Button>
                </div>
              )}
              {(b.status === "ACCEPTED" || b.status === "CONFIRMED") && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(b.id, "COMPLETED")}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Completed
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(b.id, "CANCELLED")}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <GiveBackModal
        open={giveBackOpen}
        onOpenChange={setGiveBackOpen}
        earnedAmount={giveBackBooking?.amount ? Number(giveBackBooking.amount) : undefined}
        serviceName={(giveBackBooking?.services as any)?.title}
        bookingId={giveBackBooking?.id}
      />
    </PageShell>
  );
}
