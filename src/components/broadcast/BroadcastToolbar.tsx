import { Button } from "@/components/ui/button";
import { Bold, Italic, Link2, List, ListOrdered, Heading2 } from "lucide-react";
import { RefObject } from "react";

interface Props {
  textareaRef: RefObject<HTMLTextAreaElement>;
  disabled?: boolean;
  onInsert: (text: string) => void;
}

function wrapSelection(
  textarea: HTMLTextAreaElement | null,
  before: string,
  after: string,
  onInsert: (text: string) => void
) {
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);
  const replacement = `${before}${selected || "text"}${after}`;
  const newValue = value.slice(0, start) + replacement + value.slice(end);
  onInsert(newValue);
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + before.length, start + before.length + (selected.length || 4));
  }, 0);
}

function insertPrefix(
  textarea: HTMLTextAreaElement | null,
  prefix: string,
  onInsert: (text: string) => void
) {
  if (!textarea) return;
  const start = textarea.selectionStart;
  const value = textarea.value;
  // Find beginning of current line
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  onInsert(newValue);
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + prefix.length, start + prefix.length);
  }, 0);
}

const actions = [
  { icon: Bold, tooltip: "Bold", action: (ta: HTMLTextAreaElement | null, cb: (t: string) => void) => wrapSelection(ta, "**", "**", cb) },
  { icon: Italic, tooltip: "Italic", action: (ta: HTMLTextAreaElement | null, cb: (t: string) => void) => wrapSelection(ta, "_", "_", cb) },
  { icon: Link2, tooltip: "Link", action: (ta: HTMLTextAreaElement | null, cb: (t: string) => void) => wrapSelection(ta, "[", "](url)", cb) },
  { icon: Heading2, tooltip: "Heading", action: (ta: HTMLTextAreaElement | null, cb: (t: string) => void) => insertPrefix(ta, "## ", cb) },
  { icon: List, tooltip: "Bullet list", action: (ta: HTMLTextAreaElement | null, cb: (t: string) => void) => insertPrefix(ta, "- ", cb) },
  { icon: ListOrdered, tooltip: "Numbered list", action: (ta: HTMLTextAreaElement | null, cb: (t: string) => void) => insertPrefix(ta, "1. ", cb) },
];

export function BroadcastToolbar({ textareaRef, disabled, onInsert }: Props) {
  return (
    <div className="flex items-center gap-0.5 border rounded-md p-0.5 bg-muted/30 w-fit">
      {actions.map(({ icon: Icon, tooltip, action }) => (
        <Button
          key={tooltip}
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title={tooltip}
          disabled={disabled}
          onClick={() => action(textareaRef.current, onInsert)}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}
