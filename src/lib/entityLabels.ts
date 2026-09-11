import type { TFunction } from "i18next";

/**
 * Central place to translate the raw enum/taxonomy values stored in the
 * database (topic names, entity types, task statuses, company sizes).
 * These are plain strings coming straight from Postgres columns or joined
 * tables, so they need an explicit lookup rather than a t() call on the
 * value itself. Falls back to the raw value if it isn't a known one, so
 * new taxonomy entries never disappear from the UI while waiting on a
 * translation.
 */

const TOPIC_NAME_TO_KEY: Record<string, string> = {
  "House of Form": "houseOfForm",
  "House of Light": "houseOfLight",
  "House of Movement": "houseOfMovement",
  "House of Nature": "houseOfNature",
  "House of Ritual": "houseOfRitual",
  "House of Sound": "houseOfSound",
  "House of Story": "houseOfStory",
  "Adaptability": "adaptability",
  "AI": "ai",
  "Arts & Culture": "artsCulture",
  "Bioregions": "bioregions",
  "Carbon Capture": "carbonCapture",
  "Commons & DAO": "commonsDao",
  "Complex Systems": "complexSystems",
  "CSR": "csr",
  "Energy": "energy",
  "Governance": "governance",
  "Healthcare": "healthcare",
  "Hosting & Facilitation": "hostingFacilitation",
  "Impact Real Estate": "impactRealEstate",
  "Investments & Philanthropy": "investmentsPhilanthropy",
  "Journalism & Medias": "journalismMedias",
  "Land Regeneration": "landRegeneration",
  "Leadership": "leadership",
  "Low-tech": "lowTech",
  "Metrics": "metrics",
  "Narratives & Storytelling": "narrativesStorytelling",
  "New Agriculture": "newAgriculture",
  "New Economic Models": "newEconomicModels",
  "New Gatherings": "newGatherings",
  "Open Data & Technology": "openDataTechnology",
  "Regenerative Crypto": "regenerativeCrypto",
  "Symbiotic & the Living": "symbioticLiving",
  "Territorial Innovation": "territorialInnovation",
  "Third Spaces": "thirdSpaces",
  "Transformative Education": "transformativeEducation",
  "Water & Soils": "waterSoils",
};

/** Translates a topic/tag's stored English `name` (e.g. "Third Spaces"). */
export function translateTopicName(name: string, t: TFunction): string {
  const key = TOPIC_NAME_TO_KEY[name];
  return key ? t(`topics.${key}`, { defaultValue: name }) : name;
}

const ENTITY_TYPE_KEYS = ["guild", "network", "collective", "pod", "company"] as const;

/** Translates a guild/entity `type` column value (e.g. "GUILD", "network"). */
export function translateEntityType(type: string | null | undefined, t: TFunction): string {
  const key = (type ?? "").toLowerCase();
  if ((ENTITY_TYPE_KEYS as readonly string[]).includes(key)) {
    return t(`entityTypes.${key}`, { defaultValue: type ?? "" });
  }
  return type ?? "";
}

const TASK_STATUS_KEYS: Record<string, string> = {
  BACKLOG: "backlog",
  TODO: "todo",
  IN_PROGRESS: "inProgress",
  DONE: "done",
};

/** Translates a task/quest `status` or `workState` column value. */
export function translateTaskStatus(status: string | null | undefined, t: TFunction): string {
  const key = TASK_STATUS_KEYS[status ?? ""];
  const fallback: Record<string, string> = { BACKLOG: "Backlog", TODO: "To do next", IN_PROGRESS: "In progress", DONE: "Done" };
  return key ? t(`taskStatus.${key}`, { defaultValue: fallback[status ?? ""] ?? status ?? "" }) : (status ?? "");
}

const COMPANY_SIZE_KEYS: Record<string, string> = {
  MICRO: "micro",
  SME: "sme",
  LARGE: "large",
  OTHER: "other",
};

/** Translates a company's `size` column value (e.g. "SME", "MICRO"). */
export function translateCompanySize(size: string | null | undefined, t: TFunction): string {
  const key = COMPANY_SIZE_KEYS[size ?? ""];
  return key ? t(`companySize.${key}`, { defaultValue: size ?? "" }) : (size ?? "");
}
