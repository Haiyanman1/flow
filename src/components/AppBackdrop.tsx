import BackgroundLayer from "./BackgroundLayer";
import type { BackgroundState } from "../types";
import type { SeekRequest } from "../lib/useBackground";

interface AppBackdropProps {
  background: BackgroundState;
  playing: boolean;
  muted: boolean;
  volume: number;
  onVideoError: (code: number) => void;
  onTime?: (current: number, duration: number) => void;
  seekRequest?: SeekRequest | null;
  highRes?: boolean;
  brightness?: number;
}

export default function AppBackdrop(props: AppBackdropProps) {
  return <BackgroundLayer {...props} />;
}
