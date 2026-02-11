import { motion } from "framer-motion";
import type { PersonaType } from "@/lib/personaLabels";

const GREETINGS: Record<PersonaType, (name: string) => string> = {
  CREATIVE: (name) => `Welcome back, ${name}. What do you want to create or move today?`,
  IMPACT: (name) => `Welcome back, ${name}. What mission or collaboration needs your attention?`,
  HYBRID: (name) => `Welcome back, ${name}. Ready to weave your worlds again?`,
  UNSET: () => "Welcome back!",
};

interface Props {
  userName: string;
  persona: PersonaType;
}

export function PersonaGreeting({ userName, persona }: Props) {
  const greeting = GREETINGS[persona](userName);

  return (
    <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="font-display text-2xl md:text-3xl font-bold">
      {greeting}
    </motion.h1>
  );
}
