import { useState, useCallback, useEffect, type ReactNode } from "react";
import {
  PiPanelContext,
  type PiPanelState,
  getStoredWidth,
  getStoredModel,
  STORAGE_WIDTH_KEY,
  STORAGE_MODEL_KEY,
} from "@/hooks/usePiPanel";

export function PiPanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PiPanelState>({
    isOpen: false,
    width: getStoredWidth(),
    activeConversationId: null,
    isChatActive: false,
    selectedModel: getStoredModel(),
    contextType: "global",
    contextId: null,
    prefillPrompt: null,
  });

  // Persist width
  useEffect(() => {
    localStorage.setItem(STORAGE_WIDTH_KEY, String(state.width));
  }, [state.width]);

  // Persist model
  useEffect(() => {
    localStorage.setItem(STORAGE_MODEL_KEY, state.selectedModel);
  }, [state.selectedModel]);

  const togglePiPanel = useCallback(() => {
    setState((p) => ({ ...p, isOpen: !p.isOpen }));
  }, []);

  const openPiPanel = useCallback((contextType?: PiPanelState["contextType"], contextId?: string | null) => {
    setState((p) => ({
      ...p,
      isOpen: true,
      contextType: contextType ?? p.contextType,
      contextId: contextId ?? p.contextId,
    }));
  }, []);

  const closePiPanel = useCallback(() => {
    setState((p) => ({ ...p, isOpen: false }));
  }, []);

  const setWidth = useCallback((w: number) => {
    setState((p) => ({ ...p, width: Math.max(280, Math.min(680, w)) }));
  }, []);

  const setActiveConversation = useCallback((id: string | null) => {
    setState((p) => ({ ...p, activeConversationId: id, isChatActive: !!id }));
  }, []);

  const setChatActive = useCallback((v: boolean) => {
    setState((p) => ({ ...p, isChatActive: v }));
  }, []);

  const setSelectedModel = useCallback((m: string) => {
    setState((p) => ({ ...p, selectedModel: m }));
  }, []);

  const setContext = useCallback((contextType: PiPanelState["contextType"], contextId?: string | null) => {
    setState((p) => ({ ...p, contextType, contextId: contextId ?? null }));
  }, []);

  const setPrefillPrompt = useCallback((prompt: string | null) => {
    setState((p) => ({ ...p, prefillPrompt: prompt }));
  }, []);

  return (
    <PiPanelContext.Provider
      value={{
        ...state,
        togglePiPanel,
        openPiPanel,
        closePiPanel,
        setWidth,
        setActiveConversation,
        setChatActive,
        setSelectedModel,
        setContext,
        setPrefillPrompt,
      }}
    >
      {children}
    </PiPanelContext.Provider>
  );
}
