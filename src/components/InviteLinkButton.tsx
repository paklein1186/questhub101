import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Check, Copy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type EntityType = "guild" | "pod" | "quest" | "company";

const ROUTE_MAP: Record<EntityType, string> = {
  guild: "/guilds",
  pod: "/pods",
  quest: "/quests",
  company: "/companies",
};

interface Props {
  entityType: EntityType;
  entityId: string;
  entityName: string;
}

export function InviteLinkButton({ entityType, entityId, entityName }: Props) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Use published URL if available, otherwise window origin
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = `${origin}${ROUTE_MAP[entityType]}/${entityId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: `Share this link to invite people to "${entityName}"` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <Link2 className="h-4 w-4 mr-1" /> Invite Link
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Share invite link</p>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can view and join "{entityName}"
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={inviteUrl}
              readOnly
              className="text-xs h-9"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button size="sm" variant="secondary" className="shrink-0 h-9" onClick={copyToClipboard}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
