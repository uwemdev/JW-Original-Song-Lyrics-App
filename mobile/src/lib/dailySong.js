/**
 * Daily Song utility: deterministic rotation and lyric quote extraction.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Returns formatted date string like: "Today • Saturday, Oct 31"
 */
export function getFormattedTodayDate() {
  const now = new Date();
  const dayName = DAYS[now.getDay()];
  const monthName = MONTHS[now.getMonth()];
  const dateNum = now.getDate();
  return `Today • ${dayName}, ${monthName} ${dateNum}`;
}

/**
 * Deterministically picks one song per day based on date seed.
 * All users worldwide get the same daily song on the same calendar day.
 */
export function getDailySong(songs) {
  if (!songs || songs.length === 0) return null;
  const now = new Date();
  // Unique day of year
  const startOfYear = Date.UTC(now.getFullYear(), 0, 0);
  const currentUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfYear = Math.floor((currentUTC - startOfYear) / (24 * 60 * 60 * 1000));
  const seed = now.getFullYear() * 1000 + dayOfYear;
  const index = Math.abs(seed) % songs.length;
  return songs[index];
}

/**
 * Extracts a meaningful, uplifting quote from the song's chorus or first stanza.
 */
export function extractLyricQuote(lyrics) {
  if (!lyrics) return '';

  const cleaned = lyrics
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[\u00A0\u202F\uFEFF]/g, ' ')
    .replace(/<wbr\s*\/?>/gi, '')
    .replace(/&shy;/gi, '')
    .replace(/[\u00AD\u200B]/g, '');

  // 1. Try to find the chorus line
  const chorusMatch = /(?:\(CHORUS\)|\[Chorus\])[\s\S]*?\n([^\n]+)/i.exec(cleaned);
  if (chorusMatch && chorusMatch[1] && chorusMatch[1].trim().length > 6) {
    const quote = chorusMatch[1].trim();
    if (!/^\(.*\)$|^\[.*\]$/.test(quote)) {
      return quote;
    }
  }

  // 2. Otherwise get the first clean lyric line that isn't a section header
  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 8 && !/^\(.*\)$|^\[.*\]$/.test(l));

  if (lines.length > 0) {
    return lines[0];
  }

  return 'Start your morning with encouraging words.';
}

/**
 * Synthesizes a daily morning notification item for the notification center
 */
export function getDailyNotification(dailySong) {
  if (!dailySong) return null;
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const quote = extractLyricQuote(dailySong.lyrics);

  // Set time to today at 07:30:00 local time
  const morningDate = new Date();
  morningDate.setHours(7, 30, 0, 0);

  return {
    id: `daily-song-${dateKey}`,
    type: 'daily_song',
    title: `🌅 Song of the Day: ${dailySong.title}`,
    message: quote
      ? `"${quote}" — Start your morning with encouraging words.`
      : `Start your day with "${dailySong.title}".`,
    song_id: dailySong.id,
    created_at: morningDate.toISOString(),
  };
}
