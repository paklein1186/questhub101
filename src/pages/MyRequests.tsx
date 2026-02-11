import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarClock, Video, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useMyBookings, useUpdateBookingStatus } from "@/hooks/useEntityQueries";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  REQUESTED: "bg-warning/10 text-warning",
  PENDING_PAYMENT: "bg-amber-500/10 text-amber-600",
  ACCEPTED: "bg-primary/10 text-primary",
  CONFIRMED: "bg-primary/10 text-primary",
  DECLINED: "bg-destructive/10 text-destructive",
  COMPLETED: "bg-emerald-500/10 text-emerald-600",
  CANCELLED: "bg-muted text-muted-foreground",
};

const CANCELLABLE = ["REQUESTED", "PENDING_PAYMENT", "CONFIRMED", "ACCEPTED"];

export default function MyRequests({ bare }: { bare?: boolean }) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { data: allBookings = [], isLoading } = useMyBookings(currentUser.id);
  const updateStatus = useUpdateBookingStatus();

  const myRequests = allBookings.filter((b) => b.requester_id === currentUser.id);

  const cancelBooking = (bookingId: string) => {
    updateStatus.mutate({ bookingId, status: "CANCELLED" }, {
      onSuccess: () => toast({ title: "Booking cancelled" }),
    });
  };

  return (
    <PageShell bare={bare}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <CalendarClock className="h-7 w-7 text-primary" /> My Requests
        </h1>
        <p className="text-muted-foreground mt-1">Sessions you've requested from providers.</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && myRequests.length === 0 && <p className="text-muted-foreground">You haven't requested any sessions yet.</p>}

      <div className="space-y-3">
        {myRequests.map((b, i) => {
          const svc = b.services as any;
          const canCancel = CANCELLABLE.includes(b.status);
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
                <Badge className={`${statusColors[b.status] || ""} border-0 capitalize`}>{b.status.toLowerCase().replace("_", " ")}</Badge>
              </div>

              {b.notes && <p className="text-sm text-muted-foreground mb-2">{b.notes}</p>}

              {b.start_date_time && (
                <p className="text-xs text-muted-foreground mb-1">
                  📅 {new Date(b.start_date_time).toLocaleString()} – {b.end_date_time ? new Date(b.end_date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              )}

              {b.amount != null && b.amount > 0 && (
                <p className="text-xs text-muted-foreground mb-1">💰 €{b.amount} {b.currency} — {b.payment_status?.toLowerCase().replace("_", " ") || "N/A"}</p>
              )}

              {b.call_url && b.status === "CONFIRMED" && (
                <a href={b.call_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2">
                  <Video className="h-3 w-3" /> Join call <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <p className="text-[11px] text-muted-foreground mb-3">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</p>

              {canCancel && b.status !== "COMPLETED" && (
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
