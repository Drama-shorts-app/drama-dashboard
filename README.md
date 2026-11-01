# Drama Loom video dashboard

A focused internal React dashboard for one job: upload an episode video to the Drama API and monitor Bunny Stream until playback is ready.

## What it includes

- Supabase email/password sign-in with a browser-safe publishable key
- Ordered multipart upload to `POST /v1/admin/episodes/upload`
- Browser-to-API upload progress and cancellation
- Automatic polling of `GET /v1/admin/episodes/:episodeId/video-status`
- Local recovery of the latest tracked upload after a refresh
- Responsive, keyboard-accessible upload and status controls

The dashboard intentionally does not include drama management, episode lists, analytics, users, or billing.

## Local setup

Requirements: Node.js 20.19 or newer.

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in `.env`:

```dotenv
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
```

Use a Supabase publishable key in the browser. Never add a secret key or legacy `service_role` key to a `VITE_` variable.

If the API runs on another origin, add the dashboard origin to the backend `CORS_ORIGINS` value. Vite normally serves this project at `http://127.0.0.1:5173`.

## Backend contract

The multipart form sends every metadata field before the final `video` part so the Fastify backend can stream the file to Bunny without buffering it. Supported source types are MP4, MOV, WebM, and MKV, up to 2 GiB.

The current backend authenticates the route with a Supabase bearer token. Before exposing this dashboard beyond trusted operators, enforce an admin/operator authorization check in the backend; authentication alone does not establish admin privileges.

## Checks

```bash
npm test
npm run build
```

The Supabase client is pinned to `2.100.0`, the newest tested line here that supports the workspace's Node 20 runtime. Move the project to Node 22 before upgrading to current Supabase client releases.
