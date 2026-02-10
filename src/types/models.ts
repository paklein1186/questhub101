import {
  UserRole,
  GuildType,
  GuildMemberRole,
  QuestStatus,
  MonetizationType,
  QuestParticipantRole,
  QuestParticipantStatus,
  QuestUpdateType,
  TerritoryLevel,
  CommentTargetType,
  NotificationType,
  FollowTargetType,
  PodType,
  PodMemberRole,
  BookingStatus,
  CompanySize,
  TopicStewardRole,
  TopicFeatureTargetType,
  OnlineLocationType,
  PaymentStatus,
} from "./enums";

// ─── Soft Delete Mixin ──────────────────────────────────────
export interface SoftDeletable {
  isDeleted?: boolean;
  deletedAt?: string;
  deletedByUserId?: string;
}

// ─── Core Entities ───────────────────────────────────────────

export interface User extends SoftDeletable {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  headline?: string;
  bio?: string;
  role: UserRole;
  xp: number;
  contributionIndex: number;
  // Relations
  guildMembers?: GuildMember[];
  questParticipants?: QuestParticipant[];
  userTopics?: UserTopic[];
  userTerritories?: UserTerritory[];
}

export interface Guild extends SoftDeletable {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  type: GuildType;
  isApproved: boolean;
  createdByUserId: string;
  // Relations
  createdByUser?: User;
  guildMembers?: GuildMember[];
  guildTopics?: GuildTopic[];
  guildTerritories?: GuildTerritory[];
  quests?: Quest[];
}

export interface GuildMember {
  id: string;
  guildId: string;
  userId: string;
  role: GuildMemberRole;
  joinedAt: string;
  // Relations
  guild?: Guild;
  user?: User;
}

// ─── Quests ──────────────────────────────────────────────────

export interface Quest extends SoftDeletable {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  status: QuestStatus;
  monetizationType: MonetizationType;
  rewardXp: number;
  isFeatured: boolean;
  createdByUserId: string;
  guildId: string;
  companyId?: string;
  // Relations
  createdByUser?: User;
  guild?: Guild;
  company?: Company;
  questParticipants?: QuestParticipant[];
  questTopics?: QuestTopic[];
  questTerritories?: QuestTerritory[];
  questUpdates?: QuestUpdate[];
}

export interface QuestParticipant {
  id: string;
  questId: string;
  userId: string;
  role: QuestParticipantRole;
  status: QuestParticipantStatus;
  // Relations
  quest?: Quest;
  user?: User;
}

export interface QuestUpdate extends SoftDeletable {
  id: string;
  questId: string;
  authorId: string;
  title: string;
  content: string;
  imageUrl?: string;
  type: QuestUpdateType;
  createdAt: string;
  updatedAt: string;
  // Relations
  quest?: Quest;
  author?: User;
}

// ─── Taxonomy ────────────────────────────────────────────────

export interface Topic extends SoftDeletable {
  id: string;
  name: string;
  slug: string;
  // Relations
  userTopics?: UserTopic[];
  guildTopics?: GuildTopic[];
  questTopics?: QuestTopic[];
}

export interface UserTopic {
  id: string;
  userId: string;
  topicId: string;
  user?: User;
  topic?: Topic;
}

export interface GuildTopic {
  id: string;
  guildId: string;
  topicId: string;
  guild?: Guild;
  topic?: Topic;
}

export interface QuestTopic {
  id: string;
  questId: string;
  topicId: string;
  quest?: Quest;
  topic?: Topic;
}

export interface Territory extends SoftDeletable {
  id: string;
  name: string;
  level: TerritoryLevel;
  // Relations
  userTerritories?: UserTerritory[];
  guildTerritories?: GuildTerritory[];
  questTerritories?: QuestTerritory[];
}

export interface UserTerritory {
  id: string;
  userId: string;
  territoryId: string;
  user?: User;
  territory?: Territory;
}

export interface GuildTerritory {
  id: string;
  guildId: string;
  territoryId: string;
  guild?: Guild;
  territory?: Territory;
}

export interface QuestTerritory {
  id: string;
  questId: string;
  territoryId: string;
  quest?: Quest;
  territory?: Territory;
}

// ─── Social ─────────────────────────────────────────────────

export interface Comment extends SoftDeletable {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  parentId?: string;
  targetType: CommentTargetType;
  targetId: string;
  upvoteCount: number;
  // Relations
  author?: User;
  parent?: Comment;
}

