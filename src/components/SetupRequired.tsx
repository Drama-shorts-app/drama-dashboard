import { missingConfiguration } from "../lib/config";

export function SetupRequired() {
  return (
    <main className="setup-shell">
      <section className="setup-panel" aria-labelledby="setup-title">
        <p className="wordmark">Drama Loom</p>
        <h1 id="setup-title">Connect the workbench.</h1>
        <p>
          Copy <code>.env.example</code> to <code>.env</code>, then add the backend URL and
          Supabase browser credentials.
        </p>
        <div className="setup-list" aria-label="Missing environment variables">
          {missingConfiguration.map((name) => <code key={name}>{name}</code>)}
        </div>
        <p className="helper-text">
          Use a publishable key here. A Supabase secret or service-role key must stay on a server.
        </p>
      </section>
    </main>
  );
}
