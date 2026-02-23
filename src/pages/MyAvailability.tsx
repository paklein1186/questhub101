import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Plus, Trash2, CalendarOff, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import {
  useAvailabilityRules, useAvailabilityExceptions, useUserServices,
  useCreateAvailabilityRule, useUpdateAvailabilityRule, useDeleteAvailabilityRule,
  useCreateAvailabilityException, useUpdateAvailabilityException, useDeleteAvailabilityException,
} from "@/hooks/useEntityQueries";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* Buffered time input – edits locally, saves on blur */
function BufferedTimeInput({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [local, setLocal] = useState(value);
  // sync from server when not focused
  const [focused, setFocused] = useState(false);
  const displayed = focused ? local : value;
  return (
    <Input
      type="time"
      value={displayed}
      className={className}
      onFocus={() => { setFocused(true); setLocal(value); }}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { setFocused(false); if (local !== value) onSave(local); }}
    />
  );
}

function BufferedDateInput({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);
  const displayed = focused ? local : value;
  return (
    <Input
      type="date"
      value={displayed}
      className={className}
      onFocus={() => { setFocused(true); setLocal(value); }}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { setFocused(false); if (local !== value) onSave(local); }}
    />
  );
}

export default function MyAvailability({ bare }: { bare?: boolean }) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [tab, setTab] = useState("global");

  const { data: myServices = [] } = useUserServices(currentUser.id);
  const { data: allRules = [] } = useAvailabilityRules(currentUser.id);
  const { data: allExceptions = [] } = useAvailabilityExceptions(currentUser.id);

  const createRule = useCreateAvailabilityRule();
  const updateRule = useUpdateAvailabilityRule();
  const deleteRule = useDeleteAvailabilityRule();
  const createException = useCreateAvailabilityException();
  const updateException = useUpdateAvailabilityException();
  const deleteException = useDeleteAvailabilityException();

  const globalRules = allRules.filter((r) => !r.service_id);

  const addRule = (serviceId?: string) => {
    createRule.mutate({
      provider_user_id: currentUser.id,
      weekday: 0, start_time: "09:00", end_time: "17:00",
      timezone: "Europe/Paris", service_id: serviceId,
    });
  };

  const addException = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    createException.mutate({
      provider_user_id: currentUser.id,
      date: tomorrow.toISOString().split("T")[0],
      is_available: false,
    });
  };

  const RuleEditor = ({ rules, serviceId }: { rules: typeof allRules; serviceId?: string }) => (
    <div className="space-y-3">
      {rules.length === 0 && <p className="text-muted-foreground text-sm">No availability rules set. Add one below.</p>}
      {rules.map((rule, i) => (
        <motion.div key={rule.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
          <Select value={String(rule.weekday)} onValueChange={(v) => updateRule.mutate({ id: rule.id, weekday: Number(v) })}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>{WEEKDAYS.map((d, idx) => <SelectItem key={idx} value={String(idx)}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <BufferedTimeInput value={rule.start_time} onSave={(v) => updateRule.mutate({ id: rule.id, start_time: v })} className="w-[120px]" />
          <span className="text-muted-foreground">–</span>
          <BufferedTimeInput value={rule.end_time} onSave={(v) => updateRule.mutate({ id: rule.id, end_time: v })} className="w-[120px]" />
          <div className="flex items-center gap-2">
            <Switch checked={rule.is_active} onCheckedChange={(v) => updateRule.mutate({ id: rule.id, is_active: v })} />
            <span className="text-xs text-muted-foreground">{rule.is_active ? "Active" : "Off"}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRule.mutate(rule.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </motion.div>
      ))}
      <Button variant="outline" size="sm" onClick={() => addRule(serviceId)}><Plus className="h-4 w-4 mr-1" /> Add rule</Button>
    </div>
  );
  return (
    <PageShell bare={bare}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Clock className="h-7 w-7 text-primary" /> My Availability
        </h1>
        <p className="text-muted-foreground mt-1">Set your weekly availability. Per-service overrides take precedence over global rules.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="global">Global</TabsTrigger>
          {myServices.map((svc) => <TabsTrigger key={svc.id} value={svc.id}>{svc.title}</TabsTrigger>)}
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <h2 className="font-display text-lg font-semibold mb-3">Global weekly availability</h2>
          <RuleEditor rules={globalRules} />
        </TabsContent>

        {myServices.map((svc) => {
          const svcRules = allRules.filter((r) => r.service_id === svc.id);
          return (
            <TabsContent key={svc.id} value={svc.id}>
              <h2 className="font-display text-lg font-semibold mb-1">{svc.title}</h2>
              <p className="text-sm text-muted-foreground mb-3">Override rules specific to this service.</p>
              <RuleEditor rules={svcRules} serviceId={svc.id} />
            </TabsContent>
          );
        })}

        <TabsContent value="exceptions">
          <h2 className="font-display text-lg font-semibold mb-3">Date exceptions</h2>
          <p className="text-sm text-muted-foreground mb-4">Block specific dates or add extra availability on particular days.</p>
          {allExceptions.length === 0 && <p className="text-muted-foreground text-sm mb-3">No exceptions set.</p>}
          <div className="space-y-3">
            {allExceptions.map((exc, i) => (
              <motion.div key={exc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
                <BufferedDateInput value={exc.date} onSave={(v) => updateException.mutate({ id: exc.id, date: v })} className="w-[160px]" />
                <Badge variant={exc.is_available ? "default" : "destructive"} className="cursor-pointer"
                  onClick={() => updateException.mutate({ id: exc.id, is_available: !exc.is_available })}>
                  {exc.is_available ? <><CalendarCheck className="h-3 w-3 mr-1" /> Available</> : <><CalendarOff className="h-3 w-3 mr-1" /> Blocked</>}
                </Badge>
                {exc.is_available && (
                  <>
                    <BufferedTimeInput value={exc.start_time || "09:00"} onSave={(v) => updateException.mutate({ id: exc.id, start_time: v })} className="w-[120px]" />
                    <span className="text-muted-foreground">–</span>
                    <BufferedTimeInput value={exc.end_time || "17:00"} onSave={(v) => updateException.mutate({ id: exc.id, end_time: v })} className="w-[120px]" />
                  </>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteException.mutate(exc.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={addException}><Plus className="h-4 w-4 mr-1" /> Add exception</Button>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
