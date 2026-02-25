import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Users, Building2, Compass, User } from "lucide-react";

/** Mention types supported by the system */
export type MentionEntityType = "user" | "guild" | "company" | "quest" | "service" | "course" | "event" | "territory" | "pod";

export interface MentionedEntity {
  entityType: MentionEntityType;
  entityId: string;
  name: string;
}

/** @deprecated Use MentionedEntity instead */
export interface MentionedUser {
  userId: string;
  name: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentions: MentionedUser[]) => void;
  onEntityMentionsChange?: (mentions: MentionedEntity[]) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  mentionHint?: string;
  /** Entity context for @members/@followers. If provided, these bulk options appear in the dropdown. */
  entityContext?: { entityType: string; entityId: string };
}

interface SuggestionItem {
  entityType: MentionEntityType;
  id: string;
  name: string;
  avatar_url: string | null;
}

const ENTITY_ICON: Record<MentionEntityType, typeof User> = {
  user: User,
  guild: Users,
  company: Building2,
  quest: Compass,
  service: Compass,
  course: Compass,
  event: Compass,
  territory: Compass,
  pod: Users,
};

const ENTITY_LABEL: Record<MentionEntityType, string> = {
  user: "User",
  guild: "Guild",
  company: "Company",
  quest: "Quest",
  service: "Service",
  course: "Course",
  event: "Event",
  territory: "Territory",
  pod: "Pod",
};

