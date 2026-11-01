import { useState } from "react";

import type { EpisodeVideo } from "../lib/api";
import { formatDuration, formatStatus } from "../lib/format";

type StatusPanelProps = {
  video: EpisodeVideo | null;
  isRefreshing: boolean;
  refreshError: string | null;
  onRefresh: () => void;
  onClear: () => void;
};

export function StatusPanel({
  video,
  isRefreshing,
  refreshError,
  onRefresh,
  onClear,
}: StatusPanelProps) {
  const [copied, setCopied] = useState<"episode" | "bunny" | null>(null);

  async function copy(value: string, field: "episode" | "bunny") {
    await navigator.clipboard.writeText(value);
    setCopied(field);
    window.setTimeout(() => setCopied((current) => current === field ? null : current), 2500);
  }

  if (!video) {
    return (
      <aside className="status-panel status-panel--empty" aria-labelledby="status-title">
        <div className="panel-heading">
          <h2 id="status-title">No active upload.</h2>
          <p>The newest episode will appear here after the API accepts it.</p>
        </div>
        <div className="empty-frame" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="status-note">This panel polls Bunny only while a video is processing.</p>
      </aside>
    );
  }

  const dimensions = video.width && video.height ? `${video.width} × ${video.height}` : "Pending";
  const resolutions = video.availableResolutions.length > 0
    ? video.availableResolutions.join(" · ")
    : "Pending";
  const statusLabel = formatStatus(video.videoIngestionStatus);

  return (
    <aside className="status-panel" aria-labelledby="status-title" aria-live="polite">
      <div className="status-heading">
        <div>
          <h2 id="status-title">Latest handoff.</h2>
          <p>Bunny metadata refreshes every five seconds while processing.</p>
        </div>
        <span className="status-chip" data-status={video.videoIngestionStatus}>
          <span aria-hidden="true">{statusMark(video.videoIngestionStatus)}</span>
          {statusLabel}
        </span>
      </div>

      {video.thumbnailUrl ? (
        <figure className="thumbnail-frame">
          <img
            src={video.thumbnailUrl}
            alt="Generated thumbnail for the latest uploaded episode"
            width="640"
            height="360"
            loading="lazy"
          />
          <figcaption>{video.thumbnailFilename}</figcaption>
        </figure>
      ) : null}

      <dl className="spec-sheet">
        <div>
          <dt>Episode ID</dt>
          <dd><code>{video.episodeId}</code></dd>
          <button className="copy-button" type="button" onClick={() => void copy(video.episodeId, "episode")}>
            {copied === "episode" ? "Copied" : "Copy"}
          </button>
        </div>
        <div>
          <dt>Bunny video ID</dt>
          <dd><code>{video.bunnyVideoId}</code></dd>
          <button className="copy-button" type="button" onClick={() => void copy(video.bunnyVideoId, "bunny")}>
            {copied === "bunny" ? "Copied" : "Copy"}
          </button>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(video.durationMs)}</dd>
        </div>
        <div>
          <dt>Dimensions</dt>
          <dd>{dimensions}</dd>
        </div>
        <div>
          <dt>Renditions</dt>
          <dd>{resolutions}</dd>
        </div>
      </dl>

      {refreshError ? <p className="form-alert" role="alert">{refreshError}</p> : null}

      <div className="status-actions">
        <button className="button button--primary" type="button" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? <><span className="spinner" aria-hidden="true" /> Checking…</> : "Check status"}
        </button>
        {video.videoIngestionStatus === "ready" ? (
          <a className="button button--quiet" href={video.playbackUrl} target="_blank" rel="noreferrer">
            Open HLS stream ↗
          </a>
        ) : null}
        <button className="button button--text" type="button" onClick={onClear}>Clear panel</button>
      </div>

      <p className="status-note">
        {statusDescription(video.videoIngestionStatus)}
      </p>
    </aside>
  );
}

function statusMark(status: EpisodeVideo["videoIngestionStatus"]): string {
  switch (status) {
    case "not_uploaded": return "○";
    case "processing": return "◌";
    case "ready": return "✓";
    case "failed": return "×";
  }
}

function statusDescription(status: EpisodeVideo["videoIngestionStatus"]): string {
  switch (status) {
    case "not_uploaded": return "Bunny has not received this video.";
    case "processing": return "The upload is complete. Bunny is encoding playback renditions.";
    case "ready": return "Playback and thumbnail metadata are ready.";
    case "failed": return "Bunny could not finish encoding this video. Check the source file before retrying.";
  }
}
