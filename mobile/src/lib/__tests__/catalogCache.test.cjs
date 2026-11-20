const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

function loadModule(file, dependencies = {}) {
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    babelrc: false,
    configFile: false,
    plugins: [
      require.resolve('@babel/plugin-transform-react-jsx'),
      require.resolve('@babel/plugin-transform-modules-commonjs'),
    ],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === '@react-native-async-storage/async-storage') {
      return {
        getItem: async () => null,
        setItem: async () => {},
      };
    }
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}

const cache = loadModule(path.join(__dirname, '..', 'catalogCache.js'));

const mockSongs = [
  {
    id: 1,
    title: 'A Place That Will Bring You Praise',
    category_id: 10,
    writeup: 'Dedication song for construction',
    lyrics: '<p>Jehovah God, we come before you<br/>To build a place of praise</p>',
    created_at: '2026-01-01T00:00:00Z',
    is_published: true,
  },
  {
    id: 2,
    title: 'Best Life Ever',
    category_id: 10,
    writeup: 'Joy in full-time service',
    lyrics: '<p>There is nothing quite like serving<br/>With all our heart</p>',
    created_at: '2026-03-01T00:00:00Z',
    is_published: true,
  },
  {
    id: 3,
    title: 'Preach the Word',
    category_id: 20,
    writeup: 'Preaching in all seasons',
    lyrics: '<p>Go from door to door<br/>Spreading truth forevermore</p>',
    created_at: '2026-02-01T00:00:00Z',
    is_published: true,
  },
  {
    id: 4,
    title: 'Unpublished Song',
    category_id: 10,
    writeup: 'Draft song',
    lyrics: '<p>Draft lyrics</p>',
    created_at: '2026-04-01T00:00:00Z',
    is_published: false,
  },
];

test('filterSongsByCategory filters published songs and handles sorting', () => {
  const az = cache.filterSongsByCategory(mockSongs, 10, 'az');
  assert.equal(az.length, 2);
  assert.equal(az[0].title, 'A Place That Will Bring You Praise');
  assert.equal(az[1].title, 'Best Life Ever');

  const newest = cache.filterSongsByCategory(mockSongs, 10, 'newest');
  assert.equal(newest.length, 2);
  assert.equal(newest[0].title, 'Best Life Ever');
  assert.equal(newest[1].title, 'A Place That Will Bring You Praise');

  const empty = cache.filterSongsByCategory(mockSongs, 999);
  assert.deepEqual(empty, []);
});

test('searchSongsLocally finds matches by title, writeup, and lyrics', () => {
  // Title match
  const r1 = cache.searchSongsLocally(mockSongs, 'Best Life');
  assert.equal(r1.length, 1);
  assert.equal(r1[0].id, 2);

  // Writeup match
  const r2 = cache.searchSongsLocally(mockSongs, 'Dedication');
  assert.equal(r2.length, 1);
  assert.equal(r2[0].id, 1);

  // HTML lyrics match
  const r3 = cache.searchSongsLocally(mockSongs, 'door to door');
  assert.equal(r3.length, 1);
  assert.equal(r3[0].id, 3);

  // Scoped category search
  const r4 = cache.searchSongsLocally(mockSongs, 'praise', 20);
  assert.equal(r4.length, 0);

  const r5 = cache.searchSongsLocally(mockSongs, 'praise', 10);
  assert.equal(r5.length, 1);
  assert.equal(r5[0].id, 1);
});

test('getFavoriteSongsFromCatalog resolves songs in reverse order of addition', () => {
  const favs = cache.getFavoriteSongsFromCatalog(mockSongs, [1, 3]);
  assert.equal(favs.length, 2);
  assert.equal(favs[0].id, 3); // newest added first
  assert.equal(favs[1].id, 1);

  // Ignores unpublished or nonexistent
  const favs2 = cache.getFavoriteSongsFromCatalog(mockSongs, [4, 999, 2]);
  assert.equal(favs2.length, 1);
  assert.equal(favs2[0].id, 2);
});

test('getCategoryCountsFromCatalog counts published songs per category', () => {
  const counts = cache.getCategoryCountsFromCatalog(mockSongs);
  assert.equal(counts['10'], 2); // id:4 is unpublished
  assert.equal(counts['20'], 1);
});

test('getRelatedSongsFromCatalog returns other songs in same category', () => {
  const related = cache.getRelatedSongsFromCatalog(mockSongs, 10, 1);
  assert.equal(related.length, 1);
  assert.equal(related[0].id, 2);
});
