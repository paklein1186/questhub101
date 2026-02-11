import { Compass, Clock, Shield, Building2, CircleDot, GraduationCap, CalendarDays, MapPin, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type UnitType = "QUEST" | "SERVICE" | "GUILD" | "COMPANY" | "POD" | "COURSE" | "EVENT" | "TERRITORY";

interface UnitCoverImageProps {
  type: UnitType;
  imageUrl?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  name?: string;
  /** Render height class, e.g. "h-36" */
  height?: string;
  className?: string;
}

const TYPE_CONFIG: Record<UnitType, { icon: LucideIcon; bgClass: string; label: string }> = {
  QUEST: { icon: Compass, bgClass: "bg-amber-500/10 dark:bg-amber-500/20", label: "Quest" },
  SERVICE: { icon: Clock, bgClass: "bg-rose-500/10 dark:bg-rose-500/20", label: "Service" },
  GUILD: { icon: Shield, bgClass: "bg-emerald-500/10 dark:bg-emerald-500/20", label: "Guild" },
  COMPANY: { icon: Building2, bgClass: "bg-cyan-500/10 dark:bg-cyan-500/20", label: "Company" },
  POD: { icon: CircleDot, bgClass: "bg-violet-500/10 dark:bg-violet-500/20", label: "Pod" },
  COURSE: { icon: GraduationCap, bgClass: "bg-blue-500/10 dark:bg-blue-500/20", label: "Course" },
  EVENT: { icon: CalendarDays, bgClass: "bg-orange-500/10 dark:bg-orange-500/20", label: "Event" },
  TERRITORY: { icon: MapPin, bgClass: "bg-teal-500/10 dark:bg-teal-500/20", label: "Territory" },
};

const ICON_COLOR: Record<UnitType, string> = {
  QUEST: "text-amber-500/40",
  SERVICE: "text-rose-500/40",
  GUILD: "text-emerald-500/40",
  COMPANY: "text-cyan-500/40",
  POD: "text-violet-500/40",
  COURSE: "text-blue-500/40",
  EVENT: "text-orange-500/40",
  TERRITORY: "text-teal-500/40",
};

/**
 * Universal cover image for unit cards.
 * Priority: imageUrl > bannerUrl > logoUrl (centered) > type-based fallback.
 */
export function UnitCoverImage({
  type,
  imageUrl,
  logoUrl,
  bannerUrl,
  name,
  height = "h-36",
  className,
}: UnitCoverImageProps) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  // Resolve best image
  const coverSrc = imageUrl || bannerUrl;

  if (coverSrc) {
    return (
      <div className={cn("w-full overflow-hidden bg-muted", height, className)}>
        <img
          src={coverSrc}
          alt={name ? `Cover image for ${config.label.toLowerCase()} ${name}` : `${config.label} cover`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  if (logoUrl) {
    return (
      <div className={cn("w-full flex items-center justify-center", height, config.bgClass, className)}>
        <img
          src={logoUrl}
          alt={name ? `Logo for ${name}` : `${config.label} logo`}
          className="h-16 w-16 rounded-xl object-cover shadow-sm"
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback: type icon with tinted background
  return (
    <div
      className={cn("w-full flex items-center justify-center", height, config.bgClass, className)}
      role="img"
      aria-label={`${config.label} icon`}
    >
      <Icon className={cn("h-10 w-10", ICON_COLOR[type])} />
    </div>
  );
}
