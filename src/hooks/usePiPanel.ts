import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface PiPanelState {
  isOpen: boolean;
  width: number;
  activeConversationId: string | null;
  isChatActive: boolean;
  selectedModel: string;
  contextType: "global" | "onboarding" | "guild" | "quest" | "territory";
  contextId: string | null;
}

interface PiPanelContextType extends PiPanelState {
  togglePiPanel: () => void;
  openPiPanel: (contextType?: PiPanelState["contextType"], contextId?: string | null) => void;
  closePiPanel: () => void;
  setWidth: (w: number) => void;
  setActiveConversation: (id: string | null) => void;
  setChatActive: (v: boolean) => void;
  setSelectedModel: (m: string) => void;
  setContext: (contextType: PiPanelState["contextType"], contextId?: string | null) => void;
}

const PiPanelContext = createContext<PiPanelContextType | null>(null);

const STORAGE_WIDTH_KEY = "pi_panel_width";
const STORAGE_MODEL_KEY = "pi_preferred_model";
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 280;
const MAX_WIDTH = 680;

function getStoredWidth(): number {
  try {
    const v = localStorage.getItem(STORAGE_WIDTH_KEY);
    if (v) {
      const n = parseInt(v, 10);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
    }
  } catch {}
  return DEFAULT_WIDTH;
}

function getStoredModel(): string {
  try {
    return localStorage.getItem(STORAGE_MODEL_KEY) || "gemini-flash";
  } catch {
    return "gemini-flash";
  }
}

export function usePiPanel() {
  const ctx = useContext(PiPanelContext);
  if (!ctx) throw new Error("usePiPanel must be used within PiPanelProvider");
  return ctx;
}

export { PiPanelContext, DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH, STORAGE_WIDTH_KEY, STORAGE_MODEL_KEY, getStoredWidth, getStoredModel };
