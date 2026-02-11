/**
 * Persona-adaptive label system.
 * Returns different labels depending on the user's persona type.
 * Underlying models (Service, Guild, Quest) are never changed — only display text.
 */

export type PersonaType = "IMPACT" | "CREATIVE" | "HYBRID" | "UNSET";
export type LexiconMode = "IMPACT" | "CREATIVE" | "HYBRID" | "NEUTRAL";

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
    HYBRID: "Services / Sessions",
    DEFAULT: "Services",
  },
  "service.label_plural": {
    IMPACT: "Services",
    CREATIVE: "Skill Sessions",
    HYBRID: "Services / Sessions",
    DEFAULT: "Services",
  },
  "service.label_singular": {
    IMPACT: "Service",
    CREATIVE: "Skill Session",
    HYBRID: "Service",
    DEFAULT: "Service",
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
    CREATIVE: "Circles / Studios",
    HYBRID: "Guilds",
    DEFAULT: "Guilds",
  },
  "guild.label_singular": {
    IMPACT: "Guild",
    CREATIVE: "Circle",
    HYBRID: "Guild",
    DEFAULT: "Guild",
  },

  // ── Quests ──
  "quest.label": {
    IMPACT: "Missions",
    CREATIVE: "Creations",
    HYBRID: "Quests",
    DEFAULT: "Quests",
  },
  "quest.label_singular": {
    IMPACT: "Mission",
    CREATIVE: "Creation",
    HYBRID: "Quest",
    DEFAULT: "Quest",
  },

  // ── Pods ──
  "pod.label": {
    IMPACT: "Pods",
    CREATIVE: "Ensembles",
    HYBRID: "Teams",
    DEFAULT: "Pods",
  },
  "pod.label_singular": {
    IMPACT: "Pod",
    CREATIVE: "Ensemble",
    HYBRID: "Team",
    DEFAULT: "Pod",
  },

  // ── XP ──
  "xp.label": {
    IMPACT: "XP",
    CREATIVE: "Resonance",
    HYBRID: "Impact Points",
    DEFAULT: "XP",
  },
  "xp.label_long": {
    IMPACT: "Experience Points",
    CREATIVE: "Resonance",
    HYBRID: "Impact Points",
    DEFAULT: "Experience Points",
  },

  // ── Credits ──
  "credits.label": {
    IMPACT: "Credits",
    CREATIVE: "Sparks",
    HYBRID: "Tokens",
    DEFAULT: "Credits",
  },

  // ── Feed ──
  "feed.label": {
    IMPACT: "Feed",
    CREATIVE: "The Flow",
    HYBRID: "Stream",
    DEFAULT: "Feed",
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
    CREATIVE: "Practice",
    HYBRID: "Work",
    DEFAULT: "Work",
  },
  "nav.services_tab": {
    IMPACT: "Services & Availability",
    CREATIVE: "Skill Sessions & Availability",
    HYBRID: "Services & Availability",
    DEFAULT: "Services & Availability",
  },

  // ── Territories ──
  "territory.label": {
    IMPACT: "Territories",
    CREATIVE: "Places of Resonance",
    HYBRID: "Territories",
    DEFAULT: "Territories",
  },
  "territory.label_singular": {
    IMPACT: "Territory",
    CREATIVE: "Place of Resonance",
    HYBRID: "Territory",
    DEFAULT: "Territory",
  },

  // ── Topics ──
  "topics.label": {
    IMPACT: "Topics",
    CREATIVE: "Topics",
    HYBRID: "Topics",
    DEFAULT: "Topics",
  },

  // ── Explore ──
  "nav.explore": {
    IMPACT: "Explore",
    CREATIVE: "Wander",
    HYBRID: "Explore",
    DEFAULT: "Explore",
  },

  // ── Dashboard / Work ──
  "nav.dashboard": {
    IMPACT: "Dashboard",
    CREATIVE: "Studio Desk",
    HYBRID: "Dashboard",
    DEFAULT: "Dashboard",
  },

  // ── Traditional Organizations ──
  "company.label": {
    IMPACT: "Traditional Organizations",
    CREATIVE: "Traditional Organizations",
    HYBRID: "Traditional Organizations",
    DEFAULT: "Traditional Organizations",
  },
  "company.label_singular": {
    IMPACT: "Traditional Organization",
    CREATIVE: "Traditional Organization",
    HYBRID: "Traditional Organization",
    DEFAULT: "Traditional Organization",
  },
  "company.my_label": {
    IMPACT: "My Traditional Organizations",
    CREATIVE: "My Traditional Organizations",
    HYBRID: "My Traditional Organizations",
    DEFAULT: "My Traditional Organizations",
  },
  "company.create_button": {
    IMPACT: "Create a Traditional Organization",
    CREATIVE: "Create a Traditional Organization",
    HYBRID: "Create a Traditional Organization",
    DEFAULT: "Create a Traditional Organization",
  },

  // ── Courses ──
  "course.label": {
    IMPACT: "Courses",
    CREATIVE: "Courses",
    HYBRID: "Courses",
    DEFAULT: "Courses",
  },

  // ── Hero prompts ──
  "hero.tagline": {
    IMPACT: "Tell me what impact you want to make — I'll guide you.",
    CREATIVE: "Tell me what you want to create — I'll guide you.",
    HYBRID: "Tell me what you want to accomplish — I'll guide you.",
    DEFAULT: "Tell me what you want to accomplish — I'll guide you.",
  },

  // ── Landing hero ──
  "landing.headline": {
    IMPACT: "Human-powered. AI-augmented. Game-changing.",
    CREATIVE: "Where creators gather to rewrite the world.",
    HYBRID: "Human-powered. AI-augmented. Game-changing.",
    DEFAULT: "Human-powered. AI-augmented. Game-changing.",
  },
  "landing.subline": {
    IMPACT: "Discover missions, join guilds, and share your expertise in a regenerative ecosystem built for changemakers.",
    CREATIVE: "Start a creative quest, join a circle, and let AI muses help your imagination bloom.",
    HYBRID: "Discover quests, join groups, and share your expertise in a regenerative ecosystem built for changemakers.",
    DEFAULT: "Discover quests, join communities, and share your expertise in a regenerative ecosystem built for changemakers.",
  },
  "landing.cta_primary": {
    IMPACT: "Join as a Gamechanger",
    CREATIVE: "Start a Creative Quest",
    HYBRID: "Join as a Gamechanger",
    DEFAULT: "Join as a Gamechanger",
  },
  "landing.cta_secondary": {
    IMPACT: "Join as an Ecosystem Builder",
    CREATIVE: "Explore Creators",
    HYBRID: "Join as an Ecosystem Builder",
    DEFAULT: "Join as an Ecosystem Builder",
  },

  // ── Home sections ──
  "home.quests_section": {
    IMPACT: "Featured Missions",
    CREATIVE: "Creative quests for you",
    HYBRID: "Featured Quests",
    DEFAULT: "Featured Quests",
  },
  "home.guilds_section": {
    IMPACT: "Guilds to join",
    CREATIVE: "Circles you might join",
    HYBRID: "Guilds to join",
    DEFAULT: "Guilds to join",
  },
  "home.pods_section": {
    IMPACT: "Pods for you",
    CREATIVE: "Ensembles for you",
    HYBRID: "Teams for you",
    DEFAULT: "Pods for you",
  },
  "home.services_section": {
    IMPACT: "Services",
    CREATIVE: "Skill sessions & workshops",
    HYBRID: "Services",
    DEFAULT: "Services",
  },
  "home.territories_section": {
    IMPACT: "In Your Territories",
    CREATIVE: "Places of Resonance",
    HYBRID: "In Your Territories",
    DEFAULT: "In Your Territories",
  },
};

