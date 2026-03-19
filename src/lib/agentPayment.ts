import { supabase } from "@/integrations/supabase/client";

interface PaymentResult {
  success: boolean;
  error?: string;
  coin_value: number;
  credits_used: number;
  coins_used: number;
  creator_share: number;
  platform_share: number;
}

/**
 * Process agent payment using the database function.
 * Credits are consumed first, then coins. Everything is normalized to coin value.
 */
export async function processAgentPayment(
  userId: string,
  amount: number,
  agentId: string,
  type: "hire" | "usage"
): Promise<PaymentResult> {
  if (amount <= 0) {
    return { success: true, coin_value: 0, credits_used: 0, coins_used: 0, creator_share: 0, platform_share: 0 };
  }

  const { data, error } = await supabase.rpc("process_agent_payment", {
    p_user_id: userId,
    p_amount: amount,
    p_agent_id: agentId,
    p_type: type,
  });

  if (error) {
    return { success: false, error: error.message, coin_value: 0, credits_used: 0, coins_used: 0, creator_share: 0, platform_share: 0 };
  }

  const result = data as any;
  if (!result?.success) {
    return { success: false, error: result?.error || "Payment failed", coin_value: 0, credits_used: 0, coins_used: 0, creator_share: 0, platform_share: 0 };
  }

  return {
    success: true,
    coin_value: result.coin_value,
    credits_used: result.credits_used,
    coins_used: result.coins_used,
    creator_share: result.creator_share,
    platform_share: result.platform_share,
  };
}

/**
 * Fetch user's available balance (plan credits + coins)
 */
export async function getUserBalance(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("credits_balance, coins_balance")
    .eq("user_id", userId)
    .single();

  return {
    credits: Number((data as any)?.credits_balance ?? 0),
    coins: Number((data as any)?.coins_balance ?? 0),
    total: Number((data as any)?.credits_balance ?? 0) + Number((data as any)?.coins_balance ?? 0),
  };
}
