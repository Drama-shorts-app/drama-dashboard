import { type DragEvent, type RefObject, useState } from "react";

import { formatBytes } from "../lib/format";
import { validateVideoFile } from "../lib/validation";

type VideoDropzoneProps = {
  file: File | null;
  error?: string;
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (file: File | null, error: string | null) => void;
};

export function VideoDropzone({
  file,
  error,
  disabled,
  inputRef,
  onChange,
}: VideoDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  function acceptFile(nextFile: File | null) {
    if (!nextFile) {
      onChange(null, null);
      return;
    }
    onChange(nextFile, validateVideoFile(nextFile));
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) acceptFile(event.dataTransfer.files.item(0));
  }

  return (
    <div className="field field--video">
      <span className="field__label" id="video-label">Episode video</span>
      <label
        className="dropzone"
        data-dragging={isDragging ? "true" : "false"}
        data-state={error ? "error" : file ? "success" : "idle"}
        htmlFor="video"
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id="video"
          name="video"
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mkv"
          aria-labelledby="video-label"
          aria-describedby="video-message"
          aria-invalid={Boolean(error)}
          disabled={disabled}
          onChange={(event) => acceptFile(event.target.files?.item(0) ?? null)}
        />
        <span className="dropzone__mark" aria-hidden="true">{file && !error ? "✓" : "↑"}</span>
        <span className="dropzone__copy">
          <strong>{file ? file.name : "Choose a video"}</strong>
          <span>{file ? formatBytes(file.size) : "or drop it here · MP4, MOV, WebM, or MKV · 2 GiB maximum"}</span>
        </span>
        <span className="dropzone__action">Browse</span>
      </label>
      <span
        className={error ? "field__message field__message--error" : "field__message"}
        id="video-message"
        role={error ? "alert" : undefined}
      >
        {error ?? "The browser sends the file directly to the Drama API."}
      </span>
    </div>
  );
}
