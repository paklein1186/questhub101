import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Check, Copy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getBookingUrl } from "@/lib/shareUrl";

interface Props {
  serviceId: string;
  serviceName?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "default" | "secondary";
  iconOnly?: boolean;
}

export function BookingLinkButton({
  serviceId,
  serviceName,
  size = "sm",
  variant = "outline",
  iconOnly = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const bookUrl = getBookingUrl(serviceId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookUrl);
      setCopied(true);
      toast({
        title: "Booking link copied!",
        description: serviceName
          ? `Share "${serviceName}" booking page with anyone.`
          : "Share this booking link with anyone — guests can sign up and book.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size={size} variant={variant}>
          <CalendarClock className="h-4 w-4" />
          {!iconOnly && <span className="ml-1">Booking link</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Public booking page</p>
            <p className="text-xs text-muted-foreground">
              Share this link with anyone — even guests who don't have an account yet.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={bookUrl}
              readOnly
              className="text-xs h-9"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button size="sm" variant="secondary" className="shrink-0 h-9" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
