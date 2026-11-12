/** Decodes HTML entities (&#8211;, &amp;, &eacute;…) in text scraped from web pages. */
export function decodeHtmlEntities(text: string | null | undefined): string | null {
  if (text == null) return null;
  if (!text.includes("&")) return text;
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}
