import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { ApiError, type EpisodeVideo, getEpisodeVideoStatus } from "../lib/api";
import { appConfig } from "../lib/config";
import { saveTrackedUpload, loadTrackedUpload } from "../lib/tracked-upload";
import { supabase } from "../lib/supabase";
import { StatusPanel } from "./StatusPanel";
import { UploadForm } from "./UploadForm";

type DashboardProps = {
  session: Session;
};

export function Dashboard({ session }: DashboardProps) {
  const [video, setVideo] = useState<EpisodeVideo | null>(() => loadTrackedUpload());
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const updateVideo = useCallback((nextVideo: EpisodeVideo | null) => {
    setVideo(nextVideo);
    saveTrackedUpload(nextVideo);
    setRefreshError(null);
  }, []);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!video?.episodeId) return;
    setIsRefreshing(true);
    try {
      const nextVideo = await getEpisodeVideoStatus(
        appConfig.apiUrl,
        video.episodeId,
        session.access_token,
        signal,
      );
      updateVideo(nextVideo);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setRefreshError(error instanceof ApiError
        ? `${error.message} (${error.code})`
        : "The status check could not reach the Drama API. It will retry automatically.");
    } finally {
      setIsRefreshing(false);
    }
  }, [session.access_token, updateVideo, video?.episodeId]);

  useEffect(() => {
    if (!video || video.videoIngestionStatus !== "processing") return;
    const controller = new AbortController();
    let timer = 0;
    let stopped = false;

    async function poll() {
      try {
        const nextVideo = await getEpisodeVideoStatus(
          appConfig.apiUrl,
          video!.episodeId,
          session.access_token,
          controller.signal,
        );
        if (stopped) return;
        updateVideo(nextVideo);
        if (nextVideo.videoIngestionStatus === "processing") {
          timer = window.setTimeout(() => void poll(), 5000);
        }
      } catch (error) {
        if (stopped || (error instanceof DOMException && error.name === "AbortError")) return;
        setRefreshError(error instanceof ApiError
          ? `${error.message} (${error.code})`
          : "Automatic status checks are temporarily unavailable. Retrying in ten seconds.");
        timer = window.setTimeout(() => void poll(), 10_000);
      }
    }

    timer = window.setTimeout(() => void poll(), 5000);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [session.access_token, updateVideo, video?.episodeId, video?.videoIngestionStatus]);

  async function handleSignOut() {
    if (!supabase) return;
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setRefreshError("Supabase could not end this session. Try signing out again.");
      setIsSigningOut(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="wordmark" href="#main">Drama Loom</a>
        <div className="operator-meta">
          <span title={session.user.email}>{session.user.email ?? "Signed-in operator"}</span>
          <button className="button button--quiet" type="button" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <main id="main" className="workbench">
        <section className="workbench-intro" aria-labelledby="page-title">
          <h1 id="page-title">Ship an episode.</h1>
          <p>
            Send one source video to Bunny Stream, write its episode record, then watch the encode finish.
          </p>
          <div className="service-state"><span aria-hidden="true" /> Authenticated API session</div>
        </section>

        <div className="workbench-grid">
          <UploadForm
            apiUrl={appConfig.apiUrl}
            accessToken={session.access_token}
            onUploaded={updateVideo}
          />
          <StatusPanel
            video={video}
            isRefreshing={isRefreshing}
            refreshError={refreshError}
            onRefresh={() => void refresh()}
            onClear={() => updateVideo(null)}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>Drama Loom · Video operations</p>
        <p>Supabase session · Bunny Stream delivery</p>
      </footer>
    </div>
  );
}
