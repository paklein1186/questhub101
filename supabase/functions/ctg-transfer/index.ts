import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function err(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return err(401, "Unauthorized");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return err(401, "Unauthorized");
    const fromUserId = claims.claims.sub as string;

    // Parse body
    const body = await req.json();
    const { to_user_id, amount, note } = body;

    if (!to_user_id || typeof to_user_id !== "string") return err(400, "to_user_id is required");
    if (typeof amount !== "number" || !isFinite(amount)) return err(400, "amount must be a number");
    if (amount <= 0) return err(400, "amount must be positive");
    if (amount > 10000) return err(400, "amount exceeds maximum of 10,000 per transfer");
    if (fromUserId === to_user_id) return err(400, "Cannot transfer to yourself");

    // Service role client for DB ops
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check recipient exists
    const { data: recipient } = await supabase
      .from("profiles")
      .select("user_id, name")
      .eq("user_id", to_user_id)
      .single();

    if (!recipient) return err(404, "Recipient user not found");

    // Get sender name
    const { data: sender } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", fromUserId)
      .single();

    const senderName = sender?.name || "Someone";
    const recipientName = recipient.name || "Someone";

    // Call RPC
    const { data, error: rpcErr } = await supabase.rpc("transfer_ctg", {
      p_from_user_id: fromUserId,
      p_to_user_id: to_user_id,
      p_amount: amount,
      p_note: note || null,
    });

    if (rpcErr) {
      const msg = rpcErr.message || "";
      if (msg.includes("Insufficient")) return err(400, "Insufficient $CTG balance");
      if (msg.includes("yourself")) return err(400, "Cannot transfer to yourself");
      return err(400, msg);
    }

    // Notifications
    await supabase.from("notifications").insert([
      {
        user_id: fromUserId,
        type: "CTG_TRANSFER_SENT",
        title: `You sent ${amount} $CTG to ${recipientName}`,
        message: note || `Transfer of ${amount} $CTG`,
        metadata: { amount, to_user_id, recipient_name: recipientName },
      },
      {
        user_id: to_user_id,
        type: "CTG_TRANSFER_RECEIVED",
        title: `${senderName} sent you ${amount} $CTG`,
        message: note || `Transfer of ${amount} $CTG`,
        metadata: { amount, from_user_id: fromUserId, sender_name: senderName },
      },
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        new_balance: data.new_balance_from,
        transferred_to: recipientName,
        amount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return err(500, e.message || "Internal error");
  }
});
