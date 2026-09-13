import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  StatusBar,
  Alert,
  Share,
  Animated,
} from 'react-native';
import {
  ArrowLeft,
  Palette,
  Type,
  PlayCircle,
  Wifi,
  HardDrive,
  Download,
  Bell,
  Info,
  Share2,
  MessageSquare,
  Shield,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';

// ─── Palette ─────────────────────────────────────────────────────
const BG = '#0F0A1A';
const CARD_BG = '#1A1425';
const PURPLE = '#6D28D9';
const PURPLE_ACCENT = '#A78BFA';
const TEXT_WHITE = '#FFFFFF';
const TEXT_MUTED = '#B8AFC9';
const DIVIDER = 'rgba(255,255,255,0.06)';
const DANGER = '#EF4444';

const FONT_LABELS = ['Small', 'Medium', 'Large'];

// ─── Toast ───────────────────────────────────────────────────────
function Toast({ visible, message }) {
  const opacity = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Row Components ──────────────────────────────────────────────
function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingsRow({ icon, label, subtitle, onPress, right, danger }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconWrap, danger && { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
          {icon}
        </View>
        <View style={styles.rowTextWrap}>
          <Text style={[styles.rowLabel, danger && { color: DANGER }]}>{label}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right || <ChevronRight color={TEXT_MUTED} size={18} />}
    </TouchableOpacity>
  );
}

function ToggleRow({ icon, label, subtitle, value, onValueChange }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>{icon}</View>
        <View style={styles.rowTextWrap}>
          <Text style={styles.rowLabel}>{label}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#3E3456', true: PURPLE }}
        thumbColor={value ? '#E9D5FF' : '#B8AFC9'}
        ios_backgroundColor="#3E3456"
        accessibilityLabel={`${label} toggle, currently ${value ? 'on' : 'off'}`}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS SCREEN
// ═══════════════════════════════════════════════════════════════════
export default function SettingsScreen({ navigation }) {
  const settings = useSettings();
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToastMessage = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out JW Original Song Lyrics — a beautiful app for browsing and reading JW Original Song lyrics! 🎵',
      });
    } catch (_) {}
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset App Data',
      'This will clear all your favorites, cached lyrics, recent searches, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await settings.resetAllData();
            showToastMessage('App data has been reset');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* ── Appearance ── */}
        <SectionHeader title="Appearance" />
        <View style={styles.card}>
          <SettingsRow
            icon={<Palette color={PURPLE_ACCENT} size={20} />}
            label="Theme"
            subtitle={settings.theme === 'system' ? 'System' : settings.theme === 'light' ? 'Light' : 'Dark'}
            onPress={() => navigation.navigate('ThemeSettings')}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<Type color={PURPLE_ACCENT} size={20} />}
            label="Lyrics Font Size"
            subtitle={FONT_LABELS[settings.fontSizeIdx]}
            onPress={() => navigation.navigate('FontSizeSettings')}
          />
        </View>

        {/* ── Playback ── */}
        <SectionHeader title="Playback" />
        <View style={styles.card}>
          <ToggleRow
            icon={<PlayCircle color={PURPLE_ACCENT} size={20} />}
            label="Auto-play on open"
            subtitle="Auto-play songs when opening details"
            value={settings.autoPlay}
            onValueChange={settings.setAutoPlay}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={<Wifi color={PURPLE_ACCENT} size={20} />}
            label="Data Saver"
            subtitle="Only auto-play on Wi-Fi"
            value={settings.dataSaver}
            onValueChange={settings.setDataSaver}
          />
        </View>

        {/* ── Storage & Offline ── */}
        <SectionHeader title="Storage & Offline" />
        <View style={styles.card}>
          <SettingsRow
            icon={<HardDrive color={PURPLE_ACCENT} size={20} />}
            label="Offline Lyrics Cache"
            subtitle="Manage cached songs"
            onPress={() => navigation.navigate('StorageSettings')}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={<Download color={PURPLE_ACCENT} size={20} />}
            label="Auto-cache favorites"
            subtitle="Cache lyrics when you favorite a song"
            value={settings.autoCacheFavorites}
            onValueChange={settings.setAutoCacheFavorites}
          />
        </View>

        {/* ── Notifications ── */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <ToggleRow
            icon={<Bell color={PURPLE_ACCENT} size={20} />}
            label="New song alerts"
            subtitle="Get notified when new songs are added"
            value={settings.newSongAlerts}
            onValueChange={settings.setNewSongAlerts}
          />
        </View>

        {/* ── About ── */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <SettingsRow
            icon={<Info color={PURPLE_ACCENT} size={20} />}
            label="About App"
            onPress={() => navigation.navigate('AboutApp')}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<Share2 color={PURPLE_ACCENT} size={20} />}
            label="Share this app"
            onPress={handleShare}
            right={<View />}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<MessageSquare color={PURPLE_ACCENT} size={20} />}
            label="Contact / Feedback"
            onPress={() => navigation.navigate('FeedbackScreen')}
          />
        </View>

        {/* ── Legal & Data ── */}
        <SectionHeader title="Legal & Data" />
        <View style={styles.card}>
          <SettingsRow
            icon={<Shield color={PURPLE_ACCENT} size={20} />}
            label="Privacy Note"
            onPress={() => navigation.navigate('PrivacyScreen')}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<Trash2 color={DANGER} size={20} />}
            label="Reset App Data"
            danger
            onPress={handleResetData}
            right={<View />}
          />
        </View>

        {/* ── Version ── */}
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>

      <Toast visible={showToast} message={toastMsg} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    color: TEXT_WHITE,
    fontSize: 28,
    fontWeight: '800',
  },
  sectionHeader: {
    color: PURPLE_ACCENT,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 20,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    color: TEXT_WHITE,
    fontSize: 15,
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
    marginLeft: 64,
  },
  versionText: {
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 20,
    opacity: 0.6,
  },
  toast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(109,40,217,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
