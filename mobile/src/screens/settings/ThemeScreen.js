import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { ArrowLeft, Check, Moon, Sun, Smartphone } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';

const BG = '#0F0A1A';
const CARD_BG = '#1A1425';
const PURPLE = '#6D28D9';
const PURPLE_ACCENT = '#A78BFA';
const TEXT_WHITE = '#FFFFFF';
const TEXT_MUTED = '#B8AFC9';
const DIVIDER = 'rgba(255,255,255,0.06)';

const OPTIONS = [
  { key: 'dark', label: 'Dark', subtitle: 'Always use dark theme', icon: Moon },
  { key: 'light', label: 'Light', subtitle: 'Always use light theme (coming soon)', icon: Sun },
  { key: 'system', label: 'System', subtitle: 'Follow your device settings', icon: Smartphone },
];

export default function ThemeScreen({ navigation }) {
  const { theme, setTheme } = useSettings();

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
        <Text style={styles.headerTitle}>Theme</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.card}>
        {OPTIONS.map((opt, idx) => {
          const Icon = opt.icon;
          const selected = theme === opt.key;
          return (
            <React.Fragment key={opt.key}>
              {idx > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.row}
                onPress={() => setTheme(opt.key)}
                activeOpacity={0.6}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${opt.label} theme${selected ? ', selected' : ''}`}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.iconWrap, selected && styles.iconWrapActive]}>
                    <Icon color={selected ? '#FFF' : PURPLE_ACCENT} size={20} />
                  </View>
                  <View>
                    <Text style={[styles.rowLabel, selected && { color: PURPLE_ACCENT }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.rowSubtitle}>{opt.subtitle}</Text>
                  </View>
                </View>
                {selected && (
                  <View style={styles.checkCircle}>
                    <Check color="#FFF" size={14} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      <Text style={styles.footerNote}>
        Theme changes are saved automatically. Light mode visual theming is planned for a future update.
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconWrapActive: {
    backgroundColor: PURPLE,
  },
  rowLabel: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginLeft: 70,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerNote: {
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 40,
    opacity: 0.6,
    lineHeight: 18,
  },
});
