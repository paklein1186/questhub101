import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { COINS_EUR_RATE_FALLBACK } from "@/lib/xpCreditsConfig";

export function useCoinsRate() {
  const { data } = useQuery({
    queryKey: ["coins-eur-rate"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cooperative_settings")
        .select("value")
        .eq("key", "coins_eur_rate")
        .maybeSingle();
      const raw = (data as any)?.value;
      return typeof raw === "string" ? parseFloat(raw) : typeof raw === "number" ? raw : COINS_EUR_RATE_FALLBACK;
    },
    staleTime: 1000 * 60 * 10,
  });
  const rate = data ?? COINS_EUR_RATE_FALLBACK;
  return {
    rate,
    coinsPerEur: Math.round(1 / rate),
    toEur: (coins: number) => (coins * rate).toFixed(2),
    toCoins: (eur: number) => Math.round(eur / rate),
  };
}
