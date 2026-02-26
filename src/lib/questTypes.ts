/** Quest Type (Level 1 categories) — values are stored in DB, do NOT rename */
export const QUEST_TYPES = [
  "CONTACT",
  "SERVICE",
  "ACTION",
  "PROJET",
  "EVENEMENT",
  "LIEU",
  "RESSOURCE",
  "FINANCEMENT",
  "PARTENARIAT",
  "APPRENTISSAGE",
] as const;

export type QuestType = (typeof QUEST_TYPES)[number];

/** i18n key map — use with t(`questTypes.${key}`) */
export const QUEST_TYPE_I18N_KEYS: Record<QuestType, string> = {
  CONTACT: "questTypes.CONTACT",
  SERVICE: "questTypes.SERVICE",
  ACTION: "questTypes.ACTION",
  PROJET: "questTypes.PROJET",
  EVENEMENT: "questTypes.EVENEMENT",
  LIEU: "questTypes.LIEU",
  RESSOURCE: "questTypes.RESSOURCE",
  FINANCEMENT: "questTypes.FINANCEMENT",
  PARTENARIAT: "questTypes.PARTENARIAT",
  APPRENTISSAGE: "questTypes.APPRENTISSAGE",
};

/**
 * @deprecated Use QUEST_TYPE_I18N_KEYS with useTranslation() instead.
 * Kept for backward compat in non-i18n contexts.
 */
export const QUEST_TYPE_LABELS: Record<QuestType, string> = {
  CONTACT: "Contact",
  SERVICE: "Service",
  ACTION: "Action",
  PROJET: "Project",
  EVENEMENT: "Event",
  LIEU: "Place",
  RESSOURCE: "Resource",
  FINANCEMENT: "Funding",
  PARTENARIAT: "Partnership",
  APPRENTISSAGE: "Learning",
};

export const QUEST_TYPE_COLORS: Record<QuestType, string> = {
  CONTACT: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  SERVICE: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  ACTION: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  PROJET: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  EVENEMENT: "bg-pink-500/10 text-pink-700 border-pink-500/30",
  LIEU: "bg-teal-500/10 text-teal-700 border-teal-500/30",
  RESSOURCE: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  FINANCEMENT: "bg-green-500/10 text-green-700 border-green-500/30",
  PARTENARIAT: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30",
  APPRENTISSAGE: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30",
};
