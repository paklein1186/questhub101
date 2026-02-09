import {
  User, Guild, GuildMember, Quest, QuestParticipant, QuestUpdate,
  Topic, Territory, Comment, Achievement, Notification,
  UserTopic, UserTerritory, GuildTopic, GuildTerritory, QuestTopic, QuestTerritory,
  CommentUpvote,
} from "@/types";
import {
  UserRole, GuildType, GuildMemberRole, QuestStatus, MonetizationType,
  QuestParticipantRole, QuestParticipantStatus, QuestUpdateType,
  TerritoryLevel, CommentTargetType, NotificationType,
} from "@/types/enums";

// ─── Users ───────────────────────────────────────────────────
export const users: User[] = [
  { id: "u1", name: "Aïsha Koné", email: "aisha@example.com", avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=aisha", headline: "Community Builder", bio: "Building bridges across ecosystems.", role: UserRole.ECOSYSTEM_BUILDER, xp: 1200, contributionIndex: 85 },
  { id: "u2", name: "Tomás Rivera", email: "tomas@example.com", avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=tomas", headline: "Social Innovator", bio: "Turning ideas into impact.", role: UserRole.GAMECHANGER, xp: 980, contributionIndex: 72 },
  { id: "u3", name: "Léa Martin", email: "lea@example.com", avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=lea", headline: "Civic Tech Lead", bio: "Open data advocate.", role: UserRole.BOTH, xp: 2100, contributionIndex: 93 },
  { id: "u4", name: "Yuki Tanaka", email: "yuki@example.com", avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=yuki", headline: "Design Thinker", bio: "Human-centered everything.", role: UserRole.GAMECHANGER, xp: 640, contributionIndex: 55 },
];

// ─── Topics ──────────────────────────────────────────────────
export const topics: Topic[] = [
  { id: "t1", name: "Climate Action", slug: "climate-action" },
  { id: "t2", name: "Education", slug: "education" },
  { id: "t3", name: "Open Source", slug: "open-source" },
  { id: "t4", name: "Social Inclusion", slug: "social-inclusion" },
  { id: "t5", name: "Urban Mobility", slug: "urban-mobility" },
];

// ─── Territories ─────────────────────────────────────────────
export const territories: Territory[] = [
  { id: "tr1", name: "Paris", level: TerritoryLevel.TOWN },
  { id: "tr2", name: "Île-de-France", level: TerritoryLevel.REGION },
  { id: "tr3", name: "France", level: TerritoryLevel.NATIONAL },
  { id: "tr4", name: "Barcelona", level: TerritoryLevel.TOWN },
  { id: "tr5", name: "Remote / Global", level: TerritoryLevel.OTHER },
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
  { id: "gt1", guildId: "g1", topicId: "t1" },
  { id: "gt2", guildId: "g1", topicId: "t3" },
  { id: "gt3", guildId: "g2", topicId: "t2" },
  { id: "gt4", guildId: "g3", topicId: "t3" },
  { id: "gt5", guildId: "g3", topicId: "t4" },
  { id: "gt6", guildId: "g4", topicId: "t5" },
];

export const guildTerritories: GuildTerritory[] = [
  { id: "gtr1", guildId: "g1", territoryId: "tr1" },
  { id: "gtr2", guildId: "g1", territoryId: "tr5" },
  { id: "gtr3", guildId: "g2", territoryId: "tr3" },
  { id: "gtr4", guildId: "g3", territoryId: "tr2" },
  { id: "gtr5", guildId: "g4", territoryId: "tr4" },
];

// ─── User Topics & Territories ───────────────────────────────
export const userTopics: UserTopic[] = [
  { id: "ut1", userId: "u1", topicId: "t1" },
  { id: "ut2", userId: "u1", topicId: "t3" },
  { id: "ut3", userId: "u2", topicId: "t5" },
  { id: "ut4", userId: "u3", topicId: "t2" },
  { id: "ut5", userId: "u3", topicId: "t3" },
];

export const userTerritories: UserTerritory[] = [
  { id: "utr1", userId: "u1", territoryId: "tr1" },
  { id: "utr2", userId: "u2", territoryId: "tr4" },
  { id: "utr3", userId: "u3", territoryId: "tr2" },
];

// ─── Quests ──────────────────────────────────────────────────
export const quests: Quest[] = [
  { id: "q1", title: "Carbon Footprint Dashboard", description: "Build an open-source dashboard that helps communities track their collective carbon footprint in real time.", status: QuestStatus.OPEN, monetizationType: MonetizationType.FREE, rewardXp: 300, isFeatured: true, createdByUserId: "u1", guildId: "g1" },
  { id: "q2", title: "Peer Tutoring Platform", description: "Create a platform matching volunteer tutors with students in underserved areas.", status: QuestStatus.IN_PROGRESS, monetizationType: MonetizationType.MIXED, rewardXp: 500, isFeatured: true, createdByUserId: "u3", guildId: "g2" },
  { id: "q3", title: "Open Budget Visualizer", description: "Visualize municipal budget data so citizens can understand where their taxes go.", status: QuestStatus.IN_PROGRESS, monetizationType: MonetizationType.FREE, rewardXp: 400, isFeatured: false, createdByUserId: "u3", guildId: "g3" },
  { id: "q4", title: "Bike-Share Optimization", description: "Use data analytics to optimize bike-share station placement across the city.", status: QuestStatus.OPEN, monetizationType: MonetizationType.PAID, rewardXp: 600, isFeatured: false, createdByUserId: "u2", guildId: "g4" },
  { id: "q5", title: "Community Garden Mapper", description: "Map all community gardens and track volunteer hours and harvest yields.", status: QuestStatus.COMPLETED, monetizationType: MonetizationType.FREE, rewardXp: 200, isFeatured: false, createdByUserId: "u1", guildId: "g1" },
];

// ─── Quest Topics & Territories ──────────────────────────────
export const questTopics: QuestTopic[] = [
  { id: "qt1", questId: "q1", topicId: "t1" },
  { id: "qt2", questId: "q1", topicId: "t3" },
  { id: "qt3", questId: "q2", topicId: "t2" },
  { id: "qt4", questId: "q3", topicId: "t3" },
  { id: "qt5", questId: "q3", topicId: "t4" },
  { id: "qt6", questId: "q4", topicId: "t5" },
  { id: "qt7", questId: "q5", topicId: "t1" },
];

export const questTerritories: QuestTerritory[] = [
  { id: "qtr1", questId: "q1", territoryId: "tr5" },
  { id: "qtr2", questId: "q2", territoryId: "tr3" },
  { id: "qtr3", questId: "q3", territoryId: "tr2" },
  { id: "qtr4", questId: "q4", territoryId: "tr4" },
  { id: "qtr5", questId: "q5", territoryId: "tr1" },
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

// ─── Helpers ─────────────────────────────────────────────────
export function getUserById(id: string) { return users.find(u => u.id === id); }
export function getGuildById(id: string) { return guilds.find(g => g.id === id); }
export function getQuestById(id: string) { return quests.find(q => q.id === id); }
export function getTopicById(id: string) { return topics.find(t => t.id === id); }
export function getTerritoryById(id: string) { return territories.find(t => t.id === id); }

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
