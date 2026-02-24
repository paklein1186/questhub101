import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getShareUrl, getDisplayUrl, type ShareEntityType } from "@/lib/shareUrl";

interface Props {
  entityType: ShareEntityType;
  entityId: string;
  entityName?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "default" | "secondary";
}

export function ShareLinkButton({ entityType, entityId, entityName, size = "sm", variant = "outline" }: Props) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const ogUrl = getShareUrl(entityType, entityId);
  const displayUrl = getDisplayUrl(entityType, entityId);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(ogUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: entityName ? `Share "${entityName}" with anyone.` : "Share this link with anyone." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size={size} variant={variant}>
          <Share2 className="h-4 w-4 mr-1" /> Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Share link</p>
            <p className="text-xs text-muted-foreground">
              This link includes a rich preview for social media
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={ogUrl}
              readOnly
              className="text-xs h-9"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button size="sm" variant="secondary" className="shrink-0 h-9" onClick={handleShare}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
