import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://changethegame.xyz";

const FREQUENCY_INTERVALS: Record<string, number> = {
  three_days: 3 * 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // 1. Get users whose digest is due
    const { data: prefs, error: prefsErr } = await supabase
      .from("notification_preferences")
      .select("user_id, digest_frequency, last_digest_sent_at, channel_email_enabled")
      .neq("digest_frequency", "none");

    if (prefsErr) throw prefsErr;
    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, usersProcessed: 0, message: "No users with digest enabled" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const now = Date.now();
    const dueUsers = prefs.filter((p) => {
      const interval = FREQUENCY_INTERVALS[p.digest_frequency] ?? FREQUENCY_INTERVALS.three_days;
      if (!p.last_digest_sent_at) return true;
      return now - new Date(p.last_digest_sent_at).getTime() >= interval;
    });

    if (dueUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, usersProcessed: 0, message: "No digests due yet" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: { userId: string; status: string }[] = [];

    for (const pref of dueUsers) {
      try {
        const userId = pref.user_id;
        const interval = FREQUENCY_INTERVALS[pref.digest_frequency] ?? FREQUENCY_INTERVALS.three_days;
        const since = new Date(now - interval).toISOString();

        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, email, role, headline")
          .eq("user_id", userId)
          .single();

        if (!profile?.name) continue;

        // ── Gather NETWORK-FOCUSED data ──

        // 1. Follows — what entities/people does this user follow?
        const { data: follows } = await supabase
          .from("follows")
          .select("target_type, target_id")
          .eq("follower_id", userId);

        // 2. Guild memberships
        const { data: memberships } = await supabase
          .from("guild_members")
          .select("guild_id, role, guilds(name)")
          .eq("user_id", userId)
          .limit(15);

        // 3. Followed topics
        const followedTopicIds = (follows ?? [])
          .filter((f: any) => f.target_type === "TOPIC")
          .map((f: any) => f.target_id);

        let topicNames: string[] = [];
        if (followedTopicIds.length > 0) {
          const { data: topics } = await supabase
            .from("topics")
            .select("id, name")
            .in("id", followedTopicIds.slice(0, 20));
          topicNames = (topics ?? []).map((t: any) => t.name);
        }

        // 4. Network posts — from followed entities & guilds
        const guildIds = (memberships ?? []).map((m: any) => m.guild_id);
        const followedEntityTargets = (follows ?? [])
          .filter((f: any) => f.target_type !== "TOPIC")
          .slice(0, 20);

        const orClauses: string[] = [];
        // Posts from guilds the user belongs to
        for (const gid of guildIds.slice(0, 15)) {
          orClauses.push(`and(context_type.eq.GUILD,context_id.eq.${gid})`);
        }
        // Posts from followed entities
        for (const f of followedEntityTargets) {
          orClauses.push(`and(context_type.eq.${f.target_type},context_id.eq.${f.target_id})`);
        }

        let networkPosts: any[] = [];
        if (orClauses.length > 0) {
          const { data: posts } = await supabase
            .from("feed_posts")
            .select("id, content, context_type, context_id, author_user_id, created_at, upvote_count")
            .eq("is_deleted", false)
            .neq("author_user_id", userId)
            .or(orClauses.join(","))
            .gte("created_at", since)
            .order("upvote_count", { ascending: false })
            .limit(15);
          networkPosts = posts ?? [];
        }

        // 5. New quests from guilds/followed entities
        let newQuests: any[] = [];
        if (guildIds.length > 0) {
          const { data: quests } = await supabase
            .from("quests")
            .select("id, title, guild_id, created_at, guilds(name)")
            .in("guild_id", guildIds.slice(0, 15))
            .gte("created_at", since)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false })
            .limit(8);
          newQuests = quests ?? [];
        }

        // 6. New events from guilds
        let newEvents: any[] = [];
        if (guildIds.length > 0) {
          const { data: events } = await supabase
            .from("guild_events")
            .select("id, title, guild_id, start_at, guilds(name)")
            .in("guild_id", guildIds.slice(0, 15))
            .gte("created_at", since)
            .eq("is_cancelled", false)
            .order("start_at", { ascending: true })
            .limit(5);
          newEvents = events ?? [];
        }

        // 7. New members in user's guilds (social proof)
        let newGuildMembers = 0;
        if (guildIds.length > 0) {
          const { count } = await supabase
            .from("guild_members")
            .select("id", { count: "exact", head: true })
            .in("guild_id", guildIds.slice(0, 15))
            .neq("user_id", userId)
            .gte("joined_at", since);
          newGuildMembers = count ?? 0;
        }

        // 8. Resolve author names for top posts
        const authorIds = [...new Set(networkPosts.map((p: any) => p.author_user_id))];
        let authorNames: Record<string, string> = {};
        if (authorIds.length > 0) {
          const { data: authors } = await supabase
            .from("profiles")
            .select("user_id, name")
            .in("user_id", authorIds.slice(0, 20));
          for (const a of authors ?? []) {
            authorNames[a.user_id] = a.name || "Someone";
          }
        }

        // 9. Resolve context names for posts
        const contextIds = [...new Set(networkPosts.map((p: any) => p.context_id).filter(Boolean))];
        let contextNames: Record<string, string> = {};
        if (contextIds.length > 0) {
          const { data: guilds } = await supabase
            .from("guilds")
            .select("id, name")
            .in("id", contextIds);
          for (const g of guilds ?? []) {
            contextNames[g.id] = g.name;
          }
        }

        const periodLabel = pref.digest_frequency === "weekly" ? "this week" : "these past 3 days";

        // ── Fetch unread notifications grouped by type ──
        const { data: unreadNotifs } = await supabase
          .from("notifications")
          .select("type")
          .eq("user_id", userId)
          .eq("is_read", false)
          .gte("created_at", since);

        const notifCounts: Record<string, number> = {};
        for (const n of unreadNotifs ?? []) {
          notifCounts[n.type] = (notifCounts[n.type] || 0) + 1;
        }

        // ── Fetch XP gained since last digest ──
        let xpGained = 0;
        const { data: xpRows } = await supabase
          .from("biopoints_transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("type", "earn")
          .gte("created_at", since);
        if (xpRows) {
          xpGained = xpRows.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
        }

        // Build rich context for AI — network-first
        const topPosts = networkPosts.slice(0, 8).map((p: any) => ({
          author: authorNames[p.author_user_id] || "Someone",
          context: contextNames[p.context_id] || p.context_type,
          snippet: (p.content || "").slice(0, 200),
          upvotes: p.upvote_count,
        }));

        const userContext = {
          name: profile.name,
          role: profile.role,
          headline: profile.headline,
          period: periodLabel,
          followedTopics: topicNames.slice(0, 10),
          guildNames: (memberships ?? []).map((m: any) => (m as any).guilds?.name).filter(Boolean).slice(0, 8),
          networkStats: {
            totalNewPosts: networkPosts.length,
            newQuests: newQuests.length,
            newEvents: newEvents.length,
            newMembersInYourGuilds: newGuildMembers,
            xpGained,
          },
          notificationCounts: notifCounts,
          topPosts,
          newQuests: newQuests.slice(0, 5).map((q: any) => ({
            title: q.title,
            guild: (q as any).guilds?.name,
          })),
          upcomingEvents: newEvents.slice(0, 3).map((e: any) => ({
            title: e.title,
            guild: (e as any).guilds?.name,
            date: new Date(e.start_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          })),
        };

        // Call AI to generate clustered digest
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are the digest writer for changethegame, a collaborative platform for changemakers and impact builders. Generate a clustered digest email focused on what's happening in the user's NETWORK — their guilds, followed topics, and communities. This is NOT a personal activity summary — it's a curated news brief grouped by category.

Your output must be a JSON object:
{
  "subject": "compelling subject line mentioning a specific guild or activity (max 55 chars)",
  "preheader": "short preview text shown in inbox before opening (max 90 chars)",
  "greeting": "warm 1-line greeting using their name",
  "clusters": [
    {
      "label": "🏛 Guild Activity",
      "items": [
        { "icon": "emoji", "text": "descriptive line about what happened", "link": "/relevant-deep-link" }
      ]
    }
  ],
  "closing": "1 motivational sentence",
  "cta_label": "Explore what's new",
  "cta_url": "/explore"
}

Available cluster categories (use only those that have data):
- "🏛 Guild Activity" — new posts, decisions, member joins in their guilds
- "⚡ Quests & Projects" — new quests, quest updates, proposals
- "📅 Upcoming Events" — events from guilds and followed entities
- "🏆 Your Progress" — XP gained, achievements, credits received, contributions

Rules:
- Only include clusters that have items. Max 4 items per cluster. Max 4 clusters total.
- Subject line should create curiosity: mention a specific guild name or count.
- Preheader should complement the subject, not repeat it.
- Use real deep links: /explore, /quests, /guilds, /network, /me, /me?tab=contributions
- For guild-specific links use /guilds/GUILD_ID format if you have context, otherwise /explore
- "Your Progress" cluster: summarize XP, achievements, credits in aggregate lines
- If there's little activity, highlight communities and suggest exploration
- Keep it punchy — this is a news brief, not a letter
- ONLY output valid JSON, no markdown fences`,
              },
              {
                role: "user",
                content: `Generate a clustered network digest for:\n${JSON.stringify(userContext, null, 2)}`,
              },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error for ${userId}:`, aiResponse.status, errText);
          await createFallbackDigest(supabase, userId, profile, userContext);
          results.push({ userId, status: "fallback" });
          continue;
        }

        const aiData = await aiResponse.json();
        const rawContent = aiData.choices?.[0]?.message?.content ?? "";

        let digest;
        try {
          const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          digest = JSON.parse(cleaned);
        } catch {
          console.error(`Failed to parse AI digest for ${userId}:`, rawContent.slice(0, 200));
          await createFallbackDigest(supabase, userId, profile, userContext);
          results.push({ userId, status: "fallback-parse" });
          continue;
        }

        // Create in-app notification
        const highlightsText = (digest.network_highlights ?? []).map((h: any) => `${h.icon} ${h.text}`).join(" • ");
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "AI_JOURNEY_DIGEST",
          title: digest.subject ?? "Your network digest",
          body: highlightsText || "Here's what's happening in your network.",
          deep_link_url: "/explore",
          is_read: false,
          metadata: {
            network_highlights: digest.network_highlights,
            featured_posts: digest.featured_posts,
            upcoming: digest.upcoming,
          },
        });

        // Send email
        if (pref.channel_email_enabled && profile.email) {
          // Fetch digest template from DB (fall back to hardcoded)
          let templateBodyHtml: string | null = null;
          let templateCtaLabel = "Explore what's new";
          let templateCtaUrl = "/explore";
          try {
            const { data: tpl } = await supabase
              .from("email_templates")
              .select("body_html, cta_label, cta_url")
              .eq("key", "digest")
              .single();
            if (tpl) {
              templateBodyHtml = tpl.body_html;
              templateCtaLabel = tpl.cta_label || templateCtaLabel;
              templateCtaUrl = tpl.cta_url || templateCtaUrl;
            }
          } catch { /* use defaults */ }

          const emailHtml = templateBodyHtml
            ? buildDigestFromTemplate(templateBodyHtml, templateCtaLabel, templateCtaUrl, digest, profile.name)
            : buildDigestEmailHtml(digest, profile.name);
          const resendKey = Deno.env.get("RESEND_API_KEY");
          if (resendKey) {
            try {
              const emailRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "changethegame <hello@changethegame.xyz>",
                  to: [profile.email],
                  subject: digest.subject ?? `Your ${userContext.period} network digest`,
                  html: emailHtml,
                }),
              });
              if (emailRes.ok) {
                const emailData = await emailRes.json();
                console.log(`✅ Digest email sent to ${profile.email} (id: ${emailData.id})`);
              } else {
                const errText = await emailRes.text();
                console.error(`Resend error for ${profile.email}: ${errText}`);
              }
            } catch (emailErr: any) {
              console.error(`Email send failed for ${profile.email}:`, emailErr.message);
            }
          }
        }

        // Update last_digest_sent_at
        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: new Date().toISOString() })
          .eq("user_id", userId);

        results.push({ userId, status: "sent" });
      } catch (userErr: any) {
        console.error(`Digest failed for ${pref.user_id}:`, userErr.message);
        results.push({ userId: pref.user_id, status: "error" });
      }
    }

    console.log(`Digest run completed — ${results.length} users processed`);

    return new Response(
      JSON.stringify({ success: true, usersProcessed: results.length, results }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("Digest failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

async function createFallbackDigest(supabase: any, userId: string, profile: any, ctx: any) {
  const guildList = (ctx.guildNames ?? []).slice(0, 3).join(", ");
  const body = guildList
    ? `Hey ${profile.name}! ${ctx.networkStats.totalNewPosts} new posts across your guilds (${guildList}) ${ctx.period}. Check out what's happening!`
    : `Hey ${profile.name}! Explore what's new on changethegame ${ctx.period}.`;
  await supabase.from("notifications").insert({
    user_id: userId,
    type: "AI_JOURNEY_DIGEST",
    title: `Your ${ctx.period} network digest`,
    body,
    deep_link_url: "/explore",
    is_read: false,
  });
  await supabase
    .from("notification_preferences")
    .update({ last_digest_sent_at: new Date().toISOString() })
    .eq("user_id", userId);
}

function buildDigestFromTemplate(
  bodyTemplate: string,
  ctaLabel: string,
  ctaUrl: string,
  digest: any,
  userName: string
): string {
  // Build partial HTML blocks for template placeholders
  const highlightsRows = (digest.network_highlights ?? [])
    .map((h: any) => `
      <tr>
        <td style="padding:6px 12px 6px 0;font-size:18px;vertical-align:top;width:28px;">${h.icon || "📌"}</td>
        <td style="padding:6px 0;font-size:15px;line-height:1.5;color:hsl(250,12%,30%);">${h.text}</td>
      </tr>`)
    .join("");

  const postsHtml = (digest.featured_posts ?? [])
    .map((p: any) => `
      <div style="margin-bottom:12px;padding:14px 16px;background:hsl(250,30%,97%);border-radius:8px;border-left:3px solid hsl(262,83%,58%);">
        <p style="font-size:13px;font-weight:600;color:hsl(262,83%,58%);margin:0 0 4px;">${p.author} · ${p.context}</p>
        <p style="font-size:14px;color:hsl(250,12%,30%);margin:0;line-height:1.5;">${p.teaser}</p>
      </div>`)
    .join("");

  const upcomingRows = (digest.upcoming ?? [])
    .map((u: any) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid hsl(250,18%,92%);">
          <p style="font-size:14px;font-weight:600;color:hsl(250,30%,8%);margin:0;">${u.label}</p>
          <p style="font-size:13px;color:hsl(250,12%,46%);margin:2px 0 0;">${u.detail}</p>
        </td>
      </tr>`)
    .join("");

  // Replace template variables
  let body = bodyTemplate
    .replace(/\{\{greeting\}\}/g, digest.greeting || `Hey ${userName},`)
    .replace(/\{\{highlights_rows\}\}/g, highlightsRows)
    .replace(/\{\{featured_posts_html\}\}/g, postsHtml)
    .replace(/\{\{upcoming_rows\}\}/g, upcomingRows)
    .replace(/\{\{closing\}\}/g, digest.closing || "");

  // Handle conditional sections {{#section}}...{{/section}}
  const conditionalReplace = (tag: string, hasContent: boolean) => {
    const re = new RegExp(`\\{\\{#${tag}\\}\\}([\\s\\S]*?)\\{\\{\\/${tag}\\}\\}`, "g");
    body = hasContent ? body.replace(re, "$1") : body.replace(re, "");
  };
  conditionalReplace("highlights", highlightsRows.length > 0);
  conditionalReplace("featured_posts", postsHtml.length > 0);
  conditionalReplace("upcoming", upcomingRows.length > 0);
  conditionalReplace("closing", !!digest.closing);

  const fullCtaUrl = ctaUrl.startsWith("http") ? ctaUrl : `${BASE_URL}${ctaUrl}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f5f4fb;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:hsl(262,83%,58%);border-radius:12px 12px 0 0;padding:20px 28px;">
      <span style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.85);">changethegame</span>
    </div>
    <div style="background:#ffffff;border:1px solid hsl(250,18%,90%);border-top:none;border-radius:0 0 12px 12px;padding:32px 28px;">
      ${body}
      <div style="margin-top:28px;">
        <a href="${fullCtaUrl}"
           style="display:inline-block;background:hsl(262,83%,58%);color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          ${ctaLabel}
        </a>
      </div>
      <hr style="border:none;border-top:1px solid hsl(250,18%,90%);margin:32px 0 20px;" />
      <p style="font-size:12px;color:hsl(250,12%,46%);line-height:1.6;margin:0;">
        You're receiving this because you opted into digests.
        <a href="${BASE_URL}/me?tab=notifications" style="color:hsl(262,83%,58%);text-decoration:underline;">Manage preferences</a>
      </p>
    </div>
    <p style="text-align:center;font-size:11px;color:hsl(250,12%,46%);margin-top:16px;">
      © 2025 changethegame · <a href="${BASE_URL}" style="color:hsl(250,12%,46%);">changethegame.xyz</a>
    </p>
  </div>
</body>
</html>`;
}

function buildDigestEmailHtml(digest: any, userName: string): string {
  // Network highlights
  const highlights = (digest.network_highlights ?? [])
    .map((h: any) => `
      <tr>
        <td style="padding:6px 12px 6px 0;font-size:18px;vertical-align:top;width:28px;">${h.icon || "📌"}</td>
        <td style="padding:6px 0;font-size:15px;line-height:1.5;color:hsl(250,12%,30%);">${h.text}</td>
      </tr>`)
    .join("");

  // Featured posts
  const posts = (digest.featured_posts ?? [])
    .map((p: any) => `
      <div style="margin-bottom:12px;padding:14px 16px;background:hsl(250,30%,97%);border-radius:8px;border-left:3px solid hsl(262,83%,58%);">
        <p style="font-size:13px;font-weight:600;color:hsl(262,83%,58%);margin:0 0 4px;">${p.author} · ${p.context}</p>
        <p style="font-size:14px;color:hsl(250,12%,30%);margin:0;line-height:1.5;">${p.teaser}</p>
      </div>`)
    .join("");

  // Upcoming events / quests
  const upcoming = (digest.upcoming ?? [])
    .map((u: any) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid hsl(250,18%,92%);">
          <p style="font-size:14px;font-weight:600;color:hsl(250,30%,8%);margin:0;">${u.label}</p>
          <p style="font-size:13px;color:hsl(250,12%,46%);margin:2px 0 0;">${u.detail}</p>
        </td>
      </tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f5f4fb;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:hsl(262,83%,58%);border-radius:12px 12px 0 0;padding:20px 28px;">
      <span style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.85);">changethegame</span>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border:1px solid hsl(250,18%,90%);border-top:none;border-radius:0 0 12px 12px;padding:32px 28px;">

      <h2 style="font-size:20px;font-weight:600;color:hsl(250,30%,8%);margin:0 0 16px;">${digest.greeting || `Hey ${userName},`}</h2>

      ${highlights ? `
      <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${highlights}
      </table>` : ""}

      ${posts ? `
      <h3 style="font-size:15px;font-weight:700;color:hsl(250,30%,8%);margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">📣 Worth a look</h3>
      ${posts}` : ""}

      ${upcoming ? `
      <h3 style="font-size:15px;font-weight:700;color:hsl(250,30%,8%);margin:24px 0 12px;text-transform:uppercase;letter-spacing:1px;">📅 Coming up</h3>
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        ${upcoming}
      </table>` : ""}

      ${digest.closing ? `<p style="font-size:15px;line-height:1.6;color:hsl(250,12%,46%);margin:24px 0 0;font-style:italic;">${digest.closing}</p>` : ""}

      <div style="margin-top:28px;">
        <a href="${BASE_URL}/explore"
           style="display:inline-block;background:hsl(262,83%,58%);color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Explore what's new
        </a>
      </div>

      <hr style="border:none;border-top:1px solid hsl(250,18%,90%);margin:32px 0 20px;" />
      <p style="font-size:12px;color:hsl(250,12%,46%);line-height:1.6;margin:0;">
        You're receiving this because you opted into digests.
        <a href="${BASE_URL}/me?tab=notifications" style="color:hsl(262,83%,58%);text-decoration:underline;">Manage preferences</a>
      </p>
    </div>

    <p style="text-align:center;font-size:11px;color:hsl(250,12%,46%);margin-top:16px;">
      © 2025 changethegame · <a href="${BASE_URL}" style="color:hsl(250,12%,46%);">changethegame.xyz</a>
    </p>
  </div>
</body>
</html>`;
}