/**
 * Map a LexiconMode to the internal key used for label lookup.
 * "NEUTRAL" maps to DEFAULT.
 */
function resolveMode(mode: LexiconMode | PersonaType): "IMPACT" | "CREATIVE" | "HYBRID" | "DEFAULT" {
  if (mode === "NEUTRAL" || mode === "UNSET") return "DEFAULT";
  return mode;
}

/**
 * Get an adaptive label for the given key based on persona type.
 * Falls back to HYBRID → DEFAULT if persona-specific variant is missing.
 */
export function getLabel(key: string, persona: PersonaType | LexiconMode = "UNSET"): string {
  const entry = LABELS[key];
  if (!entry) return key; // safety fallback
  const resolved = resolveMode(persona);
  return entry[resolved] || entry.DEFAULT;
}

/** Persona-specific prompt affirmations for the HeroAI */
export function getHeroPrompts(persona: PersonaType): string[] {
  if (persona === "IMPACT") {
    return [
      "I want to join a mission that matters",
      "I'm ready to share my expertise as a service",
      "Show me guilds driving regeneration",
      "Help me grow my impact this week",
    ];
  }
  if (persona === "CREATIVE") {
    return [
      "I'm ready to start a new creation",
      "I want to offer a skill session",
      "Connect me with a circle to co-create",
      "Show me upcoming creative gatherings",
    ];
  }
  // HYBRID / UNSET
  return [
    "I want to discover quests I can join",
    "I'm ready to offer my skills as a service",
    "Show me groups and communities to join",
    "Help me find collaborators in my territory",
  ];
}