/** Unique constraint on (commentId, userId) */
export interface CommentUpvote {
  id: string;
  commentId: string;
  userId: string;
  createdAt: string;
  // Relations
  comment?: Comment;
  user?: User;
}

export interface Achievement {
  id: string;
  userId: string;
  questId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  // Relations
  user?: User;
  quest?: Quest;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  data: Record<string, unknown>;
  isRead: boolean;
  // Relations
  user?: User;
}

/** Unique constraint on (followerId, targetType, targetId) */
export interface Follow {
  id: string;
  followerId: string;
  targetType: FollowTargetType;
  targetId: string;
  createdAt: string;
  // Relations
  follower?: User;
}

// ─── Pods ────────────────────────────────────────────────────

export interface Pod extends SoftDeletable {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  type: PodType;
  questId?: string;
  topicId?: string;
  creatorId: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  quest?: Quest;
  topic?: Topic;
  creator?: User;
  podMembers?: PodMember[];
}

/** Unique constraint on (podId, userId) */
export interface PodMember {
  id: string;
  podId: string;
  userId: string;
  role: PodMemberRole;
  joinedAt: string;
  // Relations
  pod?: Pod;
  user?: User;
}

// ─── Services & Bookings ─────────────────────────────────────

export interface Service extends SoftDeletable {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  providerUserId?: string;
  providerGuildId?: string;
  durationMinutes?: number;
  priceCurrency: string;
  priceAmount?: number;
  onlineLocationType?: OnlineLocationType;
  onlineLocationUrlTemplate?: string;
  isActive: boolean;
  stripePriceId?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  providerUser?: User;
  providerGuild?: Guild;
}

export interface ServiceTopic {
  id: string;
  serviceId: string;
  topicId: string;
  service?: Service;
  topic?: Topic;
}

export interface ServiceTerritory {
  id: string;
  serviceId: string;
  territoryId: string;
  service?: Service;
  territory?: Territory;
}

export interface Booking extends SoftDeletable {
  id: string;
  serviceId: string;
  requesterId: string;
  providerUserId?: string;
  providerGuildId?: string;
  companyId?: string;
  requestedDateTime?: string;
  startDateTime?: string;
  endDateTime?: string;
  status: BookingStatus;
  notes?: string;
  // Payment fields
  amount?: number;
  currency?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  paymentStatus?: PaymentStatus;
  // Call field
  callUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  service?: Service;
  requester?: User;
  providerUser?: User;
  providerGuild?: Guild;
  company?: Company;
}

// ─── Availability ────────────────────────────────────────────

export interface AvailabilityRule {
  id: string;
  providerUserId: string;
  serviceId?: string; // null = global, set = per-service override
  weekday: number; // 0=Monday, 1=Tuesday, …, 6=Sunday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  timezone: string; // e.g. "Europe/Paris"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityException {
  id: string;
  providerUserId: string;
  date: string; // "YYYY-MM-DD"
  isAvailable: boolean; // false = blocked, true = explicitly open
  startTime?: string;
  endTime?: string;
  createdAt: string;
}

// ─── Companies ───────────────────────────────────────────────

export interface Company extends SoftDeletable {
  id: string;
  name: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  sector?: string;
  size?: CompanySize;
  websiteUrl?: string;
  contactUserId?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  contactUser?: User;
  companyTopics?: CompanyTopic[];
  companyTerritories?: CompanyTerritory[];
}

export interface CompanyTopic {
  id: string;
  companyId: string;
  topicId: string;
  company?: Company;
  topic?: Topic;
}

export interface CompanyTerritory {
  id: string;
  companyId: string;
  territoryId: string;
  company?: Company;
  territory?: Territory;
}

// ─── Governance ──────────────────────────────────────────────

/** Unique constraint on (topicId, userId) */
export interface TopicSteward {
  id: string;
  topicId: string;
  userId: string;
  role: TopicStewardRole;
  createdAt: string;
  // Relations
  topic?: Topic;
  user?: User;
}

export interface TopicFeature {
  id: string;
  topicId: string;
  targetType: TopicFeatureTargetType;
  targetId: string;
  addedByUserId: string;
  createdAt: string;
  // Relations
  topic?: Topic;
  addedByUser?: User;
}
