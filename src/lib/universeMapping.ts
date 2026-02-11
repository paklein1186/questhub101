/**
 * Cross-mapping between Creative Houses of Art and Impact Houses (Topics).
 *
 * When a user filters by Creative houses, we expand the filter to include
 * the linked Impact houses — and vice versa — to prevent empty results.
 */

export type UniverseMode = "creative" | "impact" | "both";

/**
 * Maps creative House-of-Art slugs → Impact topic names that are thematically related.
 * Keys are House of Art slugs (from HOUSES_OF_ART), values are arrays of real topic names.
 */
export const CREATIVE_TO_IMPACT: Record<string, string[]> = {
  "house-of-light": ["Arts & Culture", "Narratives & Storytelling", "Open Data & Technology"],
  "house-of-sound": ["Arts & Culture", "New Gatherings", "Hosting & Facilitation"],
  "house-of-story": ["Narratives & Storytelling", "Arts & Culture", "Leadership"],
  "house-of-movement": ["New Gatherings", "Healthcare", "Hosting & Facilitation"],
  "house-of-form": ["Impact Real Estate", "Territorial Innovation", "Third Spaces"],
  "house-of-nature": ["Land Regeneration", "Symbiotic & the Living", "Bioregions", "Water & Soils", "New Agriculture"],
  "house-of-ritual": ["Hosting & Facilitation", "New Gatherings", "Governance"],
};

/**
 * Reverse mapping: Impact topic name → Creative house slugs
 * Auto-generated from CREATIVE_TO_IMPACT.
 */
export const IMPACT_TO_CREATIVE: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const [houseSlug, impactNames] of Object.entries(CREATIVE_TO_IMPACT)) {
    for (const name of impactNames) {
      if (!map[name]) map[name] = [];
      if (!map[name].includes(houseSlug)) map[name].push(houseSlug);
    }
  }
  return map;
})();

/**
 * Given a set of selected topic IDs and the full topics list,
 * expand to include cross-mapped topics from the other universe.
 *
 * @param selectedIds - currently selected topic IDs
 * @param allTopics - array of { id, name, slug? } from DB
 * @param universe - which universe the user is viewing from
 * @returns expanded set of topic IDs
 */
export function expandTopicIds(
  selectedIds: string[],
  allTopics: { id: string; name: string; slug?: string }[],
  universe: UniverseMode,
): string[] {
  if (universe === "both" || selectedIds.length === 0) return selectedIds;

  const nameToId = new Map(allTopics.map(t => [t.name, t.id]));
  const idToName = new Map(allTopics.map(t => [t.id, t.name]));
  const slugToId = new Map(allTopics.map(t => [t.slug ?? "", t.id]));

  const expanded = new Set(selectedIds);

  for (const id of selectedIds) {
    const name = idToName.get(id) ?? "";

    if (universe === "creative") {
      // Selected topics might be creative house names — find linked impact topics
      // Try slug-based lookup first
      const slug = allTopics.find(t => t.id === id)?.slug ?? name.toLowerCase().replace(/\s+/g, "-");
      const linkedImpact = CREATIVE_TO_IMPACT[slug];
      if (linkedImpact) {
        for (const impactName of linkedImpact) {
          const impactId = nameToId.get(impactName);
          if (impactId) expanded.add(impactId);
        }
      }
    } else if (universe === "impact") {
      // Selected topics are impact topics — find linked creative houses
      const linkedHouseSlugs = IMPACT_TO_CREATIVE[name];
      if (linkedHouseSlugs) {
        for (const slug of linkedHouseSlugs) {
          const houseId = slugToId.get(slug);
          if (houseId) expanded.add(houseId);
        }
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Get the default universe for a persona.
 */
export function defaultUniverseForPersona(persona: string): UniverseMode {
  if (persona === "CREATIVE") return "creative";
  if (persona === "IMPACT") return "impact";
  return "both"; // HYBRID, UNSET, NEUTRAL
}
