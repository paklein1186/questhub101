import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Check, X, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { BookingStatus } from "@/types/enums";
import {
  bookings, services, getUserById, getServiceById,
} from "@/data/mock";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  [BookingStatus.REQUESTED]: "bg-warning/10 text-warning",
  [BookingStatus.ACCEPTED]: "bg-primary/10 text-primary",
  [BookingStatus.DECLINED]: "bg-destructive/10 text-destructive",
  [BookingStatus.COMPLETED]: "bg-emerald-500/10 text-emerald-600",
  [BookingStatus.CANCELLED]: "bg-muted text-muted-foreground",
};

export default function MyBookings() {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { notifyBooking } = useNotifications();
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  // Bookings where the current user is the provider
  const incoming = bookings.filter(
    (b) => b.providerUserId === currentUser.id ||
    (b.providerGuildId && services.find((s) => s.id === b.serviceId)?.providerGuildId &&
      // simplify: show if current user is providerUser
      false) ||
    b.providerUserId === currentUser.id
  );

  // Re-derive to include guild-based ones
  const myIncoming = bookings.filter((b) => {
    if (b.providerUserId === currentUser.id) return true;
    // Guild provider: check if current user is admin
    if (b.providerGuildId) {
      const svc = getServiceById(b.serviceId);
      if (svc?.providerGuildId) {
        const { guildMembers } = require("@/data/mock");
        return guildMembers.some((gm: any) => gm.guildId === svc.providerGuildId && gm.userId === currentUser.id && gm.role === "ADMIN");
      }
    }
    return false;
  });

  const updateStatus = (bookingId: string, status: BookingStatus) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    booking.status = status;
    booking.updatedAt = new Date().toISOString();
    const svc = getServiceById(booking.serviceId);
    notifyBooking({
      bookingId: booking.id,
      serviceTitle: svc?.title ?? "Service",
      requesterName: currentUser.name,
      recipientUserId: booking.requesterId,
      action: status.toLowerCase(),
    });
    rerender();
    toast({ title: `Booking ${status.toLowerCase()}` });
  };

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Briefcase className="h-7 w-7 text-primary" /> My Bookings
        </h1>
        <p className="text-muted-foreground mt-1">Incoming session requests for your services.</p>
      </div>

      {myIncoming.length === 0 && <p className="text-muted-foreground">No incoming bookings yet.</p>}

      <div className="space-y-3">
        {myIncoming.map((b, i) => {
          const svc = getServiceById(b.serviceId);
          const requester = getUserById(b.requesterId);
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
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={requester?.avatarUrl} />
                      <AvatarFallback>{requester?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">Requested by <span className="font-medium text-foreground">{requester?.name}</span></span>
                  </div>
                </div>
                <Badge className={`${statusColors[b.status]} border-0 capitalize`}>{b.status.toLowerCase()}</Badge>
              </div>
              {b.notes && <p className="text-sm text-muted-foreground mb-2">{b.notes}</p>}
              {b.requestedDateTime && (
                <p className="text-xs text-muted-foreground mb-2">Preferred: {new Date(b.requestedDateTime).toLocaleString()}</p>
              )}
              <p className="text-[11px] text-muted-foreground mb-3">{formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}</p>

              {b.status === BookingStatus.REQUESTED && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateStatus(b.id, BookingStatus.ACCEPTED)}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, BookingStatus.DECLINED)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Decline
                  </Button>
                </div>
              )}
              {b.status === BookingStatus.ACCEPTED && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, BookingStatus.COMPLETED)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Completed
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}
