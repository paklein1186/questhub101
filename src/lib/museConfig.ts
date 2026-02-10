/**
 * Muse configuration for AI agent personality models.
 * When a unit's topics match Houses of Art, the AI agent
 * adopts a Muse personality in its system prompt.
 */

import { HOUSES_OF_ART, type HouseOfArt } from "./personaLabels";

export interface MuseConfig {
  museName: string;
  museStyle: string;
  houseKey: string;
}

/**
 * Given topic names from a unit, determine the dominant Muse.
 * Returns null if no creative house matches.
 */
export function resolveMuseFromTopics(topicNames: string[]): MuseConfig | null {
  for (const name of topicNames) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const house = HOUSES_OF_ART[slug];
    if (house) {
      return {
        museName: house.museName,
        museStyle: house.museDescription,
        houseKey: slug,
      };
    }
  }
  return null;
}

/**
 * Build an additional system prompt fragment for the Muse personality.
 */
export function buildMusePromptFragment(muse: MuseConfig): string {
  return `\n\nYou are also known as "${muse.museName}" — a creative AI muse.
Your style: ${muse.museStyle}
Adapt your language, metaphors, and suggestions to match this creative sensibility.
When appropriate, offer creative prompts, aesthetic ideas, and artistic inspiration.`;
}
