import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getShareUrl, type ShareEntityType } from "@/lib/shareUrl";

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

  const handleShare = async () => {
    const url = getShareUrl(entityType, entityId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied!", description: entityName ? `Share "${entityName}" with anyone.` : "Share this link with anyone." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <Button size={size} variant={variant} onClick={handleShare}>
      {copied ? <Check className="h-4 w-4 mr-1" /> : <Share2 className="h-4 w-4 mr-1" />}
      {copied ? "Copied!" : "Share"}
    </Button>
  );
}
