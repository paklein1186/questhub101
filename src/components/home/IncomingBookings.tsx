import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Check, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useUpdateBookingStatus } from "@/hooks/useEntityQueries";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface IncomingBookingsProps {
  userId: string;
}

export function IncomingBookings({ userId }: IncomingBookingsProps) {
  const { toast } = useToast();
  const updateStatus = useUpdateBookingStatus();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["incoming-bookings-dashboard", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, notes, start_date_time, created_at, requester_id, services(title)")
        .eq("provider_user_id", userId)
        .eq("is_deleted", false)
        .in("status", ["REQUESTED", "PENDING", "ACCEPTED", "CONFIRMED"])
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const requesterIds = [...new Set(data.map((b: any) => b.requester_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", requesterIds);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

      return data.map((b: any) => ({
        ...b,
        requester: profileMap.get(b.requester_id),
      }));
    },
    enabled: !!userId,
  });

  if (isLoading || bookings.length === 0) return null;

  const pending = bookings.filter((b: any) => b.status === "REQUESTED" || b.status === "PENDING");
  const accepted = bookings.filter((b: any) => b.status === "ACCEPTED" || b.status === "CONFIRMED");

  const handleAccept = (bookingId: string) => {
    updateStatus.mutate({ bookingId, status: "ACCEPTED" }, {
      onSuccess: () => toast({ title: "Booking accepted ✅" }),
    });
  };

  const handleDecline = (bookingId: string) => {
    updateStatus.mutate({ bookingId, status: "CANCELLED" }, {
      onSuccess: () => toast({ title: "Booking declined" }),
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" /> Booking Requests
          {pending.length > 0 && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">{pending.length} pending</Badge>
          )}
        </h2>
        <Link to="/work?tab=bookings" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {bookings.map((b: any, i: number) => {
          const svc = b.services;
          const isPending = b.status === "REQUESTED" || b.status === "PENDING";
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-lg border border-border bg-card p-3 flex items-center gap-3"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={b.requester?.avatar_url} />
                <AvatarFallback className="text-[10px]">{b.requester?.name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Link to={`/bookings/${b.id}`} className="text-sm font-medium hover:text-primary transition-colors truncate block">
                  {svc?.title || "Booking"}
                </Link>
                <p className="text-[11px] text-muted-foreground truncate">
                  {b.requester?.name || "Someone"} · {b.start_date_time ? new Date(b.start_date_time).toLocaleDateString() : formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                </p>
              </div>
              {isPending ? (
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="default" className="h-7 px-2 text-xs" onClick={() => handleAccept(b.id)}>
                    <Check className="h-3 w-3 mr-0.5" /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleDecline(b.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Badge className="bg-primary/10 text-primary border-0 text-[10px] shrink-0">Accepted</Badge>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
