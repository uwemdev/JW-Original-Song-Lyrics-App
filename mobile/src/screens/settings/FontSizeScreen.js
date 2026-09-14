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
  const { colors, isDark, fontSizeIdx, setFontSizeIdx } = useSettings();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color={colors.textWhite} size={22} />
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
                    <Text style={[styles.rowLabel, selected && { color: colors.purpleAccent }]}>
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
                      selected && { color: colors.textWhite },
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

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
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
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: '800',
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: colors.cardBg,
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
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.15)',
    marginLeft: 16,
  },
  footerNote: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 40,
    opacity: 0.6,
  },
});
