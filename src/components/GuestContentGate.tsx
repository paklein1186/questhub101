import { useAuth } from "@/hooks/useAuth";
import { Lock } from "lucide-react";

interface GuestContentGateProps {
  children: React.ReactNode;
  /** Fallback shown to guests instead of children */
  fallback?: React.ReactNode;
  /** If true, blur the content instead of hiding completely */
  blur?: boolean;
  /**
   * Optional plain text. When provided to guests, the first N sentences
   * (default 3) are shown clearly, and the remainder is blurred.
   * Falls back to fully blurring `children` if not provided.
   */
  previewText?: string;
  /** Number of leading sentences to keep readable for guests. Default 3. */
  previewSentences?: number;
}

/**
 * Hides or blurs content for unauthenticated users.
 * Use on detail pages to protect descriptions, bios, and sensitive data
 * while still showing names and images.
 */
export function GuestContentGate({
  children,
  fallback,
  blur,
  previewText,
  previewSentences = 3,
}: GuestContentGateProps) {
  const { session } = useAuth();
  if (session) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  // Preview mode: show first N sentences, blur the rest
  if (previewText && previewText.trim().length > 0) {
    const { visible, hidden } = splitSentences(previewText, previewSentences);
    if (hidden.length === 0) {
      // Nothing to hide — show as-is
      return (
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
          {visible}
        </p>
      );
    }
    return (
      <div className="relative">
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
          <span>{visible}</span>{" "}
          <span className="relative inline">
            <span className="blur-sm select-none pointer-events-none" aria-hidden="true">
              {hidden}
            </span>
          </span>
        </p>
        <div className="mt-3 flex">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border shadow-sm">
            <Lock className="h-3 w-3" />
            Sign up to see more
          </div>
        </div>
      </div>
    );
  }

  if (blur) {
    return (
      <div className="relative select-none">
        <div className="blur-sm pointer-events-none" aria-hidden="true">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border shadow-sm">
            <Lock className="h-3 w-3" />
            Sign up to see more
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Split text into the first N sentences (visible) and the remainder (hidden).
 * Sentence boundaries are detected on `.`, `!`, `?` (and their full-width
 * counterparts) followed by whitespace. Falls back gracefully when no
 * sentence delimiters are present by splitting on line breaks.
 */
function splitSentences(text: string, n: number): { visible: string; hidden: string } {
  if (n <= 0) return { visible: "", hidden: text };
  // Match sentence chunks ending with .!? (optionally followed by quotes/brackets) + whitespace,
  // OR a final chunk without trailing punctuation.
  const regex = /[^.!?。！？]+[.!?。！？]+["'”’)\]]?\s*|[^.!?。！？]+$/g;
  const matches = text.match(regex);
  if (!matches || matches.length <= n) {
    // Try line-based fallback
    const lines = text.split(/\n+/);
    if (lines.length > n) {
      return {
        visible: lines.slice(0, n).join("\n"),
        hidden: "\n" + lines.slice(n).join("\n"),
      };
    }
    return { visible: text, hidden: "" };
  }
  const visible = matches.slice(0, n).join("").trimEnd();
  const hidden = matches.slice(n).join("");
  return { visible, hidden: " " + hidden };
}

/**
 * Hook to check if the current visitor is a guest (not logged in).
 */
export function useIsGuest() {
  const { session } = useAuth();
  return !session;
}
