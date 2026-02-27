import { useParams, Link, useNavigate } from "react-router-dom";
import {
  CalendarClock, Video, ExternalLink, ArrowLeft,
  ShieldAlert, FileQuestion, CalendarPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserRoles } from "@/lib/admin";
import { useBookingById } from "@/hooks/useEntityQueries";

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

export default function BookingDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const currentUser = useCurrentUser();
  const { data: booking, isLoading, error } = useBookingById(id);
  const { isAdmin: userIsAdmin } = useUserRoles(currentUser.id);

  if (isLoading) return <PageShell><p className="text-muted-foreground">Loading…</p></PageShell>;

  if (!booking || error) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Booking not found</h1>
          <p className="text-muted-foreground mb-6">This booking doesn't exist or has been removed.</p>
          <Button variant="outline" asChild>
            <Link to="/work"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Work</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const isRequester = currentUser.id === booking.requester_id;
  const isProviderUser = currentUser.id === booking.provider_user_id;
  const hasAccess = isRequester || isProviderUser || userIsAdmin;

  if (!hasAccess) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Access denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to view this booking.</p>
          <Button variant="outline" asChild>
            <Link to="/work"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Work</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const service = booking.services as any;
  const isConfirmed = booking.status === "CONFIRMED" || booking.status === "ACCEPTED";
  const effectiveCallUrl = booking.call_url || (isConfirmed ? `https://8x8.vc/gamechanger-${booking.id}` : undefined);

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <CalendarClock className="h-6 w-6 text-primary" /> Booking Details
            </h1>
          </div>
          <Badge className={`${statusColors[booking.status] || ""} border-0 capitalize text-sm px-3 py-1`}>
            {booking.status.toLowerCase().replace("_", " ")}
          </Badge>
        </div>

        <section className="rounded-xl border border-border bg-card p-5 mb-4">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Service</h2>
          {service ? (
            <Link to={`/services/${service.id}`} className="font-display text-lg font-semibold hover:text-primary transition-colors">
              {service.title}
            </Link>
          ) : (
            <span className="text-muted-foreground">Unknown service</span>
          )}
          {service?.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 mb-4">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Date & Time</h2>
          {booking.start_date_time ? (
            <p className="text-sm">
              📅 {new Date(booking.start_date_time).toLocaleString()}
              {booking.end_date_time && <> — {new Date(booking.end_date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
            </p>
          ) : booking.requested_date_time ? (
            <p className="text-sm text-muted-foreground">Preferred: {new Date(booking.requested_date_time).toLocaleString()}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No date set</p>
          )}
        </section>

        {booking.amount != null && booking.amount > 0 && (
          <section className="rounded-xl border border-border bg-card p-5 mb-4">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Payment</h2>
            <p className="text-sm">
              💰 €{booking.amount} {booking.currency} — <span className="capitalize">{booking.payment_status?.toLowerCase().replace("_", " ") || "N/A"}</span>
            </p>
          </section>
        )}

        {booking.notes && (
          <section className="rounded-xl border border-border bg-card p-5 mb-4">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Notes</h2>
            <p className="text-sm text-muted-foreground">{booking.notes}</p>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-5 mb-4">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Session</h2>
          <div className="flex flex-wrap gap-3">
            {isConfirmed ? (
              <>
                <Button asChild>
                  <Link to={`/call/${booking.id}`}>
                    <Video className="h-4 w-4 mr-2" /> Join call room
                  </Link>
                </Button>
                {effectiveCallUrl && (
                  <Button variant="outline" asChild>
                    <a href={effectiveCallUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" /> Open in Jitsi
                    </a>
                  </Button>
                )}
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button disabled><Video className="h-4 w-4 mr-2" /> Join call</Button>
                </TooltipTrigger>
                <TooltipContent>Call link will be available once the booking is confirmed</TooltipContent>
              </Tooltip>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
