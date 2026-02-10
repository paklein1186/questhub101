/**
 * Email Templates & Triggers
 * 
 * Minimal email layer for key platform events.
 * These are template generators that return email objects ready
 * to be sent via any email provider (Resend, etc.) once a backend is connected.
 * 
 * For now, they log to console and can be called from notification hooks.
 */

import type { User, Booking, Quest, QuestUpdate, Service } from "@/types";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

const APP_NAME = "ChangeTheGame";
const BASE_URL = window?.location?.origin ?? "https://www.changethegame.xyz";

function wrapTemplate(body: string): string {
  return `
<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #2d2d2d;">
  <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #8b7355; margin-bottom: 24px;">${APP_NAME}</p>
  ${body}
  <hr style="border: none; border-top: 1px solid #e5ddd0; margin: 32px 0 16px;" />
  <p style="font-size: 13px; color: #8b7355;">You're receiving this because you're part of our learning community. Together, we grow. 🌱</p>
</div>`;
}

// ─── Welcome Email ───────────────────────────────────────────

export function welcomeEmail(user: User): EmailMessage {
  return {
    to: user.email,
    subject: `Welcome to ${APP_NAME}, ${user.name}! 🌿`,
    html: wrapTemplate(`
      <h2 style="font-size: 22px; font-weight: normal; margin-bottom: 16px;">Welcome aboard, ${user.name}!</h2>
      <p>We're thrilled to have you join this community of changemakers, builders, and dreamers working together to regenerate our world.</p>
      <p>Here are a few things you can do to get started:</p>
      <ul style="padding-left: 20px; line-height: 1.8;">
        <li><a href="${BASE_URL}/quests" style="color: #6b5b3e;">Explore open quests</a> and find projects that resonate with you</li>
        <li><a href="${BASE_URL}/guilds" style="color: #6b5b3e;">Join a guild</a> — a community of practice in your area of passion</li>
        <li><a href="${BASE_URL}/services" style="color: #6b5b3e;">Browse services</a> offered by fellow members</li>
      </ul>
      <p>Every small step matters. We can't wait to see what you'll create. ✨</p>
    `),
  };
}

// ─── Booking Requested (to provider) ─────────────────────────

export function bookingRequestedEmail(
  provider: User,
  requester: User,
  service: Service,
  booking: Booking
): EmailMessage {
  return {
    to: provider.email,
    subject: `New session request: ${service.title}`,
    html: wrapTemplate(`
      <h2 style="font-size: 22px; font-weight: normal; margin-bottom: 16px;">Someone's interested in your expertise! 🙌</h2>
      <p><strong>${requester.name}</strong> has requested a session for your service <strong>"${service.title}"</strong>.</p>
      ${booking.notes ? `<p style="background: #f9f6f0; padding: 12px 16px; border-left: 3px solid #c4a97d; border-radius: 4px; font-style: italic;">"${booking.notes}"</p>` : ""}
      ${booking.requestedDateTime ? `<p>📅 Requested time: <strong>${new Date(booking.requestedDateTime).toLocaleString()}</strong></p>` : ""}
      <p><a href="${BASE_URL}/my-bookings" style="display: inline-block; background: #6b5b3e; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none;">Review this request</a></p>
      <p style="font-size: 14px; color: #888;">You can accept, decline, or suggest a different time from your bookings dashboard.</p>
    `),
  };
}

// ─── Booking Status Changed (to requester) ───────────────────

export function bookingStatusEmail(
  requester: User,
  service: Service,
  booking: Booking,
  newStatus: "ACCEPTED" | "DECLINED"
): EmailMessage {
  const isAccepted = newStatus === "ACCEPTED";
  return {
    to: requester.email,
    subject: isAccepted
      ? `Great news! Your session for "${service.title}" was accepted ✅`
      : `Update on your session request for "${service.title}"`,
    html: wrapTemplate(`
      <h2 style="font-size: 22px; font-weight: normal; margin-bottom: 16px;">
        ${isAccepted ? "Your session is confirmed! 🎉" : "Session update"}
      </h2>
      <p>Your request for <strong>"${service.title}"</strong> has been <strong>${isAccepted ? "accepted" : "declined"}</strong>.</p>
      ${isAccepted && booking.requestedDateTime
        ? `<p>📅 Scheduled for: <strong>${new Date(booking.requestedDateTime).toLocaleString()}</strong></p>`
        : ""}
      ${isAccepted
        ? `<p>The provider will be in touch with details. In the meantime, you can view your upcoming sessions:</p>`
        : `<p>Don't worry — there are many other experts and services in our community. Keep exploring!</p>`}
      <p><a href="${BASE_URL}/my-requests" style="display: inline-block; background: #6b5b3e; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none;">View my requests</a></p>
    `),
  };
}

// ─── Quest Update Digest (for followers) ─────────────────────

export function questDigestEmail(
  user: User,
  updates: Array<{ quest: Quest; questUpdate: QuestUpdate }>
): EmailMessage {
  const updateItems = updates
    .map(
      ({ quest, questUpdate }) => `
      <li style="margin-bottom: 16px;">
        <strong><a href="${BASE_URL}/quests/${quest.id}" style="color: #6b5b3e;">${quest.title}</a></strong><br/>
        <span style="font-size: 14px;">${questUpdate.title}</span><br/>
        <span style="font-size: 13px; color: #888;">${questUpdate.content.slice(0, 120)}${questUpdate.content.length > 120 ? "…" : ""}</span>
      </li>`
    )
    .join("");

  return {
    to: user.email,
    subject: `${updates.length} new update${updates.length > 1 ? "s" : ""} from quests you follow 📬`,
    html: wrapTemplate(`
      <h2 style="font-size: 22px; font-weight: normal; margin-bottom: 16px;">Your quest digest 📬</h2>
      <p>Here's what's been happening in the quests you care about:</p>
      <ul style="padding-left: 20px; line-height: 1.6;">
        ${updateItems}
      </ul>
      <p><a href="${BASE_URL}/quests" style="display: inline-block; background: #6b5b3e; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none;">Explore all quests</a></p>
    `),
  };
}

// ─── Send helper (mock for now) ──────────────────────────────

export function sendEmail(email: EmailMessage): void {
  console.log(`📧 [EMAIL] To: ${email.to} | Subject: ${email.subject}`);
  console.log(`📧 [EMAIL] Body preview:`, email.html.slice(0, 200) + "…");
}
