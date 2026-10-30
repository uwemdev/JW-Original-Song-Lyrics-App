/**
 * Parse raw lyrics (HTML or plain text) into timestamped lines.
 * Supports standard LRC format: [mm:ss.xx] or [mm:ss]
 * Gracefully falls back to proportional timing when LRC timestamps are absent.
 */
export function parseSyncedLyrics(rawLyrics, duration = 0) {
  if (!rawLyrics) return [];

  // 1. Strip HTML tags and clean up whitespace
  const cleaned = rawLyrics
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[\u00A0\u202F\uFEFF]/g, ' ')
    .replace(/<wbr\s*\/?>/gi, '')
    .replace(/&shy;/gi, '')
    .replace(/[\u00AD\u200B]/g, '');

  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // 2. Check if lyrics contain LRC timestamps like [01:23.45]
  const hasTimestamps = lines.some((l) => /\[\d{1,2}:\d{2}/.test(l));

  if (hasTimestamps) {
    const parsed = [];
    for (const line of lines) {
      const match = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/.exec(line);
      if (match) {
        const mins = parseInt(match[1], 10) || 0;
        const secs = parseInt(match[2], 10) || 0;
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const time = mins * 60 + secs + ms / 1000;
        const text = match[4].trim();
        if (text) {
          parsed.push({
            time,
            text,
            isHeader: /^\(.*\)$|^\[.*\]$/.test(text),
          });
        }
      } else {
        // Line without timestamp (e.g. section title "(CHORUS)")
        parsed.push({
          time: parsed.length ? parsed[parsed.length - 1].time + 0.1 : 0,
          text: line,
          isHeader: true,
        });
      }
    }
    return parsed;
  }

  // 3. Fallback: Proportional smart distribution
  // Reserve introSec at start and outroSec at end
  const totalSec = duration > 30 ? duration : 180;
  const introSec = 8;
  const outroSec = 8;
  const activeDuration = Math.max(10, totalSec - introSec - outroSec);
  const step = activeDuration / Math.max(1, lines.length);

  return lines.map((text, idx) => {
    const isHeader = /^\(.*\)$|^\[.*\]$/.test(text);
    return {
      time: Math.round((introSec + idx * step) * 10) / 10,
      text,
      isHeader,
    };
  });
}
