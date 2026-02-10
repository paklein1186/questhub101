import { AppNav } from "./AppNav";
import { SiteFooter } from "./SiteFooter";

interface PageShellProps {
  children: React.ReactNode;
  bare?: boolean;
}

export function PageShell({ children, bare }: PageShellProps) {
  if (bare) {
    return <>{children}</>;
  }
  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />
      <main className="flex-1 container py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
