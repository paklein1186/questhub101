import { useEffect, useRef, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ONBOARDING_FR, TRANSLATABLE_ATTRS } from "@/i18n/onboardingFR";

/**
 * Wraps an onboarding screen and replaces visible English text/attributes
 * with their French equivalents from ONBOARDING_FR when locale === "fr".
 *
 * This is a pragmatic overlay — it preserves the underlying React tree and
 * does not require touching every JSX literal in the wizard. New strings
 * fall through untranslated until added to the dictionary.
 */
export function FrenchTextOverlay({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isFR = (i18n.language || "").toLowerCase().startsWith("fr");

  useEffect(() => {
    if (!isFR || !ref.current) return;
    const root = ref.current;

    const translateText = (raw: string): string | null => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      const fr = ONBOARDING_FR[trimmed];
      if (!fr) return null;
      // Preserve surrounding whitespace
      const leading = raw.match(/^\s*/)?.[0] ?? "";
      const trailing = raw.match(/\s*$/)?.[0] ?? "";
      return leading + fr + trailing;
    };

    const walkTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (!parent) return;
        const tag = parent.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA") return;
        const next = translateText(node.nodeValue || "");
        if (next !== null && next !== node.nodeValue) {
          node.nodeValue = next;
        }
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        for (const attr of TRANSLATABLE_ATTRS) {
          const v = el.getAttribute(attr);
          if (v) {
            const t = translateText(v);
            if (t !== null && t !== v) el.setAttribute(attr, t);
          }
        }
        // Translate empty-input placeholder via property too
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          const ph = el.placeholder;
          if (ph) {
            const t = translateText(ph);
            if (t !== null && t !== ph) el.placeholder = t;
          }
        }
        node.childNodes.forEach(walkTextNodes);
      }
    };

    // Initial pass
    walkTextNodes(root);

    // Observe further DOM changes from the React tree
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
          const next = translateText(m.target.nodeValue || "");
          if (next !== null && next !== m.target.nodeValue) {
            m.target.nodeValue = next;
          }
        } else if (m.type === "childList") {
          m.addedNodes.forEach(walkTextNodes);
        } else if (m.type === "attributes" && m.target.nodeType === Node.ELEMENT_NODE) {
          const el = m.target as HTMLElement;
          const attr = m.attributeName;
          if (attr && TRANSLATABLE_ATTRS.includes(attr)) {
            const v = el.getAttribute(attr);
            if (v) {
              const t = translateText(v);
              if (t !== null && t !== v) el.setAttribute(attr, t);
            }
          }
        }
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRS,
    });

    return () => observer.disconnect();
  }, [isFR, i18n.language]);

  return <div ref={ref}>{children}</div>;
}
