import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

// No typography plugin in the project: style the markdown elements directly.
export const MARKDOWN_CLASSES = [
  "text-sm leading-relaxed break-words",
  "[&>*+*]:mt-2.5",
  "[&_h1]:text-base [&_h1]:font-semibold",
  "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:pt-2",
  "[&_h3]:text-sm [&_h3]:font-medium [&_h3]:pt-1",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
  "[&_li>p]:inline [&_li>ul]:mt-1",
  "[&_code]:bg-background/60 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs",
  "[&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
  "[&_hr]:my-3 [&_hr]:border-border",
].join(" ");

export interface NamedLink { name: string; href: string }

/** Turns known names into markdown links, leaving existing links untouched. */
export function linkifyNames(text: string, names: NamedLink[]): string {
  const usable = names.filter((n) => n.name.trim().length >= 3);
  if (!text || usable.length === 0) return text;
  const sorted = [...usable].sort((a, b) => b.name.length - a.name.length);
  const hrefByName = new Map(sorted.map((n) => [n.name.trim().toLowerCase(), n.href]));
  const escaped = sorted.map((n) => n.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join("|")})(?![\\p{L}\\p{N}])`, "giu");
  return text
    .split(/(\[[^\]]*\]\([^)]*\))/g)
    .map((part) => (part.startsWith("[") && part.includes("](") ? part : part.replace(re, (m) => `[${m}](${hrefByName.get(m.toLowerCase())})`)))
    .join("");
}

export function AgentMarkdown({ children, links = [], className = "" }: { children: string; links?: NamedLink[]; className?: string }) {
  return (
    <div className={`${MARKDOWN_CLASSES} ${className}`}>
      <ReactMarkdown
        components={{
          a: ({ href, children: c }) =>
            href?.startsWith("/") ? (
              <Link to={href} className="text-primary font-medium underline underline-offset-2 hover:opacity-80">{c}</Link>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">{c}</a>
            ),
        }}
      >
        {linkifyNames(children, links)}
      </ReactMarkdown>
    </div>
  );
}
