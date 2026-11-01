import {
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ApiError,
  type DramaSummary,
  type EpisodeVideo,
  uploadEpisode,
} from "../lib/api";
import type { UploadDraft, UploadErrors, UploadField } from "../lib/validation";
import { validateUploadDraft } from "../lib/validation";
import { VideoDropzone } from "./VideoDropzone";

type UploadFormProps = {
  apiUrl: string;
  accessToken: string;
  dramas: DramaSummary[];
  dramasLoading: boolean;
  dramasError: string | null;
  onRefreshDramas: () => void;
  onCreateDrama: (input: { title: string; synopsis?: string }) => Promise<DramaSummary>;
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

export function UploadForm({
  apiUrl,
  accessToken,
  dramas,
  dramasLoading,
  dramasError,
  onRefreshDramas,
  onCreateDrama,
  onUploaded,
}: UploadFormProps) {
  const [draft, setDraft] = useState<UploadDraft>(INITIAL_DRAFT);
  const [errors, setErrors] = useState<UploadErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDramaTitle, setNewDramaTitle] = useState("");
  const [newDramaSynopsis, setNewDramaSynopsis] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingDrama, setIsCreatingDrama] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (draft.dramaId && !dramas.some((drama) => drama.id === draft.dramaId)) {
      setDraft((current) => ({ ...current, dramaId: "" }));
    }
  }, [dramas, draft.dramaId]);

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

  async function handleCreateDrama() {
    const title = newDramaTitle.trim();
    if (!title) {
      setCreateError("Enter a series title first.");
      return;
    }

    setIsCreatingDrama(true);
    setCreateError(null);
    try {
      const drama = await onCreateDrama({
        title,
        ...(newDramaSynopsis.trim() ? { synopsis: newDramaSynopsis.trim() } : {}),
      });
      setDraft((current) => ({ ...current, dramaId: drama.id }));
      setNewDramaTitle("");
      setNewDramaSynopsis("");
      setIsCreateOpen(false);
      setErrors((current) => ({ ...current, dramaId: undefined }));
    } catch (error) {
      setCreateError(error instanceof ApiError
        ? `${error.message} (${error.code})`
        : "The new series could not be created. Try again.");
    } finally {
      setIsCreatingDrama(false);
    }
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
            <label htmlFor="dramaId">Series</label>
            <div className="series-picker">
              <select
              id="dramaId"
              name="dramaId"
              value={draft.dramaId}
              onChange={(event) => updateField("dramaId", event.target.value)}
              onBlur={() => validateField("dramaId")}
              aria-invalid={Boolean(errors.dramaId)}
              aria-describedby="dramaId-message"
              disabled={isUploading || dramasLoading || isCreatingDrama}
            >
              <option value="">{dramasLoading ? "Loading series…" : "Select a series"}</option>
              {dramas.map((drama) => (
                <option key={drama.id} value={drama.id}>
                  {drama.title}{drama.status === "draft" ? " · Draft" : ""}
                </option>
              ))}
              </select>
              <button
                className="button button--text"
                type="button"
                onClick={() => {
                  setIsCreateOpen((current) => !current);
                  setCreateError(null);
                }}
                disabled={isUploading || isCreatingDrama}
              >
                {isCreateOpen ? "Close" : "New series"}
              </button>
            </div>
            <span className={errors.dramaId ? "field__message field__message--error" : "field__message"} id="dramaId-message">
              {errors.dramaId ?? dramasError ?? "Choose an existing series or create a new one."}
            </span>
            {dramasError ? (
              <button className="button button--text field-retry" type="button" onClick={onRefreshDramas} disabled={dramasLoading}>
                {dramasLoading ? "Retrying…" : "Retry series list"}
              </button>
            ) : null}
          </div>

          {isCreateOpen ? (
            <div className="field field--wide series-create">
              <div className="series-create__heading">
                <div>
                  <strong>Create a new series</strong>
                  <span>The API will generate its UUID automatically.</span>
                </div>
              </div>
              <div className="series-create__fields">
                <div className="field">
                  <label htmlFor="newDramaTitle">Series title</label>
                  <input
                    id="newDramaTitle"
                    name="newDramaTitle"
                    type="text"
                    maxLength={200}
                    value={newDramaTitle}
                    onChange={(event) => {
                      setNewDramaTitle(event.target.value);
                      setCreateError(null);
                    }}
                    disabled={isCreatingDrama || isUploading}
                  />
                </div>
                <div className="field">
                  <label htmlFor="newDramaSynopsis">Synopsis <span className="label-optional">Optional</span></label>
                  <input
                    id="newDramaSynopsis"
                    name="newDramaSynopsis"
                    type="text"
                    maxLength={5000}
                    value={newDramaSynopsis}
                    onChange={(event) => setNewDramaSynopsis(event.target.value)}
                    disabled={isCreatingDrama || isUploading}
                  />
                </div>
              </div>
              {createError ? <p className="field__message field__message--error" role="alert">{createError}</p> : null}
              <div className="series-create__actions">
                <button className="button button--primary" type="button" onClick={() => void handleCreateDrama()} disabled={isCreatingDrama || isUploading}>
                  {isCreatingDrama ? <><span className="spinner" aria-hidden="true" /> Creating…</> : "Create series"}
                </button>
              </div>
            </div>
          ) : null}

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
              {errors.episodeNumber ?? "Must be unique inside this series."}
            </span>
          </div>

          <div className="field field--wide">
            <label htmlFor="title">Episode title <span className="label-optional">Optional</span></label>
            <input
              id="title"
              name="title"
              type="text"
              maxLength={200}
              placeholder="Leave blank to use the series title and episode number"
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
