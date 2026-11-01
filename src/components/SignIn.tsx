import { type FormEvent, useState } from "react";

import { supabase } from "../lib/supabase";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setIsSubmitting(true);
    setError(null);

    const result = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (result.error) {
      setError("Sign-in failed. Check the email and password, then try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="sign-in-title">
        <div className="auth-intro">
          <p className="wordmark">Drama Loom</p>
          <h1 id="sign-in-title">Video operations.</h1>
          <p>Sign in with an existing Supabase operator account to upload an episode.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              aria-required="true"
              disabled={isSubmitting}
            />
            <span className="field__message">Use the email attached to your operator account.</span>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              aria-required="true"
              disabled={isSubmitting}
            />
            <span className="field__message">Your password is sent directly to Supabase Auth.</span>
          </div>

          {error ? <p className="form-alert" role="alert">{error}</p> : null}

          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <><span className="spinner" aria-hidden="true" /> Signing in…</> : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
