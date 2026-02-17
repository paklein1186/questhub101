import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GUILD_ID = "662223e6-952d-4e9f-ae54-3eb922472673";
const BOT_NAME = "Hermes";
const BOT_LABEL = `🏛️ ${BOT_NAME} — Weekly Digest`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find the guild admin to post as
    const { data: adminMember } = await supabase
      .from("guild_members")
      .select("user_id")
      .eq("guild_id", GUILD_ID)
      .eq("role", "ADMIN")
      .limit(1)
      .single();

    if (!adminMember) {
      throw new Error("No admin found for Changethegame guild");
    }

    const botUserId = adminMember.user_id;

    // Fetch posts from the last 7 days in this guild
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: recentPosts, error: postsError } = await supabase
      .from("feed_posts")
      .select("id, content, author_user_id, created_at, upvote_count")
      .eq("context_type", "GUILD")
      .eq("context_id", GUILD_ID)
      .eq("is_deleted", false)
      .gte("created_at", oneWeekAgo.toISOString())
      .order("created_at", { ascending: false });

    if (postsError) throw postsError;

    if (!recentPosts || recentPosts.length === 0) {
      console.log("No posts in the last 7 days, skipping report.");
      return new Response(
        JSON.stringify({ ok: true, message: "No posts this week, skipping." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch author names
    const authorIds = [...new Set(recentPosts.map((p) => p.author_user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name")
      .in("user_id", authorIds);

    const nameMap: Record<string, string> = {};
    for (const p of profiles || []) {
      nameMap[p.user_id] = p.name || "Anonymous";
    }

    // Build context for AI
    const postsSummary = recentPosts
      .map(
        (p, i) =>
          `Post ${i + 1} by ${nameMap[p.author_user_id] || "Unknown"} (${p.upvote_count} upvotes, ${new Date(p.created_at).toLocaleDateString()}):\n${(p.content || "").slice(0, 500)}`
      )
      .join("\n\n---\n\n");

    const systemPrompt = `You are "${BOT_NAME}", a divine messenger bot named after the Greek god of communication. You serve the Changethegame community guild as its weekly herald. Your role is to produce a concise, engaging weekly digest post that highlights new features, platform updates, discussions, and notable activity from the guild's posts over the past week.

Guidelines:
- Open with a brief, mythological-flavored greeting and the date range covered (e.g. "Greetings, Gamechangers! Here is your weekly scroll…")
- Group related updates into themed sections with emoji headers
- Highlight the most impactful or upvoted items
- Keep the tone warm, community-oriented, and celebratory
- End with an encouraging note for the community
- Keep total length under 600 words
- Use markdown-style formatting (bold, bullet points) for readability
- Do NOT invent features or changes not mentioned in the posts`;

    const userPrompt = `Here are the ${recentPosts.length} posts from the Changethegame guild this past week:\n\n${postsSummary}\n\nPlease create the weekly report digest.`;

    // Call AI
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reportContent =
      aiData.choices?.[0]?.message?.content || "Weekly report could not be generated.";

    // Post the report as a guild feed post
    const { error: insertError } = await supabase.from("feed_posts").insert({
      author_user_id: botUserId,
      content: `${BOT_LABEL}\n\n${reportContent}`,
      context_type: "GUILD",
      context_id: GUILD_ID,
      visibility: "PUBLIC",
    });

    if (insertError) throw insertError;

    console.log("Weekly report posted successfully.");

    return new Response(
      JSON.stringify({ ok: true, message: "Weekly report posted." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("changethegame-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
