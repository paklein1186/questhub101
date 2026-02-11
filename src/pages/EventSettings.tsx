import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEventAccess } from "@/pages/EventEdit";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Save, Trash2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function EventSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { event, isLoading, canManage } = useEventAccess(id);

  // Registrations count for safety checks
  const { data: registrations = [] } = useQuery({
    queryKey: ["event-registrations", id],
    queryFn: async () => {
      const { data } = await supabase.from("guild_event_attendees" as any).select("id, status, payment_status").eq("event_id", id);
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  const [visibility, setVisibility] = useState("PUBLIC");
  const [acceptanceMode, setAcceptanceMode] = useState("AUTO");
  const [isPaid, setIsPaid] = useState(false);
  const [pricePerTicket, setPricePerTicket] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [saving, setSaving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (event) {
      setVisibility(event.visibility || "PUBLIC");
      setAcceptanceMode(event.acceptance_mode || "AUTO");
      setIsPaid(!!event.is_paid);
      setPricePerTicket(event.price_per_ticket ? String(event.price_per_ticket) : "");
      setCurrency(event.currency || "EUR");
    }
  }, [event]);

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!event) return <PageShell><p>Event not found.</p></PageShell>;
  if (!canManage) {
    return (
      <PageShell>
        <div className="text-center py-16">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have permission to manage this event.</p>
          <Button asChild><Link to={`/events/${id}`}>Back to Event</Link></Button>
        </div>
      </PageShell>
    );
  }

  const isCancelled = event.is_cancelled || event.status === "CANCELLED";
  const hasPaidRegistrations = registrations.some((r: any) => r.payment_status === "PAID");
  const hasAnyRegistrations = registrations.length > 0;
  const canDelete = event.status === "DRAFT" && !hasAnyRegistrations;

  const handleSave = async () => {
    setSaving(true);
    const updates: any = {
      visibility,
      acceptance_mode: acceptanceMode,
      is_paid: isPaid,
    };
    if (isPaid) {
      updates.price_per_ticket = parseFloat(pricePerTicket) || 0;
      updates.currency = currency;
    } else {
      updates.price_per_ticket = null;
      updates.currency = null;
    }

    const { error } = await supabase.from("guild_events" as any).update(updates).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Failed to save: " + error.message); return; }
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["event-detail", id] });
  };

  const cancelEvent = async () => {
    await supabase.from("guild_events" as any).update({ is_cancelled: true, status: "CANCELLED" } as any).eq("id", id);
    // Mark all non-cancelled registrations
    const activeRegs = registrations.filter((r: any) => r.status !== "CANCELLED" && r.status !== "REFUNDED");
    for (const reg of activeRegs) {
      const update: any = { status: "CANCELLED", cancelled_at: new Date().toISOString() };
      if (reg.payment_status === "PAID") {
        update.status = "REFUNDED";
        update.payment_status = "REFUND_PENDING";
        update.refunded_at = new Date().toISOString();
      }
      await supabase.from("guild_event_attendees" as any).update(update).eq("id", reg.id);
    }
    setCancelDialogOpen(false);
    toast.success("Event cancelled. Participants will be notified.");
    qc.invalidateQueries({ queryKey: ["event-detail", id] });
    navigate(`/events/${id}`);
  };

  const deleteEvent = async () => {
    const { error } = await supabase.from("guild_events" as any).delete().eq("id", id);
    if (error) { toast.error("Failed to delete event"); return; }
    setDeleteDialogOpen(false);
    toast.success("Event deleted");
    navigate(event.guild_id ? `/guilds/${event.guild_id}` : "/calendar");
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={`/events/${id}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to Event</Link>
      </Button>

      <div className="max-w-2xl space-y-8">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold">Event Settings</h1>
          {isCancelled && <Badge variant="destructive">Cancelled</Badge>}
        </div>

        {/* Visibility */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Visibility</h2>
          <div>
            <Label>Who can see this event?</Label>
            <Select value={visibility} onValueChange={setVisibility} disabled={isCancelled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public — Anyone</SelectItem>
                <SelectItem value="FOLLOWERS">Followers — Only followers of the host</SelectItem>
                <SelectItem value="INTERNAL">Internal — Only guild members & participants</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <Separator />

        {/* Participation Mode */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Participation Mode</h2>
          <div>
            <Label>How are participants accepted?</Label>
            <Select value={acceptanceMode} onValueChange={setAcceptanceMode} disabled={isCancelled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO">Automatic — First-come, first-served</SelectItem>
                <SelectItem value="MANUAL">Manual — Host reviews and accepts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <Separator />

        {/* Ticketing & Payment */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Ticketing & Payment</h2>
          <div className="flex items-center gap-3">
            <Switch
              checked={isPaid}
              onCheckedChange={setIsPaid}
              disabled={isCancelled || hasPaidRegistrations}
            />
            <Label>This is a paid event</Label>
          </div>
          {hasPaidRegistrations && isPaid && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Ticket price cannot be changed after purchases have been made.
            </p>
          )}
          {isPaid && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ticket price</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={pricePerTicket}
                  onChange={(e) => setPricePerTicket(e.target.value)}
                  disabled={isCancelled || hasPaidRegistrations}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency} disabled={isCancelled || hasPaidRegistrations}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </section>

        {/* Save button */}
        {!isCancelled && (
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        )}

        <Separator />

        {/* Danger Zone */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-4">
            {!isCancelled && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cancel event</p>
                  <p className="text-xs text-muted-foreground">All participants will be notified. Refunds will be initiated for paid tickets.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setCancelDialogOpen(true)}>
                  <XCircle className="h-4 w-4 mr-1" /> Cancel Event
                </Button>
              </div>
            )}
            {canDelete && (
              <>
                {!isCancelled && <Separator className="bg-destructive/20" />}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Delete event</p>
                    <p className="text-xs text-muted-foreground">Permanently remove this draft event. This cannot be undone.</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete Event
                  </Button>
                </div>
              </>
            )}
            {isCancelled && !canDelete && (
              <p className="text-sm text-muted-foreground">This event has been cancelled.</p>
            )}
          </div>
        </section>
      </div>

      {/* Cancel confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
            <AlertDialogDescription>
              All participants will be notified. For paid events, refunds will be initiated for all paid registrations.
              {hasPaidRegistrations && (
                <span className="block mt-2 font-medium text-destructive">
                  {registrations.filter((r: any) => r.payment_status === "PAID").length} paid registration(s) will be marked for refund.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Event</AlertDialogCancel>
            <AlertDialogAction onClick={cancelEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The event and all associated data will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Event</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
