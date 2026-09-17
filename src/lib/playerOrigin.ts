import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

/**
 * Origin of the local server that serves the YouTube player page and imported
 * background images, e.g. `http://localhost:52341`. The port is chosen fresh on
 * each launch, so URLs must always be built from this rather than stored.
 */
export function usePlayerOrigin() {
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    invoke<string | null>("get_player_origin")
      .then((o) => alive && setOrigin(o))
      .catch(() => alive && setOrigin(null));
    return () => {
      alive = false;
    };
  }, []);

  return origin;
}
