import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { FeedSection } from "@/components/feed/FeedSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, CalendarDays, MapPin, Video, Users, Euro, Check, X, Clock, Shield, MessageSquare, RefreshCw } from "lucide-react";
import { format, isPast } from "date-fns";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useCurrentUser();
  const { session } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [actionRegId, setActionRegId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"accept" | "refuse" | "">("");

  const { data: event, isLoading } = useQuery({
    queryKey: ["event-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guild_events" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: hostGuild } = useQuery({
    queryKey: ["event-host-guild", event?.guild_id],
    queryFn: async () => {
      const { data } = await supabase.from("guilds").select("id, name, logo_url").eq("id", event.guild_id).single();
      return data;
    },
    enabled: !!event?.guild_id,
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ["event-registrations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guild_event_attendees" as any)
        .select("*")
        .eq("event_id", id)
        .order("registered_at", { ascending: true });
      if (error) throw error;
      // Fetch profile names
      const userIds = (data || []).map((r: any) => r.user_id).filter(Boolean);
      if (userIds.length === 0) return data || [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data || []).map((r: any) => ({ ...r, profile: profileMap.get(r.user_id) || null }));
    },
    enabled: !!id,
  });

  const myReg = registrations.find((r: any) => r.user_id === currentUser.id && r.status !== "CANCELLED" && r.status !== "REFUSED" && r.status !== "REFUNDED");
  const isHost = event?.created_by_user_id === currentUser.id;
  const isGuildAdmin = false; // simplified: could check guild_members
  const canManage = isHost || isGuildAdmin;
  const acceptedCount = registrations.filter((r: any) => r.status === "ACCEPTED" || r.status === "REGISTERED").length;
  const eventPast = event ? isPast(new Date(event.start_at)) : false;
  const isCancelled = event?.is_cancelled || event?.status === "CANCELLED";

  const registerFree = async () => {
    if (!session) return;
    const autoAccept = event.acceptance_mode === "AUTO";
    const isFull = event.max_attendees && acceptedCount >= event.max_attendees;
    const { error } = await supabase.from("guild_event_attendees" as any).insert({
      event_id: id,
      user_id: currentUser.id,
      status: isFull ? "WAITLIST" : autoAccept ? "ACCEPTED" : "PENDING",
      payment_status: "NONE",
      accepted_at: autoAccept && !isFull ? new Date().toISOString() : null,
    } as any);
    if (error) { toast({ title: "Failed to register", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["event-registrations", id] });
    toast({ title: isFull ? "Added to waitlist" : autoAccept ? "Registered!" : "Registration submitted, awaiting approval" });
  };

  const registerPaid = async () => {
    if (!session) return;
    const { data, error } = await supabase.functions.invoke("event-checkout", {
      body: { eventId: id },
    });
    if (error || !data?.url) { toast({ title: "Payment error", description: error?.message || "Could not start checkout", variant: "destructive" }); return; }
    window.open(data.url, "_blank");
  };

  const cancelMyRegistration = async () => {
    if (!myReg) return;
    await supabase.from("guild_event_attendees" as any).update({ status: "CANCELLED", cancelled_at: new Date().toISOString() } as any).eq("id", myReg.id);
    qc.invalidateQueries({ queryKey: ["event-registrations", id] });
    toast({ title: "Registration cancelled" });
  };

  const handleHostAction = async () => {
    if (!actionRegId || !actionType) return;
    if (actionType === "accept") {
      await supabase.from("guild_event_attendees" as any).update({ status: "ACCEPTED", accepted_at: new Date().toISOString() } as any).eq("id", actionRegId);
    } else {
      // Refuse — if paid, we'd trigger refund via webhook/manual
      await supabase.from("guild_event_attendees" as any).update({ status: "REFUSED" } as any).eq("id", actionRegId);
    }
    qc.invalidateQueries({ queryKey: ["event-registrations", id] });
    setActionRegId(null);
    setActionType("");
    toast({ title: actionType === "accept" ? "Participant accepted" : "Participant refused" });
  };

  const cancelEvent = async () => {
    await supabase.from("guild_events" as any).update({ is_cancelled: true, status: "CANCELLED" } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["event-detail", id] });
    setCancelDialogOpen(false);
    toast({ title: "Event cancelled" });
  };

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!event) return <PageShell><p>Event not found.</p></PageShell>;

  const locationIcon = event.location_type === "ONLINE" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />;

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={`/guilds/${event.guild_id}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to Guild</Link>
      </Button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-2xl font-bold">{event.title}</h1>
              {isCancelled && <Badge variant="destructive">Cancelled</Badge>}
              {event.is_paid && <Badge className="bg-primary/10 text-primary border-0"><Euro className="h-3 w-3 mr-0.5" />{event.price_per_ticket} {event.currency}</Badge>}
            </div>
            {hostGuild && (
              <p className="text-sm text-muted-foreground">
                Hosted by <Link to={`/guilds/${hostGuild.id}`} className="text-primary hover:underline">{hostGuild.name}</Link>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{format(new Date(event.start_at), "EEE, MMM d yyyy · HH:mm")}</span>
              {event.end_at && <span>→ {format(new Date(event.end_at), "HH:mm")}</span>}
              <span className="flex items-center gap-1">{locationIcon}{event.location_type}</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" />{acceptedCount}{event.max_attendees ? `/${event.max_attendees}` : ""}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {!isCancelled && !eventPast && !myReg && session && (
              event.is_paid ? (
                <Button onClick={registerPaid}><Euro className="h-4 w-4 mr-1" /> Buy Ticket</Button>
              ) : (
                <Button onClick={registerFree}>Register</Button>
              )
            )}
            {!isCancelled && !eventPast && !session && (
              <Button asChild><Link to="/login">Log in to register</Link></Button>
            )}
            {myReg && (
              <div className="text-right space-y-1">
                <Badge variant="secondary" className="capitalize">{myReg.status.toLowerCase()}</Badge>
                {myReg.status !== "CANCELLED" && (
                  <Button size="sm" variant="ghost" onClick={cancelMyRegistration}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
                )}
                {myReg.status === "ACCEPTED" && event.call_url && (
                  <Button size="sm" asChild><a href={event.call_url} target="_blank" rel="noopener noreferrer">Join Call</a></Button>
                )}
              </div>
            )}
            {canManage && !isCancelled && (
              <Button size="sm" variant="destructive" onClick={() => setCancelDialogOpen(true)}>Cancel Event</Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview"><Shield className="h-4 w-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1" />Participants ({acceptedCount})</TabsTrigger>
          <TabsTrigger value="wall"><MessageSquare className="h-4 w-4 mr-1" />Wall</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-4">
          {event.description && <div className="prose prose-sm max-w-none"><p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{event.description}</p></div>}
          {event.location_text && <p className="text-sm text-muted-foreground">📍 {event.location_text}</p>}
          {event.call_url && <p className="text-sm"><a href={event.call_url} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">🔗 Event link</a></p>}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">{acceptedCount}</p>
              <p className="text-sm text-muted-foreground">Participants</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary capitalize">{event.acceptance_mode?.toLowerCase()}</p>
              <p className="text-sm text-muted-foreground">Acceptance</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">{event.is_paid ? `${event.price_per_ticket} ${event.currency}` : "Free"}</p>
              <p className="text-sm text-muted-foreground">Ticket Price</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="participants" className="mt-6 space-y-3">
          {registrations.length === 0 && <p className="text-sm text-muted-foreground">No registrations yet.</p>}
          {registrations.map((reg: any) => (
            <div key={reg.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={reg.profile?.avatar_url} />
                <AvatarFallback>{reg.profile?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{reg.profile?.name || reg.name || "Unknown"}</p>
                <div className="flex gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[10px] capitalize">{reg.status.toLowerCase()}</Badge>
                  {reg.payment_status !== "NONE" && <Badge variant="secondary" className="text-[10px] capitalize">{reg.payment_status.toLowerCase()}</Badge>}
                </div>
              </div>
              {canManage && reg.status === "PENDING" && (
                <div className="flex gap-1">
                  <Button size="sm" variant="default" onClick={() => { setActionRegId(reg.id); setActionType("accept"); handleHostAction(); }}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setActionRegId(reg.id); setActionType("refuse"); handleHostAction(); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="wall" className="mt-6">
          {(myReg || canManage) ? (
            <div className="space-y-6">
              <FeedSection contextType="GUILD_EVENT" contextId={id!} canPost={!!myReg || canManage} />
              <CommentThread targetType={"GUILD_EVENT" as any} targetId={id!} />
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Wall and discussions are only visible to participants.</p>
              {!session && <Button asChild className="mt-3"><Link to="/login">Log in</Link></Button>}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel event dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
            <AlertDialogDescription>
              All participants will be notified. Paid registrations will need manual refunds via Stripe dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Event</AlertDialogCancel>
            <AlertDialogAction onClick={cancelEvent} className="bg-destructive text-destructive-foreground">Cancel Event</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
