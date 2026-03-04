export interface PathConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  forWho: string;
  steps: number;
}

export const PATHS: PathConfig[] = [
  {
    id: "explorer",
    name: "The Explorer",
    icon: "🌱",
    description: "Discover CTG, build your profile, find your territory and guild",
    forWho: "New to the platform",
    steps: 6,
  },
  {
    id: "mapper",
    name: "The Mapper",
    icon: "🗺️",
    description: "Document your territory, monitor natural systems, map the land",
    forWho: "You care about a specific place",
    steps: 6,
  },
  {
    id: "builder",
    name: "The Builder",
    icon: "🏗️",
    description: "Create or strengthen guilds, collaborate on shared missions",
    forWho: "You want to build community",
    steps: 6,
  },
  {
    id: "quester",
    name: "The Quester",
    icon: "⚔️",
    description: "Take action, complete missions, earn XP through tangible impact",
    forWho: "You want to DO things",
    steps: 6,
  },
  {
    id: "weaver",
    name: "The Weaver",
    icon: "🕸️",
    description: "Understand and shape the economic flows, OVN, and value networks",
    forWho: "You think in systems and value",
    steps: 6,
  },
  {
    id: "steward",
    name: "The Steward",
    icon: "🌳",
    description: "Lead with service, govern with consent, mentor others",
    forWho: "You want to lead and guide",
    steps: 6,
  },
];
