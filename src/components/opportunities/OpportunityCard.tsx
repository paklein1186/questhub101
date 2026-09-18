import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { Briefcase, Sparkles, GraduationCap, Coins, MapPin, Building2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { GuestContentGate } from "@/components/GuestContentGate";
import { translateTopicName } from "@/lib/entityLabels";
import type { Opportunity, OpportunityType } from "@/hooks/useOpportunities";

const TYPE_ICON: Record<OpportunityType, typeof Briefcase> = {
  MISSION: Coins,
  JOB: Briefcase,
  SERVICE: Sparkles,
  COURSE: GraduationCap,
};

const TYPE_BADGE_CLASS: Record<OpportunityType, string> = {
  MISSION: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  JOB: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  SERVICE: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30",
  COURSE: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
};

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const { t } = useTranslation();
  const Icon = TYPE_ICON[opportunity.type];

  return (
    <Link
      to={opportunity.url}
      className="block rounded-xl border border-border bg-card p-4 space-y-2 hover:border-primary/30 transition-all"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={`text-[10px] gap-1 ${TYPE_BADGE_CLASS[opportunity.type]}`}>
          <Icon className="h-2.5 w-2.5" /> {t(`opportunities.type.${opportunity.type}`)}
        </Badge>
        {opportunity.priceLabel && (
          <Badge variant="secondary" className="text-[10px]">{opportunity.priceLabel}</Badge>
        )}
        {opportunity.isFree && (
          <Badge variant="secondary" className="text-[10px]">{t("opportunities.free")}</Badge>
        )}
      </div>

      <h4 className="font-display font-semibold text-sm">{opportunity.title}</h4>

      {opportunity.description && (
        <GuestContentGate previewText={opportunity.description} previewSentences={1}>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 whitespace-pre-line">
            {opportunity.description}
          </p>
        </GuestContentGate>
      )}

      {(opportunity.topics.length > 0 || opportunity.territories.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {opportunity.topics.slice(0, 3).map((topic) => (
            <Badge key={topic.id} variant="outline" className="text-[10px] gap-0.5">
              <Tag className="h-2.5 w-2.5" /> {translateTopicName(topic.name, t)}
            </Badge>
          ))}
          {opportunity.territories.slice(0, 3).map((territory) => (
            <Badge key={territory.id} variant="outline" className="text-[10px] gap-0.5">
              <MapPin className="h-2.5 w-2.5" /> {territory.name}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
        {opportunity.ownerName ? (
          <span className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5 rounded">
              <AvatarImage src={opportunity.ownerLogoUrl ?? undefined} />
              <AvatarFallback className="rounded text-[8px]"><Building2 className="h-2.5 w-2.5" /></AvatarFallback>
            </Avatar>
            {opportunity.ownerName}
          </span>
        ) : <span />}
        <span>{formatDistanceToNow(new Date(opportunity.createdAt), { addSuffix: true })}</span>
      </div>
    </Link>
  );
}
