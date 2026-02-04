import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = {
  body?: unknown;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
};

/**
 * Ensures an Authorization Bearer token is sent to backend functions.
 * This prevents intermittent "Unauthorized" / non-2xx errors when the SDK
 * doesn't attach the access token (e.g. session not yet hydrated).
 */
export async function invokeWithAuth<T = any>(
  functionName: string,
  options: InvokeOptions = {}
) {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    return {
      data: null as T | null,
      error: new Error(sessionError.message),
    };
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    return {
      data: null as T | null,
      error: new Error("You are not signed in. Please sign in again."),
    };
  }

  // Always include the current access token explicitly.
  const headers = {
    ...(options.headers ?? {}),
    Authorization: `Bearer ${accessToken}`,
  };

  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body: options.body,
    method: options.method,
    headers,
  });

  if (!error) return { data, error };

  // Supabase-style Functions error often contains a Response in `context`.
  // We decode it so UI shows the real error (e.g. "Only admins can create users",
  // "User already registered", etc.) instead of the generic "non-2xx".
  let message = (error as any)?.message ?? "Request failed";
  try {
    const res = (error as any)?.context as Response | undefined;
    if (res && typeof res.text === "function") {
      const raw = await res.text();
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.error) message = String(parsed.error);
          else message = raw;
        } catch {
          message = raw;
        }
      }
    }
  } catch {
    // ignore parsing issues
  }

  const wrapped = new Error(message);
  (wrapped as any).cause = error as any;
  return { data, error: wrapped };
}
