import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      if (!p.last_digest_sent_at) return true; // never sent
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
          .select("name, email, role, headline, bio")
          .eq("user_id", userId)
          .single();

        if (!profile?.name) continue;

        // Gather user activity data
        const [
          { data: follows },
          { data: myPosts },
          { data: memberships },
          { data: bookings },
          { data: enrollments },
          { data: achievements },
          { data: xpEvents },
        ] = await Promise.all([
          supabase.from("follows").select("target_type, target_id").eq("follower_id", userId),
          supabase.from("feed_posts").select("id, content, context_type, created_at").eq("author_user_id", userId).gte("created_at", since).eq("is_deleted", false).order("created_at", { ascending: false }).limit(5),
          supabase.from("guild_members").select("guild_id, role, guilds(name)").eq("user_id", userId).limit(10),
          supabase.from("bookings").select("id, status, created_at, services(title)").eq("requester_id", userId).gte("created_at", since).eq("is_deleted", false).limit(5),
          supabase.from("course_enrollments").select("course_id, progress_percent, courses(title)").eq("user_id", userId).limit(5),
          supabase.from("achievements").select("title, created_at").eq("user_id", userId).gte("created_at", since).limit(5),
          supabase.from("xp_events").select("amount, reason, created_at").eq("user_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        ]);

        // Get recent network activity from followed entities
        let networkUpdates: any[] = [];
        if (follows && follows.length > 0) {
          const orClauses = follows
            .slice(0, 20)
            .map((f: any) => `and(context_type.eq.${f.target_type},context_id.eq.${f.target_id})`)
            .join(",");

          const { data: posts } = await supabase
            .from("feed_posts")
            .select("id, content, context_type, context_id, author_user_id, created_at")
            .eq("is_deleted", false)
            .or(orClauses)
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(10);

          networkUpdates = posts ?? [];
        }

        // Build context for AI
        const totalXp = (xpEvents ?? []).reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0);
        const periodLabel = pref.digest_frequency === "weekly" ? "this week" : "these past 3 days";

        const userContext = {
          name: profile.name,
          role: profile.role,
          headline: profile.headline,
          bio: profile.bio?.slice(0, 200),
          period: periodLabel,
          stats: {
            postsCreated: myPosts?.length ?? 0,
            networkUpdates: networkUpdates.length,
            bookingsMade: bookings?.length ?? 0,
            achievementsEarned: achievements?.length ?? 0,
            xpGained: totalXp,
            guildsJoined: memberships?.length ?? 0,
            coursesInProgress: (enrollments ?? []).filter((e: any) => e.progress_percent < 100).length,
          },
          guildNames: (memberships ?? []).map((m: any) => (m as any).guilds?.name).filter(Boolean).slice(0, 5),
          courseProgress: (enrollments ?? []).map((e: any) => ({ title: (e as any).courses?.title, progress: e.progress_percent })).slice(0, 3),
          recentAchievements: (achievements ?? []).map((a: any) => a.title),
          followingCount: follows?.length ?? 0,
        };

        // Call Lovable AI to generate personalized digest
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
                content: `You are the AI digest writer for changethegame, a collaborative platform for changemakers, creators, and impact builders. Generate a warm, personalized digest email for users about their journey on the platform. 

Your output must be a JSON object with this structure:
{
  "subject": "email subject line (max 60 chars, warm and personal)",
  "greeting": "personalized greeting (1 sentence)",
  "journey_summary": "2-3 sentences summarizing their recent activity and progress",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "suggested_paths": [
    {"title": "path title", "description": "why this is relevant", "link": "/relative-url"},
    {"title": "path title", "description": "why this is relevant", "link": "/relative-url"}
  ],
  "motivation": "1-2 sentences of encouragement based on their journey"
}

Rules:
- Be warm but not cheesy. Use the user's name naturally.
- Suggested paths should be actionable: explore quests, join guilds, start a service, complete a course, etc.
- Use real platform links: /quests, /guilds, /services, /courses, /explore, /network
- If user has low activity, gently encourage exploration rather than highlighting inactivity.
- Highlights should be concrete: "You earned 45 XP", "Your guild Solar Builders had 3 new posts"
- Keep everything concise. This is a digest, not a novel.
- ONLY output valid JSON, nothing else.`,
              },
              {
                role: "user",
                content: `Generate a digest for this user:\n${JSON.stringify(userContext, null, 2)}`,
              },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error for ${userId}:`, aiResponse.status, errText);
          // Fallback: create basic digest without AI
          await createFallbackDigest(supabase, userId, profile, userContext);
          results.push({ userId, status: "fallback" });
          continue;
        }

        const aiData = await aiResponse.json();
        const rawContent = aiData.choices?.[0]?.message?.content ?? "";
        
        let digest;
        try {
          // Strip markdown code fences if present
          const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          digest = JSON.parse(cleaned);
        } catch {
          console.error(`Failed to parse AI digest for ${userId}:`, rawContent.slice(0, 200));
          await createFallbackDigest(supabase, userId, profile, userContext);
          results.push({ userId, status: "fallback-parse" });
          continue;
        }

        // Create in-app notification
        const highlightsText = (digest.highlights ?? []).join(" • ");
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "AI_JOURNEY_DIGEST",
          title: digest.subject ?? "Your journey digest",
          body: digest.journey_summary ?? highlightsText ?? "Check out what's new for you.",
          deep_link_url: "/explore",
          is_read: false,
          metadata: {
            suggested_paths: digest.suggested_paths,
            highlights: digest.highlights,
            motivation: digest.motivation,
          },
        });

        // Send email via Resend
        if (pref.channel_email_enabled && profile.email) {
          const emailHtml = buildDigestEmailHtml(digest, profile.name);
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
                  subject: digest.subject ?? `Your ${userContext.period} digest`,
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
          } else {
            console.warn("RESEND_API_KEY not set — skipping digest email");
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
  const body = `Hey ${profile.name}! Over ${ctx.period}, you gained ${ctx.stats.xpGained} XP, created ${ctx.stats.postsCreated} posts, and your network had ${ctx.stats.networkUpdates} updates. Keep exploring!`;
  await supabase.from("notifications").insert({
    user_id: userId,
    type: "AI_JOURNEY_DIGEST",
    title: `Your ${ctx.period} digest`,
    body,
    deep_link_url: "/explore",
    is_read: false,
  });
  await supabase
    .from("notification_preferences")
    .update({ last_digest_sent_at: new Date().toISOString() })
    .eq("user_id", userId);
}

function buildDigestEmailHtml(digest: any, userName: string): string {
  const highlights = (digest.highlights ?? [])
    .map((h: string) => `<li style="margin-bottom: 8px;">${h}</li>`)
    .join("");

  const paths = (digest.suggested_paths ?? [])
    .map((p: any) => `
      <div style="margin-bottom: 12px; padding: 12px 16px; background: #f9f6f0; border-radius: 8px; border-left: 3px solid #c4a97d;">
        <p style="font-weight: 600; margin: 0 0 4px;">${p.title}</p>
        <p style="font-size: 14px; color: #666; margin: 0;">${p.description}</p>
      </div>`)
    .join("");

  return `
<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #2d2d2d;">
  <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #8b7355; margin-bottom: 24px;">changethegame</p>
  
  <h2 style="font-size: 22px; font-weight: normal; margin-bottom: 8px;">${digest.greeting ?? `Hey ${userName}!`}</h2>
  
  <p style="line-height: 1.6;">${digest.journey_summary ?? ""}</p>
  
  ${highlights ? `
  <h3 style="font-size: 16px; margin-top: 24px; margin-bottom: 12px;">✨ Highlights</h3>
  <ul style="padding-left: 20px; line-height: 1.8;">${highlights}</ul>` : ""}
  
  ${paths ? `
  <h3 style="font-size: 16px; margin-top: 24px; margin-bottom: 12px;">🧭 Suggested next steps</h3>
  ${paths}` : ""}
  
  <p style="margin-top: 24px; font-style: italic; color: #6b5b3e;">${digest.motivation ?? ""}</p>
  
  <hr style="border: none; border-top: 1px solid #e5ddd0; margin: 32px 0 16px;" />
  <p style="font-size: 13px; color: #8b7355;">You're receiving this because you opted into journey digests. You can change this in your settings.</p>
</div>`;
}
