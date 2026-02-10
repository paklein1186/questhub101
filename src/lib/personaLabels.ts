/**
 * Persona-adaptive label system.
 * Returns different labels depending on the user's persona type.
 * Underlying models (Service, Guild, Quest) are never changed — only display text.
 */

export type PersonaType = "IMPACT" | "CREATIVE" | "HYBRID" | "UNSET";

type LabelVariants = {
  IMPACT: string;
  CREATIVE: string;
  HYBRID: string;
  DEFAULT: string;
};

const LABELS: Record<string, LabelVariants> = {
  // ── Services ──
  "service.label": {
    IMPACT: "Services",
    CREATIVE: "Skill Sessions",
    HYBRID: "Services",
    DEFAULT: "Services",
  },
  "service.label_plural": {
    IMPACT: "Services",
    CREATIVE: "Skill Sessions",
    HYBRID: "Services",
    DEFAULT: "Services",
  },
  "service.create_button": {
    IMPACT: "Create a service",
    CREATIVE: "Offer a skill session",
    HYBRID: "Create a service",
    DEFAULT: "Create a service",
  },
  "service.my_label": {
    IMPACT: "My Services",
    CREATIVE: "My Skill Sessions",
    HYBRID: "My Services",
    DEFAULT: "My Services",
  },

  // ── Guilds ──
  "guild.label": {
    IMPACT: "Guilds",
    CREATIVE: "Collectives",
    HYBRID: "Guilds & Collectives",
    DEFAULT: "Guilds",
  },
  "guild.label_singular": {
    IMPACT: "Guild",
    CREATIVE: "Collective",
    HYBRID: "Guild",
    DEFAULT: "Guild",
  },

  // ── Quests ──
  "quest.label": {
    IMPACT: "Quests & Missions",
    CREATIVE: "Quests & Creations",
    HYBRID: "Quests",
    DEFAULT: "Quests",
  },
  "quest.label_singular": {
    IMPACT: "Quest",
    CREATIVE: "Quest",
    HYBRID: "Quest",
    DEFAULT: "Quest",
  },

  // ── Events ──
  "event.label": {
    IMPACT: "Events & Meetings",
    CREATIVE: "Events & Gatherings",
    HYBRID: "Events",
    DEFAULT: "Events",
  },

  // ── Navigation ──
  "nav.work": {
    IMPACT: "Work",
    CREATIVE: "Create",
    HYBRID: "Work",
    DEFAULT: "Work",
  },
  "nav.services_tab": {
    IMPACT: "Services & Availability",
    CREATIVE: "Skill Sessions & Availability",
    HYBRID: "Services & Availability",
    DEFAULT: "Services & Availability",
  },

  // ── Hero prompts ──
  "hero.tagline": {
    IMPACT: "Tell me what impact you want to make — I'll guide you.",
    CREATIVE: "Tell me what you want to create — I'll guide you.",
    HYBRID: "Tell me what you want to accomplish — I'll guide you.",
    DEFAULT: "Tell me what you want to accomplish — I'll guide you.",
  },
};

/**
 * Get an adaptive label for the given key based on persona type.
 * Falls back to HYBRID → DEFAULT if persona-specific variant is missing.
 */
export function getLabel(key: string, persona: PersonaType = "UNSET"): string {
  const entry = LABELS[key];
  if (!entry) return key; // safety fallback
  if (persona === "UNSET") return entry.DEFAULT;
  return entry[persona] || entry.DEFAULT;
}

/** Persona-specific prompt suggestions for the HeroAI */
export function getHeroPrompts(persona: PersonaType): string[] {
  if (persona === "IMPACT") {
    return [
      "Find impact missions or quests to join",
      "Offer my expertise as a service",
      "Connect with a guild working on regeneration",
      "How can I earn more XP this week?",
    ];
  }
  if (persona === "CREATIVE") {
    return [
      "Start a new creative quest",
      "Offer a skill session (workshop, class)",
      "Find a collective to co-create with",
      "What creative events are coming up?",
    ];
  }
  // HYBRID / UNSET
  return [
    "What are you up to today?",
    "How do you want to spread hope today?",
    "How can I support you?",
    "I'm ready to create a mesmerising world — guide me.",
  ];
}
