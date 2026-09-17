/**
 * Which desktop the webview is running on. Tauri's WKWebView (macOS) and
 * WebView2 (Windows) identify themselves in the user agent, which is enough
 * here — the only thing that differs between platforms is the title bar.
 */
export function detectMac(userAgent: string): boolean {
  return /Macintosh|Mac OS X/.test(userAgent);
}

export const isMac =
  typeof navigator !== "undefined" ? detectMac(navigator.userAgent) : false;
