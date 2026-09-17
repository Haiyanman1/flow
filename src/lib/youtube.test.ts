import { describe, expect, it } from "vitest";
import { extractYouTubeId, isValidYouTubeUrl, youtubeErrorMessage } from "./youtube";

const ID = "dQw4w9WgXcQ";

describe("extractYouTubeId", () => {
  it("handles the standard watch URL", () => {
    expect(extractYouTubeId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it("handles extra query params in any order", () => {
    expect(extractYouTubeId(`https://www.youtube.com/watch?app=desktop&v=${ID}`)).toBe(ID);
    expect(extractYouTubeId(`https://www.youtube.com/watch?v=${ID}&t=42s`)).toBe(ID);
    expect(extractYouTubeId(`https://www.youtube.com/watch?list=PL123&v=${ID}`)).toBe(ID);
  });

  it("handles short links, with and without tracking params", () => {
    expect(extractYouTubeId(`https://youtu.be/${ID}`)).toBe(ID);
    expect(extractYouTubeId(`https://youtu.be/${ID}?si=abcdef`)).toBe(ID);
  });

  it("handles shorts, live and embed URLs", () => {
    expect(extractYouTubeId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(extractYouTubeId(`https://www.youtube.com/live/${ID}`)).toBe(ID);
    expect(extractYouTubeId(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
  });

  it("handles a bare video id and surrounding whitespace", () => {
    expect(extractYouTubeId(ID)).toBe(ID);
    expect(extractYouTubeId(`  https://youtu.be/${ID}  `)).toBe(ID);
  });

  it("rejects non-YouTube and malformed input", () => {
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId("https://vimeo.com/12345678")).toBeNull();
    expect(extractYouTubeId("not a url")).toBeNull();
    // too short to be a real id
    expect(extractYouTubeId("https://www.youtube.com/watch?v=abc")).toBeNull();
  });

  it("isValidYouTubeUrl agrees with the extractor", () => {
    expect(isValidYouTubeUrl(`https://youtu.be/${ID}`)).toBe(true);
    expect(isValidYouTubeUrl("https://example.com")).toBe(false);
  });
});

describe("youtubeErrorMessage", () => {
  it("explains the embedding-disabled codes in plain language", () => {
    for (const code of [101, 150]) {
      expect(youtubeErrorMessage(code)).toMatch(/doesn't allow it to be embedded/i);
    }
  });

  it("covers connectivity and missing-video cases", () => {
    expect(youtubeErrorMessage(-1)).toMatch(/internet connection/i);
    expect(youtubeErrorMessage(100)).toMatch(/private, removed/i);
  });

  it("falls back to naming the raw code", () => {
    expect(youtubeErrorMessage(999)).toContain("999");
  });
});
