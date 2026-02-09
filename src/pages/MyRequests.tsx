import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { BookingStatus } from "@/types/enums";
import {
  bookings, getUserById, getGuildById, getServiceById,
} from "@/data/mock";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  [BookingStatus.REQUESTED]: "bg-warning/10 text-warning",
  [BookingStatus.ACCEPTED]: "bg-primary/10 text-primary",
  [BookingStatus.DECLINED]: "bg-destructive/10 text-destructive",
  [BookingStatus.COMPLETED]: "bg-emerald-500/10 text-emerald-600",
  [BookingStatus.CANCELLED]: "bg-muted text-muted-foreground",
};

export default function MyRequests({ bare }: { bare?: boolean }) {
  const currentUser = useCurrentUser();
  const myRequests = bookings.filter((b) => b.requesterId === currentUser.id);

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
                      <span className="flex items-center gap-1">
                        <Avatar className="h-5 w-5"><AvatarImage src={provider.avatarUrl} /><AvatarFallback>{provider.name[0]}</AvatarFallback></Avatar>
                        {provider.name}
                      </span>
                    )}
                    {guild && <span>{guild.name}</span>}
                  </div>
                </div>
                <Badge className={`${statusColors[b.status]} border-0 capitalize`}>{b.status.toLowerCase()}</Badge>
              </div>
              {b.notes && <p className="text-sm text-muted-foreground mb-2">{b.notes}</p>}
              {b.requestedDateTime && (
                <p className="text-xs text-muted-foreground mb-2">Preferred: {new Date(b.requestedDateTime).toLocaleString()}</p>
              )}
              <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}</p>
            </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}
