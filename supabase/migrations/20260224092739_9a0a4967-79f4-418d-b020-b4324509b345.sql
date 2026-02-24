INSERT INTO public.email_templates (key, label, description, subject, body_html, cta_label, cta_url)
VALUES (
  'digest',
  'Network Digest',
  'Periodic digest email with network activity, sent based on user frequency preference.',
  'Your {{period}} network digest',
  '<h2 style="font-size:20px;font-weight:600;color:hsl(250,30%,8%);margin:0 0 16px;">{{greeting}}</h2>

{{#highlights}}
<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;">
  {{highlights_rows}}
</table>
{{/highlights}}

{{#featured_posts}}
<h3 style="font-size:15px;font-weight:700;color:hsl(250,30%,8%);margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">📣 Worth a look</h3>
{{featured_posts_html}}
{{/featured_posts}}

{{#upcoming}}
<h3 style="font-size:15px;font-weight:700;color:hsl(250,30%,8%);margin:24px 0 12px;text-transform:uppercase;letter-spacing:1px;">📅 Coming up</h3>
<table role="presentation" style="width:100%;border-collapse:collapse;">
  {{upcoming_rows}}
</table>
{{/upcoming}}

{{#closing}}
<p style="font-size:15px;line-height:1.6;color:hsl(250,12%,46%);margin:24px 0 0;font-style:italic;">{{closing}}</p>
{{/closing}}',
  'Explore what''s new',
  '/explore'
)
ON CONFLICT (key) DO NOTHING;