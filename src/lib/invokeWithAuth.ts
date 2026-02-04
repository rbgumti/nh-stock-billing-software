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

  return { data, error };
}
