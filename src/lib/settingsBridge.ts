import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { Settings, TimerSnapshot } from "../types";

export const fetchSettings = () => invoke<Settings>("get_settings");
export const saveSettings = (settings: Settings) =>
  invoke<TimerSnapshot>("update_settings", { settings });

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let alive = true;
    let unlisten: (() => void) | undefined;

    fetchSettings().then((s) => alive && setSettings(s));
    listen<Settings>("settings://changed", (event) => {
      if (alive) setSettings(event.payload);
    }).then((u) => {
      if (alive) unlisten = u;
      else u();
    });

    return () => {
      alive = false;
      unlisten?.();
    };
  }, []);

  return settings;
}
