import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Plus, Calendar, Clock, Users, Video, Archive, CheckCircle,
  Coffee, Heart, Landmark, Brain, GraduationCap, Zap, Scale,
  Telescope, Network, PartyPopper, Play, XCircle,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import { RITUAL_SESSION_TYPES, RITUAL_FREQUENCIES, RITUAL_ACCESS_TYPES, GOVERNANCE_IMPACT_COLORS, type RitualSessionTypeKey } from "@/lib/ritualConfig";
import { CreateRitualDialog } from "./CreateRitualDialog";

const SESSION_ICONS: Record<string, any> = {
  Coffee, Heart, Landmark, Brain, GraduationCap, Zap, Scale, Telescope, Network, PartyPopper,
};

function getSessionIcon(sessionType: string) {
  const config = RITUAL_SESSION_TYPES[sessionType as RitualSessionTypeKey];
  if (!config) return Calendar;
  return SESSION_ICONS[config.icon] || Calendar;
}

interface Props {
  guildId: string;
  isAdmin: boolean;
  isMember: boolean;
}

export function GuildRitualsTab({ guildId, isAdmin, isMember }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const currentUser = useCurrentUser();
  const [createOpen, setCreateOpen] = useState(false);
  const [subTab, setSubTab] = useState<"upcoming" | "archive">("upcoming");

  const { data: rituals = [], isLoading } = useQuery({
    queryKey: ["rituals", guildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rituals")
        .select("*")
        .eq("guild_id", guildId)
        .eq("is_active", true)
        .order("next_occurrence", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: occurrences = [] } = useQuery({
    queryKey: ["ritual-occurrences", guildId],
    queryFn: async () => {
      const ritualIds = rituals.map((r: any) => r.id);
      if (!ritualIds.length) return [];
      const { data, error } = await supabase
        .from("ritual_occurrences")
        .select("*, ritual_attendees(id, user_id, role, xp_granted)")
        .in("ritual_id", ritualIds)
        .order("scheduled_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: rituals.length > 0,
  });

  const upcomingOccurrences = occurrences.filter((o: any) => 
    o.status === "scheduled" || (o.status === "in_progress")
  );
  const pastOccurrences = occurrences.filter((o: any) => 
    o.status === "completed" || o.status === "cancelled"
  );

  const handleJoinOccurrence = async (occurrenceId: string) => {
    const { error } = await supabase.from("ritual_attendees").insert({
      occurrence_id: occurrenceId,
      user_id: currentUser.id,
      role: "participant",
    });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already registered" });
      } else {
        toast({ title: "Failed to join", variant: "destructive" });
      }
      return;
    }
    qc.invalidateQueries({ queryKey: ["ritual-occurrences", guildId] });
    toast({ title: "Registered for ritual" });
  };

  const handleLeaveOccurrence = async (occurrenceId: string) => {
    await supabase.from("ritual_attendees")
      .delete()
      .eq("occurrence_id", occurrenceId)
      .eq("user_id", currentUser.id);
    qc.invalidateQueries({ queryKey: ["ritual-occurrences", guildId] });
    toast({ title: "Unregistered from ritual" });
  };

  const handleCreateOccurrence = async (ritualId: string, scheduledAt: string) => {
    const ritual = rituals.find((r: any) => r.id === ritualId);
    const visioLink = (ritual as any)?.default_visio_link || 
      `https://meet.jit.si/ctg-ritual-${ritualId.slice(0, 8)}-${Date.now()}`;
    
    const { error } = await supabase.from("ritual_occurrences").insert({
      ritual_id: ritualId,
      scheduled_at: scheduledAt,
      visio_link: visioLink,
      status: "scheduled",
    });
    if (error) {
      toast({ title: "Failed to schedule", variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["ritual-occurrences", guildId] });
    toast({ title: "Ritual occurrence scheduled" });
  };

  const handleCompleteOccurrence = async (occurrenceId: string) => {
    await supabase.from("ritual_occurrences")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", occurrenceId);
    qc.invalidateQueries({ queryKey: ["ritual-occurrences", guildId] });
    toast({ title: "Ritual marked as completed" });
  };

  if (isLoading) return <p className="text-muted-foreground p-4">Loading rituals…</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Rituals
          </h3>
          <p className="text-sm text-muted-foreground">
            Periodic collective synchronization — governance, culture, and coordination cadence.
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Ritual
          </Button>
        )}
      </div>

      {/* Active Ritual Definitions */}
      {rituals.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {rituals.map((ritual: any) => {
            const config = RITUAL_SESSION_TYPES[ritual.session_type as RitualSessionTypeKey];
            const Icon = getSessionIcon(ritual.session_type);
            const impactClass = GOVERNANCE_IMPACT_COLORS[config?.governanceImpact || "low"] || "";
            return (
              <Card key={ritual.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{ritual.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {config?.label || ritual.session_type}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${impactClass}`}>
                      {config?.governanceImpact || "—"} impact
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ritual.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{ritual.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" /> {ritual.duration_minutes} min
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" /> {RITUAL_FREQUENCIES[ritual.frequency as keyof typeof RITUAL_FREQUENCIES]?.label || ritual.frequency}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" /> {RITUAL_ACCESS_TYPES[ritual.access_type as keyof typeof RITUAL_ACCESS_TYPES]?.label || ritual.access_type}
                    </Badge>
                    {ritual.xp_reward > 0 && (
                      <Badge variant="outline" className="gap-1 text-primary">
                        +{ritual.xp_reward} XP
                      </Badge>
                    )}
                  </div>
                  {/* Program segments preview */}
                  {ritual.program_segments && Array.isArray(ritual.program_segments) && (ritual.program_segments as any[]).length > 0 && (
                    <div className="border-t border-border pt-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Program</p>
                      <div className="space-y-0.5">
                        {(ritual.program_segments as any[]).slice(0, 4).map((seg: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-foreground/80">{seg.title}</span>
                            <span className="text-muted-foreground">{seg.minutes}′</span>
                          </div>
                        ))}
                        {(ritual.program_segments as any[]).length > 4 && (
                          <p className="text-[10px] text-muted-foreground">+{(ritual.program_segments as any[]).length - 4} more segments</p>
                        )}
                      </div>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => {
                          const next = new Date();
                          next.setDate(next.getDate() + 7);
                          next.setHours(18, 0, 0, 0);
                          handleCreateOccurrence(ritual.id, next.toISOString());
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Schedule Next Occurrence
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {rituals.length === 0 && !isAdmin && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No rituals have been set up for this guild yet.</p>
        </div>
      )}

      {rituals.length === 0 && isAdmin && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">Create your first ritual to establish a collective cadence.</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Ritual
          </Button>
        </div>
      )}

      {/* Occurrences */}
      {occurrences.length > 0 && (
        <div>
          <Tabs value={subTab} onValueChange={(v) => setSubTab(v as any)}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcomingOccurrences.length})</TabsTrigger>
              <TabsTrigger value="archive"><Archive className="h-3.5 w-3.5 mr-1" /> Archive ({pastOccurrences.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {upcomingOccurrences.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming rituals scheduled.</p>
              )}
              {upcomingOccurrences.map((occ: any) => {
                const ritual = rituals.find((r: any) => r.id === occ.ritual_id);
                const Icon = getSessionIcon(ritual?.session_type || "");
                const attendees = occ.ritual_attendees || [];
                const isRegistered = attendees.some((a: any) => a.user_id === currentUser.id);
                return (
                  <Card key={occ.id}>
                    <CardContent className="py-4 flex items-center gap-4 flex-wrap">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{ritual?.title || "Ritual"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(occ.scheduled_at), "EEEE, MMMM d · HH:mm")}
                          {" · "}
                          {formatDistanceToNow(new Date(occ.scheduled_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {attendees.length}
                      </div>
                      <div className="flex items-center gap-2">
                        {occ.visio_link && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={occ.visio_link} target="_blank" rel="noopener noreferrer">
                              <Video className="h-3.5 w-3.5 mr-1" /> Join
                            </a>
                          </Button>
                        )}
                        {isMember && !isRegistered && (
                          <Button size="sm" onClick={() => handleJoinOccurrence(occ.id)}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Register
                          </Button>
                        )}
                        {isRegistered && (
                          <Button size="sm" variant="ghost" onClick={() => handleLeaveOccurrence(occ.id)}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Unregister
                          </Button>
                        )}
                        {isAdmin && occ.status === "scheduled" && (
                          <Button size="sm" variant="outline" onClick={() => handleCompleteOccurrence(occ.id)}>
                            <Play className="h-3.5 w-3.5 mr-1" /> Complete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="archive" className="mt-4 space-y-3">
              {pastOccurrences.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No completed rituals yet.</p>
              )}
              {pastOccurrences.map((occ: any) => {
                const ritual = rituals.find((r: any) => r.id === occ.ritual_id);
                const Icon = getSessionIcon(ritual?.session_type || "");
                const attendees = occ.ritual_attendees || [];
                return (
                  <Card key={occ.id} className="opacity-80">
                    <CardContent className="py-4 flex items-center gap-4 flex-wrap">
                      <div className="p-2 rounded-lg bg-muted shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{ritual?.title || "Ritual"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(occ.scheduled_at), "MMMM d, yyyy · HH:mm")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {attendees.length} attended
                      </div>
                      <Badge variant={occ.status === "completed" ? "default" : "destructive"} className="text-xs">
                        {occ.status}
                      </Badge>
                      {occ.notes && (
                        <p className="w-full text-xs text-muted-foreground mt-2 border-t border-border pt-2 line-clamp-2">{occ.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>
      )}

      <CreateRitualDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        guildId={guildId}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["rituals", guildId] });
          setCreateOpen(false);
        }}
      />
    </div>
  );
}
