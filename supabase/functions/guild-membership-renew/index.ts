import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
};

const log = (step: string, details?: unknown) => {
  console.log(`[GUILD-MEMBERSHIP-RENEW] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const GRACE_DAYS = 7;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const results: Record<string, number> = { renewed: 0, grace: 0, lapsed: 0, cancelled: 0, reminders: 0 };

  try {
    const now = new Date();

    const { data: memberships } = await admin
      .from("user_guild_memberships")
      .select(
        "*, guilds!inner(id, name, billing_model, monthly_fee_credits, monthly_fee_max_credits, enable_membership)",
      )
      .eq("role", "member")
      .in("status", ["active", "grace"])
      .not("current_period_end", "is", null);

    for (const m of (memberships ?? []) as any[]) {
      const guild = m.guilds;
      if (!guild?.enable_membership || guild.billing_model !== "monthly") continue;

      const periodEnd = new Date(m.current_period_end);
      const daysLeft = Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000);

      // Reminders before renewal
      if (daysLeft === 7 || daysLeft === 1) {
        await admin.from("notifications").insert({
          user_id: m.user_id,
          type: "GUILD_MEMBERSHIP_RENEWAL_REMINDER",
          title: "Membership renewal coming up",
          body: `Your membership of ${guild.name} renews in ${daysLeft} day${daysLeft > 1 ? "s" : ""} for ${guild.monthly_fee_credits} Coins.`,
          related_entity_type: "guild",
          related_entity_id: guild.id,
          deep_link_url: `/guilds/${guild.id}`,
        });
        results.reminders++;
        continue;
      }

      if (periodEnd > now) continue;

      // Cancellation requested → drop to guest at period end
      if (m.cancel_at_period_end) {
        await admin
          .from("user_guild_memberships")
          .update({ role: "guest", status: "cancelled" })
          .eq("id", m.id);
        results.cancelled++;
        continue;
      }

      const fee = Number(guild.monthly_fee_credits ?? 0);
      const { data: profile } = await admin
        .from("profiles")
        .select("coins_balance, name")
        .eq("user_id", m.user_id)
        .maybeSingle();
      const balance = Number(profile?.coins_balance ?? 0);

      if (fee > 0 && balance >= fee) {
        const nextEnd = new Date(periodEnd);
        nextEnd.setMonth(nextEnd.getMonth() + 1);

        await admin.from("profiles").update({ coins_balance: balance - fee }).eq("user_id", m.user_id);
        await admin.from("coin_transactions").insert({
          user_id: m.user_id,
          type: "GUILD_MEMBERSHIP",
          amount: -fee,
          source: `Monthly membership renewal – ${guild.name}`,
          related_entity_type: "guild",
          related_entity_id: guild.id,
        });

        const { data: wallet } = await admin
          .from("guild_wallets")
          .select("id, coins_balance")
          .eq("guild_id", guild.id)
          .maybeSingle();
        if (wallet) {
          await admin
            .from("guild_wallets")
            .update({ coins_balance: Number(wallet.coins_balance ?? 0) + fee })
            .eq("id", wallet.id);
        } else {
          await admin.from("guild_wallets").insert({ guild_id: guild.id, coins_balance: fee });
        }

        await admin.from("guild_credit_transactions").insert({
          guild_id: guild.id,
          user_id: m.user_id,
          amount: fee,
          currency: "coins",
          type: "MEMBERSHIP_RENEWAL",
          source: `${profile?.name ?? "A member"} renewed for ${fee} Coins`,
        });

        await admin
          .from("user_guild_memberships")
          .update({
            status: "active",
            role: "member",
            current_period_end: nextEnd.toISOString(),
            membership_expires_at: nextEnd.toISOString(),
            last_payment_at: now.toISOString(),
          })
          .eq("id", m.id);

        results.renewed++;
        continue;
      }

      // Not enough Coins
      const graceUntil = new Date(periodEnd.getTime() + GRACE_DAYS * 86400000);
      if (m.status !== "grace") {
        await admin.from("user_guild_memberships").update({ status: "grace" }).eq("id", m.id);
        await admin.from("notifications").insert({
          user_id: m.user_id,
          type: "GUILD_MEMBERSHIP_PAYMENT_FAILED",
          title: "Membership renewal needs Coins",
          body: `We could not renew your membership of ${guild.name} (${fee} Coins). You have ${GRACE_DAYS} days to top up.`,
          related_entity_type: "guild",
          related_entity_id: guild.id,
          deep_link_url: `/guilds/${guild.id}`,
        });
        results.grace++;
      } else if (now > graceUntil) {
        await admin
          .from("user_guild_memberships")
          .update({ role: "guest", status: "lapsed" })
          .eq("id", m.id);
        await admin.from("notifications").insert({
          user_id: m.user_id,
          type: "GUILD_MEMBERSHIP_LAPSED",
          title: "Membership lapsed",
          body: `Your membership of ${guild.name} has lapsed. You are now a guest and can rejoin at any time.`,
          related_entity_type: "guild",
          related_entity_id: guild.id,
          deep_link_url: `/guilds/${guild.id}`,
        });
        results.lapsed++;
      }
    }

    log("Done", results);
    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
