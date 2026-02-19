import React from "react";
import { renderMentions } from "@/components/MentionTextarea";

/**
 * Renders post content with support for:
 * - **bold** → <strong>
 * - * bullet point lines → <ul><li>
 * - @mentions via renderMentions
 */
export function renderPostContent(
  text: string,
  options?: { onDark?: boolean }
): React.ReactNode {
  if (!text) return null;

  // Split into lines to handle bullet points
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
        // Empty line = paragraph break
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
 * Renders inline content: **bold** + @mentions
 */
function renderInline(
  text: string,
  options?: { onDark?: boolean }
): React.ReactNode[] {
  // First split by **bold** markers
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

  // Now process each segment through renderMentions
  const result: React.ReactNode[] = [];
  segments.forEach((seg, segIdx) => {
    if (seg.type === "bold") {
      const inner = renderMentions(seg.content, options);
      result.push(
        <strong key={`bold-${segIdx}`} className="font-semibold">
          {inner}
        </strong>
      );
    } else {
      const parts = renderMentions(seg.content, options);
      parts.forEach((part, pIdx) => {
        result.push(
          <React.Fragment key={`seg-${segIdx}-${pIdx}`}>{part}</React.Fragment>
        );
      });
    }
  });

  return result;
}
