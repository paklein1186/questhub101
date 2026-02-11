import { cn } from "@/lib/utils";

import questPattern from "@/assets/patterns/quest-pattern.jpg";
import servicePattern from "@/assets/patterns/service-pattern.jpg";
import guildPattern from "@/assets/patterns/guild-pattern.jpg";
import companyPattern from "@/assets/patterns/company-pattern.jpg";
import podPattern from "@/assets/patterns/pod-pattern.jpg";
import coursePattern from "@/assets/patterns/course-pattern.jpg";
import eventPattern from "@/assets/patterns/event-pattern.jpg";
import territoryPattern from "@/assets/patterns/territory-pattern.jpg";

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

const TYPE_LABEL: Record<UnitType, string> = {
  QUEST: "Quest",
  SERVICE: "Service",
  GUILD: "Guild",
  COMPANY: "Company",
  POD: "Pod",
  COURSE: "Course",
  EVENT: "Event",
  TERRITORY: "Territory",
};

const FALLBACK_PATTERN: Record<UnitType, string> = {
  QUEST: questPattern,
  SERVICE: servicePattern,
  GUILD: guildPattern,
  COMPANY: companyPattern,
  POD: podPattern,
  COURSE: coursePattern,
  EVENT: eventPattern,
  TERRITORY: territoryPattern,
};

/**
 * Universal cover image for unit cards.
 * Priority: imageUrl > bannerUrl > logoUrl (centered over pattern) > type-based pattern fallback.
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
  const label = TYPE_LABEL[type];
  const coverSrc = imageUrl || bannerUrl;

  if (coverSrc) {
    return (
      <div className={cn("w-full overflow-hidden bg-muted", height, className)}>
        <img
          src={coverSrc}
          alt={name ? `Cover image for ${label.toLowerCase()} ${name}` : `${label} cover`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // Logo over pattern background
  if (logoUrl) {
    return (
      <div className={cn("w-full relative overflow-hidden", height, className)}>
        <img
          src={FALLBACK_PATTERN[type]}
          alt=""
          className="w-full h-full object-cover absolute inset-0"
          loading="lazy"
          aria-hidden="true"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <img
            src={logoUrl}
            alt={name ? `Logo for ${name}` : `${label} logo`}
            className="h-16 w-16 rounded-xl object-cover shadow-sm"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  // Fallback: soft nature pattern
  return (
    <div className={cn("w-full overflow-hidden", height, className)}>
      <img
        src={FALLBACK_PATTERN[type]}
        alt={`${label} pattern`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
