import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  titleKey: string;
  subtitleKey: string;
  accentColor?: string;
}

export function LandingServicesSection({ titleKey, subtitleKey, accentColor = "text-primary" }: Props) {
  const { t } = useTranslation();
  const { data: services = [], isLoading } = useQuery<any[]>({
    queryKey: ["landing-featured-services"],
    queryFn: async () => {
      const query = supabase
        .from("services")
        .select("id, title, description, price_amount, price_currency")
        .eq("is_deleted", false)
        .eq("is_published", true);
      const { data } = await query.order("created_at", { ascending: false }).limit(3);
      return (data ?? []) as any[];
    },
    staleTime: 300_000,
  });

  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-2">
          <Briefcase className={`h-5 w-5 ${accentColor}`} />
          <h2 className="text-2xl sm:text-3xl font-display font-bold">{t(titleKey)}</h2>
        </div>
        <p className="text-muted-foreground mb-10">{t(subtitleKey)}</p>

        <div className="grid sm:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          ) : services.length === 0 ? (
            <p className="text-muted-foreground col-span-3 text-center py-8">{t("landing.services.empty")}</p>
          ) : (
            services.map((s: any, i: number) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={`/services/${s.id}`}
                  className="block rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground line-clamp-1">{s.title}</h3>
                    {s.price_amount != null && (
                      <Badge variant="secondary" className="shrink-0">
                        {s.price_amount} {s.price_currency || "€"}
                      </Badge>
                    )}
                  </div>
                  {s.provider?.display_name && (
                    <p className="text-xs text-muted-foreground">{s.provider.display_name}</p>
                  )}
                </Link>
              </motion.div>
            ))
          )}
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" asChild>
            <Link to="/services">
              {t("landing.services.seeAll")} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
