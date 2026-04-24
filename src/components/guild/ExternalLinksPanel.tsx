import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Plus, Trash2, Link as LinkIcon, FolderOpen, Cloud, HardDrive, Globe } from "lucide-react";

export interface ExternalLinkItem {
  id: string;
  label: string;
  url: string;
}

interface ExternalLinksPanelProps {
  links: ExternalLinkItem[];
  onLinksChange: (links: ExternalLinkItem[]) => void;
  canEdit: boolean;
}

function getLinkIcon(url: string) {
  if (url.includes("drive.google.com")) return <FolderOpen className="h-5 w-5 text-yellow-500" />;
  if (url.includes("nextcloud") || url.includes("owncloud")) return <Cloud className="h-5 w-5 text-blue-500" />;
  if (url.includes("dropbox")) return <HardDrive className="h-5 w-5 text-blue-600" />;
  if (url.includes("notion.so")) return <FileIcon className="h-5 w-5 text-foreground" />;
  if (url.includes("onedrive") || url.includes("sharepoint")) return <Cloud className="h-5 w-5 text-sky-500" />;
  return <Globe className="h-5 w-5 text-muted-foreground" />;
}

function FileIcon({ className }: { className?: string }) {
  return <FolderOpen className={className} />;
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function ExternalLinksPanel({ links, onLinksChange, canEdit }: ExternalLinksPanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const addLink = () => {
    if (!label.trim() || !url.trim()) return;
    const newLink: ExternalLinkItem = {
      id: crypto.randomUUID(),
      label: label.trim(),
      url: url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`,
    };
    onLinksChange([...links, newLink]);
    setLabel("");
    setUrl("");
    setAddOpen(false);
  };

  const removeLink = (id: string) => {
    onLinksChange(links.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-primary" />
          External Resources
        </h3>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Link
          </Button>
        )}
      </div>

      {links.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="group relative flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                {getLinkIcon(link.url)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{getDomain(link.url)}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); removeLink(link.id); }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {canEdit ? "No external links yet. Add a link to Google Drive, Nextcloud, Dropbox, or any resource." : "No external resources shared."}
        </p>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add External Link</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Label</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Shared Drive, Project Files…" maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">URL</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/…" className="font-mono text-xs" />
            </div>
            <Button onClick={addLink} disabled={!label.trim() || !url.trim()} className="w-full">Add Link</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
