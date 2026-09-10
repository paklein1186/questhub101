import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Users, CalendarClock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGuildMembership, isActiveMember } from "@/hooks/useGuildMembership";
import { useNavigate } from "react-router-dom";

interface Props {
  guild: any;
}

export function GuildMembershipCard({ guild }: Props) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const {
    membership,
    application,
    isGuest,
    isMember,
    isLoading,
    joinAsGuest,
    becomeMember,
    cancelRenewal,
  } = useGuildMembership(guild.id);
  const [processing, setProcessing] = useState(false);

  if (!guild.enable_membership) return null;

  const monthly = guild.billing_model === "monthly";
  const joiningFee = Number(guild.joining_fee_credits ?? 0);
  const recurringFee = Number(guild.monthly_fee_credits ?? 0);
  const oneTimeFee = Number(guild.entry_fee_credits ?? 0);
  const firstPayment = !membership?.last_payment_at;
  const dueNow = monthly ? recurringFee + (firstPayment ? joiningFee : 0) : oneTimeFee;

  const active = isActiveMember(membership, guild);
  const isCreator = guild.created_by_user_id === session?.user?.id;
  const needsApproval = guild.requires_application_before_payment || guild.join_policy === "APPROVAL_REQUIRED";
  const approved = application?.status === "APPROVED";
  const pendingApplication = application?.status === "PENDING";
  const blockedByApproval = needsApproval && !approved && !isCreator;

  const periodEnd = membership?.current_period_end ?? membership?.membership_expires_at;
  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  const handleBecomeMember = async () => {
    setProcessing(true);
    await becomeMember();
    setProcessing(false);
  };

  const payLabel = monthly
    ? `Become Member (${dueNow} credits / month${firstPayment && joiningFee ? ", incl. joining fee" : ""})`
    : `Become Member (${dueNow} credits)`;

  const PayButton = ({ label }: { label: string }) => (
    <Button size="sm" onClick={handleBecomeMember} disabled={processing || blockedByApproval} className="w-full">
      {processing && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
      {label}
    </Button>
  );

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
      ) : isCreator ? (
        <div className="space-y-1">
          <Badge className="bg-primary/10 text-primary border-0 text-xs">Founding member</Badge>
          <p className="text-xs text-muted-foreground">
            As the founder of this guild you are a permanent member — no application, no fee.
          </p>
        </div>
      ) : (
        <>
          {/* Pricing */}
          {dueNow > 0 && (
            <div className="flex items-start gap-1 text-xs text-muted-foreground">
              <CreditCard className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                {monthly ? (
                  <>
                    Monthly fee: <strong className="text-foreground">{recurringFee} credits / month</strong>
                    {joiningFee > 0 && (
                      <> · one-time joining fee <strong className="text-foreground">{joiningFee} credits</strong></>
                    )}
                  </>
                ) : (
                  <>One-time entry fee: <strong className="text-foreground">{oneTimeFee} credits</strong></>
                )}
              </span>
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

          {/* Approval gate */}
          {blockedByApproval && (
            <p className="text-xs text-muted-foreground">
              {pendingApplication
                ? "Your application is waiting for an admin decision. You'll be able to pay once it's approved."
                : "You need to apply and be approved by an admin before you can become a paying member."}
            </p>
          )}

          {/* Status & Actions */}
          {!membership && (
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={joinAsGuest} className="w-full">
                Join as Guest
              </Button>
              {dueNow > 0 && <PayButton label={payLabel} />}
            </div>
          )}

          {isGuest && (
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs">Status: Guest</Badge>
              <p className="text-xs text-muted-foreground">You can still participate in public quests and events.</p>
              {dueNow > 0 && <PayButton label={payLabel} />}
            </div>
          )}

          {isMember && active && (
            <div className="space-y-2">
              <Badge className="bg-primary/10 text-primary border-0 text-xs">
                Status: Member{membership?.status === "grace" ? " (payment pending)" : ""}
              </Badge>
              <p className="text-xs text-muted-foreground">You have full member privileges in this guild.</p>
              {periodEnd && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {monthly
                    ? membership?.cancel_at_period_end
                      ? `Ends on ${formatDate(periodEnd)}`
                      : `Renews on ${formatDate(periodEnd)}`
                    : `Valid until ${formatDate(periodEnd)}`}
                </p>
              )}
              {membership?.last_payment_at && (
                <p className="text-[11px] text-muted-foreground">
                  Last payment: {formatDate(membership.last_payment_at)}
                </p>
              )}
              {monthly && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => cancelRenewal(!membership?.cancel_at_period_end)}
                >
                  {membership?.cancel_at_period_end ? "Reactivate monthly renewal" : "Stop monthly renewal"}
                </Button>
              )}
            </div>
          )}

          {isMember && !active && (
            <div className="space-y-2">
              <Badge variant="destructive" className="text-xs">Membership expired</Badge>
              {dueNow > 0 && <PayButton label={`Renew membership (${dueNow} credits)`} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
