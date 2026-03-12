import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Minus, Highlighter, Undo, Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface Props {
  initialContent: string; // HTML string
  onChange: (html: string) => void;
}

export function ContractRichEditor({ initialContent, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[280px] p-3 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && initialContent && editor.isEmpty) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  if (!editor) return null;

  const Btn = ({
    active, onClick, children, title,
  }: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded hover:bg-accent transition-colors",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  );

  const ic = "h-3.5 w-3.5";

  return (
    <div className="border border-input rounded-md overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
        <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold className={ic} />
        </Btn>
        <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic className={ic} />
        </Btn>
        <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <UnderlineIcon className={ic} />
        </Btn>
        <Btn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <Strikethrough className={ic} />
        </Btn>
        <Btn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight">
          <Highlighter className={ic} />
        </Btn>

        <span className="w-px h-5 bg-border mx-1" />

        <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <Heading2 className={ic} />
        </Btn>
        <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
          <Heading3 className={ic} />
        </Btn>

        <span className="w-px h-5 bg-border mx-1" />

        <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <List className={ic} />
        </Btn>
        <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          <ListOrdered className={ic} />
        </Btn>

        <span className="w-px h-5 bg-border mx-1" />

        <Btn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left">
          <AlignLeft className={ic} />
        </Btn>
        <Btn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align center">
          <AlignCenter className={ic} />
        </Btn>
        <Btn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align right">
          <AlignRight className={ic} />
        </Btn>

        <span className="w-px h-5 bg-border mx-1" />

        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
          <Minus className={ic} />
        </Btn>

        <span className="w-px h-5 bg-border mx-1" />

        <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className={ic} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className={ic} />
        </Btn>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
