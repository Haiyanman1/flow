const PATTERNS = [
  // `v=` anywhere in the query, so extra params in any order still work
  // (e.g. .../watch?app=desktop&v=ID, or ...&list=...&v=ID).
  /[?&]v=([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
  /(?:youtube\.com\/live\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  // A bare 11-character ID pasted on its own.
  /^([\w-]{11})$/,
];

/** Human-readable text for a YouTube IFrame API error code. */
export function youtubeErrorMessage(code: number): string {
  switch (code) {
    case -1:
      return "Couldn't load YouTube. Check your internet connection.";
    case -2:
      return "The video took too long to load. Check your connection and try again.";
    case 2:
      return "That video link looks malformed.";
    case 5:
      return "This video can't be played in the background player.";
    case 100:
      return "That video is private, removed, or doesn't exist.";
    case 101:
    case 150:
      return "This video's owner doesn't allow it to be embedded. Try another video.";
    case 153:
      return "YouTube refused the embed. Try restarting Flow.";
    default:
      return `YouTube reported error ${code}.`;
  }
}

export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  for (const pattern of PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}
