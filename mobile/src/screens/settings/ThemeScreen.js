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









const OPTIONS = [
  { key: 'dark', label: 'Dark', subtitle: 'Always use dark theme', icon: Moon },
  { key: 'light', label: 'Light', subtitle: 'Always use light theme (coming soon)', icon: Sun },
  { key: 'system', label: 'System', subtitle: 'Follow your device settings', icon: Smartphone },
];

export default function ThemeScreen({ navigation }) {
  const { colors, isDark, theme, setTheme } = useSettings();
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
                    <Text style={[styles.rowLabel, selected && { color: colors.purpleAccent }]}>
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
    backgroundColor: colors.purple,
  },
  rowLabel: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.15)',
    marginLeft: 70,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerNote: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 40,
    opacity: 0.6,
    lineHeight: 18,
  },
});
