const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

function loadModule(file, dependencies = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const { code } = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [
      require.resolve('@babel/plugin-transform-react-jsx'),
      require.resolve('@babel/plugin-transform-modules-commonjs'),
    ],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    module,
    module.exports
  );
  return module.exports;
}

const registry = loadModule(path.join(__dirname, '..', 'wallpapers.js'));
const react = {
  Fragment: 'Fragment',
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
};
const renderer = loadModule(path.join(__dirname, '..', '..', 'components', 'ChatWallpaperBackground.js'), {
  react,
  'react-native': { View: 'View', StyleSheet: { absoluteFillObject: {}, create: (styles) => styles } },
  'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
  '../lib/wallpapers': registry,
}).default;

function contrastWithWhite(hex) {
  const channels = hex.slice(1).match(/../g).map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2] + 0.05);
}

test('themes have usable gradients, categories, and accessible outgoing text', () => {
  const { WALLPAPERS, THEME_CATEGORIES } = registry;
  assert.ok(WALLPAPERS.length >= 12);
  assert.equal(new Set(WALLPAPERS.map((theme) => theme.id)).size, WALLPAPERS.length);
  for (const category of THEME_CATEGORIES) {
    assert.ok(WALLPAPERS.some((theme) => theme.category === category));
  }
  for (const theme of WALLPAPERS) {
    assert.ok(theme.name && theme.subtitle && theme.landscapeType);
    assert.ok(THEME_CATEGORIES.includes(theme.category));
    assert.equal(theme.bubbleTextColor, '#FFFFFF');
    assert.ok(contrastWithWhite(theme.bubbleColor) >= 4.5, theme.id);
    for (const gradient of [theme.darkGradient, theme.lightGradient]) {
      assert.equal(gradient.length, 3, theme.id);
      assert.equal(new Set(gradient).size, 3, theme.id);
      assert.ok(gradient.every((color) => /^#[0-9A-F]{6}$/i.test(color)));
    }
    assert.equal(theme.previewColors.length, 2);
  }
});

test('legacy themes resolve and each theme renders a full-height gradient with native scenery', () => {
  assert.equal(registry.getWallpaperById('mountains').id, 'mountain_dawn');
  assert.equal(registry.getWallpaperById('unknown').id, 'default');
  const shapes = new Map();
  for (const theme of registry.WALLPAPERS) {
    for (const isDark of [false, true]) {
      const root = renderer({ wallpaperId: theme.id, isDark });
      assert.equal(root.props.pointerEvents, 'none');
      const gradient = root.children.find((child) => child.type === 'LinearGradient');
      assert.deepEqual(gradient.props.colors, isDark ? theme.darkGradient : theme.lightGradient);
      assert.deepEqual(gradient.props.start, { x: 0.5, y: 0 });
      assert.deepEqual(gradient.props.end, { x: 0.5, y: 1 });
      const scenery = root.children.find((child) => typeof child.type === 'function');
      const result = scenery.type(scenery.props);
      assert.ok(result);
      shapes.set(theme.landscapeType, true);
    }
  }
  for (const type of ['dunes', 'mountains', 'aurora', 'sunset', 'palms', 'forest', 'ocean', 'minimal']) {
    assert.ok(shapes.has(type), type);
  }
});

test('rapid theme selections update immediately and persist in selection order', async () => {
  const states = [];
  const writes = [];
  let releaseFirst;
  const firstWrite = new Promise((resolve) => { releaseFirst = resolve; });
  const settingsReact = {
    ...react,
    createContext: () => ({ Provider: 'Provider' }),
    useContext: () => null,
    useState: (value) => {
      const state = { value };
      states.push(state);
      return [value, (next) => { state.value = next; }];
    },
    useEffect: () => {},
    useCallback: (callback) => callback,
    useRef: (value) => ({ current: value }),
  };
  const settings = loadModule(path.join(__dirname, '..', '..', 'context', 'SettingsContext.js'), {
    react: settingsReact,
    'react-native': { useColorScheme: () => 'dark', AppState: {}, Platform: {}, Alert: {} },
    '@react-native-async-storage/async-storage': {
      setItem: async (key, value) => {
        writes.push([key, value]);
        if (writes.length === 1) await firstWrite;
      },
    },
    'expo-notifications': {},
    '../lib/supabase': {},
    '../lib/notificationScheduler': {},
    '../lib/versionCheck': {},
  });
  const provider = settings.SettingsProvider({ children: null });
  const wallpaperState = states.find((state) => state.value === 'default');
  provider.props.value.setChatWallpaper('desert_dusk');
  provider.props.value.setChatWallpaper('ocean_blue');
  assert.equal(wallpaperState.value, 'ocean_blue');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(writes.map((entry) => entry[1]), ['desert_dusk']);
  releaseFirst();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(writes.map((entry) => entry[1]), ['desert_dusk', 'ocean_blue']);
});
