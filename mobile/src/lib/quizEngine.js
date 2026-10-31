/**
 * Quiz Engine for "Finish the Lyric" (Family Worship Quiz).
 * Generates and randomizes 5-question rounds with authentic Kingdom original song lyrics.
 */

export const CURATED_QUESTIONS = [
  // 1. Just Around the Corner
  {
    id: 'q1',
    songTitle: 'Just Around the Corner',
    category: 'Original Songs',
    lyricBefore: 'Just around the corner, only a heartbeat away, soon all our tears will be',
    blank: 'wiped away',
    lyricAfter: 'and no one will say, “I am sick.”',
    options: ['wiped away', 'forgotten', 'blown away'],
    explanation: '“Just around the corner, only a heartbeat away, soon all our tears will be wiped away!”',
    tags: ['comfort', 'all'],
  },
  // 2. The Best Life Ever
  {
    id: 'q2',
    songTitle: 'The Best Life Ever',
    category: 'Original Songs',
    lyricBefore: 'There’s no greater work you could ever do, this is the',
    blank: 'best life ever',
    lyricAfter: 'putting Jehovah first in all you do!',
    options: ['best life ever', 'way of wisdom', 'road to follow'],
    explanation: '“There’s no greater work you could ever do, this is the best life ever!”',
    tags: ['joy', 'all'],
  },
  // 3. Run the Race
  {
    id: 'q3',
    songTitle: 'Run the Race',
    category: 'Original Songs',
    lyricBefore: 'Don’t look back to the things behind. Keep your eyes straight ahead on that',
    blank: 'finish line',
    lyricAfter: 'and run the race to the very end.',
    options: ['finish line', 'promised land', 'shining prize'],
    explanation: '“Don’t look back to the things behind. Keep your eyes straight ahead on that finish line!”',
    tags: ['patience', 'all'],
  },
  // 4. Never Give Up
  {
    id: 'q4',
    songTitle: 'Never Give Up',
    category: 'Original Songs',
    lyricBefore: 'Fulfilling the words that were said by your Son: ‘If they persecuted me, then they’ll do it to',
    blank: 'you',
    lyricAfter: 'It’s not a surprise, really, nothing that’s new.’',
    options: ['you', 'them', 'all'],
    explanation: '“‘If they persecuted me, then they’ll do it to you.’ Never give up!”',
    tags: ['strength', 'all'],
  },
  // 5. Stop, Think, and Pray
  {
    id: 'q5',
    songTitle: 'Stop, Think, and Pray',
    category: 'Original Songs',
    lyricBefore: 'When trouble’s around and the situation is getting you down, stop, think, and',
    blank: 'pray',
    lyricAfter: 'Turn to Jehovah and let him guide the way.',
    options: ['pray', 'sing', 'wait'],
    explanation: '“Turn to Jehovah, stop, think, and pray!”',
    tags: ['kids', 'all'],
  },
  // 6. Study Makes You Strong
  {
    id: 'q6',
    songTitle: 'Study Makes You Strong',
    category: 'Original Songs',
    lyricBefore: 'Father would read to me before I would sleep. Now I am taller; I still keep up with that',
    blank: 'routine',
    lyricAfter: 'Study makes you strong, study helps you grow!',
    options: ['routine', 'habit', 'practice'],
    explanation: '“Now I am taller; I still keep up with that routine. Study makes you strong!”',
    tags: ['kids', 'all'],
  },
  // 7. Give Me Courage
  {
    id: 'q7',
    songTitle: 'Give Me Courage',
    category: 'Original Songs',
    lyricBefore: 'Through uncertainty you guide me; I know you’re always',
    blank: 'near',
    lyricAfter: 'Give me courage, Lord, to conquer every fear.',
    options: ['near', 'there', 'strong'],
    explanation: '“Through uncertainty you guide me; I know you’re always near.”',
    tags: ['strength', 'all'],
  },
  // 8. “Always Rejoice”
  {
    id: 'q8',
    songTitle: '“Always Rejoice”',
    category: 'Original Songs',
    lyricBefore: 'So much our God provides—blessing our lives, helping us grow. But even more than this, his love is a',
    blank: 'gift',
    lyricAfter: 'we’ll never let go. Always rejoice!',
    options: ['gift', 'song', 'guide'],
    explanation: '“Even more than this, his love is a gift; we’ll never let go!”',
    tags: ['joy', 'all'],
  },
  // 9. “It Will Not Be Late!”
  {
    id: 'q9',
    songTitle: '“It Will Not Be Late!”',
    category: 'Original Songs',
    lyricBefore: 'Hold on to the vision, keep it in sight, it will not be',
    blank: 'late',
    lyricAfter: 'For Jehovah’s promise stands true and bright.',
    options: ['late', 'lost', 'delayed'],
    explanation: '“Hold on to the vision, keep it in sight: ‘It will not be late!’”',
    tags: ['patience', 'all'],
  },
  // 10. “More Than Many Sparrows”
  {
    id: 'q10',
    songTitle: '“More Than Many Sparrows”',
    category: 'Original Songs',
    lyricBefore: 'If he feeds the birds in the sky, you are worth more than many',
    blank: 'sparrows',
    lyricAfter: 'He knows your every care and will carry you through.',
    options: ['sparrows', 'eagles', 'ravens'],
    explanation: '“Do not fear: you are worth more than many sparrows!”',
    tags: ['comfort', 'all'],
  },
  // 11. ‘Peace Becomes Just Like a River’
  {
    id: 'q11',
    songTitle: '‘Peace Becomes Just Like a River’',
    category: 'Original Songs',
    lyricBefore: 'When you listen to his voice and keep his words in mind, peace becomes just like a',
    blank: 'river',
    lyricAfter: 'calm and deep and true.',
    options: ['river', 'fountain', 'stream'],
    explanation: '“Peace becomes just like a river when we walk in Jehovah’s way.”',
    tags: ['comfort', 'all'],
  },
  // 12. Building My Future With Jehovah
  {
    id: 'q12',
    songTitle: 'Building My Future With Jehovah',
    category: 'Original Songs',
    lyricBefore: 'I want to give my youth and give my best, building my future with',
    blank: 'Jehovah',
    lyricAfter: 'a foundation that will never fade.',
    options: ['Jehovah', 'my friends', 'the truth'],
    explanation: '“Building my future with Jehovah—the best decision of my life.”',
    tags: ['kids', 'all'],
  },
  // 13. Rise Again
  {
    id: 'q13',
    songTitle: 'Rise Again',
    category: 'Original Songs',
    lyricBefore: 'Though the righteous one may fall seven times, with Jehovah’s help he will',
    blank: 'rise again',
    lyricAfter: 'standing firm once more.',
    options: ['rise again', 'stand tall', 'never break'],
    explanation: '“Though we may stumble, Jehovah lifts our hand so we rise again!”',
    tags: ['comfort', 'strength', 'all'],
  },
  // 14. Be Courageous and Strong
  {
    id: 'q14',
    songTitle: 'Be Courageous and Strong',
    category: 'Original Songs',
    lyricBefore: 'It’s dark outside. To start the day, she humbly starts to',
    blank: 'pray',
    lyricAfter: 'for wisdom, strength, and faith.',
    options: ['pray', 'sing', 'smile'],
    explanation: '“To start the day, she humbly starts to pray: Be courageous and strong!”',
    tags: ['strength', 'all'],
  },
  // 15. True Friends
  {
    id: 'q15',
    songTitle: 'True Friends',
    category: 'Original Songs',
    lyricBefore: 'Jehovah knows that we need friends to help us along the',
    blank: 'way',
    lyricAfter: 'true companions who love his name.',
    options: ['way', 'road', 'walk'],
    explanation: '“Jehovah knows that we need friends to help us along the way.”',
    tags: ['kids', 'all'],
  },
  // 16. Joy of Conventions
  {
    id: 'q16',
    songTitle: 'Joy of Conventions',
    category: 'Original Songs',
    lyricBefore: 'Seeing all our brothers here from near and far, happy faces everywhere',
    blank: 'we are',
    lyricAfter: 'worshiping as one united family.',
    options: ['we are', 'they meet', 'today'],
    explanation: '“Seeing all our brothers here from near and far, happy faces everywhere we are!”',
    tags: ['joy', 'all'],
  },
  // 17. Forgive Freely
  {
    id: 'q17',
    songTitle: 'Forgive Freely',
    category: 'Original Songs',
    lyricBefore: 'Just as Jehovah forgave you freely, from your heart you must also',
    blank: 'forgive',
    lyricAfter: 'and let peace flourish.',
    options: ['forgive', 'forget', 'rejoice'],
    explanation: '“Forgive freely, just as Jehovah has forgiven you!”',
    tags: ['kids', 'all'],
  },
  // 18. By Faith
  {
    id: 'q18',
    songTitle: 'By Faith',
    category: 'Original Songs',
    lyricBefore: 'By faith we see what eyes cannot behold, a promise more precious than',
    blank: 'gold',
    lyricAfter: 'shining clear and bright.',
    options: ['gold', 'silver', 'pearls'],
    explanation: '“By faith we see the new world to come, more precious than gold!”',
    tags: ['strength', 'all'],
  },
  // 19. Precious Daughter
  {
    id: 'q19',
    songTitle: 'Precious Daughter',
    category: 'Original Songs',
    lyricBefore: 'In Jehovah’s eyes you are valued and rare, you are his precious',
    blank: 'daughter',
    lyricAfter: 'always in his tender care.',
    options: ['daughter', 'servant', 'child'],
    explanation: '“You are deeply loved, his precious daughter.”',
    tags: ['comfort', 'all'],
  },
  // 20. Choices
  {
    id: 'q20',
    songTitle: 'Choices',
    category: 'Original Songs',
    lyricBefore: 'Every single choice I make can bring a smile to Jehovah’s face or cause him',
    blank: 'pain',
    lyricAfter: 'So I will choose the course that honors his holy name.',
    options: ['pain', 'grief', 'sorrow'],
    explanation: '“Every choice we make can bring joy to Jehovah or cause him pain.”',
    tags: ['kids', 'all'],
  },
  // 21. Jehovah’s Family
  {
    id: 'q21',
    songTitle: 'Jehovah’s Family',
    category: 'Original Songs',
    lyricBefore: 'Brothers and sisters in every land, together hand in',
    blank: 'hand',
    lyricAfter: 'we are Jehovah’s family.',
    options: ['hand', 'glove', 'prayer'],
    explanation: '“Hand in hand across the earth, we are Jehovah’s family!”',
    tags: ['kids', 'joy', 'all'],
  },
  // 22. “Good News”! (2024 Convention Song)
  {
    id: 'q22',
    songTitle: '“Good News”! (2024 Convention Song)',
    category: 'Original Songs',
    lyricBefore: 'Share the message far and wide, the kingdom will never be pushed',
    blank: 'aside',
    lyricAfter: 'Tell the world the good news!',
    options: ['aside', 'away', 'back'],
    explanation: '“Tell everyone the glorious good news of the kingdom!”',
    tags: ['joy', 'all'],
  },
  // 23. Imagine the Time
  {
    id: 'q23',
    songTitle: 'Imagine the Time',
    category: 'Original Songs',
    lyricBefore: 'Imagine the time when the lame leap like a deer, and no more sorrow or',
    blank: 'fear',
    lyricAfter: 'will ever touch our hearts again.',
    options: ['fear', 'pain', 'sighs'],
    explanation: '“Imagine the time when all former things have passed away!”',
    tags: ['patience', 'all'],
  },
  // 24. Friends Again
  {
    id: 'q24',
    songTitle: 'Friends Again',
    category: 'Original Songs',
    lyricBefore: 'Saying sorry isn’t easy to do, but saying sorry makes us',
    blank: 'friends again',
    lyricAfter: 'and brings peace back to our hearts.',
    options: ['friends again', 'feel happy', 'stand strong'],
    explanation: '“A humble apology brings peace and makes us friends again!”',
    tags: ['kids', 'all'],
  },
  // 25. Feed My Faith
  {
    id: 'q25',
    songTitle: 'Feed My Faith',
    category: 'Original Songs',
    lyricBefore: 'Every single day I will read your Word, feed my faith and starve my',
    blank: 'doubts',
    lyricAfter: 'so I can stand firm through every storm.',
    options: ['doubts', 'fears', 'worries'],
    explanation: '“Feed your faith and starve your doubts!”',
    tags: ['strength', 'all'],
  },
];

/**
 * Shuffles an array in place using Fisher-Yates algorithm.
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Returns a randomized quiz of `count` questions.
 * @param {number} count Number of questions (default 5)
 * @param {'all'|'kids'} mode 'all' or 'kids'
 */
export function generateQuizRound(count = 5, mode = 'all') {
  let pool = CURATED_QUESTIONS;

  if (mode === 'kids') {
    pool = CURATED_QUESTIONS.filter((q) => q.tags.includes('kids'));
    // If pool is small, mix in all
    if (pool.length < count) {
      pool = CURATED_QUESTIONS;
    }
  }

  const shuffledPool = shuffle(pool);
  const selected = shuffledPool.slice(0, count);

  // Randomize the order of options (A, B, C) for each question
  return selected.map((q, index) => {
    const randomizedOptions = shuffle(q.options);
    const correctIndex = randomizedOptions.indexOf(q.blank);

    return {
      ...q,
      questionNumber: index + 1,
      totalQuestions: count,
      options: randomizedOptions,
      correctIndex,
      correctLetter: ['A', 'B', 'C'][correctIndex] || 'A',
    };
  });
}
