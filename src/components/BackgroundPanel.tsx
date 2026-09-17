import { useRef, useState } from "react";
import type { BackgroundState } from "../types";
import { GRADIENT_PRESETS } from "../lib/gradients";
import { isValidYouTubeUrl } from "../lib/youtube";
import { CloseIcon, FilmIcon, GridIcon, ImageIcon } from "./icons";

interface BackgroundPanelProps {
  background: BackgroundState;
  onSelectGradient: (id: string) => void;
  onSetYouTube: (url: string) => void;
  onRemoveYouTube: () => void;
  onClose: () => void;
  videoError?: string | null;
  onSetImage: (file: File) => Promise<void>;
  onRemoveImage: () => void;
  imageOrigin?: string | null;
}

export default function BackgroundPanel({
  background,
  onSelectGradient,
  onSetYouTube,
  onRemoveYouTube,
  onClose,
  videoError,
  onSetImage,
  onRemoveImage,
  imageOrigin,
}: BackgroundPanelProps) {
  const [urlInput, setUrlInput] = useState(background.youtubeUrl);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"gradient" | "youtube" | "image">(background.mode);
  const [imageError, setImageError] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setImageError("");
    setImporting(true);
    try {
      await onSetImage(file);
    } catch (e) {
      setImageError(typeof e === "string" ? e : "Couldn't use that image.");
    } finally {
      setImporting(false);
    }
  };

  const submitUrl = () => {
    if (!urlInput.trim()) {
      setError("Paste a YouTube video URL.");
      return;
    }
    if (!isValidYouTubeUrl(urlInput)) {
      setError("That doesn't look like a valid YouTube URL.");
      return;
    }
    setError("");
    onSetYouTube(urlInput.trim());
  };

  return (
    <div className="glass w-80 rounded-2xl p-4 animate-rise-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink">Background</h3>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="text-ink-faint hover:text-ink transition-colors"
        >
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      <div className="mt-3 flex gap-1 rounded-lg bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setTab("gradient")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors ${
            tab === "gradient" ? "bg-white/15 text-ink" : "text-ink-faint hover:text-ink-soft"
          }`}
        >
          <GridIcon width={13} height={13} /> Gradients
        </button>
        <button
          type="button"
          onClick={() => setTab("youtube")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors ${
            tab === "youtube" ? "bg-white/15 text-ink" : "text-ink-faint hover:text-ink-soft"
          }`}
        >
          <FilmIcon width={13} height={13} /> YouTube
        </button>
        <button
          type="button"
          onClick={() => setTab("image")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors ${
            tab === "image" ? "bg-white/15 text-ink" : "text-ink-faint hover:text-ink-soft"
          }`}
        >
          <ImageIcon width={13} height={13} /> Image
        </button>
      </div>

      {tab === "image" ? (
        <div className="mt-3">
          <p className="text-xs text-ink-faint">
            Use your own picture as the background. It's copied into Flow, so moving
            the original won't break it.
          </p>

          {background.mode === "image" && background.imageFile && imageOrigin && (
            <div
              className="mt-3 h-24 w-full rounded-lg bg-cover bg-center ring-1 ring-white/15"
              style={{ backgroundImage: `url("${imageOrigin}/bg/${background.imageFile}")` }}
            />
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => {
              void pickImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
            className="mt-3 w-full rounded-lg bg-focus px-3 py-2 text-xs font-medium text-[#14100b] transition-all hover:brightness-110 disabled:opacity-50"
          >
            {importing ? "Adding…" : background.imageFile ? "Choose a different image" : "Choose an image"}
          </button>

          {imageError && <p className="mt-1.5 text-xs text-red-400">{imageError}</p>}

          {background.imageFile && (
            <button
              type="button"
              onClick={onRemoveImage}
              className="mt-3 text-xs text-ink-faint hover:text-ink transition-colors"
            >
              Remove image background
            </button>
          )}
        </div>
      ) : tab === "gradient" ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {GRADIENT_PRESETS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelectGradient(g.id)}
              className={`group relative h-14 overflow-hidden rounded-lg ring-2 transition-all ${
                background.mode === "gradient" && background.gradientId === g.id
                  ? "ring-focus"
                  : "ring-transparent hover:ring-white/25"
              }`}
              style={{ background: g.css }}
              aria-label={g.name}
              title={g.name}
            >
              <span className="absolute inset-x-0 bottom-0 bg-black/40 px-1.5 py-0.5 text-[10px] text-ink/90 opacity-0 group-hover:opacity-100 transition-opacity">
                {g.name}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-xs text-ink-faint">
            Paste a YouTube link to use as a looping, muted-by-default background.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && submitUrl()}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-white/25 focus:outline-none"
            />
            <button
              type="button"
              onClick={submitUrl}
              className="shrink-0 rounded-lg bg-focus px-3 py-2 text-xs font-medium text-[#14100b] hover:brightness-110 transition-all"
            >
              Use
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
          {!error && videoError && (
            <p className="mt-1.5 text-xs text-amber-400">{videoError}</p>
          )}
          {background.mode === "youtube" && background.youtubeUrl && (
            <button
              type="button"
              onClick={onRemoveYouTube}
              className="mt-3 text-xs text-ink-faint hover:text-ink transition-colors"
            >
              Remove video background
            </button>
          )}
        </div>
      )}
    </div>
  );
}
