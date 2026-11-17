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
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}

const dock = loadModule(path.join(__dirname, '..', 'bottomDock.js'));

test('chat clears the measured player and tab bar on both platforms', () => {
  for (const platform of ['android', 'ios']) {
    for (const inset of [0, 24]) {
      for (const height of [68, 110]) {
        const playerTop = dock.getMiniPlayerBottom(platform, inset) + height;
        assert.equal(dock.getChatBottomPadding(platform, inset, true, height, false), playerTop + dock.DOCK_GAP);
      }
      assert.equal(
        dock.getChatBottomPadding(platform, inset, false, 68, false),
        dock.getMiniPlayerBottom(platform, inset)
      );
    }
  }
});

test('chat input adapts to keyboard correctly on android and ios', () => {
  // iOS uses safe inset or dock gap
  assert.equal(dock.getChatBottomPadding('ios', 0, false, 68, true), dock.DOCK_GAP);
  assert.equal(dock.getChatBottomPadding('ios', 24, false, 68, true), 24);

  // Android: without window resize, lifts by full keyboard height or fallback 280
  assert.equal(dock.getChatBottomPadding('android', 0, false, 68, true, 305, false), 305);
  assert.equal(dock.getChatBottomPadding('android', 0, false, 68, true, 0, false), 280);

  // Android: with window resize, uses DOCK_GAP
  assert.equal(dock.getChatBottomPadding('android', 0, false, 68, true, 305, true), dock.DOCK_GAP);
});

test('mini-player hides for the keyboard and reports its measured height', () => {
  for (const platform of ['android', 'ios']) {
    const listeners = {};
    let keyboardVisible = false;
    let height;
    const react = {
      createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
      useState: () => [keyboardVisible, (value) => { keyboardVisible = value; }],
      useEffect: (effect) => { effect(); },
    };
    const keyboard = {
      isVisible: () => false,
      addListener: (name, callback) => {
        listeners[name] = callback;
        return { remove() {} };
      },
    };
    const player = loadModule(path.join(__dirname, '..', '..', 'components', 'MiniPlayer.js'), {
      react,
      'react-native': {
        View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Image: 'Image',
        Platform: { OS: platform, select: (options) => options[platform] },
        Keyboard: keyboard, StyleSheet: { create: (styles) => styles },
      },
      '@react-navigation/native': { useNavigation: () => ({}) },
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 20 }) },
      'lucide-react-native': { Play: 'Play', Pause: 'Pause', Music: 'Music', X: 'X' },
      '../context/AudioContext': {
        useAudio: () => ({
          currentSong: { title: 'Song' },
          isMiniPlayerVisible: true,
          setMiniPlayerHeight: (value) => { height = value; },
        }),
      },
      '../context/SettingsContext': { useSettings: () => ({ colors: {}, isDark: true }) },
      '../lib/bottomDock': dock,
    }).default;

    const rendered = player();
    rendered.props.onLayout({ nativeEvent: { layout: { height: 110 } } });
    assert.equal(height, 110);
    assert.equal(rendered.props.style[1].bottom, dock.getMiniPlayerBottom(platform, 20));
    listeners[platform === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow']();
    assert.equal(player(), null);
    listeners[platform === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide']();
    assert.ok(player());
  }
});
