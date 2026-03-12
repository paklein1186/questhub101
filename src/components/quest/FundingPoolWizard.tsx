import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";

interface FundingPoolWizardProps {
  coinsBudget: string;
  setCoinsBudget: (v: string) => void;
  ctgBudget: string;
  setCtgBudget: (v: string) => void;
  coinsEnabled: boolean;
  setCoinsEnabled: (v: boolean) => void;
  ctgEnabled: boolean;
  setCtgEnabled: (v: boolean) => void;
  coinsBalance: number;
  ctgBalance: number;
  coinEurRate: number;
  toEur: (coins: number) => string;
}

export function FundingPoolWizard({
  coinsBudget, setCoinsBudget,
  ctgBudget, setCtgBudget,
  coinsEnabled, setCoinsEnabled,
  ctgEnabled, setCtgEnabled,
  coinsBalance, ctgBalance,
  coinEurRate, toEur,
}: FundingPoolWizardProps) {
  const coinsVal = Number(coinsBudget) || 0;
  const ctgVal = Number(ctgBudget) || 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Funding Pools</h3>
      <p className="text-xs text-muted-foreground">
        Allocate funds from your wallet to this quest. You can add more after creation.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Coins Pool */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CurrencyIcon currency="coins" className="h-4 w-4" />
              <Label className="text-sm font-semibold">🟩 Coins Pool</Label>
            </div>
            <Switch checked={coinsEnabled} onCheckedChange={setCoinsEnabled} />
          </div>

          {coinsEnabled && (
            <>
              <div>
                <Label className="text-xs">Coins to allocate (≈ €{toEur(coinsVal)})</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={coinsBudget}
                  onChange={(e) => setCoinsBudget(e.target.value)}
                  className="mt-1"
                  placeholder="0"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Coins are fiat-backed and withdrawable. Contributors earn Coins for their work.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Your balance: <span className="font-medium text-foreground">{coinsBalance.toFixed(0)} Coins</span>
              </p>
              {coinsVal > coinsBalance && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  Insufficient Coins balance.
                </div>
              )}
            </>
          )}
        </Card>

        {/* CTG Pool */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-lime-500" />
              <Label className="text-sm font-semibold">🌱 $CTG Pool</Label>
            </div>
            <Switch checked={ctgEnabled} onCheckedChange={setCtgEnabled} />
          </div>

          {ctgEnabled && (
            <>
              <div>
                <Label className="text-xs">$CTG to allocate</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={ctgBudget}
                  onChange={(e) => setCtgBudget(e.target.value)}
                  className="mt-1"
                  placeholder="0"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                $CTG is frozen from demurrage while held in quest escrow.
                It resumes normal circulation once distributed to contributors.
                $CTG is not fiat-backed — it represents contribution to the commons.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Your balance: <span className="font-medium text-foreground">{ctgBalance.toFixed(1)} $CTG</span>
              </p>
              {ctgVal > ctgBalance && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  Insufficient $CTG balance.
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {(coinsVal > 0 || ctgVal > 0) && (
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <p>
            This quest will hold:
            {coinsVal > 0 && <> 🟩 <span className="font-semibold">{coinsVal}</span> Coins</>}
            {coinsVal > 0 && ctgVal > 0 && "  +  "}
            {ctgVal > 0 && <> 🌱 <span className="font-semibold">{ctgVal}</span> $CTG</>}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            You can add more funds or launch a fundraising campaign at any time after creation.
          </p>
        </div>
      )}
    </div>
  );
}
