export enum UserRole {
  GAMECHANGER = "GAMECHANGER",
  ECOSYSTEM_BUILDER = "ECOSYSTEM_BUILDER",
  BOTH = "BOTH",
}

export enum GuildType {
  GUILD = "GUILD",
  NETWORK = "NETWORK",
  COLLECTIVE = "COLLECTIVE",
}

export enum GuildMemberRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum QuestStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export enum MonetizationType {
  FREE = "FREE",
  PAID = "PAID",
  MIXED = "MIXED",
}

export enum QuestParticipantRole {
  OWNER = "OWNER",
  COLLABORATOR = "COLLABORATOR",
  FOLLOWER = "FOLLOWER",
}

export enum QuestParticipantStatus {
  INVITED = "INVITED",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
}

export enum QuestUpdateType {
  GENERAL = "GENERAL",
  CALL_FOR_HELP = "CALL_FOR_HELP",
  MILESTONE = "MILESTONE",
  REFLECTION = "REFLECTION",
}

export enum TerritoryLevel {
  TOWN = "TOWN",
  REGION = "REGION",
  NATIONAL = "NATIONAL",
  OTHER = "OTHER",
}

export enum CommentTargetType {
  USER = "USER",
  GUILD = "GUILD",
  QUEST = "QUEST",
  QUEST_UPDATE = "QUEST_UPDATE",
  ACHIEVEMENT = "ACHIEVEMENT",
  POD = "POD",
  SERVICE = "SERVICE",
  COMPANY = "COMPANY",
}

export enum NotificationType {
  COMMENT = "COMMENT",
  UPVOTE = "UPVOTE",
  INVITE = "INVITE",
  QUEST_UPDATE = "QUEST_UPDATE",
  BOOKING = "BOOKING",
}

export enum FollowTargetType {
  USER = "USER",
  GUILD = "GUILD",
  QUEST = "QUEST",
  COMPANY = "COMPANY",
}

export enum PodType {
  QUEST_POD = "QUEST_POD",
  STUDY_POD = "STUDY_POD",
}

export enum PodMemberRole {
  HOST = "HOST",
  MEMBER = "MEMBER",
}

export enum BookingStatus {
  REQUESTED = "REQUESTED",
  PENDING_PAYMENT = "PENDING_PAYMENT",
  CONFIRMED = "CONFIRMED",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}

export enum OnlineLocationType {
  JITSI = "JITSI",
  ZOOM = "ZOOM",
  OTHER = "OTHER",
}

export enum PaymentStatus {
  NOT_REQUIRED = "NOT_REQUIRED",
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum CompanySize {
  MICRO = "MICRO",
  SME = "SME",
  LARGE = "LARGE",
  OTHER = "OTHER",
}

export enum TopicStewardRole {
  STEWARD = "STEWARD",
  CURATOR = "CURATOR",
}

export enum TopicFeatureTargetType {
  QUEST = "QUEST",
  GUILD = "GUILD",
}

export enum ReportTargetType {
  USER = "USER",
  GUILD = "GUILD",
  QUEST = "QUEST",
  POD = "POD",
  SERVICE = "SERVICE",
  COMMENT = "COMMENT",
  BOOKING = "BOOKING",
}

export enum ReportStatus {
  OPEN = "OPEN",
  REVIEWED = "REVIEWED",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

export enum AttachmentTargetType {
  QUEST = "QUEST",
  QUEST_UPDATE = "QUEST_UPDATE",
  POD = "POD",
  GUILD = "GUILD",
  COMPANY = "COMPANY",
}
