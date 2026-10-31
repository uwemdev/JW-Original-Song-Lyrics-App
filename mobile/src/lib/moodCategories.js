/**
 * Mood & Emotion Filter definitions and helpers for JW Original Songs.
 * Provides curated emotional anchors to help users find songs based on how they feel.
 */

export const MOODS = [
  {
    id: 'comfort',
    emoji: '🌧️',
    title: 'Comfort & Peace',
    pillLabel: '🌧️ Need Comfort & Peace',
    tagline: 'Need Comfort & Peace',
    description: 'Calming melodies for grief, anxiety, and peace of mind',
    gradient: ['#2563EB', '#1E40AF'],
    lightBg: '#EFF6FF',
    accentColor: '#3B82F6',
    borderCol: 'rgba(59, 130, 246, 0.4)',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    titles: [
      'Rise Again',
      'Just Around the Corner',
      'Peace Becomes Just Like a River',
      'More Than Many Sparrows',
      'A Word at the Right Time',
      'Each Day Has Its Own Anxieties',
      'Draw Close to Me',
      'He Knows Us',
      'Hearer of Prayer',
      'Home',
      'I Am in Your Hands',
      'I Can Get Back Up',
      'I Know Jehovah’s With Me',
      'I Trust In You',
      'I Trust in Your Loyal Love',
      'Jehovah Welcomes You Home',
      'Jehovah’s Always by Our Side',
      'Living Peacefully in a Peaceless World',
      'Never Alone',
      'Pause and Reset',
      'Peace at Last!',
      'Please Be Convinced',
      'Precious Daughter',
      'Roll It on Him',
      'Safeguard Your Mind',
      'Stop, Think, and Pray',
      'To Whom Could I Go Away?',
      'Unfailing Love',
      'We Won’t Forget You',
      'With Jehovah, We Are One',
      'You Will See',
    ],
    keywords: [
      'peace', 'river', 'comfort', 'around the corner', 'rise again', 'sparrow', 'rely', 'pray', 'prayer',
      'tears', 'grief', 'sorrow', 'safe', 'shelter', 'rest', 'quiet', 'gentle', 'brokenhearted', 'heal',
      'father', 'never alone', 'hope', 'refuge', 'shepherd', 'carry me', 'anxiet',
    ],
  },
  {
    id: 'strength',
    emoji: '⚡',
    title: 'Strength & Courage',
    pillLabel: '⚡ Need Strength & Courage',
    tagline: 'Need Strength & Courage',
    description: 'Empowering songs to help you stand firm and conquer fear',
    gradient: ['#D97706', '#92400E'],
    lightBg: '#FFFBEB',
    accentColor: '#F59E0B',
    borderCol: 'rgba(245, 158, 11, 0.4)',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    titles: [
      'Never Give Up',
      'Be Courageous and Strong',
      'Fight the Fine Fight of the Faith',
      'By Faith',
      'Confident in You',
      'Do Not Be Afraid',
      'Faith Can Make Things Happen',
      'Feed My Faith',
      'Give Me Courage',
      'Let’s Take the Leap',
      'Study Makes You Strong',
      'The Power Beyond My Own',
      'Together We Are Strong',
      'Use Your Strength for Jehovah’s Name',
      'We Can’t Hold Back',
      'We Won’t Stop Now',
      'With Eyes of Faith',
    ],
    keywords: [
      'strength', 'strong', 'courage', 'courageous', 'never give up', 'fight', 'stand firm', 'bold',
      'fear', 'fearless', 'brave', 'power', 'shield', 'unshakable', 'champion', 'faith', 'mountain',
      'armor', 'warrior', 'fortress',
    ],
  },
  {
    id: 'joy',
    emoji: '🎉',
    title: 'Joy & Gratitude',
    pillLabel: '🎉 Joy & Gratitude',
    tagline: 'Joy & Gratitude',
    description: 'Upbeat and thankful songs to lift your heart in praise',
    gradient: ['#DB2777', '#9D174D'],
    lightBg: '#FDF2F8',
    accentColor: '#EC4899',
    borderCol: 'rgba(236, 72, 153, 0.4)',
    badgeBg: 'rgba(236, 72, 153, 0.15)',
    titles: [
      'Joy of Conventions',
      'Our Best for Jehovah',
      'Always Rejoice',
      'Good News',
      'Honor Jehovah With Your Valuable Things',
      'The Real Life',
      'Two Small Coins',
      'A Higher Kind of Love',
      'A Place That Will Bring You Praise',
      'All I Can Give',
      'Blessings of Learning a Language',
      'Brotherly Love',
      'Count My Blessings',
      'Give Jehovah Glory',
      'Give You My All',
      'I Give You My Best',
      'Glad I Passed the Test',
      'Happy Are These Eyes',
      'I Give My Life to You',
      'Inspired by Your Wonders',
      'It’s Filled With Love',
      'Joy Is in the Air',
      'Just a Smile',
      'Language of Our Hearts',
      'One United People',
      'Our Joy Eternally',
      'Our Thanks Go to You',
      'Thankful for God’s Creation',
      'The Best Life Ever',
      'The Road to Life',
      'The Way You “Open Your Hand”',
      'To Do Your Will Is My Delight',
      'Truly in Love',
      'We Marvel at Your Work',
      'When All Hearts Sing as One',
    ],
    keywords: [
      'joy', 'rejoice', 'happy', 'happiness', 'gratitude', 'thank', 'thanks', 'praise',
      'celebrate', 'convention', 'good news', 'smile', 'blessing', 'brotherly love', 'cheerful',
      'glad', 'delight', 'radiant',
    ],
  },
  {
    id: 'patience',
    emoji: '⏳',
    title: 'Patience & Endurance',
    pillLabel: '⏳ Patience & Endurance',
    tagline: 'Patience & Endurance',
    description: 'Inspirational anthems to help you wait on Jehovah and endure',
    gradient: ['#059669', '#065F46'],
    lightBg: '#ECFDF5',
    accentColor: '#10B981',
    borderCol: 'rgba(16, 185, 129, 0.4)',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    titles: [
      'Keep Your Eyes on the Prize',
      'It Will Not Be Late!',
      'Building My Future With Jehovah',
      'Choices',
      'Don’t Run So Fast',
      'Every Minute',
      'Finding Treasures',
      'I Keep Your Reminders',
      'I’ll Wait on Jehovah',
      'Imagine the Time',
      'It Won’t Be Long',
      'Keep the Pace',
      'Live for Forever',
      'Make Time for Jehovah',
      'Now Is the Time',
      'Run the Race',
      'Take Your Time, Choose Wisely',
      'The New World to Come',
      'The Search',
      'Where I Belong',
      'Your Word Endures Forever',
    ],
    keywords: [
      'prize', 'eyes on the prize', 'patience', 'patient', 'endure', 'endurance', 'wait', 'waiting',
      'not be late', 'tomorrow', 'hold on', 'race', 'finish', 'paradise', 'looking ahead', 'persevere', 'long-suffering',
    ],
  },
  {
    id: 'kids',
    emoji: '👨‍👩‍👧',
    title: 'For the Kids',
    pillLabel: '👨‍👩‍👧 For the Kids',
    tagline: 'For the Kids',
    description: 'Heartwarming songs for young ones, friendship, and family',
    gradient: ['#7C3AED', '#5B21B6'],
    lightBg: '#F5F3FF',
    accentColor: '#8B5CF6',
    borderCol: 'rgba(139, 92, 246, 0.4)',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    categoryMatch: ['become jehovah', 'sing with us', 'friend'],
    titles: [
      'Just Like a Child',
      'Friends Again',
      'Jehovah’s Family',
      'True Friends',
      'We’re Your Family',
      'Follow the Course of Hospitality',
      'Forgive Freely',
      'Forgive One Another',
      'Learn From a Fall',
      'Let’s Keep It Simple',
      'Let’s Stick Together',
      'Tell Them You Love Them',
      'You Can Count on Me',
      'We See You, Sister',
      'What Means the Most to Me',
    ],
    keywords: [
      'caleb', 'sophia', 'child', 'children', 'friend', 'listen', 'obey', 'parents', 'young', 'school',
      'family', 'kids',
    ],
  },
];

