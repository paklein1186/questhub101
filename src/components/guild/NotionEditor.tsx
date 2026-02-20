import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Code, Link as LinkIcon, Image as ImageIcon,
  Highlighter, AlignLeft, AlignCenter, AlignRight, Minus,
  Undo, Redo, Save
} from "lucide-react";

interface NotionEditorProps {
  content: string;
  onChange: (html: string) => void;
  onSave?: () => void;
  editable?: boolean;
  placeholder?: string;
  /** Yjs document for collaborative editing */
  ydoc?: Y.Doc;
  /** Active collaborators */
  activeUsers?: Array<{ name: string; color: string }>;
  /** Auto-save indicator */
  isSaving?: boolean;
}

export function NotionEditor({
  content, onChange, onSave, editable = true, placeholder = "Start writing…",
  ydoc, activeUsers = [], isSaving = false,
}: NotionEditorProps) {
  const contentInitialized = useRef(false);

  const extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // Disable history when using collaboration (Yjs handles undo)
      ...(ydoc ? { history: false } : {}),
    }),
    LinkExt.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline cursor-pointer" } }),
    Image.configure({ inline: false, allowBase64: true }),
    Placeholder.configure({ placeholder }),
    Underline,
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: false }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    // Add Yjs collaboration if a doc is provided
    ...(ydoc ? [Collaboration.configure({ document: ydoc })] : []),
  ];

  const editor = useEditor({
    extensions,
    // Only set initial content for non-collaborative mode
    ...(ydoc ? {} : { content }),
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "notion-editor prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3",
      },
    },
  }, [ydoc]); // Re-create editor when ydoc changes

  // Initialize collaborative doc with existing content
  useEffect(() => {
    if (!editor || !ydoc || contentInitialized.current) return;
    // If the Yjs doc is empty and we have HTML content, initialize it
    const fragment = ydoc.getXmlFragment("default");
    if (fragment.length === 0 && content) {
      editor.commands.setContent(content);
      contentInitialized.current = true;
    }
  }, [editor, ydoc, content]);

  // For non-collaborative mode, sync content prop
  useEffect(() => {
    if (ydoc) return; // Skip for collaborative mode
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor, ydoc]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const ToolBtn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-7 w-7 p-0 ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
            <Bold className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
            <Italic className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
            <Highlighter className="h-3.5 w-3.5" />
          </ToolBtn>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
            <Heading1 className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
            <Heading2 className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
            <Heading3 className="h-3.5 w-3.5" />
          </ToolBtn>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
            <List className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Checklist">
            <CheckSquare className="h-3.5 w-3.5" />
          </ToolBtn>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
            <Quote className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block">
            <Code className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
            <Minus className="h-3.5 w-3.5" />
          </ToolBtn>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <ToolBtn onClick={addLink} active={editor.isActive("link")} title="Add link">
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={addImage} title="Add image">
            <ImageIcon className="h-3.5 w-3.5" />
          </ToolBtn>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
            <AlignRight className="h-3.5 w-3.5" />
          </ToolBtn>

          <div className="flex-1" />

          {/* Collaborative presence indicators */}
          {activeUsers.length > 0 && (
            <TooltipProvider>
              <div className="flex items-center -space-x-1.5 mr-2">
                {activeUsers.slice(0, 5).map((u, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-6 w-6 border-2 border-card ring-0">
                        <AvatarFallback
                          className="text-[9px] font-bold text-white"
                          style={{ backgroundColor: u.color }}
                        >
                          {u.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">{u.name}</TooltipContent>
                  </Tooltip>
                ))}
                {activeUsers.length > 5 && (
                  <span className="text-[10px] text-muted-foreground ml-2">+{activeUsers.length - 5}</span>
                )}
              </div>
            </TooltipProvider>
          )}

          {/* Save / auto-save indicator */}
          {onSave && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={onSave}
              title="Save now"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {isSaving ? "Saving…" : "Save"}
            </Button>
          )}

          {!ydoc && (
            <>
              <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
                <Undo className="h-3.5 w-3.5" />
              </ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
                <Redo className="h-3.5 w-3.5" />
              </ToolBtn>
            </>
          )}
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
