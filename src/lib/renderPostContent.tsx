import React from "react";
import { renderMentions } from "@/components/MentionTextarea";

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;

/**
 * Renders post content with support for:
 * - **bold** → <strong>
 * - * bullet point lines → <ul><li>
 * - https?:// URLs → clickable <a>
 * - @mentions via renderMentions
 */
export function renderPostContent(
  text: string,
  options?: { onDark?: boolean }
): React.ReactNode {
  if (!text) return null;

  const lines = text.split("\n");

  const result: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let keyCounter = 0;

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    result.push(
      <ul key={`bullets-${keyCounter++}`} className="list-none space-y-1 my-1">
        {bulletBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-60" />
            <span>{renderInline(item, options)}</span>
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  lines.forEach((line, lineIdx) => {
    const isBullet = /^\*\s+(.*)/.test(line);

    if (isBullet) {
      const content = line.replace(/^\*\s+/, "");
      bulletBuffer.push(content);
    } else {
      flushBullets();
      const isLastLine = lineIdx === lines.length - 1;
      if (line === "") {
        result.push(<br key={`br-${keyCounter++}`} />);
      } else {
        result.push(
          <React.Fragment key={`line-${keyCounter++}`}>
            {renderInline(line, options)}
            {!isLastLine && <br />}
          </React.Fragment>
        );
      }
    }
  });

  flushBullets();

  return <>{result}</>;
}

/**
 * Renders inline content: **bold** + URLs + @mentions
 */
function renderInline(
  text: string,
  options?: { onDark?: boolean }
): React.ReactNode[] {
  // Step 1: split by **bold**
  const boldPattern = /\*\*(.+?)\*\*/g;
  const segments: Array<{ type: "text" | "bold"; content: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "bold", content: match[1] });
    lastIndex = boldPattern.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  // Step 2: for each segment, render mentions + URLs
  const result: React.ReactNode[] = [];
  segments.forEach((seg, segIdx) => {
    if (seg.type === "bold") {
      const inner = renderWithUrls(seg.content, options, `bold-${segIdx}`);
      result.push(
        <strong key={`bold-${segIdx}`} className="font-semibold">
          {inner}
        </strong>
      );
    } else {
      const parts = renderWithUrls(seg.content, options, `seg-${segIdx}`);
      parts.forEach((part, pIdx) => {
        result.push(
          <React.Fragment key={`seg-${segIdx}-p-${pIdx}`}>{part}</React.Fragment>
        );
      });
    }
  });

  return result;
}

/**
 * Splits text by URLs first, then runs renderMentions on non-URL parts.
 */
function renderWithUrls(
  text: string,
  options: { onDark?: boolean } | undefined,
  keyPrefix: string
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_REGEX.source, "g");
  let idx = 0;

  while ((match = re.exec(text)) !== null) {
    // Text before URL — run through mentions
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      const mentionParts = renderMentions(before, options);
      mentionParts.forEach((p, pi) => {
        parts.push(
          <React.Fragment key={`${keyPrefix}-pre-${idx}-${pi}`}>{p}</React.Fragment>
        );
      });
    }

    // The URL itself
    const url = match[0];
    parts.push(
      <a
        key={`${keyPrefix}-url-${idx}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={
          options?.onDark
            ? "underline decoration-white/40 hover:decoration-white text-white/90 break-all"
            : "text-primary underline decoration-primary/40 hover:decoration-primary break-all"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );

    lastIndex = re.lastIndex;
    idx++;
  }

  // Remaining text after last URL
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    const mentionParts = renderMentions(remaining, options);
    mentionParts.forEach((p, pi) => {
      parts.push(
        <React.Fragment key={`${keyPrefix}-post-${idx}-${pi}`}>{p}</React.Fragment>
      );
    });
  }

  // If no URLs were found at all, just render mentions
  if (parts.length === 0) {
    const mentionParts = renderMentions(text, options);
    mentionParts.forEach((p, pi) => {
      parts.push(
        <React.Fragment key={`${keyPrefix}-m-${pi}`}>{p}</React.Fragment>
      );
    });
  }

  return parts;
}
