const FR = new Set(["le", "la", "les", "des", "du", "de", "un", "une", "et", "est", "dans", "pour", "avec", "sur", "qui", "que", "au", "aux", "ce", "cette", "ses", "son", "sa", "nous", "vous", "il", "elle", "par", "pas", "ou", "où", "d", "l", "à", "en", "sont", "ainsi"]);
const EN = new Set(["the", "and", "of", "to", "in", "is", "for", "with", "on", "that", "this", "are", "it", "as", "by", "at", "from", "an", "be", "or", "we", "you", "our", "their", "has", "have", "which", "into"]);

/** Cheap French/English guess from stop-words. Returns null when the text is too short or ambiguous. */
export function detectLanguage(text: string | null | undefined): "fr" | "en" | null {
  if (!text) return null;
  const words = text.toLowerCase().normalize("NFC").match(/[\p{L}']+/gu) ?? [];
  if (words.length < 6) return null;
  let fr = 0, en = 0;
  for (const raw of words) {
    for (const w of raw.split("'")) {
      if (FR.has(w)) fr++;
      if (EN.has(w)) en++;
    }
  }
  if (fr + en < 3) return null;
  if (fr > en * 1.5) return "fr";
  if (en > fr * 1.5) return "en";
  return null;
}
