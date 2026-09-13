import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';

const BG = '#0F0A1A';
const CARD_BG = '#1A1425';
const PURPLE = '#6D28D9';
const PURPLE_ACCENT = '#A78BFA';
const TEXT_WHITE = '#FFFFFF';
const TEXT_MUTED = '#B8AFC9';
const DIVIDER = 'rgba(255,255,255,0.06)';

// Must match SongScreen.js FONT_SIZES / LINE_HEIGHTS
const FONT_SIZES = [16, 19, 23];
const LINE_HEIGHTS = [30, 36, 44];

const OPTIONS = [
  { idx: 0, label: 'Small' },
  { idx: 1, label: 'Medium' },
  { idx: 2, label: 'Large' },
];

const SAMPLE_LYRIC = 'Praise Jah for all of his works...';

export default function FontSizeScreen({ navigation }) {
  const { fontSizeIdx, setFontSizeIdx } = useSettings();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color={TEXT_WHITE} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lyrics Font Size</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.card}>
        {OPTIONS.map((opt, i) => {
          const selected = fontSizeIdx === opt.idx;
          return (
            <React.Fragment key={opt.idx}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.row}
                onPress={() => setFontSizeIdx(opt.idx)}
                activeOpacity={0.6}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${opt.label} font size${selected ? ', selected' : ''}`}
              >
                <View style={styles.rowContent}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.rowLabel, selected && { color: PURPLE_ACCENT }]}>
                      {opt.label}
                    </Text>
                    {selected && (
                      <View style={styles.checkCircle}>
                        <Check color="#FFF" size={14} strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  {/* Live preview */}
                  <Text
                    style={[
                      styles.preview,
                      {
                        fontSize: FONT_SIZES[opt.idx],
                        lineHeight: LINE_HEIGHTS[opt.idx],
                      },
                      selected && { color: TEXT_WHITE },
                    ]}
                    numberOfLines={1}
                  >
                    {SAMPLE_LYRIC}
                  </Text>
                </View>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      <Text style={styles.footerNote}>
        Changes apply immediately to the Song lyrics view.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: TEXT_WHITE,
    fontSize: 18,
    fontWeight: '800',
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.08)',
  },
  row: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowContent: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowLabel: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    color: TEXT_MUTED,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginLeft: 16,
  },
  footerNote: {
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 40,
    opacity: 0.6,
  },
});