// ── Houses of Art ──────────────────────────────────────────────
// When persona is CREATIVE, Houses (topics) display with creative names.
// This maps a topic slug or name to a creative alternative.

export interface HouseOfArt {
  creativeLabel: string;
  description: string;
  museName: string;
  museDescription: string;
  icon: string; // emoji for lightweight rendering
}

export const HOUSES_OF_ART: Record<string, HouseOfArt> = {
  "house-of-light": {
    creativeLabel: "House of Light",
    description: "Visual arts — painting, illustration, photography, film",
    museName: "The Prism",
    museDescription: "Visual, colorful, metaphorical. Speaks in imagery and aesthetics.",
    icon: "🎨",
  },
  "house-of-sound": {
    creativeLabel: "House of Sound",
    description: "Musical arts — composition, performance, soundscapes",
    museName: "The Echo",
    museDescription: "Rhythmic, harmonic, sound-based. Thinks in patterns and resonance.",
    icon: "🎵",
  },
  "house-of-story": {
    creativeLabel: "House of Story",
    description: "Writing, narrative, dramaturgy, mythology",
    museName: "The Storykeeper",
    museDescription: "Narrative, mythic. Weaves meaning through arcs and characters.",
    icon: "📖",
  },
  "house-of-movement": {
    creativeLabel: "House of Movement",
    description: "Dance, performance, theatre, body-based arts",
    museName: "The Mover",
    museDescription: "Embodied, flow-based. Thinks through gesture and presence.",
    icon: "💃",
  },
  "house-of-form": {
    creativeLabel: "House of Form",
    description: "Design, craft, sculpture, architecture",
    museName: "The Shaper",
    museDescription: "Structural, constructive. Builds meaning through form and function.",
    icon: "🏗️",
  },
  "house-of-nature": {
    creativeLabel: "House of Nature",
    description: "Eco-art, land art, nature-inspired creation",
    museName: "The Green One",
    museDescription: "Ecological, grounded, regenerative. Rooted in living systems.",
    icon: "🌿",
  },
  "house-of-ritual": {
    creativeLabel: "House of Ritual",
    description: "Facilitation, ceremonies, immersive experiences",
    museName: "The Threshold",
    museDescription: "Liminal, experiential, ceremonial. Holds space for transformation.",
    icon: "🔮",
  },
};

/** All creative House keys for the onboarding selection */
export const CREATIVE_HOUSE_KEYS = Object.keys(HOUSES_OF_ART);

/**
 * Given a topic name, try to find a creative House of Art mapping.
 * Returns the creative label if found, otherwise the original name.
 */
export function getCreativeHouseLabel(topicName: string, persona: PersonaType): string {
  if (persona !== "CREATIVE") return topicName;
  const slug = topicName.toLowerCase().replace(/\s+/g, "-");
  const house = HOUSES_OF_ART[slug];
  return house ? house.creativeLabel : topicName;
}

/**
 * Get the Muse info for a given set of topic names/slugs.
 * Returns the dominant Muse (first match) or null.
 */
export function getMuseForTopics(topicNames: string[]): HouseOfArt | null {
  for (const name of topicNames) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    if (HOUSES_OF_ART[slug]) return HOUSES_OF_ART[slug];
  }
  return null;
}

// ── Creative onboarding options ──────────────────────────────
export const CREATIVE_INTENTION_OPTIONS = [
  { key: "make", label: "I want to make something new", icon: "🎨", desc: "Bring an idea into the world" },
  { key: "write", label: "I want to write / compose / explore ideas", icon: "✍️", desc: "Words, music, concepts" },
  { key: "experiment", label: "I want to experiment and see what happens", icon: "🧪", desc: "Play, explore, discover" },
  { key: "collab", label: "I want to create with others", icon: "🤝", desc: "Collaborative creativity" },
  { key: "inspire", label: "I'm looking for inspiration", icon: "✨", desc: "Feed the creative fire" },
  { key: "unsure", label: "I'm not sure yet, guide me", icon: "🧭", desc: "Let's figure it out together" },
];

export const CREATIVE_BIO_SUGGESTIONS = [
  "I weave stories between people and places.",
  "I make invisible worlds visible.",
  "I follow curiosity until it becomes form.",
];

/** Available world/lexicon modes for the toggle */
export const LEXICON_MODES: { value: LexiconMode; label: string; description: string }[] = [
  { value: "IMPACT", label: "Impact World", description: "Guilds, Missions, Services, XP" },
  { value: "CREATIVE", label: "Creative World", description: "Circles, Creations, Skill Sessions, Resonance" },
  { value: "HYBRID", label: "Hybrid World", description: "Groups, Quests, Services, Impact Points" },
  { value: "NEUTRAL", label: "Neutral Mode", description: "Groups, Quests, Services, XP" },
];