import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarClock, Video, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { BookingStatus, PaymentStatus } from "@/types/enums";
import {
  bookings, getUserById, getGuildById, getServiceById,
} from "@/data/mock";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  [BookingStatus.REQUESTED]: "bg-warning/10 text-warning",
  [BookingStatus.PENDING_PAYMENT]: "bg-amber-500/10 text-amber-600",
  [BookingStatus.ACCEPTED]: "bg-primary/10 text-primary",
  [BookingStatus.CONFIRMED]: "bg-primary/10 text-primary",
  [BookingStatus.DECLINED]: "bg-destructive/10 text-destructive",
  [BookingStatus.COMPLETED]: "bg-emerald-500/10 text-emerald-600",
  [BookingStatus.CANCELLED]: "bg-muted text-muted-foreground",
};

export default function MyRequests({ bare }: { bare?: boolean }) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { notifyBooking } = useNotifications();
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);
  const myRequests = bookings.filter((b) => b.requesterId === currentUser.id);

  const cancelBooking = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    booking.status = BookingStatus.CANCELLED;
    booking.updatedAt = new Date().toISOString();
    const svc = getServiceById(booking.serviceId);
    if (booking.providerUserId) {
      notifyBooking({
        bookingId: booking.id,
        serviceTitle: svc?.title ?? "Service",
        requesterName: currentUser.name,
        recipientUserId: booking.providerUserId,
        action: "cancelled",
      });
    }
    rerender();
    toast({ title: "Booking cancelled" });
  };

  return (
    <PageShell bare={bare}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <CalendarClock className="h-7 w-7 text-primary" /> My Requests
        </h1>
        <p className="text-muted-foreground mt-1">Sessions you've requested from providers.</p>
      </div>

      {myRequests.length === 0 && <p className="text-muted-foreground">You haven't requested any sessions yet.</p>}

      <div className="space-y-3">
        {myRequests.map((b, i) => {
          const svc = getServiceById(b.serviceId);
          const provider = b.providerUserId ? getUserById(b.providerUserId) : null;
          const guild = b.providerGuildId ? getGuildById(b.providerGuildId) : null;
          const canCancel = [BookingStatus.REQUESTED, BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.ACCEPTED].includes(b.status);
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
                  <Link to={`/services/${svc?.id}`} className="font-display font-semibold hover:text-primary transition-colors">{svc?.title}</Link>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    {provider && (
                      <Link to={`/users/${provider.id}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                        <Avatar className="h-5 w-5"><AvatarImage src={provider.avatarUrl} /><AvatarFallback>{provider.name[0]}</AvatarFallback></Avatar>
                        {provider.name}
                      </Link>
                    )}
                    {guild && (
                      <Link to={`/guilds/${guild.id}`} className="hover:text-primary transition-colors">{guild.name}</Link>
                    )}
                  </div>
                </div>
                <Badge className={`${statusColors[b.status]} border-0 capitalize`}>{b.status.toLowerCase().replace("_", " ")}</Badge>
              </div>

              {b.notes && <p className="text-sm text-muted-foreground mb-2">{b.notes}</p>}

              {b.startDateTime && (
                <p className="text-xs text-muted-foreground mb-1">
                  📅 {new Date(b.startDateTime).toLocaleString()} – {b.endDateTime ? new Date(b.endDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              )}
              {b.requestedDateTime && !b.startDateTime && (
                <p className="text-xs text-muted-foreground mb-2">Preferred: {new Date(b.requestedDateTime).toLocaleString()}</p>
              )}

              {b.amount != null && b.amount > 0 && (
                <p className="text-xs text-muted-foreground mb-1">💰 €{b.amount} {b.currency} — {b.paymentStatus?.toLowerCase().replace("_", " ") || "N/A"}</p>
              )}

              {b.callUrl && b.status === BookingStatus.CONFIRMED && (
                <a href={b.callUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2">
                  <Video className="h-3 w-3" /> Join call <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <p className="text-[11px] text-muted-foreground mb-3">{formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}</p>

              {canCancel && b.status !== BookingStatus.COMPLETED && (
                <Button size="sm" variant="outline" onClick={() => cancelBooking(b.id)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}
