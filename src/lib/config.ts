function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function normalizeApiUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export const appConfig = {
  apiUrl: normalizeApiUrl(clean(import.meta.env.VITE_API_URL)),
  supabaseUrl: clean(import.meta.env.VITE_SUPABASE_URL),
  supabasePublishableKey: clean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
} as const;

export const missingConfiguration = [
  appConfig.apiUrl ? null : "VITE_API_URL",
  appConfig.supabaseUrl ? null : "VITE_SUPABASE_URL",
  appConfig.supabasePublishableKey ? null : "VITE_SUPABASE_PUBLISHABLE_KEY",
].filter((name): name is string => name !== null);
