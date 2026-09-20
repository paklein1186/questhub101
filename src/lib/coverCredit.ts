export interface CoverCredit { author: string | null; license: string; license_url: string | null; source_url: string }

/** « Photo : Auteur · CC BY-SA 4.0 » — attribution required by the free licences of the cover photos. */
export function coverCreditText(c: CoverCredit | null | undefined): string | undefined {
  if (!c) return undefined;
  return `Photo: ${c.author ?? "Wikimedia Commons"} · ${c.license}`;
}
