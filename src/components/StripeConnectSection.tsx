import { useState, useEffect } from "react";
import { Zap, Plug, ExternalLink, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

interface ConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
}

export function StripeConnectSection() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [searchParams] = useSearchParams();

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-status");
      if (error) throw error;
      setStatus(data);
    } catch {
      setStatus({ connected: false, onboarding_complete: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Auto-refresh when returning from Stripe onboarding
  useEffect(() => {
    if (searchParams.get("stripe_connect") === "success") {
      fetchStatus();
      toast.success("Stripe Connect status updated");
    }
  }, [searchParams]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboarding");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to start Stripe onboarding");
      setConnecting(false);
    }
  };

  const handleOpenDashboard = async () => {
    setOpeningDashboard(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-dashboard");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to open Stripe dashboard");
    } finally {
      setOpeningDashboard(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Connected Apps</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Checking Stripe status…
        </div>
      </div>
    );
  }

  const isConnected = status?.connected;
  const isComplete = status?.onboarding_complete;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Connected Apps</h3>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Stripe Connect</p>
                <p className="text-xs text-muted-foreground">
                  Receive payouts from bookings, quests, events & courses
                </p>
              </div>
            </div>
            {isComplete ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-3 w-3 mr-1" /> Connected
              </Badge>
            ) : isConnected ? (
              <Badge variant="secondary" className="text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 mr-1" /> Onboarding incomplete
              </Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>

          {isComplete && (
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                <span>Charges enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                <span>Payouts enabled</span>
              </div>
            </div>
          )}

          {isConnected && !isComplete && (
            <p className="text-sm text-muted-foreground">
              Your Stripe account setup is not complete. Click below to continue onboarding.
            </p>
          )}

          <div className="flex gap-2 flex-wrap">
            {!isComplete && (
              <Button onClick={handleConnect} disabled={connecting} size="sm">
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4 mr-1" />
                )}
                {isConnected ? "Continue onboarding" : "Connect Stripe"}
              </Button>
            )}
            {isComplete && (
              <Button onClick={handleOpenDashboard} disabled={openingDashboard} variant="outline" size="sm">
                {openingDashboard ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-1" />
                )}
                Open Stripe Dashboard
              </Button>
            )}
            {isConnected && (
              <Button onClick={fetchStatus} variant="ghost" size="sm">
                Refresh status
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
