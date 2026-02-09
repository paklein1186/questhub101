import { useState } from "react";
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
  availabilityRules, availabilityExceptions,
  getServicesForUser,
} from "@/data/mock";
import type { AvailabilityRule, AvailabilityException } from "@/types";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function MyAvailability({ bare }: { bare?: boolean }) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);
  const [tab, setTab] = useState("global");

  const myServices = getServicesForUser(currentUser.id);

  const globalRules = availabilityRules.filter(
    (r) => r.providerUserId === currentUser.id && !r.serviceId
  );
  const myExceptions = availabilityExceptions.filter(
    (r) => r.providerUserId === currentUser.id
  );

  const addRule = (serviceId?: string) => {
    const rule: AvailabilityRule = {
      id: `ar-${Date.now()}`,
      providerUserId: currentUser.id,
      serviceId,
      weekday: 0,
      startTime: "09:00",
      endTime: "17:00",
      timezone: "Europe/Paris",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    availabilityRules.push(rule);
    rerender();
  };

  const removeRule = (id: string) => {
    const idx = availabilityRules.findIndex((r) => r.id === id);
    if (idx !== -1) availabilityRules.splice(idx, 1);
    rerender();
  };

  const updateRule = (id: string, updates: Partial<AvailabilityRule>) => {
    const rule = availabilityRules.find((r) => r.id === id);
    if (rule) Object.assign(rule, updates, { updatedAt: new Date().toISOString() });
    rerender();
  };

  const addException = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const exc: AvailabilityException = {
      id: `ae-${Date.now()}`,
      providerUserId: currentUser.id,
      date: tomorrow.toISOString().split("T")[0],
      isAvailable: false,
      createdAt: new Date().toISOString(),
    };
    availabilityExceptions.push(exc);
    rerender();
  };

  const removeException = (id: string) => {
    const idx = availabilityExceptions.findIndex((e) => e.id === id);
    if (idx !== -1) availabilityExceptions.splice(idx, 1);
    rerender();
  };

  const updateException = (id: string, updates: Partial<AvailabilityException>) => {
    const exc = availabilityExceptions.find((e) => e.id === id);
    if (exc) Object.assign(exc, updates);
    rerender();
  };

  const RuleEditor = ({ rules, serviceId }: { rules: AvailabilityRule[]; serviceId?: string }) => (
    <div className="space-y-3">
      {rules.length === 0 && (
        <p className="text-muted-foreground text-sm">No availability rules set. Add one below.</p>
      )}
      {rules.map((rule, i) => (
        <motion.div
          key={rule.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
        >
          <Select
            value={String(rule.weekday)}
            onValueChange={(v) => updateRule(rule.id, { weekday: Number(v) })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map((d, idx) => (
                <SelectItem key={idx} value={String(idx)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="time"
            value={rule.startTime}
            onChange={(e) => updateRule(rule.id, { startTime: e.target.value })}
            className="w-[120px]"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="time"
            value={rule.endTime}
            onChange={(e) => updateRule(rule.id, { endTime: e.target.value })}
            className="w-[120px]"
          />

          <div className="flex items-center gap-2">
            <Switch
              checked={rule.isActive}
              onCheckedChange={(v) => updateRule(rule.id, { isActive: v })}
            />
            <span className="text-xs text-muted-foreground">{rule.isActive ? "Active" : "Off"}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => removeRule(rule.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </motion.div>
      ))}

      <Button variant="outline" size="sm" onClick={() => addRule(serviceId)}>
        <Plus className="h-4 w-4 mr-1" /> Add rule
      </Button>
    </div>
  );

  return (
    <PageShell bare={bare}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Clock className="h-7 w-7 text-primary" /> My Availability
        </h1>
        <p className="text-muted-foreground mt-1">
          Set your weekly availability. Per-service overrides take precedence over global rules.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="global">Global</TabsTrigger>
          {myServices.map((svc) => (
            <TabsTrigger key={svc.id} value={svc.id}>
              {svc.title}
            </TabsTrigger>
          ))}
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <h2 className="font-display text-lg font-semibold mb-3">Global weekly availability</h2>
          <RuleEditor rules={globalRules} />
        </TabsContent>

        {myServices.map((svc) => {
          const svcRules = availabilityRules.filter(
            (r) => r.providerUserId === currentUser.id && r.serviceId === svc.id
          );
          return (
            <TabsContent key={svc.id} value={svc.id}>
              <h2 className="font-display text-lg font-semibold mb-1">{svc.title}</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Override rules specific to this service. If none are set, global rules apply.
              </p>
              <RuleEditor rules={svcRules} serviceId={svc.id} />
            </TabsContent>
          );
        })}

        <TabsContent value="exceptions">
          <h2 className="font-display text-lg font-semibold mb-3">Date exceptions</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Block specific dates or add extra availability on particular days.
          </p>

          {myExceptions.length === 0 && (
            <p className="text-muted-foreground text-sm mb-3">No exceptions set.</p>
          )}

          <div className="space-y-3">
            {myExceptions.map((exc, i) => (
              <motion.div
                key={exc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <Input
                  type="date"
                  value={exc.date}
                  onChange={(e) => updateException(exc.id, { date: e.target.value })}
                  className="w-[160px]"
                />

                <Badge
                  variant={exc.isAvailable ? "default" : "destructive"}
                  className="cursor-pointer"
                  onClick={() => updateException(exc.id, { isAvailable: !exc.isAvailable })}
                >
                  {exc.isAvailable ? (
                    <><CalendarCheck className="h-3 w-3 mr-1" /> Available</>
                  ) : (
                    <><CalendarOff className="h-3 w-3 mr-1" /> Blocked</>
                  )}
                </Badge>

                {exc.isAvailable && (
                  <>
                    <Input
                      type="time"
                      value={exc.startTime || "09:00"}
                      onChange={(e) => updateException(exc.id, { startTime: e.target.value })}
                      className="w-[120px]"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={exc.endTime || "17:00"}
                      onChange={(e) => updateException(exc.id, { endTime: e.target.value })}
                      className="w-[120px]"
                    />
                  </>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeException(exc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>

          <Button variant="outline" size="sm" className="mt-3" onClick={addException}>
            <Plus className="h-4 w-4 mr-1" /> Add exception
          </Button>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