export function MentionTextarea({
  value,
  onChange,
  onMentionsChange,
  onEntityMentionsChange,
  placeholder,
  className,
  maxLength,
  onKeyDown,
  mentionHint,
  entityContext,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [entityMentions, setEntityMentions] = useState<MentionedEntity[]>([]);

  // Search users, guilds, companies, quests
  useEffect(() => {
    if (!showSuggestions || query.length < 1) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const likeQ = `%${query}%`;

        const [usersRes, guildsRes, companiesRes, questsRes] = await Promise.all([
          (supabase as any).from("profiles_public").select("user_id, name, avatar_url").ilike("name", likeQ).limit(4),
          supabase.from("guilds").select("id, name, logo_url").ilike("name", likeQ).eq("is_deleted", false).limit(3),
          supabase.from("companies").select("id, name, logo_url").ilike("name", likeQ).eq("is_deleted", false).limit(3),
          supabase.from("quests").select("id, title").ilike("title", likeQ).eq("is_deleted", false).limit(3),
        ]);

        const items: SuggestionItem[] = [];

        // Add @members and @followers bulk options if entity context is provided and query matches
        if (entityContext) {
          if ("members".startsWith(query.toLowerCase())) {
            items.push({ entityType: "user" as const, id: `bulk:members:${entityContext.entityType}:${entityContext.entityId}`, name: "members", avatar_url: null });
          }
          if ("followers".startsWith(query.toLowerCase())) {
            items.push({ entityType: "user" as const, id: `bulk:followers:${entityContext.entityType}:${entityContext.entityId}`, name: "followers", avatar_url: null });
          }
        }

        items.push(
          ...(usersRes.data ?? []).map((u: any) => ({ entityType: "user" as const, id: u.user_id, name: u.name, avatar_url: u.avatar_url })),
          ...(guildsRes.data ?? []).map((g: any) => ({ entityType: "guild" as const, id: g.id, name: g.name, avatar_url: g.logo_url })),
          ...(companiesRes.data ?? []).map((c: any) => ({ entityType: "company" as const, id: c.id, name: c.name, avatar_url: c.logo_url })),
          ...(questsRes.data ?? []).map((q: any) => ({ entityType: "quest" as const, id: q.id, name: q.title, avatar_url: null })),
        );

        setSuggestions(items);
      } catch {
        setSuggestions([]);
      }
      setLoading(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, showSuggestions, entityContext]);

  const handleInput = useCallback(
    (newValue: string) => {
      onChange(newValue);

      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursor = textarea.selectionStart;
      const textBefore = newValue.slice(0, cursor);

      const lastAt = textBefore.lastIndexOf("@");
      if (lastAt >= 0) {
        const charBefore = lastAt > 0 ? textBefore[lastAt - 1] : " ";
        if (lastAt === 0 || /\s/.test(charBefore)) {
          const afterAt = textBefore.slice(lastAt + 1);
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
    (item: SuggestionItem) => {
      if (mentionStart === null) return;

      const before = value.slice(0, mentionStart);
      const textarea = textareaRef.current;
      const cursor = textarea?.selectionStart ?? value.length;
      const after = value.slice(cursor);

      // Format: @[Name](type:id) — user mentions keep backward compat @[Name](userId)
      const mentionToken = item.entityType === "user"
        ? `@[${item.name}](${item.id})`
        : `@[${item.name}](${item.entityType}:${item.id})`;
      const newValue = `${before}${mentionToken} ${after}`;
      onChange(newValue);

      // Track entity mention
      const newMention: MentionedEntity = { entityType: item.entityType, entityId: item.id, name: item.name };
      const updated = [...entityMentions.filter((m) => !(m.entityType === item.entityType && m.entityId === item.id)), newMention];
      setEntityMentions(updated);
      onEntityMentionsChange?.(updated);

      // Backward compat: also report user mentions via legacy callback
      if (item.entityType === "user") {
        const userMentions = updated.filter((m) => m.entityType === "user").map((m) => ({ userId: m.entityId, name: m.name }));
        onMentionsChange?.(userMentions);
      }

      setShowSuggestions(false);
      setMentionStart(null);
      setQuery("");

      setTimeout(() => {
        if (textarea) {
          const newCursor = before.length + mentionToken.length + 1;
          textarea.focus();
          textarea.setSelectionRange(newCursor, newCursor);
        }
      }, 0);
    },
    [mentionStart, value, onChange, entityMentions, onEntityMentionsChange, onMentionsChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions && suggestions.length > 0) {
        if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1)); return; }
        if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); return; }
        if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(suggestions[selectedIndex]); return; }
        if (e.key === "Escape") { e.preventDefault(); setShowSuggestions(false); return; }
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

  // Compute dropdown position relative to viewport when suggestions show
  useEffect(() => {
    if (!showSuggestions || !textareaRef.current) {
      setDropdownPos(null);
      return;
    }
    const updatePos = () => {
      const rect = textareaRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Place above the textarea if near bottom, otherwise below
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 224; // max-h-56 = 14rem = 224px
      const top = spaceBelow < dropdownHeight
        ? rect.top - dropdownHeight
        : rect.bottom + 4;
      setDropdownPos({ top, left: rect.left, width: Math.min(rect.width, 288) });
    };
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
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

      {showSuggestions && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-72 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          )}
          {!loading && suggestions.length === 0 && query.length >= 1 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No results found</div>
          )}
          {suggestions.map((item, i) => {
            const isBulk = item.id.startsWith("bulk:");
            const Icon = isBulk ? Users : ENTITY_ICON[item.entityType];
            return (
              <button
                key={`${item.entityType}-${item.id}`}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                  i === selectedIndex && "bg-accent",
                  isBulk && "font-semibold text-primary",
                )}
                onMouseDown={(e) => { e.preventDefault(); insertMention(item); }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={item.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    <Icon className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <span className="truncate font-medium flex-1">
                  {isBulk ? `@${item.name}` : item.name}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {isBulk ? "Notify all" : ENTITY_LABEL[item.entityType]}
                </span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Mention parsing utilities ──────────────────────────────

// Matches both @[Name](userId) and @[Name](type:id)
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Parse a mention reference string into type + id.
 * "guild:abc" → { type: "guild", id: "abc" }
 * "abc-123"  → { type: "user", id: "abc-123" }
 */
function parseMentionRef(ref: string): { type: MentionEntityType; id: string } {
  // Handle bulk mentions
  if (ref.startsWith("bulk:")) {
    return { type: "user", id: ref };
  }
  const colonIdx = ref.indexOf(":");
  if (colonIdx > 0) {
    const type = ref.slice(0, colonIdx) as MentionEntityType;
    if (["guild", "company", "quest", "service", "course", "event", "territory", "pod"].includes(type)) {
      return { type, id: ref.slice(colonIdx + 1) };
    }
  }
  return { type: "user", id: ref };
}

/**
 * Extract mentioned user IDs from raw text (backward compat).
 */
export function extractMentionIds(text: string): string[] {
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_REGEX.source, "g");
  while ((match = re.exec(text)) !== null) {
    const parsed = parseMentionRef(match[2]);
    if (parsed.type === "user") ids.push(parsed.id);
  }
  return [...new Set(ids)];
}

/**
 * Extract all entity mentions (users, guilds, companies, quests).
 */
export function extractAllMentions(text: string): MentionedEntity[] {
  const mentions: MentionedEntity[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_REGEX.source, "g");
  while ((match = re.exec(text)) !== null) {
    const parsed = parseMentionRef(match[2]);
    mentions.push({ entityType: parsed.type, entityId: parsed.id, name: match[1] });
  }
  return mentions;
}

/**
 * Extract bulk mention tokens (@members, @followers) from text.
 * Returns array of { mentionType: "members"|"followers", entityType, entityId }
 */
export function extractBulkMentions(text: string): { mentionType: "members" | "followers"; entityType: string; entityId: string }[] {
  const results: { mentionType: "members" | "followers"; entityType: string; entityId: string }[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_REGEX.source, "g");
  while ((match = re.exec(text)) !== null) {
    const ref = match[2];
    if (ref.startsWith("bulk:")) {
      // Format: bulk:members:GUILD:id or bulk:followers:GUILD:id
      const parts = ref.split(":");
      if (parts.length === 4) {
        results.push({ mentionType: parts[1] as "members" | "followers", entityType: parts[2], entityId: parts[3] });
      }
    }
  }
  return results;
}

function entityLink(type: MentionEntityType, id: string): string {
  const routes: Record<MentionEntityType, string> = {
    user: "/users/",
    guild: "/guilds/",
    company: "/companies/",
    quest: "/quests/",
    service: "/services/",
    course: "/courses/",
    event: "/events/",
    territory: "/territories/",
    pod: "/pods/",
  };
  return `${routes[type] || "/"}${id}`;
}

/**
 * Convert mention tokens to display JSX.
 * User mentions → inline @Name link
 * Entity mentions (quest, guild, etc.) → clickable Badge
 */
export function renderMentions(text: string, options?: { onDark?: boolean }): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_REGEX.source, "g");
  const onDark = options?.onDark ?? false;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const name = match[1];
    const parsed = parseMentionRef(match[2]);
    const href = entityLink(parsed.type, parsed.id);

    if (parsed.id.startsWith("bulk:")) {
      // Bulk mention: render as a styled badge (no link)
      parts.push(
        <Badge
          key={`bulk-${match.index}`}
          variant="secondary"
          className={onDark
            ? "text-[10px] bg-white/20 text-white border-0 font-semibold"
            : "text-[10px] bg-primary/15 text-primary font-semibold"}
        >
          @{name}
        </Badge>,
      );
    } else if (parsed.type === "user") {
      parts.push(
        <Link
          key={`${parsed.type}-${parsed.id}-${match.index}`}
          to={href}
          className={onDark
            ? "font-semibold text-white/90 underline decoration-white/40 hover:decoration-white"
            : "font-semibold text-primary hover:underline"}
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </Link>,
      );
    } else {
      parts.push(
        <Link
          key={`${parsed.type}-${parsed.id}-${match.index}`}
          to={href}
          className="inline-flex"
          onClick={(e) => e.stopPropagation()}
        >
          <Badge variant="secondary" className={onDark
            ? "text-[10px] cursor-pointer bg-white/20 text-white hover:bg-white/30 transition-colors border-0"
            : "text-[10px] cursor-pointer hover:bg-primary/20 transition-colors"}>
            {name}
          </Badge>
        </Link>,
      );
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
