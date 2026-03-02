import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface PiSidePanelState {
  isOpen: boolean;
  contextType: "global" | "onboarding" | "guild" | "quest" | "territory";
  contextId?: string | null;
}

interface PiSidePanelContextType extends PiSidePanelState {
  openPanel: (contextType?: PiSidePanelState["contextType"], contextId?: string | null) => void;
  closePanel: () => void;
  togglePanel: () => void;
  setContext: (contextType: PiSidePanelState["contextType"], contextId?: string | null) => void;
}

const PiSidePanelContext = createContext<PiSidePanelContextType | null>(null);

export function usePiSidePanel() {
  const ctx = useContext(PiSidePanelContext);
  if (!ctx) throw new Error("usePiSidePanel must be used within PiSidePanelProvider");
  return ctx;
}

export function PiSidePanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PiSidePanelState>({
    isOpen: false,
    contextType: "global",
    contextId: null,
  });

  const openPanel = useCallback((contextType?: PiSidePanelState["contextType"], contextId?: string | null) => {
    setState((prev) => ({
      isOpen: true,
      contextType: contextType ?? prev.contextType,
      contextId: contextId ?? prev.contextId,
    }));
  }, []);

  const closePanel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const togglePanel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const setContext = useCallback((contextType: PiSidePanelState["contextType"], contextId?: string | null) => {
    setState((prev) => ({ ...prev, contextType, contextId }));
  }, []);

  return (
    <PiSidePanelContext.Provider value={{ ...state, openPanel, closePanel, togglePanel, setContext }}>
      {children}
    </PiSidePanelContext.Provider>
  );
}
