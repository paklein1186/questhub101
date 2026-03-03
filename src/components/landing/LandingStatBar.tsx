import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export function LandingStatBar() {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const [quests, guilds, territories, profiles] = await Promise.all([
        supabase.from("quests").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("is_draft", false),
        supabase.from("guilds").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("is_draft", false).eq("is_approved", true),
        supabase.from("territories").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        quests: quests.count ?? 0,
        guilds: guilds.count ?? 0,
        territories: territories.count ?? 0,
        members: profiles.count ?? 0,
      };
    },
    staleTime: 300_000,
  });

  if (!data) return null;

  const stats = [
    { value: data.quests, label: t("landing.stats.quests") },
    { value: data.guilds, label: t("landing.stats.guilds") },
    { value: data.territories, label: t("landing.stats.territories") },
    { value: data.members, label: t("landing.stats.members") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex flex-wrap justify-center gap-6 sm:gap-10 py-4"
    >
      {stats.map((s) => (
        <div key={s.label} className="text-center">
          <p className="text-2xl sm:text-3xl font-bold text-foreground">
            {s.value.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {s.label}
          </p>
        </div>
      ))}
    </motion.div>
  );
}
