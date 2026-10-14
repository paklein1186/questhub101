import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UnitCoverImage } from "@/components/UnitCoverImage";
import type { ResolvedHost } from "@/hooks/useQuestHosts";

/**
 * « Hosted by » for cards: plain text (no links), so it can sit inside a card that is itself a link.
 * Shows the primary host first, then the co-hosts.
 */
export function QuestHostChips({ hosts, max = 3 }: { hosts: ResolvedHost[] | undefined; max?: number }) {
  const { t } = useTranslation();
  if (!hosts?.length) return null;
  const shown = hosts.slice(0, max);
  const rest = hosts.length - shown.length;
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
      <span>{hosts.length > 1 ? t("questHosts.hostedByMany") : t("questHosts.hostedBy")}</span>
      {shown.map((h) => (
        <span key={h.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 pl-0.5 pr-2 py-0.5 text-foreground">
          <Avatar className="h-4 w-4">
            <AvatarImage src={h.logo_url ?? undefined} />
            <AvatarFallback className="text-[7px]">{h.name[0]}</AvatarFallback>
          </Avatar>
          <span className="font-medium max-w-[10rem] truncate">{h.name}</span>
        </span>
      ))}
      {rest > 0 && <span>+{rest}</span>}
    </div>
  );
}

/** Small quest thumbnail: cover, title, status and hosts. */
export function QuestThumbnail({ quest, hosts }: { quest: any; hosts: ResolvedHost[] | undefined }) {
  const { t } = useTranslation();
  return (
    <Link to={`/quests/${quest.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
      <UnitCoverImage type="QUEST" imageUrl={quest.cover_image_url} name={quest.title} height="h-24" />
      <div className="p-3 space-y-1.5">
        <h4 className="font-display font-semibold text-sm leading-snug line-clamp-2 flex items-start gap-1.5">
          <Compass className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" /> {quest.title}
        </h4>
        {quest.status && <p className="text-[11px] text-muted-foreground capitalize">{String(quest.status).toLowerCase().replace(/_/g, " ")}</p>}
        <QuestHostChips hosts={hosts} max={2} />
        {!hosts?.length && <p className="text-[11px] text-muted-foreground">{t("questHosts.noHost")}</p>}
      </div>
    </Link>
  );
}
