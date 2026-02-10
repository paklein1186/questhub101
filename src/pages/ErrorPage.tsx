import { useParams, Link } from "react-router-dom";
import { ShieldX, LogIn, ServerCrash, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

const errors: Record<string, { icon: React.ElementType; title: string; description: string; action?: { label: string; to: string } }> = {
  "404": {
    icon: FileQuestion,
    title: "Page not found",
    description: "The page you're looking for doesn't exist or has been removed.",
    action: { label: "Back to Home", to: "/" },
  },
  "500": {
    icon: ServerCrash,
    title: "Something went wrong",
    description: "We encountered an unexpected server error. Please try again later.",
    action: { label: "Back to Home", to: "/" },
  },
  "access-denied": {
    icon: ShieldX,
    title: "Access denied",
    description: "You don't have permission to view this page or resource.",
    action: { label: "Back to Home", to: "/" },
  },
  "login-required": {
    icon: LogIn,
    title: "Login required",
    description: "You need to be logged in to access this page.",
    action: { label: "Go to Login", to: "/login" },
  },
};

export default function ErrorPage() {
  const { code } = useParams<{ code: string }>();
  const info = errors[code ?? ""] ?? errors["404"];
  const Icon = info.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center max-w-md px-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <Icon className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="mb-2 text-3xl font-bold font-display">{info.title}</h1>
        <p className="mb-6 text-muted-foreground">{info.description}</p>
        {info.action && (
          <Button asChild>
            <Link to={info.action.to}>{info.action.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
