import { describe, expect, it } from "vitest";
import { detectMac } from "./platform";

describe("detectMac", () => {
  it("recognises the macOS WKWebView user agent", () => {
    expect(
      detectMac(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)",
      ),
    ).toBe(true);
  });

  it("does not mistake WebView2 on Windows for a Mac", () => {
    expect(
      detectMac(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
      ),
    ).toBe(false);
  });
});
