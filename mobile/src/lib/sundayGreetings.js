/**
 * Sunday Evening Reflections & Greetings Bank.
 * Warm, heartwarming questions and thoughts for Sunday after the meeting.
 */

export const SUNDAY_GREETINGS = [
  "How was the meeting today? 🕊️ Relax this evening and unwind with",
  "Hope you had an encouraging meeting today! 📖 Like to listen to",
  "A spiritual Sunday well spent! ✨ Keep the joy going with",
  "How was the meeting today? 💛 Sing along tonight to",
  "Reflecting on today's spiritual gems? 💎 Here is an uplifting melody:",
  "Peaceful Sunday evening! 🕯️ Let your heart be comforted with",
  "Encouraged by today's talks and study? 🎶 End your weekend with",
  "Winding down after a spiritually refreshing day? 🌙 Tap to play",
  "How was the meeting today? 🌿 Let's cap off Sunday with",
  "A beautiful Sunday of worship! 🕊️ Relax and enjoy",
  "Gathered with family tonight? 👨‍👩‍👧‍👦 Put on an encouraging song:",
  "Still singing the melodies from the meeting? 🎵 Keep the praise going with",
  "Time to relax and meditate on today's thoughts. 📖 Let's listen to",
  "Hope your heart was uplifted today! 💛 Here is a song for your evening:",
  "Ending the week with gratitude and peace. 🕊️ Play",
  "How was the Watchtower study today? 💬 Settle in tonight with",
  "A quiet Sunday evening at home. 🕯️ Let the soothing words of",
  "Ready for a peaceful night's rest? 🌙 Start winding down with",
  "Spiritual food for the soul today! 🌿 Now enjoy the melody of",
  "Warm love to you this Sunday evening! 🕊️ Relax and sing along to",
  "Did a talk touch your heart today? ✨ Keep that feeling alive with",
  "Treasuring the association and encouragement from today! 💛 Play",
  "Sunday evening family time! 👨‍👩‍👧‍👦 Sing along together to",
  "Recharging for the week ahead! ⚡ Find strength tonight in",
  "What a blessing to gather today! 🕊️ Let's listen to",
  "May your evening be peaceful and calm. 🌙 Unwind with",
  "A joyful heart is good medicine! 🎶 Brighten your Sunday night with",
  "Reflecting on Jehovah's loving-kindness today. 🕯️ Listen to",
  "Peace of mind as the weekend comes to a close. 🕊️ Play",
  "How was meeting today? 📖 Wrap up your Sunday with",
];

/**
 * Returns a greeting tailored with the song title.
 */
export function getSundayGreeting(songTitle, seedNumber = null) {
  const title = songTitle || 'an Original Song';
  let index = 0;
  if (typeof seedNumber === 'number') {
    index = Math.abs(seedNumber) % SUNDAY_GREETINGS.length;
  } else {
    // Pick based on the current week number of the year for variety
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.floor(((now - start) / 86400000 + start.getDay() + 1) / 7);
    index = (now.getFullYear() + week) % SUNDAY_GREETINGS.length;
  }
  const prefix = SUNDAY_GREETINGS[index];
  return `${prefix} "${title}"`;
}

/**
 * Check if today is Sunday (day 0)
 */
export function isSunday() {
  return new Date().getDay() === 0;
}

/**
 * Check if it is Sunday evening (Sunday after 5:00 PM / 17:00)
 */
export function isSundayEvening() {
  const now = new Date();
  return now.getDay() === 0 && now.getHours() >= 17;
}

