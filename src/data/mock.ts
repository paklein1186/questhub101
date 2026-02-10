import {
  User, Guild, GuildMember, Quest, QuestParticipant, QuestUpdate,
  Topic, Territory, Comment, Achievement, Notification, Follow, Pod, PodMember,
  Service, ServiceTopic, ServiceTerritory, Booking,
  UserTopic, UserTerritory, GuildTopic, GuildTerritory, QuestTopic, QuestTerritory,
  CommentUpvote, Company, CompanyTopic, CompanyTerritory,
  TopicSteward, TopicFeature, AvailabilityRule, AvailabilityException,
  UserBlock,
} from "@/types";
import {
  UserRole, GuildType, GuildMemberRole, QuestStatus, MonetizationType,
  QuestParticipantRole, QuestParticipantStatus, QuestUpdateType,
  TerritoryLevel, CommentTargetType, NotificationType, FollowTargetType,
  PodType, PodMemberRole, BookingStatus, CompanySize,
  TopicStewardRole, TopicFeatureTargetType, OnlineLocationType, PaymentStatus,
} from "@/types/enums";

// ─── Users ───────────────────────────────────────────────────
export const users: User[] = [
  { id: "u1", name: "Aïsha Koné", email: "aisha@example.com", avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=aisha", headline: "Community Builder", bio: "Building bridges across ecosystems.", role: UserRole.ECOSYSTEM_BUILDER, xp: 1200, contributionIndex: 85 },
  { id: "u2", name: "Tomás Rivera", email: "tomas@example.com", avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=tomas", headline: "Social Innovator", bio: "Turning ideas into impact.", role: UserRole.GAMECHANGER, xp: 980, contributionIndex: 72 },
  { id: "u3", name: "Léa Martin", email: "lea@example.com", avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=lea", headline: "Civic Tech Lead", bio: "Open data advocate.", role: UserRole.BOTH, xp: 2100, contributionIndex: 93 },
  { id: "u4", name: "Yuki Tanaka", email: "yuki@example.com", avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=yuki", headline: "Design Thinker", bio: "Human-centered everything.", role: UserRole.GAMECHANGER, xp: 640, contributionIndex: 55 },
];

// ─── Topics (Houses) ─────────────────────────────────────────
export const topics: Topic[] = [
  { id: "t1", name: "New Agriculture", slug: "new-agriculture" },
  { id: "t2", name: "Arts & Culture", slug: "arts-culture" },
  { id: "t3", name: "Bioregions", slug: "bioregions" },
  { id: "t4", name: "Carbon Capture", slug: "carbon-capture" },
  { id: "t5", name: "Commons & DAO", slug: "commons-dao" },
  { id: "t6", name: "Complex Systems", slug: "complex-systems" },
  { id: "t7", name: "CSR", slug: "csr" },
  { id: "t8", name: "Energy", slug: "energy" },
  { id: "t9", name: "AI", slug: "ai" },
  { id: "t10", name: "New Economic Models", slug: "new-economic-models" },
  { id: "t11", name: "New Gatherings", slug: "new-gatherings" },
  { id: "t12", name: "Governance", slug: "governance" },
  { id: "t13", name: "Healthcare", slug: "healthcare" },
  { id: "t14", name: "Hosting & Facilitation", slug: "hosting-facilitation" },
  { id: "t15", name: "Impact Real Estate", slug: "impact-real-estate" },
  { id: "t16", name: "Investments & Philanthropy", slug: "investments-philanthropy" },
  { id: "t17", name: "Land Regeneration", slug: "land-regeneration" },
  { id: "t18", name: "Leadership", slug: "leadership" },
  { id: "t19", name: "Metrics", slug: "metrics" },
  { id: "t20", name: "Narratives & Storytelling", slug: "narratives-storytelling" },
  { id: "t21", name: "Open Data & Technology", slug: "open-data-technology" },
  { id: "t22", name: "Regenerative Crypto", slug: "regenerative-crypto" },
  { id: "t23", name: "Symbiotic & the Living", slug: "symbiotic-living" },
  { id: "t24", name: "Territorial Innovation", slug: "territorial-innovation" },
  { id: "t25", name: "Third Spaces", slug: "third-spaces" },
  { id: "t26", name: "Water & Soils", slug: "water-soils" },
];

// ─── Territories ─────────────────────────────────────────────
export const territories: Territory[] = [
  { id: "tr1", name: "Joigny", level: TerritoryLevel.TOWN },
  { id: "tr2", name: "Burgundy", level: TerritoryLevel.REGION },
  { id: "tr3", name: "France", level: TerritoryLevel.NATIONAL },
  { id: "tr4", name: "Belgium", level: TerritoryLevel.NATIONAL },
  { id: "tr5", name: "Europe", level: TerritoryLevel.OTHER },
  { id: "tr6", name: "Remote / Global", level: TerritoryLevel.OTHER },
  { id: "tr7", name: "Paris", level: TerritoryLevel.TOWN },
  { id: "tr8", name: "Île-de-France", level: TerritoryLevel.REGION },
  { id: "tr9", name: "Barcelona", level: TerritoryLevel.TOWN },
];

// ─── Guilds ──────────────────────────────────────────────────
export const guilds: Guild[] = [
  { id: "g1", name: "GreenTech Collective", description: "Accelerating climate solutions through tech and community.", logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=greentech", type: GuildType.COLLECTIVE, isApproved: true, createdByUserId: "u1" },
  { id: "g2", name: "EduForward Network", description: "Reimagining education for the 21st century.", logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=eduforward", type: GuildType.NETWORK, isApproved: true, createdByUserId: "u3" },
  { id: "g3", name: "Open Civic Guild", description: "Open data, open government, open minds.", logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=opencivic", type: GuildType.GUILD, isApproved: false, createdByUserId: "u3" },
  { id: "g4", name: "Mobility Lab", description: "Rethinking how cities move.", logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=mobilitylab", type: GuildType.GUILD, isApproved: true, createdByUserId: "u2" },
];

// ─── Guild Members ───────────────────────────────────────────
export const guildMembers: GuildMember[] = [
  { id: "gm1", guildId: "g1", userId: "u1", role: GuildMemberRole.ADMIN, joinedAt: "2024-01-15" },
  { id: "gm2", guildId: "g1", userId: "u2", role: GuildMemberRole.MEMBER, joinedAt: "2024-02-10" },
  { id: "gm3", guildId: "g2", userId: "u3", role: GuildMemberRole.ADMIN, joinedAt: "2024-01-01" },
  { id: "gm4", guildId: "g3", userId: "u3", role: GuildMemberRole.ADMIN, joinedAt: "2024-03-01" },
  { id: "gm5", guildId: "g4", userId: "u2", role: GuildMemberRole.ADMIN, joinedAt: "2024-04-01" },
  { id: "gm6", guildId: "g4", userId: "u4", role: GuildMemberRole.MEMBER, joinedAt: "2024-04-15" },
];

// ─── Guild Topics & Territories ──────────────────────────────
export const guildTopics: GuildTopic[] = [
  { id: "gt1", guildId: "g1", topicId: "t4" },   // Carbon Capture
  { id: "gt2", guildId: "g1", topicId: "t21" },  // Open Data & Technology
  { id: "gt3", guildId: "g2", topicId: "t2" },   // Arts & Culture
  { id: "gt4", guildId: "g3", topicId: "t21" },  // Open Data & Technology
  { id: "gt5", guildId: "g3", topicId: "t5" },   // Commons & DAO
  { id: "gt6", guildId: "g4", topicId: "t24" },  // Territorial Innovation
];

export const guildTerritories: GuildTerritory[] = [
  { id: "gtr1", guildId: "g1", territoryId: "tr7" },  // Paris
  { id: "gtr2", guildId: "g1", territoryId: "tr6" },  // Remote / Global
  { id: "gtr3", guildId: "g2", territoryId: "tr3" },  // France
  { id: "gtr4", guildId: "g3", territoryId: "tr8" },  // Île-de-France
  { id: "gtr5", guildId: "g4", territoryId: "tr9" },  // Barcelona
];

// ─── User Topics & Territories ───────────────────────────────
export const userTopics: UserTopic[] = [
  { id: "ut1", userId: "u1", topicId: "t4" },   // Carbon Capture
  { id: "ut2", userId: "u1", topicId: "t21" },  // Open Data & Technology
  { id: "ut3", userId: "u2", topicId: "t24" },  // Territorial Innovation
  { id: "ut4", userId: "u3", topicId: "t2" },   // Arts & Culture
  { id: "ut5", userId: "u3", topicId: "t21" },  // Open Data & Technology
];

export const userTerritories: UserTerritory[] = [
  { id: "utr1", userId: "u1", territoryId: "tr7" },  // Paris
  { id: "utr2", userId: "u2", territoryId: "tr9" },  // Barcelona
  { id: "utr3", userId: "u3", territoryId: "tr8" },  // Île-de-France
];

// ─── Companies ───────────────────────────────────────────────
export const companies: Company[] = [
  { id: "co1", name: "ÉcoVille Consulting", logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=ecoville", description: "Sustainability consultancy helping cities achieve carbon neutrality.", sector: "Sustainability", size: CompanySize.SME, websiteUrl: "https://ecoville.example.com", contactUserId: "u2", createdAt: "2024-06-01T10:00:00Z", updatedAt: "2024-06-01T10:00:00Z" },
  { id: "co2", name: "LearnCorp", logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=learncorp", description: "EdTech company focused on lifelong learning solutions for enterprises.", sector: "Education", size: CompanySize.LARGE, websiteUrl: "https://learncorp.example.com", contactUserId: "u3", createdAt: "2024-07-15T09:00:00Z", updatedAt: "2024-07-15T09:00:00Z" },
  { id: "co3", name: "MicroMobility SAS", description: "Startup building last-mile delivery solutions with cargo bikes.", sector: "Mobility", size: CompanySize.MICRO, contactUserId: "u4", createdAt: "2025-01-05T11:00:00Z", updatedAt: "2025-01-05T11:00:00Z" },
];

export const companyTopics: CompanyTopic[] = [
  { id: "ct1", companyId: "co1", topicId: "t4" },   // Carbon Capture
  { id: "ct2", companyId: "co2", topicId: "t2" },   // Arts & Culture
  { id: "ct3", companyId: "co3", topicId: "t24" },  // Territorial Innovation
];

export const companyTerritories: CompanyTerritory[] = [
  { id: "ctr1", companyId: "co1", territoryId: "tr7" },  // Paris
  { id: "ctr2", companyId: "co2", territoryId: "tr3" },  // France
  { id: "ctr3", companyId: "co3", territoryId: "tr9" },  // Barcelona
];

// ─── Quests ──────────────────────────────────────────────────
export const quests: Quest[] = [
  { id: "q1", title: "Carbon Footprint Dashboard", description: "Build an open-source dashboard that helps communities track their collective carbon footprint in real time.", status: QuestStatus.OPEN, monetizationType: MonetizationType.FREE, rewardXp: 300, isFeatured: true, createdByUserId: "u1", guildId: "g1" },
  { id: "q2", title: "Peer Tutoring Platform", description: "Create a platform matching volunteer tutors with students in underserved areas.", status: QuestStatus.IN_PROGRESS, monetizationType: MonetizationType.MIXED, rewardXp: 500, isFeatured: true, createdByUserId: "u3", guildId: "g2" },
  { id: "q3", title: "Open Budget Visualizer", description: "Visualize municipal budget data so citizens can understand where their taxes go.", status: QuestStatus.IN_PROGRESS, monetizationType: MonetizationType.FREE, rewardXp: 400, isFeatured: false, createdByUserId: "u3", guildId: "g3" },
  { id: "q4", title: "Bike-Share Optimization", description: "Use data analytics to optimize bike-share station placement across the city.", status: QuestStatus.OPEN, monetizationType: MonetizationType.PAID, rewardXp: 600, isFeatured: false, createdByUserId: "u2", guildId: "g4", companyId: "co3" },
  { id: "q5", title: "Community Garden Mapper", description: "Map all community gardens and track volunteer hours and harvest yields.", status: QuestStatus.COMPLETED, monetizationType: MonetizationType.FREE, rewardXp: 200, isFeatured: false, createdByUserId: "u1", guildId: "g1" },
  { id: "q6", title: "Corporate Sustainability Report Tool", description: "Build an automated tool for generating ESG reports from company data.", status: QuestStatus.OPEN, monetizationType: MonetizationType.PAID, rewardXp: 450, isFeatured: false, createdByUserId: "u2", guildId: "g1", companyId: "co1" },
];

// ─── Quest Topics & Territories ──────────────────────────────
export const questTopics: QuestTopic[] = [
  { id: "qt1", questId: "q1", topicId: "t4" },   // Carbon Capture
  { id: "qt2", questId: "q1", topicId: "t21" },  // Open Data & Technology
  { id: "qt3", questId: "q2", topicId: "t2" },   // Arts & Culture
  { id: "qt4", questId: "q3", topicId: "t21" },  // Open Data & Technology
  { id: "qt5", questId: "q3", topicId: "t5" },   // Commons & DAO
  { id: "qt6", questId: "q4", topicId: "t24" },  // Territorial Innovation
  { id: "qt7", questId: "q5", topicId: "t4" },   // Carbon Capture
];

export const questTerritories: QuestTerritory[] = [
  { id: "qtr1", questId: "q1", territoryId: "tr6" },  // Remote / Global
  { id: "qtr2", questId: "q2", territoryId: "tr3" },  // France
  { id: "qtr3", questId: "q3", territoryId: "tr8" },  // Île-de-France
  { id: "qtr4", questId: "q4", territoryId: "tr9" },  // Barcelona
  { id: "qtr5", questId: "q5", territoryId: "tr7" },  // Paris
];

// ─── Quest Participants ──────────────────────────────────────
export const questParticipants: QuestParticipant[] = [
  { id: "qp1", questId: "q1", userId: "u1", role: QuestParticipantRole.OWNER, status: QuestParticipantStatus.ACCEPTED },
  { id: "qp2", questId: "q1", userId: "u2", role: QuestParticipantRole.COLLABORATOR, status: QuestParticipantStatus.ACCEPTED },
  { id: "qp3", questId: "q2", userId: "u3", role: QuestParticipantRole.OWNER, status: QuestParticipantStatus.ACCEPTED },
  { id: "qp4", questId: "q2", userId: "u4", role: QuestParticipantRole.FOLLOWER, status: QuestParticipantStatus.ACCEPTED },
  { id: "qp5", questId: "q3", userId: "u3", role: QuestParticipantRole.OWNER, status: QuestParticipantStatus.ACCEPTED },
  { id: "qp6", questId: "q4", userId: "u2", role: QuestParticipantRole.OWNER, status: QuestParticipantStatus.ACCEPTED },
];

// ─── Quest Updates ───────────────────────────────────────────
export const questUpdates: QuestUpdate[] = [
  { id: "qu1", questId: "q1", authorId: "u1", title: "Project kickoff!", content: "We're officially starting the Carbon Footprint Dashboard. Looking for frontend contributors.", type: QuestUpdateType.GENERAL, createdAt: "2025-01-20T10:00:00Z", updatedAt: "2025-01-20T10:00:00Z" },
  { id: "qu2", questId: "q1", authorId: "u2", title: "Need help with data pipeline", content: "We have raw emissions data but need help building the ingestion pipeline. Any data engineers out there?", type: QuestUpdateType.CALL_FOR_HELP, createdAt: "2025-01-25T14:30:00Z", updatedAt: "2025-01-25T14:30:00Z" },
  { id: "qu3", questId: "q2", authorId: "u3", title: "First 50 tutors matched!", content: "Milestone reached — 50 tutors have been matched with students in 3 regions.", type: QuestUpdateType.MILESTONE, createdAt: "2025-02-01T09:00:00Z", updatedAt: "2025-02-01T09:00:00Z" },
  { id: "qu4", questId: "q3", authorId: "u3", title: "Reflections on open data challenges", content: "Working with municipal data is harder than expected. Formats vary wildly across departments.", type: QuestUpdateType.REFLECTION, createdAt: "2025-02-05T16:00:00Z", updatedAt: "2025-02-05T16:00:00Z" },
  { id: "qu5", questId: "q5", authorId: "u1", title: "Garden mapper is live!", content: "The community garden mapper is now live and tracking 120 gardens across Paris.", type: QuestUpdateType.MILESTONE, createdAt: "2025-01-10T12:00:00Z", updatedAt: "2025-01-10T12:00:00Z" },
];

// ─── Comments ────────────────────────────────────────────────
export const comments: Comment[] = [
  { id: "c1", content: "This guild is doing amazing work for the climate!", createdAt: "2025-01-22T08:00:00Z", authorId: "u2", targetType: CommentTargetType.GUILD, targetId: "g1", upvoteCount: 5 },
  { id: "c2", content: "Love the open approach. Count me in.", createdAt: "2025-01-23T10:30:00Z", authorId: "u4", targetType: CommentTargetType.GUILD, targetId: "g1", upvoteCount: 3 },
  { id: "c3", content: "Excited to see how this dashboard evolves!", createdAt: "2025-01-21T15:00:00Z", authorId: "u3", targetType: CommentTargetType.QUEST, targetId: "q1", upvoteCount: 7 },
  { id: "c4", content: "I can help with the data pipeline — DM me.", createdAt: "2025-01-26T09:00:00Z", authorId: "u4", targetType: CommentTargetType.QUEST_UPDATE, targetId: "qu2", upvoteCount: 12 },
  { id: "c5", content: "Great milestone! The matching algorithm is impressive.", createdAt: "2025-02-02T11:00:00Z", authorId: "u1", targetType: CommentTargetType.QUEST_UPDATE, targetId: "qu3", upvoteCount: 8 },
  { id: "c6", content: "Have you tried standardizing with OCDS?", createdAt: "2025-02-06T10:00:00Z", authorId: "u2", parentId: "c4", targetType: CommentTargetType.QUEST_UPDATE, targetId: "qu2", upvoteCount: 2 },
  { id: "c7", content: "The quest marketplace needs more paid quests!", createdAt: "2025-02-07T14:00:00Z", authorId: "u4", targetType: CommentTargetType.QUEST, targetId: "q4", upvoteCount: 1 },
];

export const commentUpvotes: CommentUpvote[] = [
  { id: "cu1", commentId: "c1", userId: "u1", createdAt: "2025-01-22T09:00:00Z" },
  { id: "cu2", commentId: "c3", userId: "u2", createdAt: "2025-01-22T10:00:00Z" },
];

// ─── Achievements ────────────────────────────────────────────
export const achievements: Achievement[] = [
  { id: "a1", userId: "u1", questId: "q5", title: "Garden Guardian", description: "Successfully mapped 120 community gardens.", createdAt: "2025-01-10T12:00:00Z" },
  { id: "a2", userId: "u3", questId: "q2", title: "Mentor Matchmaker", description: "Matched 50 tutors with students.", createdAt: "2025-02-01T09:00:00Z" },
];

// ─── Notifications ───────────────────────────────────────────
export const notifications: Notification[] = [
  { id: "n1", userId: "u1", type: NotificationType.COMMENT, data: { commentId: "c1", message: "Tomás commented on GreenTech Collective" }, isRead: false },
  { id: "n2", userId: "u3", type: NotificationType.QUEST_UPDATE, data: { questUpdateId: "qu3", message: "Milestone reached on Peer Tutoring Platform" }, isRead: true },
];

// ─── Follows ─────────────────────────────────────────────────
export const follows: Follow[] = [
  { id: "f1", followerId: "u1", targetType: FollowTargetType.USER, targetId: "u2", createdAt: "2025-01-18T10:00:00Z" },
  { id: "f2", followerId: "u1", targetType: FollowTargetType.GUILD, targetId: "g2", createdAt: "2025-01-20T09:00:00Z" },
  { id: "f3", followerId: "u1", targetType: FollowTargetType.QUEST, targetId: "q2", createdAt: "2025-01-22T14:00:00Z" },
  { id: "f4", followerId: "u1", targetType: FollowTargetType.QUEST, targetId: "q4", createdAt: "2025-01-25T08:00:00Z" },
  { id: "f5", followerId: "u2", targetType: FollowTargetType.USER, targetId: "u1", createdAt: "2025-01-19T11:00:00Z" },
  { id: "f6", followerId: "u3", targetType: FollowTargetType.GUILD, targetId: "g1", createdAt: "2025-01-21T15:00:00Z" },
];

// ─── Pods ────────────────────────────────────────────────────
export const pods: Pod[] = [
  { id: "pod1", name: "Carbon Dashboard Sprint", description: "A focused 2-week sprint to build the first version of the carbon footprint dashboard.", type: PodType.QUEST_POD, questId: "q1", creatorId: "u1", startDate: "2025-02-01", endDate: "2025-02-14", createdAt: "2025-01-28T10:00:00Z", updatedAt: "2025-01-28T10:00:00Z" },
  { id: "pod2", name: "Climate Data Study Group", description: "Weekly study sessions exploring open climate datasets and visualization techniques.", type: PodType.STUDY_POD, topicId: "t1", creatorId: "u3", startDate: "2025-02-10", createdAt: "2025-02-05T09:00:00Z", updatedAt: "2025-02-05T09:00:00Z" },
  { id: "pod3", name: "Tutoring Platform UX Pod", description: "Collaborative pod to redesign the tutor-student matching experience.", type: PodType.QUEST_POD, questId: "q2", creatorId: "u3", createdAt: "2025-02-03T14:00:00Z", updatedAt: "2025-02-03T14:00:00Z" },
];

export const podMembers: PodMember[] = [
  { id: "pm1", podId: "pod1", userId: "u1", role: PodMemberRole.HOST, joinedAt: "2025-01-28T10:00:00Z" },
  { id: "pm2", podId: "pod1", userId: "u2", role: PodMemberRole.MEMBER, joinedAt: "2025-01-29T08:00:00Z" },
  { id: "pm3", podId: "pod2", userId: "u3", role: PodMemberRole.HOST, joinedAt: "2025-02-05T09:00:00Z" },
  { id: "pm4", podId: "pod2", userId: "u1", role: PodMemberRole.MEMBER, joinedAt: "2025-02-06T11:00:00Z" },
  { id: "pm5", podId: "pod3", userId: "u3", role: PodMemberRole.HOST, joinedAt: "2025-02-03T14:00:00Z" },
  { id: "pm6", podId: "pod3", userId: "u4", role: PodMemberRole.MEMBER, joinedAt: "2025-02-04T10:00:00Z" },
];

// ─── Services ────────────────────────────────────────────────
export const services: Service[] = [
  { id: "svc1", title: "Climate Strategy Workshop", description: "A 90-minute interactive workshop helping organizations define their climate action roadmap with concrete, measurable goals.", providerUserId: "u1", durationMinutes: 90, priceCurrency: "EUR", priceAmount: 150, onlineLocationType: OnlineLocationType.JITSI, isActive: true, createdAt: "2025-01-15T10:00:00Z", updatedAt: "2025-01-15T10:00:00Z" },
  { id: "svc2", title: "Open Data Audit", description: "Comprehensive audit of your organization's data practices, identifying opportunities for open data publishing and civic transparency.", providerUserId: "u3", durationMinutes: 120, priceCurrency: "EUR", priceAmount: 200, onlineLocationType: OnlineLocationType.JITSI, isActive: true, createdAt: "2025-01-20T09:00:00Z", updatedAt: "2025-01-20T09:00:00Z" },
  { id: "svc3", title: "UX Design Sprint Facilitation", description: "Facilitated design sprint for your team — from problem framing to tested prototype in 5 days.", providerUserId: "u4", durationMinutes: 60, priceCurrency: "EUR", priceAmount: 120, onlineLocationType: OnlineLocationType.ZOOM, onlineLocationUrlTemplate: "https://zoom.us/j/gamechanger", isActive: true, createdAt: "2025-01-22T14:00:00Z", updatedAt: "2025-01-22T14:00:00Z" },
  { id: "svc4", title: "GreenTech Mentoring Session", description: "One-on-one mentoring from the GreenTech Collective on launching climate-tech projects.", providerGuildId: "g1", durationMinutes: 60, priceCurrency: "EUR", priceAmount: 0, onlineLocationType: OnlineLocationType.JITSI, isActive: true, createdAt: "2025-02-01T08:00:00Z", updatedAt: "2025-02-01T08:00:00Z" },
  { id: "svc5", title: "Mobility Data Analysis", description: "Custom analysis of urban mobility patterns using open transport datasets.", providerGuildId: "g4", durationMinutes: 180, priceCurrency: "EUR", priceAmount: 300, onlineLocationType: OnlineLocationType.OTHER, isActive: true, createdAt: "2025-02-05T11:00:00Z", updatedAt: "2025-02-05T11:00:00Z" },
];

export const serviceTopics: ServiceTopic[] = [
  { id: "st1", serviceId: "svc1", topicId: "t4" },   // Carbon Capture
  { id: "st2", serviceId: "svc2", topicId: "t21" },  // Open Data & Technology
  { id: "st3", serviceId: "svc2", topicId: "t5" },   // Commons & DAO
  { id: "st4", serviceId: "svc3", topicId: "t2" },   // Arts & Culture
  { id: "st5", serviceId: "svc4", topicId: "t4" },   // Carbon Capture
  { id: "st6", serviceId: "svc5", topicId: "t24" },  // Territorial Innovation
];

export const serviceTerritories: ServiceTerritory[] = [
  { id: "str1", serviceId: "svc1", territoryId: "tr6" },  // Remote / Global
  { id: "str2", serviceId: "svc2", territoryId: "tr8" },  // Île-de-France
  { id: "str3", serviceId: "svc3", territoryId: "tr6" },  // Remote / Global
  { id: "str4", serviceId: "svc4", territoryId: "tr7" },  // Paris
  { id: "str5", serviceId: "svc5", territoryId: "tr9" },  // Barcelona
];

// ─── Bookings ────────────────────────────────────────────────
export const bookings: Booking[] = [
  { id: "bk1", serviceId: "svc1", requesterId: "u2", providerUserId: "u1", startDateTime: "2025-02-15T09:00:00Z", endDateTime: "2025-02-15T10:30:00Z", status: BookingStatus.REQUESTED, paymentStatus: PaymentStatus.PENDING, amount: 150, currency: "EUR", notes: "Looking for help scoping our Q2 climate initiative.", createdAt: "2025-02-08T10:00:00Z", updatedAt: "2025-02-08T10:00:00Z" },
  { id: "bk2", serviceId: "svc4", requesterId: "u3", providerGuildId: "g1", startDateTime: "2025-02-15T14:00:00Z", endDateTime: "2025-02-15T15:00:00Z", status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.NOT_REQUIRED, amount: 0, currency: "EUR", callUrl: "https://meet.jit.si/gamechanger-bk2", requestedDateTime: "2025-02-15T14:00:00Z", notes: "Want to discuss launching a new climate-tech project.", createdAt: "2025-02-06T09:00:00Z", updatedAt: "2025-02-07T08:00:00Z" },
];

// ─── Helpers ─────────────────────────────────────────────────
export function getUserById(id: string) { return users.find(u => u.id === id); }
export function getGuildById(id: string) { return guilds.find(g => g.id === id); }
export function getQuestById(id: string) { return quests.find(q => q.id === id); }
export function getTopicById(id: string) { return topics.find(t => t.id === id); }
export function getTerritoryById(id: string) { return territories.find(t => t.id === id); }
export function getPodById(id: string) { return pods.find(p => p.id === id); }
export function getServiceById(id: string) { return services.find(s => s.id === id); }

export function getTopicsForGuild(guildId: string) {
  return guildTopics.filter(gt => gt.guildId === guildId).map(gt => getTopicById(gt.topicId)!).filter(Boolean);
}
export function getTerritoriesForGuild(guildId: string) {
  return guildTerritories.filter(gt => gt.guildId === guildId).map(gt => getTerritoryById(gt.territoryId)!).filter(Boolean);
}
export function getTopicsForQuest(questId: string) {
  return questTopics.filter(qt => qt.questId === questId).map(qt => getTopicById(qt.topicId)!).filter(Boolean);
}
export function getTerritoriesForQuest(questId: string) {
  return questTerritories.filter(qt => qt.questId === questId).map(qt => getTerritoryById(qt.territoryId)!).filter(Boolean);
}
export function getTopicsForService(serviceId: string) {
  return serviceTopics.filter(st => st.serviceId === serviceId).map(st => getTopicById(st.topicId)!).filter(Boolean);
}
export function getTerritoriesForService(serviceId: string) {
  return serviceTerritories.filter(st => st.serviceId === serviceId).map(st => getTerritoryById(st.territoryId)!).filter(Boolean);
}
export function getCommentsForTarget(targetType: CommentTargetType, targetId: string) {
  return comments.filter(c => c.targetType === targetType && c.targetId === targetId);
}
export function getQuestsForGuild(guildId: string) {
  return quests.filter(q => q.guildId === guildId);
}
export function getUpdatesForQuest(questId: string) {
  return questUpdates.filter(qu => qu.questId === questId);
}
export function getMembersForGuild(guildId: string) {
  return guildMembers.filter(gm => gm.guildId === guildId).map(gm => ({ ...gm, user: getUserById(gm.userId) }));
}
export function getParticipantsForQuest(questId: string) {
  return questParticipants.filter(qp => qp.questId === questId).map(qp => ({ ...qp, user: getUserById(qp.userId) }));
}
export function getMembersForPod(podId: string) {
  return podMembers.filter(pm => pm.podId === podId).map(pm => ({ ...pm, user: getUserById(pm.userId) }));
}
export function getPodsForQuest(questId: string) {
  return pods.filter(p => p.questId === questId);
}
export function getServicesForUser(userId: string) {
  return services.filter(s => s.providerUserId === userId && s.isActive);
}
export function getServicesForGuild(guildId: string) {
  return services.filter(s => s.providerGuildId === guildId && s.isActive);
}
export function getCompanyById(id: string) { return companies.find(c => c.id === id); }
export function getTopicsForCompany(companyId: string) {
  return companyTopics.filter(ct => ct.companyId === companyId).map(ct => getTopicById(ct.topicId)!).filter(Boolean);
}
export function getTerritoriesForCompany(companyId: string) {
  return companyTerritories.filter(ct => ct.companyId === companyId).map(ct => getTerritoryById(ct.territoryId)!).filter(Boolean);
}
export function getQuestsForCompany(companyId: string) {
  return quests.filter(q => q.companyId === companyId);
}
export function getBookingsForCompany(companyId: string) {
  return bookings.filter(b => b.companyId === companyId);
}

// ─── Topic Stewards & Features ───────────────────────────────
export const topicStewards: TopicSteward[] = [
  { id: "ts1", topicId: "t4", userId: "u1", role: TopicStewardRole.STEWARD, createdAt: "2024-12-01T10:00:00Z" },   // Carbon Capture
  { id: "ts2", topicId: "t2", userId: "u3", role: TopicStewardRole.STEWARD, createdAt: "2024-12-05T09:00:00Z" },   // Arts & Culture
  { id: "ts3", topicId: "t4", userId: "u3", role: TopicStewardRole.CURATOR, createdAt: "2025-01-10T11:00:00Z" },   // Carbon Capture
  { id: "ts4", topicId: "t21", userId: "u3", role: TopicStewardRole.STEWARD, createdAt: "2025-01-15T14:00:00Z" },  // Open Data & Technology
];

export const topicFeatures: TopicFeature[] = [
  { id: "tf1", topicId: "t4", targetType: TopicFeatureTargetType.QUEST, targetId: "q1", addedByUserId: "u1", createdAt: "2025-01-22T10:00:00Z" },   // Carbon Capture
  { id: "tf2", topicId: "t4", targetType: TopicFeatureTargetType.GUILD, targetId: "g1", addedByUserId: "u1", createdAt: "2025-01-23T09:00:00Z" },   // Carbon Capture
  { id: "tf3", topicId: "t2", targetType: TopicFeatureTargetType.QUEST, targetId: "q2", addedByUserId: "u3", createdAt: "2025-02-01T12:00:00Z" },   // Arts & Culture
];

export function getStewardsForTopic(topicId: string) {
  return topicStewards.filter(ts => ts.topicId === topicId).map(ts => ({ ...ts, user: getUserById(ts.userId) }));
}
export function getFeaturesForTopic(topicId: string) {
  return topicFeatures.filter(tf => tf.topicId === topicId);
}
export function isTopicSteward(topicId: string, userId: string) {
  return topicStewards.some(ts => ts.topicId === topicId && ts.userId === userId);
}
export function getTopicBySlug(slug: string) {
  return topics.find(t => t.slug === slug);
}

// ─── Availability ────────────────────────────────────────────
export const availabilityRules: AvailabilityRule[] = [
  // u1 global: Mon-Fri 9:00-17:00
  { id: "ar1", providerUserId: "u1", weekday: 0, startTime: "09:00", endTime: "17:00", timezone: "Europe/Paris", isActive: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "ar2", providerUserId: "u1", weekday: 1, startTime: "09:00", endTime: "17:00", timezone: "Europe/Paris", isActive: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "ar3", providerUserId: "u1", weekday: 2, startTime: "09:00", endTime: "17:00", timezone: "Europe/Paris", isActive: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "ar4", providerUserId: "u1", weekday: 3, startTime: "09:00", endTime: "17:00", timezone: "Europe/Paris", isActive: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "ar5", providerUserId: "u1", weekday: 4, startTime: "09:00", endTime: "17:00", timezone: "Europe/Paris", isActive: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  // u3 global: Tue-Thu 10:00-16:00
  { id: "ar6", providerUserId: "u3", weekday: 1, startTime: "10:00", endTime: "16:00", timezone: "Europe/Paris", isActive: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "ar7", providerUserId: "u3", weekday: 2, startTime: "10:00", endTime: "16:00", timezone: "Europe/Paris", isActive: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "ar8", providerUserId: "u3", weekday: 3, startTime: "10:00", endTime: "16:00", timezone: "Europe/Paris", isActive: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  // u4 global: Mon, Wed, Fri 08:00-12:00
  { id: "ar9", providerUserId: "u4", weekday: 0, startTime: "08:00", endTime: "12:00", timezone: "Europe/Paris", isActive: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "ar10", providerUserId: "u4", weekday: 2, startTime: "08:00", endTime: "12:00", timezone: "Europe/Paris", isActive: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "ar11", providerUserId: "u4", weekday: 4, startTime: "08:00", endTime: "12:00", timezone: "Europe/Paris", isActive: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
];

export const availabilityExceptions: AvailabilityException[] = [
  // u1 blocked on 2025-02-17
  { id: "ae1", providerUserId: "u1", date: "2025-02-17", isAvailable: false, createdAt: "2025-02-10T00:00:00Z" },
];

export function getAvailabilityRulesForUser(userId: string, serviceId?: string) {
  return availabilityRules.filter(r => r.providerUserId === userId && (!serviceId || !r.serviceId || r.serviceId === serviceId));
}

export function getAvailabilityExceptionsForUser(userId: string) {
  return availabilityExceptions.filter(e => e.providerUserId === userId);
}

export function getBookingsForProvider(userId: string) {
  return bookings.filter(b => b.providerUserId === userId);
}

// ─── User Blocks ─────────────────────────────────────────────
export const userBlocks: UserBlock[] = [];

export function isBlockedBy(blockerId: string, blockedId: string): boolean {
  return userBlocks.some(b => b.blockerId === blockerId && b.blockedId === blockedId);
}

export function hasBlockRelationship(userA: string, userB: string): boolean {
  return isBlockedBy(userA, userB) || isBlockedBy(userB, userA);
}
