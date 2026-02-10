/**
 * Booking Detail Page — /bookings/:id
 *
 * Canonical route for viewing a single booking.
 * Access: requester, provider (user or guild admin), or app admin.
 * "Join call" button shown when status = CONFIRMED and callUrl is set.
 */
import { useParams, Link } from "react-router-dom";
import {
  CalendarClock, Video, ExternalLink, ArrowLeft, User as UserIcon,
  ShieldAlert, FileQuestion, CalendarPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isAdmin } from "@/lib/admin";
import { BookingStatus, OnlineLocationType } from "@/types/enums";
import {
  bookings, getUserById, getGuildById, getServiceById, guildMembers,
} from "@/data/mock";
import { GuildMemberRole } from "@/types/enums";
import { downloadIcs } from "@/lib/icsExport";

const statusColors: Record<string, string> = {
  [BookingStatus.REQUESTED]: "bg-warning/10 text-warning",
  [BookingStatus.PENDING_PAYMENT]: "bg-amber-500/10 text-amber-600",
  [BookingStatus.CONFIRMED]: "bg-primary/10 text-primary",
  [BookingStatus.ACCEPTED]: "bg-primary/10 text-primary",
  [BookingStatus.DECLINED]: "bg-destructive/10 text-destructive",
  [BookingStatus.COMPLETED]: "bg-emerald-500/10 text-emerald-600",
  [BookingStatus.CANCELLED]: "bg-muted text-muted-foreground",
};

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useCurrentUser();

  const booking = bookings.find((b) => b.id === id);

  // Not found / soft-deleted
  if (!booking || booking.isDeleted) {
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

  // Access check
  const isRequester = currentUser.id === booking.requesterId;
  const isProviderUser = currentUser.id === booking.providerUserId;
  const isGuildAdmin = booking.providerGuildId
    ? guildMembers.some(
        (gm) =>
          gm.guildId === booking.providerGuildId &&
          gm.userId === currentUser.id &&
          gm.role === GuildMemberRole.ADMIN
      )
    : false;
  const userIsAdmin = isAdmin(currentUser.email);
  const hasAccess = isRequester || isProviderUser || isGuildAdmin || userIsAdmin;

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

  const service = getServiceById(booking.serviceId);
  const requester = getUserById(booking.requesterId);
  const providerUser = booking.providerUserId ? getUserById(booking.providerUserId) : null;
  const providerGuild = booking.providerGuildId ? getGuildById(booking.providerGuildId) : null;

  // Fallback callUrl generation for confirmed Jitsi bookings
  const effectiveCallUrl =
    booking.callUrl ||
    (booking.status === BookingStatus.CONFIRMED &&
      service?.onlineLocationType === OnlineLocationType.JITSI
      ? `https://meet.jit.si/gamechanger-${booking.id}`
      : undefined);

  const isConfirmed = booking.status === BookingStatus.CONFIRMED;

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/work"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Work</Link>
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <CalendarClock className="h-6 w-6 text-primary" />
              Booking Details
            </h1>
            <p className="text-sm text-muted-foreground mt-1">ID: {booking.id}</p>
          </div>
          <Badge className={`${statusColors[booking.status] || ""} border-0 capitalize text-sm px-3 py-1`}>
            {booking.status.toLowerCase().replace("_", " ")}
          </Badge>
        </div>

        {/* Service */}
        <section className="rounded-xl border border-border bg-card p-5 mb-4">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Service</h2>
          {service ? (
            <Link to={`/services/${service.id}`} className="font-display text-lg font-semibold hover:text-primary transition-colors">
              {service.title}
            </Link>
          ) : (
            <span className="text-muted-foreground">Unknown service</span>
          )}
          {service?.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
          )}
        </section>

        {/* People */}
        <section className="rounded-xl border border-border bg-card p-5 mb-4">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-3">People</h2>
          <div className="space-y-3">
            {/* Provider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20">Provider</span>
              {providerUser ? (
                <Link to={`/users/${providerUser.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={providerUser.avatarUrl} />
                    <AvatarFallback>{providerUser.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{providerUser.name}</span>
                </Link>
              ) : providerGuild ? (
                <Link to={`/guilds/${providerGuild.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                  {providerGuild.name}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
            {/* Requester */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20">Requester</span>
              {requester ? (
                <Link to={`/users/${requester.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={requester.avatarUrl} />
                    <AvatarFallback>{requester.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{requester.name}</span>
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </section>

        {/* Date & Time */}
        <section className="rounded-xl border border-border bg-card p-5 mb-4">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Date & Time</h2>
          {booking.startDateTime ? (
            <p className="text-sm">
              📅 {new Date(booking.startDateTime).toLocaleString()}
              {booking.endDateTime && (
                <> — {new Date(booking.endDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
              )}
            </p>
          ) : booking.requestedDateTime ? (
            <p className="text-sm text-muted-foreground">Preferred: {new Date(booking.requestedDateTime).toLocaleString()}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No date set</p>
          )}
        </section>

        {/* Payment */}
        {booking.amount != null && booking.amount > 0 && (
          <section className="rounded-xl border border-border bg-card p-5 mb-4">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Payment</h2>
            <p className="text-sm">
              💰 €{booking.amount} {booking.currency} —{" "}
              <span className="capitalize">{booking.paymentStatus?.toLowerCase().replace("_", " ") || "N/A"}</span>
            </p>
          </section>
        )}

        {/* Notes */}
        {booking.notes && (
          <section className="rounded-xl border border-border bg-card p-5 mb-4">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Notes</h2>
            <p className="text-sm text-muted-foreground">{booking.notes}</p>
          </section>
        )}

        {/* Join Call / Calendar */}
        <section className="rounded-xl border border-border bg-card p-5 mb-4">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Session</h2>
          <div className="flex flex-wrap gap-3">
            {isConfirmed && effectiveCallUrl ? (
              <Button asChild>
                <a href={effectiveCallUrl} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4 mr-2" /> Join call <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </a>
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button disabled>
                    <Video className="h-4 w-4 mr-2" /> Join call
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Call link will be available once the booking is confirmed</TooltipContent>
              </Tooltip>
            )}

            {(isConfirmed || booking.status === BookingStatus.ACCEPTED) && service && (
              <Button variant="outline" onClick={() => downloadIcs(booking, service)}>
                <CalendarPlus className="h-4 w-4 mr-2" /> Add to calendar
              </Button>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
