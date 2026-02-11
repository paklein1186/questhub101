import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { PersonaType } from "@/lib/personaLabels";

interface Props {
  userName: string;
  persona: PersonaType;
}

export function PersonaGreeting({ userName, persona }: Props) {
  const { t } = useTranslation();

  const getGreeting = () => {
    const name = userName;
    switch (persona) {
      case "CREATIVE":
        return t("home.welcomeCreative", { name });
      case "IMPACT":
        return t("home.welcomeImpact", { name });
      case "HYBRID":
        return t("home.welcomeHybrid", { name });
      default:
        return t("home.welcome");
    }
  };

  return (
    <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="font-display text-xl sm:text-2xl md:text-3xl font-bold">
      {getGreeting()}
    </motion.h1>
  );
}
