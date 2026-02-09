import { AppNav } from "./AppNav";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />
      <main className="flex-1 container py-8">{children}</main>
    </div>
  );
}
