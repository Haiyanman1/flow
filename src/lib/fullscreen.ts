import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useState } from "react";

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    win.isFullscreen().then(setIsFullscreen);
  }, []);

  const toggle = useCallback(async () => {
    const win = getCurrentWindow();
    const next = !(await win.isFullscreen());
    await win.setFullscreen(next);
    setIsFullscreen(next);
  }, []);

  return { isFullscreen, toggle };
}
