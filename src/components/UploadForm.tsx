import {
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  useRef,
  useState,
} from "react";

import { ApiError, type EpisodeVideo, uploadEpisode } from "../lib/api";
import type { UploadDraft, UploadErrors, UploadField } from "../lib/validation";
import { validateUploadDraft } from "../lib/validation";
import { VideoDropzone } from "./VideoDropzone";

type UploadFormProps = {
  apiUrl: string;
  accessToken: string;
  onUploaded: (video: EpisodeVideo) => void;
};

const INITIAL_DRAFT: UploadDraft = {
  dramaId: "",
  episodeNumber: "1",
  title: "",
  isFree: true,
  coinPrice: "0",
  thumbnailTimeSeconds: "",
  video: null,
};

export function UploadForm({ apiUrl, accessToken, onUploaded }: UploadFormProps) {
  const [draft, setDraft] = useState<UploadDraft>(INITIAL_DRAFT);
  const [errors, setErrors] = useState<UploadErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField<K extends keyof UploadDraft>(name: K, value: UploadDraft[K]) {
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setRequestError(null);
  }

  function validateField(name: UploadField) {
    const nextError = validateUploadDraft(draft).errors[name];
    setErrors((current) => ({ ...current, [name]: nextError }));
  }

  function handleAccessChange(event: ChangeEvent<HTMLInputElement>) {
    const isFree = event.target.value === "free";
    setDraft((current) => ({
      ...current,
      isFree,
      coinPrice: isFree ? "0" : current.coinPrice === "0" ? "1" : current.coinPrice,
    }));
    setErrors((current) => ({ ...current, coinPrice: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateUploadDraft(draft);
    if (!result.value) {
      setErrors(result.errors);
      const firstInvalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
      firstInvalid?.focus();
      return;
    }
    const validUpload = result.value;

    setIsUploading(true);
    setProgress(0);
    setRequestError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const uploaded = await uploadEpisode({
        apiUrl,
        accessToken,
        upload: validUpload,
        onProgress: setProgress,
        signal: controller.signal,
      });
      onUploaded(uploaded);
      setDraft((current) => ({
        ...current,
        episodeNumber: String(validUpload.episodeNumber + 1),
        title: "",
        thumbnailTimeSeconds: "",
        video: null,
      }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      setErrors({});
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setRequestError("The upload was cancelled. Choose the video again when you are ready.");
      } else if (error instanceof ApiError) {
        setRequestError(`${error.message} (${error.code})`);
      } else {
        setRequestError("The upload failed before the API returned a response. Try again.");
      }
    } finally {
      abortRef.current = null;
      setIsUploading(false);
    }
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-title">
      <div className="panel-heading">
        <h2 id="upload-title">Upload one episode.</h2>
        <p>Metadata is written only after Bunny accepts the complete file.</p>
      </div>

      <form ref={formRef} className="upload-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="field field--wide">
            <label htmlFor="dramaId">Drama UUID</label>
            <input
              id="dramaId"
              name="dramaId"
              type="text"
              inputMode="text"
              placeholder="7a7f2f56-2f06-4cd3-9d54-7f287b2d935e"
              value={draft.dramaId}
              onChange={(event) => updateField("dramaId", event.target.value)}
              onBlur={() => validateField("dramaId")}
              aria-invalid={Boolean(errors.dramaId)}
              aria-describedby="dramaId-message"
              disabled={isUploading}
            />
            <span className={errors.dramaId ? "field__message field__message--error" : "field__message"} id="dramaId-message">
              {errors.dramaId ?? "Use the existing drama record ID."}
            </span>
          </div>

          <div className="field">
            <label htmlFor="episodeNumber">Episode number</label>
            <input
              id="episodeNumber"
              name="episodeNumber"
              type="number"
              inputMode="numeric"
              min="1"
              max="100000"
              step="1"
              value={draft.episodeNumber}
              onChange={(event) => updateField("episodeNumber", event.target.value)}
              onBlur={() => validateField("episodeNumber")}
              aria-invalid={Boolean(errors.episodeNumber)}
              aria-describedby="episodeNumber-message"
              disabled={isUploading}
            />
            <span className={errors.episodeNumber ? "field__message field__message--error" : "field__message"} id="episodeNumber-message">
              {errors.episodeNumber ?? "Must be unique inside this drama."}
            </span>
          </div>

          <div className="field field--wide">
            <label htmlFor="title">Episode title <span className="label-optional">Optional</span></label>
            <input
              id="title"
              name="title"
              type="text"
              maxLength={200}
              placeholder="Leave blank to use the drama title and episode number"
              value={draft.title}
              onChange={(event) => updateField("title", event.target.value)}
              onBlur={() => validateField("title")}
              aria-invalid={Boolean(errors.title)}
              aria-describedby="title-message"
              disabled={isUploading}
            />
            <span className={errors.title ? "field__message field__message--error" : "field__message"} id="title-message">
              {errors.title ?? `${draft.title.length}/200 characters`}
            </span>
          </div>

          <fieldset className="field access-field">
            <legend>Viewer access</legend>
            <div className="segment">
              <label>
                <input
                  type="radio"
                  name="access"
                  value="free"
                  checked={draft.isFree}
                  onChange={handleAccessChange}
                  disabled={isUploading}
                />
                <span>Free</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="access"
                  value="paid"
                  checked={!draft.isFree}
                  onChange={handleAccessChange}
                  disabled={isUploading}
                />
                <span>Paid</span>
              </label>
            </div>
            <span className="field__message">Sets whether a viewer spends coins.</span>
          </fieldset>

          <div className="field">
            <label htmlFor="coinPrice">Coin price</label>
            <input
              id="coinPrice"
              name="coinPrice"
              type="number"
              inputMode="numeric"
              min={draft.isFree ? 0 : 1}
              max="1000000000"
              step="1"
              value={draft.coinPrice}
              onChange={(event) => updateField("coinPrice", event.target.value)}
              onBlur={() => validateField("coinPrice")}
              aria-invalid={Boolean(errors.coinPrice)}
              aria-describedby="coinPrice-message"
              disabled={isUploading || draft.isFree}
            />
            <span className={errors.coinPrice ? "field__message field__message--error" : "field__message"} id="coinPrice-message">
              {errors.coinPrice ?? (draft.isFree ? "Fixed at 0 for a free episode." : "Use a whole number of coins.")}
            </span>
          </div>

          <div className="field">
            <label htmlFor="thumbnailTimeSeconds">Thumbnail time <span className="label-optional">Optional</span></label>
            <div className="input-suffix">
              <input
                id="thumbnailTimeSeconds"
                name="thumbnailTimeSeconds"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                placeholder="3.5"
                value={draft.thumbnailTimeSeconds}
                onChange={(event) => updateField("thumbnailTimeSeconds", event.target.value)}
                onBlur={() => validateField("thumbnailTimeSeconds")}
                aria-invalid={Boolean(errors.thumbnailTimeSeconds)}
                aria-describedby="thumbnailTimeSeconds-message"
                disabled={isUploading}
              />
              <span aria-hidden="true">sec</span>
            </div>
            <span className={errors.thumbnailTimeSeconds ? "field__message field__message--error" : "field__message"} id="thumbnailTimeSeconds-message">
              {errors.thumbnailTimeSeconds ?? "Bunny captures the poster at this timestamp."}
            </span>
          </div>
        </div>

        <VideoDropzone
          file={draft.video}
          error={errors.video}
          disabled={isUploading}
          inputRef={fileInputRef}
          onChange={(file, error) => {
            updateField("video", file);
            if (error) setErrors((current) => ({ ...current, video: error }));
          }}
        />

        {requestError ? <p className="form-alert" role="alert">{requestError}</p> : null}

        {isUploading ? (
          <div className="upload-progress" aria-live="polite">
            <div className="progress-copy">
              <span>{progress === 100 ? "Finishing the Bunny handoff…" : "Sending video to the API…"}</span>
              <span>{progress === null ? "—" : `${progress}%`}</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Video upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress ?? undefined}
            >
              <span style={{ "--upload-progress": String((progress ?? 16) / 100) } as CSSProperties} />
            </div>
          </div>
        ) : null}

        <div className="form-actions">
          <button className="button button--primary" type="submit" disabled={isUploading}>
            {isUploading ? <><span className="spinner" aria-hidden="true" /> Uploading…</> : "Upload episode"}
          </button>
          {isUploading ? (
            <button className="button button--quiet" type="button" onClick={() => abortRef.current?.abort()}>
              Cancel
            </button>
          ) : null}
          <p>Keep this tab open until the API confirms the handoff.</p>
        </div>
      </form>
    </section>
  );
}
