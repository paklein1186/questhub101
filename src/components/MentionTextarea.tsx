import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface MentionedUser {
  userId: string;
  name: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentions: MentionedUser[]) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  /** Hint shown below the textarea */
  mentionHint?: string;
}

interface SuggestedUser {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

/**
 * Textarea that supports @mention autocomplete.
 *
 * Mention format in text: `@[Name](userId)`
 * Display format: `@Name` (rendered bold/colored in read views)
 */
export function MentionTextarea({
  value,
  onChange,
  onMentionsChange,
  placeholder,
  className,
  maxLength,
  onKeyDown,
  mentionHint,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Track all mentioned users in the current text
  const [mentions, setMentions] = useState<MentionedUser[]>([]);

  // Search users when query changes
  useEffect(() => {
    if (!showSuggestions || query.length < 1) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .ilike("name", `%${query}%`)
          .limit(8);
        setSuggestions((data ?? []) as SuggestedUser[]);
      } catch {
        setSuggestions([]);
      }
      setLoading(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, showSuggestions]);

  const handleInput = useCallback(
    (newValue: string) => {
      onChange(newValue);

      // Detect @mention trigger
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursor = textarea.selectionStart;
      const textBefore = newValue.slice(0, cursor);

      // Find the last @ that isn't part of an existing mention
      const lastAt = textBefore.lastIndexOf("@");
      if (lastAt >= 0) {
        const charBefore = lastAt > 0 ? textBefore[lastAt - 1] : " ";
        // @ must be at start or preceded by whitespace
        if (lastAt === 0 || /\s/.test(charBefore)) {
          const afterAt = textBefore.slice(lastAt + 1);
          // No spaces allowed in mention query (simple rule)
          if (/^[^\s@]{0,30}$/.test(afterAt)) {
            setMentionStart(lastAt);
            setQuery(afterAt);
            setShowSuggestions(true);
            setSelectedIndex(0);
            return;
          }
        }
      }

      setShowSuggestions(false);
      setMentionStart(null);
    },
    [onChange],
  );

  const insertMention = useCallback(
    (user: SuggestedUser) => {
      if (mentionStart === null) return;

      const before = value.slice(0, mentionStart);
      const textarea = textareaRef.current;
      const cursor = textarea?.selectionStart ?? value.length;
      const after = value.slice(cursor);

      const mentionToken = `@[${user.name}](${user.user_id})`;
      const newValue = `${before}${mentionToken} ${after}`;
      onChange(newValue);

      // Track mention
      const newMention: MentionedUser = { userId: user.user_id, name: user.name };
      const updated = [...mentions.filter((m) => m.userId !== user.user_id), newMention];
      setMentions(updated);
      onMentionsChange?.(updated);

      setShowSuggestions(false);
      setMentionStart(null);
      setQuery("");

      // Restore focus
      setTimeout(() => {
        if (textarea) {
          const newCursor = before.length + mentionToken.length + 1;
          textarea.focus();
          textarea.setSelectionRange(newCursor, newCursor);
        }
      }, 0);
    },
    [mentionStart, value, onChange, mentions, onMentionsChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions && suggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowSuggestions(false);
          return;
        }
      }
      onKeyDown?.(e);
    },
    [showSuggestions, suggestions, selectedIndex, insertMention, onKeyDown],
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSuggestions]);

  return (
    <div className="relative w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("resize-none text-sm", className)}
        maxLength={maxLength}
      />

      {mentionHint && !showSuggestions && (
        <p className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {mentionHint}
        </p>
      )}

      {showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-64 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
        >
          {loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          )}
          {!loading && suggestions.length === 0 && query.length >= 1 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No users found</div>
          )}
          {suggestions.map((user, i) => (
            <button
              key={user.user_id}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                i === selectedIndex && "bg-accent",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(user);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{user.name?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">{user.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mention parsing utilities ──────────────────────────────

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Extract mentioned user IDs from raw text containing mention tokens.
 */
export function extractMentionIds(text: string): string[] {
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    ids.push(match[2]);
  }
  return [...new Set(ids)];
}

/**
 * Convert mention tokens to display JSX.
 * Renders `@[Name](userId)` as a clickable `@Name` span.
 */
export function renderMentions(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_REGEX.source, "g");

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const name = match[1];
    const userId = match[2];
    parts.push(
      <a
        key={`${userId}-${match.index}`}
        href={`/users/${userId}`}
        className="font-semibold text-primary hover:underline"
        title="View profile"
      >
        @{name}
      </a>,
    );
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
