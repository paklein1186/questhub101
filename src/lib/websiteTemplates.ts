/**
 * Default page & section templates per website owner type.
 * Used when scaffolding a new website in the admin UI.
 */

type SectionDef = {
  type: string;
  title?: string;
  subtitle?: string;
  body_markdown?: string;
  source: "manual" | "auto";
  layout?: string;
  filters?: Record<string, unknown>;
};

type PageDef = {
  slug: string;
  title: string;
  page_type: string;
  sections: SectionDef[];
};

export type WebsiteTemplate = PageDef[];

/* ─── Individual / Studio ─── */
const userTemplate: WebsiteTemplate = [
  {
    slug: "home",
    title: "Home",
    page_type: "home",
    sections: [
      {
        type: "hero",
        title: "",
        subtitle: "",
        body_markdown:
          "Welcome — I help mission-driven organisations design regenerative collaborations.",
        source: "manual",
      },
      {
        type: "services_list",
        title: "What I can help you with",
        source: "auto",
        filters: { itemType: "service", webTags: ["flagship"], publicOnly: true, limit: 3 },
        layout: "grid",
      },
      {
        type: "quests_list",
        title: "Recent projects & quests",
        source: "auto",
        filters: { itemType: "quest", webTags: ["portfolio"], publicOnly: true, limit: 3 },
        layout: "grid",
      },
      {
        type: "guilds_list",
        title: "Ecosystems I steward",
        source: "auto",
        filters: { itemType: "guild", webTags: ["flagship"], publicOnly: true, limit: 3 },
        layout: "list",
      },
      {
        type: "cta",
        title: "Explore the commons",
        body_markdown:
          "Much of this work lives as shared quests, guilds and tools on changethegame. [Visit my profile](https://changethegame.xyz).",
        source: "manual",
      },
    ],
  },
  {
    slug: "about",
    title: "About",
    page_type: "about",
    sections: [
      {
        type: "hero",
        title: "About",
        subtitle: "My story & worldview",
        source: "manual",
      },
      {
        type: "text_block",
        title: "Philosophy & approach",
        body_markdown: "Write about your philosophy and approach here…",
        source: "manual",
      },
      {
        type: "guilds_list",
        title: "Communities I'm part of",
        source: "auto",
        filters: { itemType: "guild", publicOnly: true, limit: 6 },
        layout: "list",
      },
      {
        type: "cta",
        title: "Let's connect",
        body_markdown: "If this resonates, let's talk.",
        source: "manual",
      },
    ],
  },
  {
    slug: "services",
    title: "Services",
    page_type: "services",
    sections: [
      {
        type: "hero",
        title: "Services",
        subtitle: "How we can work together",
        source: "manual",
      },
      {
        type: "services_list",
        title: "Core services",
        source: "auto",
        filters: { itemType: "service", webTags: ["flagship"], publicOnly: true },
        layout: "grid",
      },
      {
        type: "services_list",
        title: "Other ways we can work together",
        source: "auto",
        filters: { itemType: "service", webTags: ["secondary"], publicOnly: true },
        layout: "list",
      },
      {
        type: "cta",
        title: "Ready to explore a collaboration?",
        body_markdown:
          "You can reach out directly or **book some of these services via changethegame**.",
        source: "manual",
      },
    ],
  },
  {
    slug: "projects",
    title: "Projects",
    page_type: "projects",
    sections: [
      {
        type: "hero",
        title: "Projects",
        subtitle: "Portfolio & ongoing quests",
        source: "manual",
      },
      {
        type: "quests_list",
        title: "Case studies & portfolio",
        source: "auto",
        filters: { itemType: "quest", webTags: ["portfolio", "case_study"], publicOnly: true },
        layout: "grid",
      },
      {
        type: "quests_list",
        title: "Ongoing quests",
        source: "auto",
        filters: { itemType: "quest", webTags: ["ongoing"], publicOnly: true },
        layout: "list",
      },
      {
        type: "cta",
        title: "Join a quest",
        body_markdown: "Want to participate? Discover open quests on changethegame.",
        source: "manual",
      },
    ],
  },
  {
    slug: "commons",
    title: "Commons",
    page_type: "community",
    sections: [
      {
        type: "text_block",
        title: "The commons behind my work",
        body_markdown:
          "I use changethegame as a commons platform — a shared space for quests, guilds and regenerative tools.",
        source: "manual",
      },
      {
        type: "guilds_list",
        title: "Guilds & communities",
        source: "auto",
        filters: { itemType: "guild", publicOnly: true },
        layout: "grid",
      },
      {
        type: "quests_list",
        title: "Programs & projects",
        source: "auto",
        filters: { itemType: "quest", webTags: ["program"], publicOnly: true },
        layout: "list",
      },
      {
        type: "cta",
        title: "Explore on changethegame",
        body_markdown: "[Visit changethegame](https://changethegame.xyz)",
        source: "manual",
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    page_type: "contact",
    sections: [
      {
        type: "text_block",
        title: "Get in touch",
        body_markdown: "Describe how people can work with you, email, or social links.",
        source: "manual",
      },
      {
        type: "cta",
        title: "Or contact me on changethegame",
        body_markdown: "You can also book a service or start a quest directly on changethegame.",
        source: "manual",
      },
    ],
  },
];

/* ─── Guild / Organisation ─── */
const guildTemplate: WebsiteTemplate = [
  {
    slug: "home",
    title: "Home",
    page_type: "home",
    sections: [
      { type: "hero", title: "", subtitle: "", body_markdown: "Welcome to our guild.", source: "manual" },
      {
        type: "services_list",
        title: "Programs & services",
        source: "auto",
        filters: { itemType: "service", webTags: ["flagship"], publicOnly: true, limit: 3 },
        layout: "grid",
      },
      {
        type: "quests_list",
        title: "Current quests",
        source: "auto",
        filters: { itemType: "quest", webTags: ["ongoing"], publicOnly: true, limit: 3 },
        layout: "grid",
      },
      {
        type: "cta",
        title: "Join us",
        body_markdown: "Discover how to participate on changethegame.",
        source: "manual",
      },
    ],
  },
  {
    slug: "about",
    title: "About",
    page_type: "about",
    sections: [
      { type: "hero", title: "About", subtitle: "Who we are", source: "manual" },
      { type: "text_block", title: "Our story", body_markdown: "Write your guild's story here…", source: "manual" },
      { type: "cta", title: "Get involved", body_markdown: "Join the guild on changethegame.", source: "manual" },
    ],
  },
  {
    slug: "services",
    title: "Programs & Services",
    page_type: "services",
    sections: [
      { type: "hero", title: "Programs & Services", source: "manual" },
      {
        type: "services_list",
        title: "Our programs",
        source: "auto",
        filters: { itemType: "service", publicOnly: true },
        layout: "grid",
      },
      { type: "cta", title: "Book a program", body_markdown: "Book via changethegame.", source: "manual" },
    ],
  },
  {
    slug: "projects",
    title: "Quests & Projects",
    page_type: "projects",
    sections: [
      { type: "hero", title: "Quests & Projects", source: "manual" },
      {
        type: "quests_list",
        title: "Active quests",
        source: "auto",
        filters: { itemType: "quest", publicOnly: true },
        layout: "grid",
      },
      { type: "cta", title: "Start a quest", body_markdown: "Propose or join a quest on changethegame.", source: "manual" },
    ],
  },
  {
    slug: "members",
    title: "Members & Partners",
    page_type: "community",
    sections: [
      { type: "text_block", title: "Our network", body_markdown: "Describe your members and partners…", source: "manual" },
      {
        type: "guilds_list",
        title: "Partner guilds",
        source: "auto",
        filters: { itemType: "guild", webTags: ["partner"], publicOnly: true },
        layout: "list",
      },
      { type: "cta", title: "Become a member", body_markdown: "Apply on changethegame.", source: "manual" },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    page_type: "contact",
    sections: [
      { type: "text_block", title: "Contact us", body_markdown: "How to reach the guild…", source: "manual" },
      { type: "cta", title: "Find us on changethegame", body_markdown: "[Visit our guild page](https://changethegame.xyz)", source: "manual" },
    ],
  },
];

/* ─── Territory / Program ─── */
const territoryTemplate: WebsiteTemplate = [
  {
    slug: "home",
    title: "Home",
    page_type: "home",
    sections: [
      { type: "hero", title: "", subtitle: "", body_markdown: "Welcome to our territory.", source: "manual" },
      {
        type: "quests_list",
        title: "Key actions",
        source: "auto",
        filters: { itemType: "quest", webTags: ["flagship"], publicOnly: true, limit: 3 },
        layout: "grid",
      },
      {
        type: "guilds_list",
        title: "Partner guilds",
        source: "auto",
        filters: { itemType: "guild", webTags: ["flagship"], publicOnly: true, limit: 3 },
        layout: "list",
      },
      {
        type: "cta",
        title: "Get involved",
        body_markdown: "Explore our territory on changethegame.",
        source: "manual",
      },
    ],
  },
  {
    slug: "about",
    title: "About",
    page_type: "about",
    sections: [
      { type: "hero", title: "About the territory", source: "manual" },
      { type: "text_block", title: "Vision & context", body_markdown: "Describe the territory or program here…", source: "manual" },
      { type: "cta", title: "Learn more", body_markdown: "Discover the full ecosystem on changethegame.", source: "manual" },
    ],
  },
  {
    slug: "actions",
    title: "Actions & Quests",
    page_type: "projects",
    sections: [
      { type: "hero", title: "Actions & Quests", source: "manual" },
      {
        type: "quests_list",
        title: "Ongoing actions",
        source: "auto",
        filters: { itemType: "quest", publicOnly: true },
        layout: "grid",
      },
      { type: "cta", title: "Propose an action", body_markdown: "Launch a quest on changethegame.", source: "manual" },
    ],
  },
  {
    slug: "partners",
    title: "Partners & Guilds",
    page_type: "community",
    sections: [
      {
        type: "guilds_list",
        title: "Guilds active in this territory",
        source: "auto",
        filters: { itemType: "guild", publicOnly: true },
        layout: "grid",
      },
      { type: "cta", title: "Join the network", body_markdown: "Connect via changethegame.", source: "manual" },
    ],
  },
  {
    slug: "learning",
    title: "Learning & Events",
    page_type: "learning",
    sections: [
      { type: "hero", title: "Learning & Events", source: "manual" },
      {
        type: "services_list",
        title: "Programs & training",
        source: "auto",
        filters: { itemType: "service", publicOnly: true },
        layout: "grid",
      },
      { type: "cta", title: "Explore on changethegame", body_markdown: "Find events and courses on changethegame.", source: "manual" },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    page_type: "contact",
    sections: [
      { type: "text_block", title: "Contact", body_markdown: "How to reach the territory team…", source: "manual" },
      { type: "cta", title: "Find us on changethegame", body_markdown: "[Visit our territory page](https://changethegame.xyz)", source: "manual" },
    ],
  },
];

export function getDefaultTemplate(ownerType: string): WebsiteTemplate {
  switch (ownerType) {
    case "guild":
      return guildTemplate;
    case "territory":
    case "program":
      return territoryTemplate;
    default:
      return userTemplate;
  }
}
