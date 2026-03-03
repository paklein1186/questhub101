import { AppNav } from "./AppNav";
import { SiteFooter } from "./SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePiPanel } from "@/hooks/usePiPanel";

interface PageShellProps {
  children: React.ReactNode;
  bare?: boolean;
}

export function PageShell({ children, bare }: PageShellProps) {
  const { session } = useAuth();
  const isMobile = useIsMobile();
  const hasBottomBar = isMobile && !!session;
  const { isOpen: piOpen, width: piWidth } = usePiPanel();
  const panelOffset = !isMobile && piOpen;

  if (bare) {
    return <>{children}</>;
  }
  return (
    <div
      className="min-h-screen flex flex-col transition-[margin] duration-300 ease-out"
      style={{ marginRight: panelOffset ? `${piWidth}px` : undefined }}
    >
      <AppNav />
      <main className={`flex-1 container py-4 sm:py-8 px-3 sm:px-4 ${hasBottomBar ? "pb-20" : ""}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}
