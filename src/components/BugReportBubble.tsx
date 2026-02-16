import { useState, useRef } from "react";
import { Bug, X, Send, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function BugReportBubble() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10 MB", variant: "destructive" });
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleSend = async () => {
    if (!text.trim()) {
      toast({ title: "Please describe the bug", variant: "destructive" });
      return;
    }
    setSending(true);

    const subject = encodeURIComponent("Bug Report — changethegame");
    const userInfo = user?.email ? `\n\nReported by: ${user.email}` : "";
    const pageInfo = `\nPage: ${window.location.href}`;
    const body = encodeURIComponent(`${text.trim()}${pageInfo}${userInfo}\n\n(Screenshot attached separately if provided)`);

    window.open(`mailto:pa@changethegame.xyz?subject=${subject}&body=${body}`, "_blank");

    setSending(false);
    setText("");
    setFile(null);
    setPreview(null);
    setOpen(false);
    toast({ title: "Bug report prepared", description: "Your email client should open with the report." });
  };

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-destructive text-destructive-foreground shadow-lg hover:scale-110 transition-transform"
          aria-label="Report a bug"
          title="Report a bug"
        >
          <Bug size={18} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-4 left-4 z-50 w-80 rounded-2xl border border-border bg-card shadow-xl p-4 space-y-3 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Bug size={14} className="text-destructive" /> Report a Bug
            </h4>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>

          <Textarea
            placeholder="Describe what went wrong…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[80px] text-sm resize-none"
            maxLength={2000}
          />

          {preview && (
            <div className="relative">
              <img src={preview} alt="Screenshot" className="rounded-lg max-h-28 w-full object-cover" />
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => inputRef.current?.click()}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ImagePlus size={14} /> Add screenshot
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

            <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()}>
              {sending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
              Send
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
