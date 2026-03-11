import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export async function insertBookingNotification(params: {
  recipientUserId: string; bookingId: string; serviceTitle: string; requesterName?: string; action: string;
  startDateTime?: string; endDateTime?: string; amount?: number; currency?: string;
}) {
  const titleMap: Record<string, string> = {
    requested: "New booking request",
    confirmed: "Booking confirmed ✅",
    sent: "Booking request sent",
    accepted: "Booking accepted",
    declined: "Booking declined",
    cancelled: "Booking cancelled",
  };
  const timeSummary = params.startDateTime
    ? `\n📅 ${new Date(params.startDateTime).toLocaleString()}${params.endDateTime ? ` – ${new Date(params.endDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}`
    : "";
  const priceSummary = params.amount && params.amount > 0 ? `\n🟩 ${Math.round(params.amount / 0.04).toLocaleString()} Coins (≈ €${params.amount})` : "";
  const name = params.requesterName || "Someone";
  const bodyMap: Record<string, string> = {
    requested: `${name} requested "${params.serviceTitle}"${timeSummary}${priceSummary}`,
    confirmed: `Your session for "${params.serviceTitle}" is confirmed${timeSummary}`,
    sent: `Your booking request for "${params.serviceTitle}" was sent${timeSummary}${priceSummary}`,
    accepted: `Your booking for "${params.serviceTitle}" has been accepted${timeSummary}`,
    declined: `Your booking for "${params.serviceTitle}" was declined`,
    cancelled: `Booking for "${params.serviceTitle}" was cancelled`,
  };
  const { error: notifErr } = await supabase.from("notifications").insert({
    user_id: params.recipientUserId,
    type: params.action === "requested" ? "BOOKING_REQUESTED" : params.action === "confirmed" || params.action === "accepted" ? "BOOKING_CONFIRMED" : params.action === "declined" ? "BOOKING_CANCELLED" : "BOOKING_UPDATED",
    title: titleMap[params.action] || `Booking ${params.action}`,
    body: bodyMap[params.action] || `Booking for "${params.serviceTitle}" was ${params.action}`,
    related_entity_type: "BOOKING",
    related_entity_id: params.bookingId,
    deep_link_url: `/bookings/${params.bookingId}`,
    data: { bookingId: params.bookingId } as any,
  });
  if (notifErr) {
    logger.error("[BOOKING-NOTIF] Failed to insert notification:", notifErr.message, notifErr.code, notifErr.details);
  }
}
