import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { Dashboard } from "./components/Dashboard";
import { SetupRequired } from "./components/SetupRequired";
import { SignIn } from "./components/SignIn";
import { missingConfiguration } from "./lib/config";
import { supabase } from "./lib/supabase";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setIsAuthReady(true);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const preview = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get("preview")
    : null;
  if (preview === "dashboard") {
    return <Dashboard session={PREVIEW_SESSION} />;
  }
  if (preview === "sign-in") {
    return <SignIn />;
  }
  if (missingConfiguration.length > 0) return <SetupRequired />;
  if (!isAuthReady) {
    return (
      <main className="loading-shell" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <p>Restoring operator session…</p>
      </main>
    );
  }
  return session ? <Dashboard session={session} /> : <SignIn />;
}

const PREVIEW_SESSION = {
  access_token: "local-preview-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 4_102_444_800,
  refresh_token: "local-preview-refresh-token",
  user: {
    id: "a825df74-74af-40cf-8853-988de49cd724",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    email: "operator@dramaloom.local",
    created_at: "2026-11-01T00:00:00.000Z",
  },
} as Session;
