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
      <main className="flex-1 container py-4 sm:py-8 px-3 sm:px-4">{children}</main>
      <SiteFooter />
    </div>
  );
}
