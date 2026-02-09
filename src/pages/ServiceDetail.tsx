import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Euro, MapPin, Hash, CalendarClock, Send, Video, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { BookingStatus, PaymentStatus } from "@/types/enums";
import {
  getServiceById, getUserById, getGuildById,
  getTopicsForService, getTerritoriesForService,
  bookings as allBookings, guildMembers, companies,
  getAvailabilityRulesForUser, getAvailabilityExceptionsForUser,
  getBookingsForProvider,
} from "@/data/mock";
import { generateSlots, generateCallUrl, type TimeSlot } from "@/lib/slots";
import type { Booking } from "@/types";

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const svc = getServiceById(id!);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { notifyBooking } = useNotifications();
  const [bookOpen, setBookOpen] = useState(false);
  const [bookNotes, setBookNotes] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const provider = svc?.providerUserId ? getUserById(svc.providerUserId) : null;
  const guild = svc?.providerGuildId ? getGuildById(svc.providerGuildId) : null;
  const svcTopics = svc ? getTopicsForService(svc.id) : [];
  const svcTerrs = svc ? getTerritoriesForService(svc.id) : [];
  const isOwnService = svc?.providerUserId === currentUser.id;
  const providerUserId = svc?.providerUserId;

  // Compute available slots for 1-week window
  const slots = useMemo(() => {
    if (!providerUserId || !svc?.durationMinutes) return [];
    const rules = getAvailabilityRulesForUser(providerUserId, svc.id);
    const exceptions = getAvailabilityExceptionsForUser(providerUserId);
    const providerBookings = getBookingsForProvider(providerUserId);

    const start = new Date();
    start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    return generateSlots(
      rules,
      exceptions,
      providerBookings,
      svc.durationMinutes,
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0],
      svc.id,
    );
  }, [providerUserId, svc?.id, svc?.durationMinutes, weekOffset]);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const groups: Record<string, TimeSlot[]> = {};
    for (const slot of slots) {
      const date = slot.startDateTime.split("T")[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(slot);
    }
    return groups;
  }, [slots]);

  if (!svc) return <PageShell><p>Service not found.</p></PageShell>;

  const isFree = !svc.priceAmount || svc.priceAmount === 0;

  const createBooking = () => {
    if (!selectedSlot) {
      toast({ title: "Please select a time slot", variant: "destructive" });
      return;
    }
    const userCompany = companies.find(c => c.contactUserId === currentUser.id);
    const booking: Booking = {
      id: `bk-${Date.now()}`,
      serviceId: svc.id,
      requesterId: currentUser.id,
      providerUserId: svc.providerUserId,
      providerGuildId: svc.providerGuildId,
      companyId: userCompany?.id,
      startDateTime: selectedSlot.startDateTime,
      endDateTime: selectedSlot.endDateTime,
      status: isFree ? BookingStatus.CONFIRMED : BookingStatus.PENDING_PAYMENT,
      paymentStatus: isFree ? PaymentStatus.NOT_REQUIRED : PaymentStatus.PENDING,
      amount: svc.priceAmount || 0,
      currency: svc.priceCurrency,
      notes: bookNotes.trim() || undefined,
      callUrl: isFree ? generateCallUrl(`bk-${Date.now()}`, svc.onlineLocationType) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    allBookings.push(booking);

    // Notify provider
    if (svc.providerUserId) {
      notifyBooking({ bookingId: booking.id, serviceTitle: svc.title, requesterName: currentUser.name, recipientUserId: svc.providerUserId, action: isFree ? "confirmed" : "requested" });
    } else if (svc.providerGuildId) {
      const admins = guildMembers.filter((gm) => gm.guildId === svc.providerGuildId && gm.role === "ADMIN");
      for (const admin of admins) {
        notifyBooking({ bookingId: booking.id, serviceTitle: svc.title, requesterName: currentUser.name, recipientUserId: admin.userId, action: isFree ? "confirmed" : "requested" });
      }
    }

    setBookOpen(false);
    setBookNotes("");
    setSelectedSlot(null);
    setWeekOffset(0);

    if (isFree) {
      toast({ title: "Session confirmed!", description: `Your call link: ${booking.callUrl}` });
    } else {
      toast({ title: "Session requested!", description: "Payment will be required once Stripe is connected." });
    }
  };

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/explore?tab=services"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Services</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-2">{svc.title}</h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
          {provider && (
            <Link to={`/users/${provider.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
              <Avatar className="h-6 w-6">
                <AvatarImage src={provider.avatarUrl} />
                <AvatarFallback>{provider.name[0]}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{provider.name}</span>
            </Link>
          )}
          {guild && (
            <Link to={`/guilds/${guild.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
              <img src={guild.logoUrl} className="h-6 w-6 rounded" alt="" />
              <span className="font-medium">{guild.name}</span>
            </Link>
          )}
          {svc.durationMinutes && (
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {svc.durationMinutes} min</span>
          )}
          {svc.priceAmount != null && (
            <Badge className="bg-primary/10 text-primary border-0">
              <Euro className="h-3 w-3 mr-0.5" />
              {svc.priceAmount === 0 ? "Free" : `${svc.priceAmount} ${svc.priceCurrency}`}
            </Badge>
          )}
          {svc.onlineLocationType && (
            <Badge variant="outline" className="text-xs">
              <Video className="h-3 w-3 mr-1" />
              {svc.onlineLocationType}
            </Badge>
          )}
        </div>

        <p className="text-muted-foreground max-w-2xl mb-4">{svc.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {svcTopics.map((t) => <Badge key={t.id} variant="secondary"><Hash className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
          {svcTerrs.map((t) => <Badge key={t.id} variant="outline"><MapPin className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
        </div>

        {!isOwnService && (
          <Dialog open={bookOpen} onOpenChange={(o) => { setBookOpen(o); if (!o) { setSelectedSlot(null); setWeekOffset(0); } }}>
            <DialogTrigger asChild>
              <Button><CalendarClock className="h-4 w-4 mr-1" /> Book a session</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Book — {svc.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Week navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={weekOffset === 0}
                    onClick={() => setWeekOffset((w) => w - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {fmtDate(weekStart)} – {fmtDate(weekEnd)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={weekOffset >= 3}
                    onClick={() => setWeekOffset((w) => w + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Slots */}
                {providerUserId ? (
                  Object.keys(slotsByDate).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No available slots this week. Try another week.
                    </p>
                  ) : (
                    <div className="max-h-[280px] overflow-y-auto space-y-3">
                      {Object.entries(slotsByDate).map(([date, daySlots]) => (
                        <div key={date}>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                            {new Date(date).toLocaleDateString("en-GB", { weekday: "long", month: "short", day: "numeric" })}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {daySlots.map((slot) => (
                              <Button
                                key={slot.startDateTime}
                                size="sm"
                                variant={selectedSlot?.startDateTime === slot.startDateTime ? "default" : "outline"}
                                className="text-xs"
                                onClick={() => setSelectedSlot(slot)}
                              >
                                {slot.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This is a guild-provided service. Availability is managed by the guild admins.
                  </p>
                )}

                <div>
                  <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
                  <Textarea value={bookNotes} onChange={(e) => setBookNotes(e.target.value)} placeholder="Any context or questions…" maxLength={500} className="resize-none" />
                </div>

                <Button
                  onClick={createBooking}
                  className="w-full"
                  disabled={providerUserId ? !selectedSlot : false}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {isFree ? "Confirm (Free)" : `Book & Pay (€${svc.priceAmount})`}
                </Button>

                {!isFree && (
                  <p className="text-[11px] text-muted-foreground text-center">
                    Stripe Checkout will be enabled when Cloud is connected.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>
    </PageShell>
  );
}
