import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PlusCircle, Briefcase, Shield, Hash, Compass, Users,
  Handshake, Sparkles, Eye,
} from "lucide-react";
import type { PersonaType } from "@/lib/personaLabels";

interface ActionItem {
  label: string;
  icon: any;
  route: string;
}

const ACTIONS: Record<PersonaType, ActionItem[]> = {
  CREATIVE: [
    { label: "Start a new Creation", icon: PlusCircle, route: "/quests/new" },
    { label: "Offer a Skill Session", icon: Briefcase, route: "/services/new" },
    { label: "Join a Circle or Studio", icon: Shield, route: "/explore?tab=guilds" },
    { label: "Explore your Houses", icon: Hash, route: "/explore/houses" },
    { label: "See inspirations from your circles", icon: Sparkles, route: "/network" },
  ],
  IMPACT: [
    { label: "Start a Mission", icon: PlusCircle, route: "/quests/new" },
    { label: "Post a Service", icon: Briefcase, route: "/services/new" },
    { label: "Join a Guild", icon: Shield, route: "/explore?tab=guilds" },
    { label: "Review partnership requests", icon: Handshake, route: "/work" },
    { label: "Explore opportunities in your territories", icon: Compass, route: "/explore" },
  ],
  HYBRID: [
    { label: "Start a Quest", icon: PlusCircle, route: "/quests/new" },
    { label: "Share an Offering", icon: Briefcase, route: "/services/new" },
    { label: "Join a Circle or Guild", icon: Shield, route: "/explore?tab=guilds" },
    { label: "Check collaborations in progress", icon: Users, route: "/work" },
    { label: "Explore your hybrid Houses", icon: Hash, route: "/explore/houses" },
  ],
  UNSET: [
    { label: "Start a Quest", icon: PlusCircle, route: "/quests/new" },
    { label: "Offer a Service", icon: Briefcase, route: "/services/new" },
    { label: "Join a Community", icon: Shield, route: "/explore?tab=guilds" },
    { label: "Explore", icon: Eye, route: "/explore" },
  ],
};

interface Props {
  persona: PersonaType;
}

export function ContextualActions({ persona }: Props) {
  const actions = ACTIONS[persona];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <motion.div key={action.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}>
            <Link to={action.route}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:border-primary/30 hover:shadow-sm transition-all group">
              <Icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              {action.label}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
