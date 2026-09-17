import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { FloatingPrefs } from "../types";

export const fetchFloatingPrefs = () => invoke<FloatingPrefs>("get_floating_prefs");
export const saveFloatingPrefs = (prefs: FloatingPrefs) =>
  invoke<FloatingPrefs>("set_floating_prefs", { prefs });
export const showFloatingWindow = () => invoke<void>("show_floating_window");
export const hideFloatingWindow = () => invoke<void>("hide_floating_window");
export const toggleFloatingWindow = () => invoke<void>("toggle_floating_window");
export const showMainWindow = () => invoke<void>("show_main_window");

export function useFloatingPrefs() {
  const [prefs, setPrefs] = useState<FloatingPrefs | null>(null);

  useEffect(() => {
    let alive = true;
    let unlisten: (() => void) | undefined;

    fetchFloatingPrefs().then((p) => alive && setPrefs(p));
    listen<FloatingPrefs>("floating://prefs-changed", (event) => {
      if (alive) setPrefs(event.payload);
    }).then((u) => {
      if (alive) unlisten = u;
      else u();
    });

    return () => {
      alive = false;
      unlisten?.();
    };
  }, []);

  return prefs;
}
