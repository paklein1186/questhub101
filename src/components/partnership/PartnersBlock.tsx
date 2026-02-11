import { Handshake, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { usePartnershipsForEntity, usePartnerEntities } from "@/hooks/usePartnerships";

interface Props {
  entityType: "GUILD" | "COMPANY";
  entityId: string;
}

/** Compact partners block for the entity overview tab */
export function PartnersBlock({ entityType, entityId }: Props) {
  const { data: partnerships } = usePartnershipsForEntity(entityType, entityId);
  const accepted = (partnerships ?? []).filter((p: any) => p.status === "ACCEPTED");
  const { data: entityMap } = usePartnerEntities(accepted);
  const map = entityMap ?? {};

  if (accepted.length === 0) return null;

  const getPartner = (p: any) => {
    const key = p.from_entity_type === entityType && p.from_entity_id === entityId
      ? `${p.to_entity_type}:${p.to_entity_id}`
      : `${p.from_entity_type}:${p.from_entity_id}`;
    const [type, id] = key.split(":");
    return { ...(map[key] ?? { name: "Unknown", logo_url: null, type }), id, type };
  };

  return (
    <div>
      <h3 className="font-display font-semibold mb-2 flex items-center gap-1.5">
        <Handshake className="h-4 w-4 text-primary" /> Partners
      </h3>
      <div className="flex flex-wrap gap-2">
        {accepted.map((p: any) => {
          const partner = getPartner(p);
          const link = partner.type === "GUILD" ? `/guilds/${partner.id}` : `/companies/${partner.id}`;
          return (
            <Link key={p.id} to={link} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 pr-3 hover:border-primary/30 transition-all">
              <Avatar className="h-7 w-7 rounded-md">
                <AvatarImage src={partner.logo_url ?? undefined} />
                <AvatarFallback className="rounded-md text-xs">{partner.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{partner.name}</span>
              <Badge variant="outline" className="text-[9px] capitalize">{partner.type.toLowerCase()}</Badge>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
