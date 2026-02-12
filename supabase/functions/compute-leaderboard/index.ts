import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Authentication & Admin check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller's identity
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasAdmin = (roles || []).some((r: any) => ["admin", "superadmin"].includes(r.role));
    if (!hasAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Existing computation logic ---
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    const { data: profiles } = await supabase.from("profiles").select("user_id").limit(1000);
    const userIds = (profiles ?? []).map((p: any) => p.user_id);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, computed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [
      { data: postUpvotes },
      { data: commentUpvotes },
      { data: quests },
      { data: questUpdates },
      { data: services },
      { data: courses },
      { data: questParticipants },
      { data: podMembers },
      { data: comments },
      { data: guildMembers },
      { data: feedPosts },
      { data: bookings },
      { data: follows },
      { data: starredExcerpts },
    ] = await Promise.all([
      supabase.from("post_upvotes").select("id, post_id, created_at").limit(5000),
      supabase.from("comment_upvotes").select("id, comment_id, created_at, user_id").limit(5000),
      supabase.from("quests").select("id, created_by_user_id, created_at, guild_id").eq("is_deleted", false).limit(2000),
      supabase.from("quest_updates").select("id, author_id, created_at, quest_id").eq("is_deleted", false).limit(5000),
      supabase.from("services").select("id, owner_user_id, created_at").limit(2000),
      supabase.from("courses").select("id, owner_user_id, created_at, is_published").eq("is_deleted", false).limit(2000),
      supabase.from("quest_participants").select("id, user_id, quest_id, created_at").limit(5000),
      supabase.from("pod_members").select("id, user_id, pod_id, joined_at").limit(5000),
      supabase.from("comments").select("id, author_id, target_type, target_id, created_at").eq("is_deleted", false).limit(10000),
      supabase.from("guild_members").select("id, user_id, guild_id, role, joined_at").limit(5000),
      supabase.from("feed_posts").select("id, author_user_id, context_type, context_id, created_at, upvote_count").eq("is_deleted", false).limit(10000),
      supabase.from("bookings").select("id, provider_user_id, requester_id, created_at, status").eq("is_deleted", false).limit(5000),
      supabase.from("follows").select("id, follower_id, target_id, target_type, created_at").limit(10000),
      supabase.from("starred_excerpts").select("id, user_id, created_at").limit(5000),
    ]);

    const postAuthorMap = new Map<string, string>();
    for (const p of feedPosts ?? []) postAuthorMap.set(p.id, p.author_user_id);

    const commentAuthorMap = new Map<string, string>();
    for (const c of comments ?? []) commentAuthorMap.set(c.id, c.author_id);

    const inScope = (dateStr: string, scope: string) => {
      if (scope === "ALL_TIME") return true;
      const cutoff = scope === "WEEKLY" ? weekAgo : monthAgo;
      return dateStr >= cutoff;
    };

    const scopes = ["WEEKLY", "MONTHLY", "ALL_TIME"] as const;
    const rows: any[] = [];

    for (const userId of userIds) {
      for (const scope of scopes) {
        let postUpvotesReceived = 0;
        for (const pu of postUpvotes ?? []) {
          if (inScope(pu.created_at, scope) && postAuthorMap.get(pu.post_id) === userId) postUpvotesReceived++;
        }
        let commentUpvotesReceived = 0;
        for (const cu of commentUpvotes ?? []) {
          if (inScope(cu.created_at, scope) && commentAuthorMap.get(cu.comment_id) === userId) commentUpvotesReceived++;
        }
        const helpfulScore = postUpvotesReceived + Math.round(commentUpvotesReceived * 0.7);

        const questsCreated = (quests ?? []).filter(q => q.created_by_user_id === userId && inScope(q.created_at, scope)).length;
        const updatesCreated = (questUpdates ?? []).filter(u => u.author_id === userId && inScope(u.created_at, scope)).length;
        const servicesCreated = (services ?? []).filter(s => s.owner_user_id === userId && inScope(s.created_at, scope)).length;
        const coursesCreated = (courses ?? []).filter(c => c.owner_user_id === userId && inScope(c.created_at, scope) && c.is_published).length;
        const creatorScore = questsCreated * 3 + updatesCreated * 1 + servicesCreated * 2 + coursesCreated * 2;

        const joinedQuests = (questParticipants ?? []).filter(p => p.user_id === userId && inScope(p.created_at, scope)).length;
        const activePods = (podMembers ?? []).filter(p => p.user_id === userId && inScope(p.joined_at, scope)).length;
        const commentsOnOthers = (comments ?? []).filter(c => c.author_id === userId && inScope(c.created_at, scope)).length;
        const collaboratorScore = joinedQuests * 2 + activePods * 2 + commentsOnOthers;

        const territoryPosts = (feedPosts ?? []).filter(p => p.author_user_id === userId && p.context_type === "TERRITORY" && inScope(p.created_at, scope)).length;
        const territoryScore = territoryPosts * 2;

        const completedBookings = (bookings ?? []).filter(b => b.provider_user_id === userId && inScope(b.created_at, scope) && b.status === "COMPLETED").length;
        const mentorScore = completedBookings * 2 + coursesCreated * 3;

        const adminGuilds = (guildMembers ?? []).filter(gm => gm.user_id === userId && ["admin", "steward", "owner"].includes(gm.role));
        const adminGuildIds = new Set(adminGuilds.map(g => g.guild_id));
        const guildPostsCount = (feedPosts ?? []).filter(p => p.context_type === "GUILD" && p.context_id && adminGuildIds.has(p.context_id) && inScope(p.created_at, scope)).length;
        const guildNewMembersCount = (guildMembers ?? []).filter(gm => adminGuildIds.has(gm.guild_id) && gm.user_id !== userId && inScope(gm.joined_at, scope)).length;
        const guildScore = adminGuilds.length * 2 + guildPostsCount + guildNewMembersCount * 2;

        const newFollowers = (follows ?? []).filter(f => f.target_type === "USER" && f.target_id === userId && inScope(f.created_at, scope)).length;
        const newUpvotes = postUpvotesReceived + commentUpvotesReceived;
        const risingScore = newUpvotes + newFollowers * 2;

        const starredCount = (starredExcerpts ?? []).filter(s => s.user_id === userId && inScope(s.created_at, scope)).length;
        const aiScore = starredCount;

        rows.push({
          user_id: userId,
          time_scope: scope,
          period_start: scope === "WEEKLY" ? weekAgo : scope === "MONTHLY" ? monthAgo : null,
          helpful_score: helpfulScore,
          creator_score: creatorScore,
          collaborator_score: collaboratorScore,
          territory_score: territoryScore,
          mentor_score: mentorScore,
          guild_score: guildScore,
          rising_score: risingScore,
          ai_score: aiScore,
          xp_gained: 0,
          followers_gained: newFollowers,
          updated_at: now.toISOString(),
        });
      }
    }

    const { error } = await supabase
      .from("leaderboard_scores")
      .upsert(rows, { onConflict: "user_id,time_scope" });

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, computed: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
