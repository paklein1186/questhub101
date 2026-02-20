import { useEffect, useRef, useState, useMemo } from "react";
import * as Y from "yjs";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/** Lightweight Yjs provider that syncs via Supabase Realtime broadcast */
class SupabaseRealtimeProvider {
  doc: Y.Doc;
  channel: ReturnType<typeof supabase.channel> | null = null;
  awareness: Map<number, { user: any; cursor: any }> = new Map();
  awarenessListeners: Set<() => void> = new Set();
  private channelName: string;
  private user: { name: string; color: string; id: string };
  private destroyed = false;

  constructor(channelName: string, doc: Y.Doc, user: { name: string; color: string; id: string }) {
    this.channelName = channelName;
    this.doc = doc;
    this.user = user;

    this.doc.on("update", this.handleDocUpdate);
    this.connect();
  }

  private connect() {
    this.channel = supabase.channel(`doc:${this.channelName}`, {
      config: { broadcast: { self: false } },
    });

    this.channel
      .on("broadcast", { event: "yjs-update" }, ({ payload }) => {
        if (this.destroyed) return;
        try {
          const update = new Uint8Array(payload.update);
          Y.applyUpdate(this.doc, update, "remote");
        } catch (e) {
          console.warn("Failed to apply Yjs update:", e);
        }
      })
      .on("broadcast", { event: "awareness" }, ({ payload }) => {
        if (this.destroyed) return;
        if (payload.userId === this.user.id) return;
        this.awareness.set(payload.clientId, {
          user: payload.user,
          cursor: payload.cursor,
        });
        this.emitAwareness();
      })
      .on("broadcast", { event: "awareness-leave" }, ({ payload }) => {
        this.awareness.delete(payload.clientId);
        this.emitAwareness();
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        for (const p of leftPresences) {
          const cid = (p as any).clientId;
          if (cid) this.awareness.delete(cid);
        }
        this.emitAwareness();
      })
      .subscribe();

    // Announce presence
    this.broadcastAwareness();
  }

  private handleDocUpdate = (update: Uint8Array, origin: any) => {
    if (origin === "remote" || this.destroyed) return;
    this.channel?.send({
      type: "broadcast",
      event: "yjs-update",
      payload: { update: Array.from(update) },
    });
  };

  broadcastAwareness(cursor?: any) {
    this.channel?.send({
      type: "broadcast",
      event: "awareness",
      payload: {
        clientId: this.doc.clientID,
        userId: this.user.id,
        user: this.user,
        cursor,
      },
    });
  }

  onAwarenessChange(fn: () => void) {
    this.awarenessListeners.add(fn);
    return () => this.awarenessListeners.delete(fn);
  }

  private emitAwareness() {
    this.awarenessListeners.forEach((fn) => fn());
  }

  getActiveUsers(): Array<{ name: string; color: string }> {
    return Array.from(this.awareness.values()).map((a) => a.user);
  }

  destroy() {
    this.destroyed = true;
    this.doc.off("update", this.handleDocUpdate);
    this.channel?.send({
      type: "broadcast",
      event: "awareness-leave",
      payload: { clientId: this.doc.clientID },
    });
    supabase.removeChannel(this.channel!);
    this.awareness.clear();
    this.awarenessListeners.clear();
  }
}

// Random cursor color generator
const CURSOR_COLORS = [
  "#F87171", "#FB923C", "#FBBF24", "#34D399", "#60A5FA",
  "#A78BFA", "#F472B6", "#2DD4BF", "#818CF8", "#FB7185",
];

function pickColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export function useCollaborativeDoc(docId: string | null) {
  const currentUser = useCurrentUser();
  const providerRef = useRef<SupabaseRealtimeProvider | null>(null);
  const [activeUsers, setActiveUsers] = useState<Array<{ name: string; color: string }>>([]);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ydoc = useMemo(() => new Y.Doc(), [docId]);

  const user = useMemo(() => ({
    name: currentUser.name || "Anonymous",
    color: pickColor(currentUser.id || "anon"),
    id: currentUser.id || "anon",
  }), [currentUser.id, currentUser.name]);

  useEffect(() => {
    if (!docId) return;

    const provider = new SupabaseRealtimeProvider(docId, ydoc, user);
    providerRef.current = provider;

    const unsub = provider.onAwarenessChange(() => {
      setActiveUsers(provider.getActiveUsers());
    });

    return () => {
      unsub();
      provider.destroy();
      providerRef.current = null;
    };
  }, [docId, ydoc, user]);

  /** Initialize the Yjs doc from HTML content */
  const initFromHtml = (editor: any) => {
    if (!editor) return;
    // The collaboration extension handles this via the Y.Doc
  };

  /** Get current HTML from editor for saving */
  const getHtml = (editor: any): string => {
    return editor?.getHTML() || "";
  };

  return { ydoc, activeUsers, provider: providerRef, user };
}
