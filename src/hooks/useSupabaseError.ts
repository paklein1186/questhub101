import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

/**
 * Known Supabase / PostgREST error codes mapped to user-friendly messages.
 * Extend this map as new error patterns are discovered.
 */
const ERROR_MESSAGES: Record<string, string> = {
  "23505": "This record already exists.",
  "23503": "This action references data that no longer exists.",
  "42501": "You don't have permission to perform this action.",
  "PGRST301": "The requested resource was not found.",
  "PGRST204": "No data was returned from the server.",
  "invalid_credentials": "Invalid email or password.",
  "email_not_confirmed": "Please confirm your email before logging in.",
  "user_already_exists": "An account with this email already exists.",
};

interface SupabaseError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Centralized hook for handling Supabase errors.
 *
 * Returns helpers to parse error objects into user-friendly messages
 * and display them via toast notifications.
 *
 * Usage:
 *   const { handleError } = useSupabaseError();
 *
 *   const { error } = await supabase.from("quests").insert(data);
 *   if (error) handleError(error, "[QuestCreate]");
 */
export function useSupabaseError() {
  const { toast } = useToast();

  /** Parse a Supabase error into a user-friendly string. */
  const parseError = useCallback((error: SupabaseError | Error | unknown): string => {
    if (!error) return "An unknown error occurred.";

    // Supabase PostgrestError shape
    if (typeof error === "object" && error !== null && "code" in error) {
      const e = error as SupabaseError;
      const mapped = e.code ? ERROR_MESSAGES[e.code] : undefined;
      if (mapped) return mapped;
      return e.message || "An unexpected error occurred.";
    }

    // Standard Error
    if (error instanceof Error) {
      return error.message || "An unexpected error occurred.";
    }

    // String error
    if (typeof error === "string") return error;

    return "An unexpected error occurred.";
  }, []);

  /** Log the error and show a destructive toast. */
  const handleError = useCallback(
    (error: unknown, context?: string, customTitle?: string) => {
      const message = parseError(error);

      if (context) {
        logger.error(`${context} ${message}`, error);
      } else {
        logger.error(message, error);
      }

      toast({
        title: customTitle ?? "Something went wrong",
        description: message,
        variant: "destructive",
      });

      return message;
    },
    [parseError, toast],
  );

  return { parseError, handleError };
}
