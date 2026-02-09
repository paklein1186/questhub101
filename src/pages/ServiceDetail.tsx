import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Euro, MapPin, Hash, CalendarClock, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { BookingStatus } from "@/types/enums";
import {
  getServiceById, getUserById, getGuildById,
  getTopicsForService, getTerritoriesForService,
  bookings as allBookings, guildMembers, companies,
} from "@/data/mock";
import type { Booking } from "@/types";

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const svc = getServiceById(id!);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { notifyBooking } = useNotifications();
  const [bookOpen, setBookOpen] = useState(false);
  const [bookDateTime, setBookDateTime] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  if (!svc) return <PageShell><p>Service not found.</p></PageShell>;

  const provider = svc.providerUserId ? getUserById(svc.providerUserId) : null;
  const guild = svc.providerGuildId ? getGuildById(svc.providerGuildId) : null;
  const svcTopics = getTopicsForService(svc.id);
  const svcTerrs = getTerritoriesForService(svc.id);
  const isOwnService = svc.providerUserId === currentUser.id;

  const createBooking = () => {
    // Find if current user is a contact for any company
    const userCompany = companies.find(c => c.contactUserId === currentUser.id);
    const booking: Booking = {
      id: `bk-${Date.now()}`,
      serviceId: svc.id,
      requesterId: currentUser.id,
      providerUserId: svc.providerUserId,
      providerGuildId: svc.providerGuildId,
      companyId: userCompany?.id,
      requestedDateTime: bookDateTime || undefined,
      status: BookingStatus.REQUESTED,
      notes: bookNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    allBookings.push(booking);

    // Notify provider
    if (svc.providerUserId) {
      notifyBooking({ bookingId: booking.id, serviceTitle: svc.title, requesterName: currentUser.name, recipientUserId: svc.providerUserId, action: "requested" });
    } else if (svc.providerGuildId) {
      const admins = guildMembers.filter((gm) => gm.guildId === svc.providerGuildId && gm.role === "ADMIN");
      for (const admin of admins) {
        notifyBooking({ bookingId: booking.id, serviceTitle: svc.title, requesterName: currentUser.name, recipientUserId: admin.userId, action: "requested" });
      }
    }

    setBookOpen(false);
    setBookDateTime("");
    setBookNotes("");
    toast({ title: "Session requested!", description: "The provider will be notified." });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/services"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Services</Link>
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
        </div>

        <p className="text-muted-foreground max-w-2xl mb-4">{svc.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {svcTopics.map((t) => <Badge key={t.id} variant="secondary"><Hash className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
          {svcTerrs.map((t) => <Badge key={t.id} variant="outline"><MapPin className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
        </div>

        {!isOwnService && (
          <Dialog open={bookOpen} onOpenChange={setBookOpen}>
            <DialogTrigger asChild>
              <Button><CalendarClock className="h-4 w-4 mr-1" /> Request a session</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a session — {svc.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Preferred date & time (optional)</label>
                  <Input type="datetime-local" value={bookDateTime} onChange={(e) => setBookDateTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
                  <Textarea value={bookNotes} onChange={(e) => setBookNotes(e.target.value)} placeholder="Any context or questions for the provider…" maxLength={500} className="resize-none" />
                </div>
                <Button onClick={createBooking} className="w-full">
                  <Send className="h-4 w-4 mr-1" /> Send Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>
    </PageShell>
  );
}
