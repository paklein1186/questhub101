import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGuildMembership, isActiveMember } from "@/hooks/useGuildMembership";
import { useNavigate } from "react-router-dom";

interface Props {
  guild: any;
}

export function GuildMembershipCard({ guild }: Props) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { membership, isGuest, isMember, isLoading, joinAsGuest, becomeMember } = useGuildMembership(guild.id);
  const [processing, setProcessing] = useState(false);

  if (!guild.enable_membership) return null;

  const fee = guild.entry_fee_credits ?? 0;
  const active = isActiveMember(membership, guild);

  const handleBecomeMember = async () => {
    setProcessing(true);
    await becomeMember(guild);
    setProcessing(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Membership</h3>
      </div>

      {!session ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Log in or create an account to join this guild.
          </p>
          <Button size="sm" onClick={() => navigate("/login")} className="w-full">
            Log in
          </Button>
        </div>
      ) : isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
      ) : (
        <>
          {/* Info */}
          {fee > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CreditCard className="h-3 w-3" />
              <span>One-time entry fee: <strong className="text-foreground">{fee} credits</strong></span>
            </div>
          )}

          {guild.membership_benefits_text && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">What you get</p>
              <p className="text-xs text-foreground">{guild.membership_benefits_text}</p>
            </div>
          )}

          {guild.membership_commitments_text && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">What you commit to</p>
              <p className="text-xs text-foreground">{guild.membership_commitments_text}</p>
            </div>
          )}

          {/* Status & Actions */}
          {!membership && (
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={joinAsGuest} className="w-full">
                Join as Guest
              </Button>
              {fee > 0 && (
                <Button size="sm" onClick={handleBecomeMember} disabled={processing} className="w-full">
                  {processing && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Become Member ({fee} credits)
                </Button>
              )}
            </div>
          )}

          {isGuest && (
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs">Status: Guest</Badge>
              <p className="text-xs text-muted-foreground">You can still participate in public quests and events.</p>
              {fee > 0 && (
                <Button size="sm" onClick={handleBecomeMember} disabled={processing} className="w-full">
                  {processing && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Become Member ({fee} credits)
                </Button>
              )}
            </div>
          )}

          {isMember && active && (
            <div className="space-y-1">
              <Badge className="bg-primary/10 text-primary border-0 text-xs">Status: Member</Badge>
              <p className="text-xs text-muted-foreground">You have full member privileges in this guild.</p>
            </div>
          )}

          {isMember && !active && (
            <div className="space-y-2">
              <Badge variant="destructive" className="text-xs">Membership Expired</Badge>
              {fee > 0 && (
                <Button size="sm" onClick={handleBecomeMember} disabled={processing} className="w-full">
                  {processing && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Renew Membership ({fee} credits)
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