function clean(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Filter a list of songs by the given moodId.
 * Multi-layer classification ensures any new songs added to Supabase
 * are seamlessly categorized:
 * 1. Explicit database tag (song.mood or song.mood_id)
 * 2. Dedicated category matching (e.g. for Kids series)
 * 3. Curated title library matching
 * 4. Automatic keyword matching across Title
 * 5. Automatic keyword matching across Writeup / Description
 */
export function filterSongsByMood(allSongs, moodId) {
  if (!allSongs || !moodId) return [];
  const mood = MOODS.find((m) => m.id === moodId);
  if (!mood) return [];

  const matchedSet = new Set();
  const results = [];

  allSongs.forEach((song) => {
    // 1. Explicit DB field: if set in Supabase or Admin, it takes absolute precedence
    if (song.mood || song.mood_id) {
      const dbMood = (song.mood || song.mood_id || '').toLowerCase().trim();
      if (dbMood === moodId && !matchedSet.has(song.id)) {
        matchedSet.add(song.id);
        results.push(song);
      }
      return; // Do not check other criteria if explicit mood is specified
    }

    const sClean = clean(song.title);
    const catClean = clean(song.categories?.name || '');

    // 2. Category match (e.g. for Kids series)
    if (mood.categoryMatch && mood.categoryMatch.some((c) => catClean.includes(clean(c)))) {
      if (!matchedSet.has(song.id)) {
        matchedSet.add(song.id);
        results.push(song);
        return;
      }
    }

    // 3. Explicit curated title match
    const titleMatched = mood.titles.some((t) => {
      const tClean = clean(t);
      return sClean.includes(tClean) || tClean.includes(sClean);
    });

    if (titleMatched && !matchedSet.has(song.id)) {
      matchedSet.add(song.id);
      results.push(song);
      return;
    }

    // 4. Keyword match in Title
    const titleKeywordMatched = mood.keywords.some((k) => {
      const kClean = clean(k);
      return sClean.includes(kClean);
    });

    if (titleKeywordMatched && !matchedSet.has(song.id)) {
      matchedSet.add(song.id);
      results.push(song);
      return;
    }

    // 5. Keyword match in Writeup / Description (for new songs)
    if (song.writeup) {
      const writeupClean = clean(song.writeup);
      const writeupMatched = mood.keywords.some((k) => {
        const kClean = clean(k);
        return kClean.length >= 4 && writeupClean.includes(kClean);
      });

      if (writeupMatched && !matchedSet.has(song.id)) {
        matchedSet.add(song.id);
        results.push(song);
      }
    }
  });

  return results;
}

/**
 * Retrieve mood metadata by ID.
 */
export function getMoodById(moodId) {
  return MOODS.find((m) => m.id === moodId) || null;
}

