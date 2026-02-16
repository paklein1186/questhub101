import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface ListItem {
  id: string;
  name: string;
  imageUrl?: string | null;
  subtitle?: string;
  link: string;
}

interface ProfileListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: LucideIcon;
  items: ListItem[];
}

export function ProfileListDialog({ open, onOpenChange, title, icon: Icon, items }: ProfileListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto space-y-1 -mx-2 px-2 flex-1 min-h-0">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">None yet</p>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                to={item.link}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-9 w-9 rounded-lg">
                  <AvatarImage src={item.imageUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    <Icon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <span className="text-sm font-medium truncate block">{item.name}</span>
                  {item.subtitle && (
                    <span className="text-[10px] text-muted-foreground capitalize">{item.subtitle}</span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
