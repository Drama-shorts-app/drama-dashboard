import { createClient } from "@supabase/supabase-js";

import { appConfig, missingConfiguration } from "./config";

export const supabase = missingConfiguration.length === 0
  ? createClient(appConfig.supabaseUrl, appConfig.supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;
