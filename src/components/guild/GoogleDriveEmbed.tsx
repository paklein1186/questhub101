import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderOpen, ExternalLink, X, Link as LinkIcon } from "lucide-react";

interface GoogleDriveEmbedProps {
  driveUrl: string;
  onUrlChange: (url: string) => void;
  canEdit: boolean;
}

/** Convert a Google Drive folder URL to an embeddable URL */
function toEmbedUrl(url: string): string | null {
  if (!url.trim()) return null;
  // Match: https://drive.google.com/drive/folders/FOLDER_ID...
  const folderMatch = url.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#list`;
  }
  // Match: https://drive.google.com/drive/u/0/folders/FOLDER_ID
  const folderMatch2 = url.match(/drive\.google\.com\/drive\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch2) {
    return `https://drive.google.com/embeddedfolderview?id=${folderMatch2[1]}#list`;
  }
  // Already an embed URL
  if (url.includes("embeddedfolderview")) return url;
  return null;
}

export function GoogleDriveEmbed({ driveUrl, onUrlChange, canEdit }: GoogleDriveEmbedProps) {
  const [editing, setEditing] = useState(false);
  const [urlInput, setUrlInput] = useState(driveUrl);

  const embedUrl = toEmbedUrl(driveUrl);

  const handleSave = () => {
    onUrlChange(urlInput.trim());
    setEditing(false);
  };

  const handleRemove = () => {
    onUrlChange("");
    setUrlInput("");
    setEditing(false);
  };

  if (!embedUrl && !editing) {
    if (!canEdit) return null;
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 p-6 w-full text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
      >
        <FolderOpen className="h-5 w-5 shrink-0" />
        <div className="text-left">
          <p className="text-sm font-medium">Embed Google Drive folder</p>
          <p className="text-xs">Paste a shared Google Drive folder link to embed it here</p>
        </div>
      </button>
    );
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FolderOpen className="h-4 w-4 text-primary" />
          Google Drive Folder
        </div>
        <Input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/..."
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Paste the URL of a <strong>shared</strong> Google Drive folder. Make sure the folder is set to "Anyone with the link can view".
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={!urlInput.trim()}>
            <LinkIcon className="h-3.5 w-3.5 mr-1" /> Save
          </Button>
          {driveUrl && (
            <Button size="sm" variant="destructive" onClick={handleRemove}>
              <X className="h-3.5 w-3.5 mr-1" /> Remove
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => { setUrlInput(driveUrl); setEditing(false); }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FolderOpen className="h-4 w-4 text-primary" />
          Google Drive
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => window.open(driveUrl, "_blank")}
          >
            <ExternalLink className="h-3 w-3 mr-1" /> Open
          </Button>
          {canEdit && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setUrlInput(driveUrl); setEditing(true); }}>
              Edit
            </Button>
          )}
        </div>
      </div>
      <iframe
        src={embedUrl!}
        className="w-full h-[400px] border-0"
        title="Google Drive folder"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        loading="lazy"
      />
    </div>
  );
}
