
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  cta_label TEXT,
  cta_url TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by_user_id UUID
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can read/write all templates
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default templates
INSERT INTO public.email_templates (key, label, subject, body_html, cta_label, cta_url, description) VALUES
(
  'welcome',
  'Welcome Email',
  'Welcome to changethegame, {{name}}! 🌿',
  '<h2 style="font-size:22px;font-weight:normal;margin-bottom:16px;">Welcome aboard, {{name}}!</h2>
<p>We''re thrilled to have you join this community of changemakers, builders, and dreamers working together to regenerate our world.</p>
<p>Here are a few things you can do to get started:</p>
<ul style="padding-left:20px;line-height:1.8;">
  <li>Explore open quests and find projects that resonate with you</li>
  <li>Join a guild — a community of practice in your area of passion</li>
  <li>Browse services offered by fellow members</li>
</ul>
<p>Every small step matters. We can''t wait to see what you''ll create. ✨</p>',
  'Get started',
  'https://changethegame.xyz/quests',
  'Sent to new users right after signup.'
),
(
  'booking_requested',
  'Booking Requested (to provider)',
  'New session request: {{service_title}}',
  '<h2 style="font-size:22px;font-weight:normal;margin-bottom:16px;">Someone''s interested in your expertise! 🙌</h2>
<p><strong>{{requester_name}}</strong> has requested a session for your service <strong>"{{service_title}}"</strong>.</p>
<p>You can accept, decline, or suggest a different time from your bookings dashboard.</p>',
  'Review this request',
  'https://changethegame.xyz/my-bookings',
  'Sent to a service provider when a new booking is requested.'
),
(
  'booking_confirmed',
  'Booking Confirmed (to requester)',
  'Your session for "{{service_title}}" is confirmed ✅',
  '<h2 style="font-size:22px;font-weight:normal;margin-bottom:16px;">Your session is confirmed! 🎉</h2>
<p>Your request for <strong>"{{service_title}}"</strong> has been <strong>accepted</strong>.</p>
<p>The provider will be in touch with details. In the meantime, you can view your upcoming sessions:</p>',
  'View my requests',
  'https://changethegame.xyz/my-requests',
  'Sent to the requester when a provider accepts a booking.'
),
(
  'notification_mention',
  'Mention Notification',
  'You were mentioned by {{actor_name}}',
  '<h2 style="font-size:22px;font-weight:normal;margin-bottom:16px;">Someone mentioned you! 💬</h2>
<p><strong>{{actor_name}}</strong> mentioned you in a {{context}}.</p>',
  'View the mention',
  'https://changethegame.xyz/feed',
  'Sent when a user is mentioned in a post or comment.'
),
(
  'quest_update',
  'Quest Update Digest',
  '{{count}} new update(s) from quests you follow 📬',
  '<h2 style="font-size:22px;font-weight:normal;margin-bottom:16px;">Your quest digest 📬</h2>
<p>Here''s what''s been happening in the quests you care about:</p>
<p>{{update_items}}</p>',
  'Explore all quests',
  'https://changethegame.xyz/quests',
  'Periodic digest for users following quests with new updates.'
),
(
  'credit_received',
  'Credits Received',
  'You received {{amount}} credits 🪙',
  '<h2 style="font-size:22px;font-weight:normal;margin-bottom:16px;">Credits received! 🪙</h2>
<p>You''ve just received <strong>{{amount}} credits</strong>. {{reason}}</p>
<p>Credits can be used to fund quests, access services, and more.</p>',
  'View my wallet',
  'https://changethegame.xyz/me?tab=wallet',
  'Sent when a user receives credits (gift, reward, purchase).'
);
